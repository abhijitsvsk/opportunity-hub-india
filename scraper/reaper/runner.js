require('dotenv').config({ path: './.env' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { parseDomainInfo, isHighRiskSource } = require('./domain-utils');
const { DomainQueue } = require('./domain-queue');
const { CircuitBreaker } = require('./circuit-breaker');
const { safeGet } = require('./http-client');
const { classifyResponse } = require('./classifier');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const INGESTION_GRACE_HOURS = parseInt(process.env.INGESTION_GRACE_HOURS || '24', 10);
const GLOBAL_CONCURRENCY = parseInt(process.env.GLOBAL_CONCURRENCY || '12', 10);
const PER_DOMAIN_CONCURRENCY = parseInt(process.env.PER_DOMAIN_CONCURRENCY || '2', 10);
const SAME_DOMAIN_MIN_DELAY_MS = parseInt(process.env.SAME_DOMAIN_MIN_DELAY_MS || '350', 10);

async function runReaper(options = {}) {
  const isAudit = options.audit !== false; // Default to AUDIT mode!
  const limit = options.limit || 2000;
  const startedAt = new Date();

  console.log(`\n======================================================`);
  console.log(`  OPPHUNT LINK HEALTH REAPER (MODE: ${isAudit ? 'AUDIT ONLY' : 'LIVE'})`);
  console.log(`  Safety Constraints:`);
  console.log(`  - 24h Ingestion Grace Period: Active (${INGESTION_GRACE_HOURS}h)`);
  console.log(`  - Database Deactivations: ${isAudit ? 'DISABLED (0 mutations to is_active)' : 'ENABLED'}`);
  console.log(`  - Global Concurrency: ${GLOBAL_CONCURRENCY} | Per-Domain: ${PER_DOMAIN_CONCURRENCY}`);
  console.log(`======================================================\n`);

  // 1. Fetch opportunities with grace period applied
  const graceCutoff = new Date(Date.now() - (INGESTION_GRACE_HOURS * 60 * 60 * 1000)).toISOString();

  let allOpportunities = [];
  let from = 0;
  const pageSize = 500;

  while (allOpportunities.length < limit) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, source_url, normalized_company, created_at')
      .eq('is_active', true)
      .lt('created_at', graceCutoff)
      .range(from, from + pageSize - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to query opportunities:', error.message);
      return;
    }
    if (!data || data.length === 0) break;
    allOpportunities.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const targets = allOpportunities.slice(0, limit);
  console.log(`Found ${targets.length} active opportunities older than ${INGESTION_GRACE_HOURS}h.\n`);

  if (targets.length === 0) {
    console.log('No targets found for link health audit.');
    return;
  }

  const queue = new DomainQueue({
    globalConcurrency: GLOBAL_CONCURRENCY,
    perDomainConcurrency: PER_DOMAIN_CONCURRENCY,
    minDomainDelayMs: SAME_DOMAIN_MIN_DELAY_MS
  });

  const circuitBreaker = new CircuitBreaker({ minSample: 10, threshold: 0.50 });

  const auditResults = [];
  const statusCounts = {
    HEALTHY: 0,
    DEAD: 0,
    CLOSED: 0,
    BLOCKED: 0,
    ACCESS_RESTRICTED: 0,
    TEMP_ERROR: 0,
    SUSPECT: 0,
    SOFT_DEAD: 0
  };

  let completedCount = 0;

  // 2. Process targets with domain queue
  const tasks = targets.map(async (opp) => {
    // Check manual override
    if (opp.reaper_protected) {
      return {
        opportunity_id: opp.id,
        title: opp.title,
        url: opp.source_url,
        status: 'HEALTHY',
        reason: 'reaper_protected_override',
        action: 'SKIPPED_PROTECTED'
      };
    }

    const domainInfo = parseDomainInfo(opp.source_url);
    await queue.acquire(domainInfo.registrableDomain);

    let httpResult;
    try {
      httpResult = await safeGet(opp.source_url);

      // Handle Retry-After on 429
      if (httpResult.statusCode === 429 && httpResult.headers?.retryAfter) {
        queue.setRetryAfter(domainInfo.registrableDomain, Math.min(httpResult.headers.retryAfter, 60));
      }

      // In-run confirmation for 404/410 (quick backoff retry to rule out glitch)
      if (httpResult.statusCode === 404 || httpResult.statusCode === 410) {
        await new Promise(r => setTimeout(r, 1500));
        const retryResult = await safeGet(opp.source_url);
        if (retryResult.success && retryResult.statusCode < 400) {
          httpResult = retryResult; // False alarm recovered!
        }
      }
    } finally {
      queue.release(domainInfo.registrableDomain);
    }

    const classification = classifyResponse({
      initialUrl: opp.source_url,
      httpResult,
      domainInfo
    });

    circuitBreaker.record(domainInfo.registrableDomain, classification.status, classification.statusCode);
    statusCounts[classification.status] = (statusCounts[classification.status] || 0) + 1;
    completedCount++;

    const isHighRisk = isHighRiskSource(domainInfo, opp.source_url, opp.normalized_company);

    const record = {
      opportunity_id: opp.id,
      title: opp.title,
      company: opp.normalized_company || 'Unknown',
      domain: domainInfo.registrableDomain,
      url: opp.source_url,
      final_url: httpResult.finalUrl || opp.source_url,
      status: classification.status,
      http_status: classification.statusCode,
      evidence_type: classification.evidenceType,
      evidence: classification.evidence,
      is_high_risk: isHighRisk,
      action: isAudit ? 'AUDIT_RECORDED' : 'PENDING_DECISION'
    };

    if (completedCount % 50 === 0 || completedCount === targets.length) {
      process.stdout.write(`Progress: ${completedCount}/${targets.length} checked (${statusCounts.HEALTHY} healthy, ${statusCounts.DEAD} dead, ${statusCounts.BLOCKED} blocked)...\r`);
    }

    return record;
  });

  const results = await Promise.all(tasks);
  const finishedAt = new Date();

  console.log(`\n\n================ AUDIT SUMMARY ================`);
  console.table(statusCounts);

  const domainStats = circuitBreaker.getAllStats();
  const degradedDomains = domainStats.filter(d => d.degraded);

  if (degradedDomains.length > 0) {
    console.log(`\n⚠️  DEGRADED DOMAINS DETECTED (Circuit Breaker Tripped):`);
    console.table(degradedDomains.map(d => ({
      domain: d.domain,
      checked: d.checked,
      blocked403: d.blocked403,
      serverError5xx: d.serverError5xx,
      healthStatus: d.healthStatus
    })));
  }

  // 3. Database Updates (AUDIT ONLY — Zero is_active mutations)
  if (isAudit) {
    console.log(`\nPersisting audit telemetry to Supabase (link_health_status, last_checked_at)...`);
    const updateBatchSize = 100;
    try {
      for (let i = 0; i < results.length; i += updateBatchSize) {
        const batch = results.slice(i, i + updateBatchSize);
        await Promise.all(batch.map(async (r) => {
          if (!r.opportunity_id) return;
          const isFailing = ['DEAD', 'CLOSED', 'SOFT_DEAD'].includes(r.status);

          const { error } = await supabase
            .from('opportunities')
            .update({
              link_health_status: r.status,
              last_checked_at: finishedAt.toISOString(),
              last_http_status: r.http_status,
              last_health_reason: `${r.evidence_type}: ${r.evidence}`,
              last_final_url: r.final_url,
              // Notice: consecutive_failures is NEVER touched in audit mode!
              audit_failure_count: isFailing ? (r.audit_failure_count || 0) + 1 : 0
            })
            .eq('id', r.opportunity_id);

          if (error && error.message.includes('does not exist')) {
            throw new Error(`Schema migration 10 needed: ${error.message}`);
          }
        }));
      }
      console.log(`Audit telemetry saved.`);
    } catch (err) {
      console.warn(`[Notice] Skipping DB column update (${err.message}). Apply migration 10 in Supabase to persist columns.`);
    }
  }

  // 4. Record Run Telemetry into reaper_runs table
  try {
    await supabase.from('reaper_runs').insert({
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      mode: isAudit ? 'AUDIT' : 'LIVE',
      total_checked: targets.length,
      healthy_count: statusCounts.HEALTHY,
      dead_count: statusCounts.DEAD,
      closed_count: statusCounts.CLOSED,
      blocked_count: statusCounts.BLOCKED,
      access_restricted_count: statusCounts.ACCESS_RESTRICTED,
      temp_error_count: statusCounts.TEMP_ERROR,
      suspect_count: statusCounts.SUSPECT,
      soft_dead_count: statusCounts.SOFT_DEAD,
      domains_degraded: degradedDomains.map(d => d.domain)
    });
  } catch (err) {
    console.warn(`Could not save reaper_runs record (migration may not be applied yet): ${err.message}`);
  }

  // 5. Generate Markdown Summary for GitHub Actions
  const summaryMarkdown = generateStepSummary({
    totalChecked: targets.length,
    statusCounts,
    degradedDomains,
    domainStats: domainStats.slice(0, 10),
    sampleDead: results.filter(r => r.status === 'DEAD' || r.status === 'CLOSED').slice(0, 15),
    isAudit
  });

  // Write to $GITHUB_STEP_SUMMARY if running in GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown);
  }

  // Save sanitized JSON report
  const reportPath = path.join(__dirname, '..', 'reaper-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    metadata: {
      startedAt,
      finishedAt,
      mode: isAudit ? 'AUDIT' : 'LIVE',
      totalChecked: targets.length,
      statusCounts
    },
    degradedDomains,
    domainStats,
    results
  }, null, 2));

  console.log(`\nSanitized audit report saved to: ${reportPath}`);
}

function generateStepSummary({ totalChecked, statusCounts, degradedDomains, domainStats, sampleDead, isAudit }) {
  let md = `## 🔍 OppHunt Link Health Reaper Summary (${isAudit ? 'Audit Mode' : 'Live Mode'})\n\n`;
  md += `**Total Verified:** ${totalChecked} listings (older than ${INGESTION_GRACE_HOURS}h)\n\n`;

  md += `| Health Status | Count | Impact |\n`;
  md += `|---|---|---|\n`;
  md += `| 🟢 **HEALTHY** | ${statusCounts.HEALTHY} | Verified alive with job content |\n`;
  md += `| 🔴 **DEAD** | ${statusCounts.DEAD} | Confirmed HTTP 404/410 |\n`;
  md += `| 🟡 **CLOSED** | ${statusCounts.CLOSED} | Verified ATS closed notice |\n`;
  md += `| 🛡️ **BLOCKED** | ${statusCounts.BLOCKED} | WAF / 403 (Zero DB mutation) |\n`;
  md += `| 🔒 **ACCESS_RESTRICTED** | ${statusCounts.ACCESS_RESTRICTED} | HTTP 401 / Auth required |\n`;
  md += `| ⏳ **TEMP_ERROR** | ${statusCounts.TEMP_ERROR} | 429 / 5xx / Timeout |\n`;
  md += `| ❓ **SUSPECT** | ${statusCounts.SUSPECT} | DNS or redirect to home |\n`;
  md += `| ⚠️ **SOFT_DEAD** | ${statusCounts.SOFT_DEAD} | 200 OK but "not found" page |\n\n`;

  if (degradedDomains.length > 0) {
    md += `### ⚠️ Degraded Domains (Circuit Breaker Tripped)\n`;
    md += `*The following domains have >50% WAF/blocking failures. Automated mutations are suppressed.* \n\n`;
    md += `| Domain | Checked | Blocked (403) | Server Errors (5xx) | Status |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const d of degradedDomains) {
      md += `| \`${d.domain}\` | ${d.checked} | ${d.blocked403} | ${d.serverError5xx} | **DEGRADED** |\n`;
    }
    md += `\n`;
  }

  if (sampleDead.length > 0) {
    md += `### 📋 Dead / Closed Sample (Audit Only - Not Deactivated)\n\n`;
    md += `| Opportunity | Domain | Status | Evidence |\n`;
    md += `|---|---|---|---|\n`;
    for (const r of sampleDead) {
      md += `| ${r.title.slice(0, 40)} | \`${r.domain}\` | \`${r.status}\` | ${r.evidence.slice(0, 50)} |\n`;
    }
    md += `\n`;
  }

  md += `> **Safety Notice:** Audit Mode is active. Database fields \`is_active\` and \`consecutive_failures\` were untouched.`;
  return md;
}

module.exports = { runReaper };
