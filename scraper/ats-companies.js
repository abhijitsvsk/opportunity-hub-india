require('dotenv').config();
const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');
const { createClient } = require('@supabase/supabase-js');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

// Strict word-boundary patterns for entry-level / student tech roles
const STUDENT_ROLE_REGEX = /\b(intern|internship|internships|new grad|new graduate|fresher|entry level|associate software engineer|associate engineer|sde[- ]?1|sde[- ]?i\b|graduate engineer trainee|\bget\b|mts[- ]?1|apprentice|trainee|early career|campus)\b/i;

// Roles to strictly exclude (Seniority)
const EXCLUDE_ROLE_REGEX = /\b(senior|staff|principal|lead|director|vp|vice president|manager|head of|5\+|6\+|7\+|8\+|10\+ years)\b/i;

// Non-tech roles to strictly exclude (even if they are internships)
const NON_TECH_ROLE_REGEX = /\b(creative|communications|recruiter|recruiting|talent|marketing|sales|accountant|accounting|finance|legal|pr|public relations|people team|content writer|copywriter|business development|operations specialist|brand)\b/i;

// Roles must contain at least one technical keyword in title or technical requirements
const TECH_KEYWORD_REGEX = /\b(developer|software|engineer|engineering|data|ai|ml|machine learning|artificial intelligence|cloud|backend|frontend|fullstack|web|devops|security|cyber|qa|testing|mobile|ios|android|systems|infrastructure|analytics|analyst|architect|network|programmer|coder|sde)\b/i;

/**
 * Strips tracking parameters and normalizes application URLs
 */
function canonicalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl.trim());
    const trackingParams = [
      'gh_jid', 'gh_src', 'lever-source', 'trid', 'ref', 'source',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'
    ];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Strips HTML tags, decodes entities, and truncates to maxLen
 * Handles both raw HTML and HTML entity-encoded content
 */
function cleanDescription(rawHtml, maxLen = 2000) {
  if (!rawHtml) return '';
  try {
    let text = rawHtml;
    const $ = cheerio.load(text);
    $('script, style, noscript').remove();
    text = $('body').text() || $.text();

    if (text.includes('<') && text.includes('>')) {
      const $2 = cheerio.load(text);
      text = $2('body').text() || $2.text();
    }

    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > maxLen) {
      return text.substring(0, maxLen - 3) + '...';
    }
    return text;
  } catch {
    const stripped = String(rawHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > maxLen ? stripped.substring(0, maxLen - 3) + '...' : stripped;
  }
}

/**
 * Derives relevant domain tags from job title and description
 */
function deriveDomainTags(title, desc = '') {
  const combined = `${title} ${desc}`.toLowerCase();
  const tags = new Set();

  if (/frontend|react|vue|angular|ui|next\.js/.test(combined)) tags.add('Frontend');
  if (/backend|node|express|django|flask|spring|golang|rust|api/.test(combined)) tags.add('Backend');
  if (/fullstack|full-stack/.test(combined)) tags.add('Fullstack');
  if (/machine learning|deep learning|ai|nlp|computer vision|llm|pytorch|tensorflow/.test(combined)) tags.add('AI/ML');
  if (/data science|data analyst|data engineer|analytics|sql|spark|pandas/.test(combined)) tags.add('Data Science');
  if (/cloud|aws|azure|gcp|devops|kubernetes|docker|terraform/.test(combined)) tags.add('Cloud & DevOps');
  if (/cybersecurity|security|infosec|vulnerability|penetration/.test(combined)) tags.add('Cybersecurity');
  if (/mobile|android|ios|flutter|react native|swift|kotlin/.test(combined)) tags.add('Mobile Development');

  if (tags.size === 0) tags.add('Software Engineering');
  return Array.from(tags);
}

/**
 * Two-stage Greenhouse fetch: Fast list query, then detail query only for pre-filtered candidates
 */
async function fetchGreenhouse(company) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`;
  const res = await axios.get(url, { httpsAgent: ipv4Agent, timeout: 8000 });
  const rawJobs = res.data?.jobs || [];

  const candidates = [];
  for (const job of rawJobs) {
    let loc = job.location?.name || '';
    if (Array.isArray(job.offices) && job.offices.length > 0) {
      const officeNames = job.offices.map(o => o.name || o.location).filter(Boolean);
      loc = [loc, ...officeNames].join('; ');
    }

    const title = (job.title || '').trim();
    if (!STUDENT_ROLE_REGEX.test(title)) continue;
    if (EXCLUDE_ROLE_REGEX.test(title)) continue;
    if (NON_TECH_ROLE_REGEX.test(title)) continue;

    let isGeo = false;
    const locLower = loc.toLowerCase();
    if (company.is_indian_entity && locLower.includes('remote') && !locLower.includes('us') && !locLower.includes('canada')) {
      isGeo = true;
    } else {
      isGeo = isRelevantForIndianStudent(loc, `${company.name} - ${title}`);
    }
    if (!isGeo) continue;

    candidates.push({ job, loc });
  }

  const results = [];
  for (const item of candidates) {
    let content = '';
    try {
      const detailUrl = `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs/${item.job.id}`;
      const dRes = await axios.get(detailUrl, { httpsAgent: ipv4Agent, timeout: 6000 });
      content = dRes.data?.content || '';
    } catch {}

    let jobUrl = item.job.absolute_url;
    if (!jobUrl || jobUrl.endsWith('/jobs') || jobUrl.includes('/search')) {
      jobUrl = `https://boards.greenhouse.io/${company.token}/jobs/${item.job.id}`;
    }

    results.push({
      title: item.job.title || '',
      location: item.loc,
      raw_html: content,
      url: canonicalizeUrl(jobUrl),
      posted_at: item.job.updated_at || null
    });
  }

  return results;
}

/**
 * Fetch jobs from Lever
 */
async function fetchLever(company) {
  const url = `https://api.lever.co/v0/postings/${company.token}?mode=json`;
  const res = await axios.get(url, { httpsAgent: ipv4Agent, timeout: 8000 });
  const rawJobs = Array.isArray(res.data) ? res.data : [];

  return rawJobs.map(job => {
    let loc = job.categories?.location || '';
    if (Array.isArray(job.categories?.allLocations)) {
      loc = [loc, ...job.categories.allLocations].join('; ');
    }

    return {
      title: job.text || '',
      location: loc,
      raw_html: job.descriptionPlain || job.description || '',
      url: canonicalizeUrl(job.hostedUrl || job.applyUrl),
      posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null
    };
  });
}

/**
 * Fetch jobs from Ashby
 */
async function fetchAshby(company) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${company.token}`;
  const res = await axios.get(url, { httpsAgent: ipv4Agent, timeout: 8000 });
  const rawJobs = res.data?.jobs || [];

  return rawJobs.map(job => {
    let loc = job.location || '';
    if (Array.isArray(job.secondaryLocations)) {
      const sec = job.secondaryLocations.map(l => l.location || l).filter(Boolean);
      loc = [loc, ...sec].join('; ');
    }

    return {
      title: job.title || '',
      location: loc,
      raw_html: job.descriptionHtml || job.descriptionPlain || '',
      url: canonicalizeUrl(job.jobUrl),
      posted_at: job.publishedAt || null
    };
  });
}

/**
 * Fetch jobs from SmartRecruiters with 100-limit pagination
 */
async function fetchSmartRecruiters(company) {
  const url = `https://api.smartrecruiters.com/v1/companies/${company.token}/postings?limit=100`;
  const res = await axios.get(url, { httpsAgent: ipv4Agent, timeout: 8000 });
  const rawJobs = res.data?.content || [];

  return rawJobs.map(job => {
    const locParts = [
      job.location?.city,
      job.location?.region,
      job.location?.country
    ].filter(Boolean);

    return {
      title: job.name || '',
      location: locParts.join(', '),
      raw_html: '',
      url: canonicalizeUrl(job.ref),
      posted_at: job.releasedDate || null
    };
  });
}

/**
 * Deactivates stale closed jobs for companies that were scraped
 */
async function reconcileStaleAtsOpportunities(currentOpportunities) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false }
    });

    const activeScrapedUrls = new Set(currentOpportunities.map(o => o.source_url));
    const companiesInThisRun = [...new Set(currentOpportunities.map(o => o.company))];

    for (const compName of companiesInThisRun) {
      const { data: dbRecords } = await supabase
        .from('opportunities')
        .select('id, source_url')
        .eq('is_active', true)
        .eq('source', 'ats-company')
        .ilike('title', `${compName} - %`);

      if (dbRecords && dbRecords.length > 0) {
        const toDeactivate = dbRecords.filter(r => !activeScrapedUrls.has(r.source_url)).map(r => r.id);
        if (toDeactivate.length > 0) {
          console.log(`[ATS Reconciliation] Deactivating ${toDeactivate.length} closed jobs for ${compName}...`);
          await supabase
            .from('opportunities')
            .update({ is_active: false })
            .in('id', toDeactivate);
        }
      }
    }
  } catch (err) {
    console.warn(`[ATS Reconciliation] Non-fatal error during reconciliation: ${err.message}`);
  }
}

/**
 * Core scraping engine for ATS company career pages
 */
async function scrapeAtsCompanies() {
  console.log('[ATS Scraper] Initializing direct ATS company career pipeline...');
  const companiesPath = path.join(__dirname, 'data', 'companies.json');
  
  if (!fs.existsSync(companiesPath)) {
    console.warn(`[ATS Scraper] companies.json not found at ${companiesPath}. Returning empty list.`);
    return [];
  }

  const rawConfig = fs.readFileSync(companiesPath, 'utf-8');
  let companies = [];
  try {
    companies = JSON.parse(rawConfig);
  } catch (err) {
    console.error(`[ATS Scraper] Failed to parse companies.json: ${err.message}`);
    return [];
  }

  const activeCompanies = companies.filter(c => c.active !== false);
  console.log(`[ATS Scraper] Loaded ${activeCompanies.length} active company configurations.`);

  const opportunities = [];

  for (let idx = 0; idx < activeCompanies.length; idx++) {
    const company = activeCompanies[idx];
    console.log(`[ATS Scraper] [${idx + 1}/${activeCompanies.length}] Querying ${company.name} (${company.ats})...`);

    let rawJobs = [];
    try {
      if (company.ats === 'greenhouse') {
        rawJobs = await fetchGreenhouse(company);
      } else if (company.ats === 'lever') {
        rawJobs = await fetchLever(company);
      } else if (company.ats === 'ashby') {
        rawJobs = await fetchAshby(company);
      } else if (company.ats === 'smartrecruiters') {
        rawJobs = await fetchSmartRecruiters(company);
      } else {
        console.warn(`  -> Unsupported ATS: ${company.ats}`);
        continue;
      }
    } catch (apiErr) {
      console.warn(`  -> Warning: Failed to query ${company.name}: ${apiErr.message}`);
      continue;
    }

    let companyMatchCount = 0;

    for (const job of rawJobs) {
      if (!job.title || !job.url) continue;

      const title = job.title.trim();

      // 1. Role Filter
      if (!STUDENT_ROLE_REGEX.test(title)) continue;

      // 2. Exclusion Filter (Seniority)
      if (EXCLUDE_ROLE_REGEX.test(title)) continue;

      // 3. Exclusion Filter (Non-Tech)
      if (NON_TECH_ROLE_REGEX.test(title)) continue;

      // 4. Tech Relevance
      const cleanedDesc = cleanDescription(job.raw_html);
      if (!TECH_KEYWORD_REGEX.test(title) && !TECH_KEYWORD_REGEX.test(cleanedDesc)) continue;

      // 5. Geographic Relevance Filter
      let isGeoEligible = false;
      const locLower = (job.location || '').toLowerCase();
      if (company.is_indian_entity && locLower.includes('remote') && !locLower.includes('us') && !locLower.includes('canada')) {
        isGeoEligible = true;
      } else {
        isGeoEligible = isRelevantForIndianStudent(job.location, `${company.name} - ${title} ${cleanedDesc}`);
      }

      if (!isGeoEligible) continue;

      const isIntern = /\bintern(ship)?s?\b/i.test(title);
      const domainTags = deriveDomainTags(title, cleanedDesc);

      // Synthetic 30-day rolling deadline so SQL ranking does not starve it on Page 1
      const rollingDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      opportunities.push({
        id: uuidv4(),
        title: `${company.name} - ${title}`,
        company: company.name,
        type: isIntern ? 'internship' : 'full-time',
        location: job.location || (company.is_indian_entity ? 'India (Remote)' : 'Remote'),
        description: cleanedDesc || `${title} at ${company.name}. Apply directly through official career portal.`,
        source_url: job.url,
        deadline: rollingDeadline,
        source_of_deadline: 'Rolling',
        domain_tags: domainTags,
        effort_level: 'medium',
        competitiveness: 'high',
        eligibility: isIntern ? { year: [2, 3, 4] } : { segments: ['4th year', 'postgraduate'] },
        deadline_confidence: 'unknown',
        is_active: true,
        source: 'ats-company'
      });

      companyMatchCount++;
    }

    console.log(`  -> Matched ${companyMatchCount} eligible opportunities from ${rawJobs.length} processed postings.`);

    // Polite spacing between companies
    if (idx < activeCompanies.length - 1) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  console.log(`[ATS Scraper] Completed ATS extraction. Found ${opportunities.length} total verified opportunities.`);

  // Auto-deactivate stale jobs that disappeared from ATS
  await reconcileStaleAtsOpportunities(opportunities);

  return opportunities;
}

// Standalone runner for testing and verification
if (require.main === module) {
  (async () => {
    try {
      console.log('=== RUNNING ATS COMPANIES STANDALONE TEST ===');
      const isDryRun = process.argv.includes('--dry-run');
      const results = await scrapeAtsCompanies();
      console.log(`\nSuccessfully scraped ${results.length} eligible opportunities:`);
      
      if (results.length > 0) {
        console.log('\n--- SAMPLE LISTINGS ---');
        console.dir(results.slice(0, 5), { depth: null });
      }

      if (!isDryRun && results.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const { upsertData } = require('./upserter');
        console.log(`\nUpserting ${results.length} records to Supabase...`);
        const upsertRes = await upsertData(results, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert result:', upsertRes);
      } else if (isDryRun) {
        console.log('\n[Dry Run] Skipped database write.');
      }
    } catch (err) {
      console.error('Fatal error in standalone test:', err);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeAtsCompanies, canonicalizeUrl, cleanDescription, deriveDomainTags };
