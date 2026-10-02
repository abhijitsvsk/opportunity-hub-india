require('dotenv').config();
const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

// Roles to strictly exclude (Seniority)
const EXCLUDE_ROLE_REGEX = /\b(senior|staff|principal|lead|director|vp|vice president|manager|head of|5\+|6\+|7\+|8\+|10\+ years)\b/i;

// Roles must contain at least one technical keyword
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
 * Strips HTML tags and decodes entities
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

    return text.replace(/\s+/g, ' ').trim().slice(0, maxLen);
  } catch {
    return String(rawHtml).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
  }
}

/**
 * Derives standardized domain tags based on title, description, and skills
 */
function deriveDomainTags(title, desc = '', skills = []) {
  const combined = `${title} ${desc} ${skills.join(' ')}`.toLowerCase();
  const tags = new Set();

  if (/\b(ai|ml|machine learning|artificial intelligence|nlp|deep learning|llm|computer vision)\b/.test(combined)) {
    tags.add('ai');
  }
  if (/\b(backend|node|express|django|flask|spring|golang|rust|api|microservice|sql|postgres|database)\b/.test(combined)) {
    tags.add('backend');
  }
  if (/\b(frontend|react|angular|vue|nextjs|tailwind|ui|ux|css|html|javascript|typescript)\b/.test(combined)) {
    tags.add('frontend');
  }
  if (/\b(fullstack|full-stack|full stack)\b/.test(combined)) {
    tags.add('fullstack');
  }
  if (/\b(data|analyst|analytics|data science|etl|bi|tableau|power bi|pandas|numpy)\b/.test(combined)) {
    tags.add('data');
  }
  if (/\b(devops|cloud|aws|azure|gcp|docker|kubernetes|ci\/cd|terraform|infra)\b/.test(combined)) {
    tags.add('devops');
  }
  if (/\b(security|cyber|infosec|penetration|soc)\b/.test(combined)) {
    tags.add('security');
  }
  if (/\b(mobile|ios|android|flutter|react native|swift|kotlin)\b/.test(combined)) {
    tags.add('mobile');
  }
  if (/\b(qa|sdet|quality assurance|testing|test automation|selenium|cypress|playwright)\b/.test(combined)) {
    tags.add('qa');
  }

  if (tags.size === 0) tags.add('software-engineering');
  return Array.from(tags).slice(0, 4);
}

/**
 * Scrapes fresh Indian tech internships, junior roles, and MNC opportunities from FreeHire API
 */
async function scrapeFreehire() {
  console.log('[FreeHire Scraper] Querying FreeHire open REST API for Indian opportunities...');

  const endpoints = [
    // 1. Tech Internships in India (Page 1 & 2)
    { name: 'Internships (Page 1)', url: 'https://freehire.me/api/v1/jobs/search?countries=IN&employment_type=internship&is_tech=tech&limit=100&offset=0' },
    { name: 'Internships (Page 2)', url: 'https://freehire.me/api/v1/jobs/search?countries=IN&employment_type=internship&is_tech=tech&limit=100&offset=100' },
    // 2. Tech Fresher / Junior roles in India (Page 1 & 2)
    { name: 'Junior Roles (Page 1)', url: 'https://freehire.me/api/v1/jobs/search?countries=IN&seniority=intern,junior&is_tech=tech&limit=100&offset=0' },
    { name: 'Junior Roles (Page 2)', url: 'https://freehire.me/api/v1/jobs/search?countries=IN&seniority=intern,junior&is_tech=tech&limit=100&offset=100' },
    // 3. Fortune 500 / Big Tech MNC hubs in India
    { name: 'MNC Hubs', url: 'https://freehire.me/api/v1/jobs/search?countries=IN&collections=bigtech,fortune500,mag7&limit=100' }
  ];

  const seenUrls = new Set();
  const opportunities = [];
  const now = new Date();
  const rollingDeadline = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const ep of endpoints) {
    try {
      console.log(`[FreeHire Scraper] Fetching ${ep.name}...`);
      const response = await axios.get(ep.url, {
        httpsAgent: ipv4Agent,
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpportunityHubIndia/1.0',
          'Accept': 'application/json'
        }
      });

      const jobs = response.data?.data || [];
      console.log(`  -> Retrieved ${jobs.length} raw jobs from ${ep.name}.`);

      for (const job of jobs) {
        if (!job.title || !job.url || !job.company) continue;

        // Skip aggregator/telegram channel links — keep 100% direct company career portals
        if (job.source === 'telegram' || job.url.includes('t.me')) continue;

        const cleanUrl = canonicalizeUrl(job.url);
        if (!cleanUrl || seenUrls.has(cleanUrl)) continue;

        const title = job.title.trim();

        // Filter out senior roles
        if (EXCLUDE_ROLE_REGEX.test(title)) continue;

        // Ensure tech relevance
        const skills = Array.isArray(job.skills) ? job.skills : [];
        if (!TECH_KEYWORD_REGEX.test(title) && skills.length === 0 && job.is_tech !== 'tech') {
          continue;
        }

        // Location verification
        const rawLocation = job.location || (job.cities && job.cities.length > 0 ? job.cities.join(', ') : 'India');
        const descText = cleanDescription(job.description);

        if (!isRelevantForIndianStudent(String(rawLocation || ''), descText)) {
          continue;
        }

        seenUrls.add(cleanUrl);

        const isIntern = (
          job.enrichment?.employment_type === 'internship' ||
          job.enrichment?.seniority === 'intern' ||
          /\b(intern|internship|trainee|apprentice)\b/i.test(title)
        );

        let workMode = 'in-office';
        if (job.work_mode === 'remote') workMode = 'remote';
        else if (job.work_mode === 'hybrid') workMode = 'hybrid';

        const domainTags = deriveDomainTags(title, descText, skills);

        opportunities.push({
          id: uuidv4(),
          title: `${job.company} - ${title}`,
          company: job.company,
          type: isIntern ? 'internship' : 'full-time',
          location: rawLocation,
          mode: workMode,
          description: descText || `${title} at ${job.company}. Direct application via official career portal.`,
          source_url: cleanUrl,
          deadline: rollingDeadline,
          source_of_deadline: 'Rolling',
          domain_tags: domainTags,
          effort_level: 'medium',
          competitiveness: 'high',
          eligibility: isIntern ? { year: [2, 3, 4] } : { segments: ['4th year', 'postgraduate'] },
          deadline_confidence: 'unknown',
          is_active: true,
          source: 'freehire'
        });
      }
    } catch (err) {
      console.warn(`[FreeHire Scraper] Warning: Failed to fetch ${ep.name}: ${err.message}`);
    }
  }

  console.log(`[FreeHire Scraper] Completed extraction. Found ${opportunities.length} high-quality, verified opportunities.`);
  return opportunities;
}

// Standalone runner for testing and verification
if (require.main === module) {
  (async () => {
    try {
      console.log('=== RUNNING FREEHIRE STANDALONE TEST ===');
      const isDryRun = process.argv.includes('--dry-run');
      const results = await scrapeFreehire();
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

module.exports = { scrapeFreehire };
