require('dotenv').config({ path: './.env' });
const axios = require('axios');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true, rejectUnauthorized: false });

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache'
};

// Substrings that indicate a job has closed even if HTTP 200 is returned
const CLOSED_BODY_PATTERNS = [
  /job (?:is |has been )?(?:no longer available|closed|expired|filled)/i,
  /position (?:is |has been )?(?:no longer available|filled|closed)/i,
  /this posting is (?:closed|no longer accepting applications)/i,
  /no longer accepting (?:applications|submissions)/i,
  /this job has been unlisted/i,
  /registrations? (?:have )?closed/i,
  /application (?:deadline|period) has passed/i,
  /this role is no longer open/i
];

/**
 * Checks a single URL for availability.
 * Returns: { isDead: boolean, reason?: string, statusCode?: number }
 */
async function checkUrlHealth(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { isDead: true, reason: 'invalid_url' };
  }

  // Skip Discord channel links - they require Discord auth and cannot be health-checked via HTTP
  if (url.includes('discord.com/channels')) {
    return { isDead: false, reason: 'skipped_discord_auth' };
  }

  try {
    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      httpsAgent: ipv4Agent,
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Don't throw on 404/410/302
    });

    const statusCode = res.status;

    // Tier 1: Explicit 404 / 410 HTTP status
    if (statusCode === 404 || statusCode === 410) {
      return { isDead: true, reason: `http_${statusCode}`, statusCode };
    }

    // Check if redirected to root or generic job board page
    if (res.request && res.request.res && res.request.res.responseUrl) {
      const finalUrl = res.request.res.responseUrl;
      const initialPath = new URL(url).pathname.replace(/\/$/, '');
      const finalPath = new URL(finalUrl).pathname.replace(/\/$/, '');

      // If initial URL had a specific job slug, but redirected to root/search
      if (initialPath.length > 5 && (finalPath === '' || finalPath === '/jobs' || finalPath === '/careers' || finalPath === '/search')) {
        return { isDead: true, reason: 'redirected_to_career_root', statusCode };
      }
    }

    // Tier 2: ATS Content Sniffing (for 200 OK responses)
    if (statusCode >= 200 && statusCode < 300) {
      const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || '');

      // Check suspiciously empty body
      if (body.length < 350) {
        return { isDead: true, reason: 'empty_response_body', statusCode };
      }

      // Check closed patterns
      for (const pattern of CLOSED_BODY_PATTERNS) {
        if (pattern.test(body)) {
          return { isDead: true, reason: `pattern_match: ${pattern.source}`, statusCode };
        }
      }
    }

    return { isDead: false, statusCode };

  } catch (err) {
    // Check specific connection errors that imply dead domain
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return { isDead: true, reason: `dns_${err.code}` };
    }
    if (err.response?.status === 404 || err.response?.status === 410) {
      return { isDead: true, reason: `http_${err.response.status}`, statusCode: err.response.status };
    }
    // Timeout or transient network errors are NOT assumed dead to prevent false positives
    return { isDead: false, reason: `transient_${err.code || err.message}` };
  }
}

/**
 * Runs dead-link check across active opportunities
 */
async function runDeadLinkReaper(options = {}) {
  const { dryRun = true, limit = 100 } = options;

  console.log(`=== RUNNING SMART DEAD-LINK REAPER (${dryRun ? 'DRY RUN' : 'LIVE ARCHIVE'}) ===`);
  console.log(`Target: Checking up to ${limit} active opportunities...`);

  let opportunities = [];
  let from = 0;
  const pageSize = 500;

  while (opportunities.length < limit) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, source_url, normalized_company, created_at')
      .eq('is_active', true)
      .range(from, from + pageSize - 1)
      .order('created_at', { ascending: true }); // Check oldest first

    if (error) {
      console.error('Failed to query opportunities:', error.message);
      return;
    }
    if (!data || data.length === 0) break;
    opportunities.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const targets = opportunities.slice(0, limit);
  console.log(`Fetched ${targets.length} opportunities for health check.\n`);

  const concurrency = 15;
  const deadRecords = [];
  let processed = 0;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const checks = await Promise.all(
      batch.map(async (opp) => {
        const result = await checkUrlHealth(opp.source_url);
        return { opp, result };
      })
    );

    for (const { opp, result } of checks) {
      processed++;
      if (result.isDead) {
        deadRecords.push({ opp, reason: result.reason, statusCode: result.statusCode });
        console.log(`[DEAD] (${result.reason}) -> ${opp.title} (${opp.source_url.slice(0, 70)}...)`);
      }
    }

    process.stdout.write(`Checked ${processed}/${targets.length} links (Dead found: ${deadRecords.length})...\r`);
  }

  console.log(`\n\nHealth Check Summary:`);
  console.log(`- Total URLs Verified: ${targets.length}`);
  console.log(`- Healthy URLs: ${targets.length - deadRecords.length}`);
  console.log(`- Dead / Closed URLs: ${deadRecords.length}`);

  if (deadRecords.length > 0) {
    console.log('\n--- SAMPLE DEAD LISTINGS IDENTIFIED ---');
    console.table(deadRecords.slice(0, 10).map(d => ({
      title: d.opp.title,
      reason: d.reason,
      url: d.opp.source_url.slice(0, 50) + '...'
    })));

    if (!dryRun) {
      const deadIds = deadRecords.map(d => d.opp.id);
      console.log(`\nArchiving ${deadIds.length} dead opportunities (setting is_active = false)...`);

      const chunkSize = 100;
      for (let j = 0; j < deadIds.length; j += chunkSize) {
        const chunk = deadIds.slice(j, j + chunkSize);
        const { error: updateError } = await supabase
          .from('opportunities')
          .update({ is_active: false })
          .in('id', chunk);

        if (updateError) {
          console.error(`Failed to archive dead opportunities chunk: ${updateError.message}`);
        }
      }
      console.log('Dead-link archival complete!');
    } else {
      console.log('\n[Dry Run] Skipped database archival.');
    }
  }

  return { totalChecked: targets.length, deadCount: deadRecords.length, deadRecords };
}

if (require.main === module) {
  const isLive = process.argv.includes('--live');
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

  runDeadLinkReaper({ dryRun: !isLive, limit });
}

module.exports = { checkUrlHealth, runDeadLinkReaper };
