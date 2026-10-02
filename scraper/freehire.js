require('dotenv').config();
const axios = require('axios');
const https = require('https');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

// Roles to strictly exclude (Seniority)
const EXCLUDE_ROLE_REGEX = /\b(senior|staff|principal|lead|director|vp|vice president|manager|head of|5\+|6\+|7\+|8\+|10\+ years)\b/i;

// Roles must contain at least one technical or early-career keyword
const TECH_KEYWORD_REGEX = /\b(developer|software|engineer|engineering|data|ai|ml|machine learning|artificial intelligence|cloud|backend|frontend|fullstack|web|devops|security|cyber|qa|sdet|testing|mobile|ios|android|systems|infrastructure|analytics|analyst|architect|network|programmer|coder|sde|trainee|fresher|graduate|tech|technology|research|embedded|firmware|iot|ui|ux|product designer|technical)\b/i;

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
  if (/\b(devops|docker|kubernetes|aws|azure|gcp|terraform|ci\/cd|pipeline|cloud)\b/.test(combined)) {
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
  if (/\b(data|analyst|analytics|bi|tableau|power bi|pandas|numpy)\b/.test(combined)) {
    tags.add('data');
  }

  if (tags.size === 0) tags.add('software-engineering');
  return Array.from(tags).slice(0, 4);
}

/**
 * Scrapes fresh Indian tech internships, junior roles, and MNC opportunities from FreeHire API
 * with deep multi-page pagination.
 */
async function scrapeFreehire() {
  console.log('[FreeHire Scraper] Querying FreeHire open REST API with expanded deep pagination...');

  const categories = [
    // 1. Tech Internships in India (Paginating up to 10 pages -> 1,000 listings)
    {
      name: 'Indian Internships',
      baseUrl: 'https://freehire.me/api/v1/jobs/search?countries=IN&employment_type=internship&limit=100',
      maxPages: 10
    },
    // 2. Junior / Fresher Roles in India (Paginating up to 12 pages -> 1,200 listings)
    {
      name: 'Indian Junior & Fresher Roles',
      baseUrl: 'https://freehire.me/api/v1/jobs/search?countries=IN&seniority=intern,junior&limit=100',
      maxPages: 12
    },
    // 3. Fortune 500 / Big Tech MNC hubs in India (Paginating up to 5 pages -> 500 listings)
    {
      name: 'MNC Hubs (BigTech, Fortune 500)',
      baseUrl: 'https://freehire.me/api/v1/jobs/search?countries=IN&collections=bigtech,fortune500,mag7&limit=100',
      maxPages: 5
    },
    // 4. Remote Junior / Intern Roles (Paginating up to 5 pages -> 500 listings)
    {
      name: 'Remote Junior & Intern Roles',
      baseUrl: 'https://freehire.me/api/v1/jobs/search?work_mode=remote&seniority=intern,junior&limit=100',
      maxPages: 5
    }
  ];

  const seenUrls = new Set();
  const opportunities = [];
  const now = new Date();
  const rollingDeadline = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const cat of categories) {
    console.log(`[FreeHire Scraper] Paginating ${cat.name} (up to ${cat.maxPages} pages)...`);

    for (let page = 0; page < cat.maxPages; page++) {
      const offset = page * 100;
      const url = `${cat.baseUrl}&offset=${offset}`;

      try {
        const response = await axios.get(url, {
          httpsAgent: ipv4Agent,
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpportunityHubIndia/1.0',
            'Accept': 'application/json'
          }
        });

        const jobs = response.data?.data || [];
        const totalAvailable = response.data?.meta?.total || 0;

        if (jobs.length === 0) break;

        let pageAccepted = 0;
        for (const job of jobs) {
          if (!job.title || !job.url || !job.company) continue;

          // Skip aggregator/telegram links — keep 100% direct company career portals
          if (job.source === 'telegram' || job.url.includes('t.me')) continue;

          const cleanUrl = canonicalizeUrl(job.url);
          if (!cleanUrl || seenUrls.has(cleanUrl)) continue;

          const title = job.title.trim();

          // Filter out senior roles
          if (EXCLUDE_ROLE_REGEX.test(title)) continue;

          // Ensure tech / early-career relevance
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
          pageAccepted++;

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

        console.log(`  -> Page ${page + 1} (${offset}-${offset + jobs.length}/${totalAvailable}): +${pageAccepted} accepted (Total: ${opportunities.length})`);

        if (offset + jobs.length >= totalAvailable) {
          console.log(`  -> Reached end of ${cat.name} (${totalAvailable} total jobs).`);
          break;
        }

        // Brief delay between page requests
        await new Promise(r => setTimeout(r, 250));
      } catch (err) {
        console.warn(`  -> Warning on ${cat.name} page ${page + 1}: ${err.message}`);
        break;
      }
    }
  }

  console.log(`[FreeHire Scraper] Completed extraction. Found ${opportunities.length} high-quality, verified opportunities.`);
  return opportunities;
}

// Standalone runner for testing and verification
if (require.main === module) {
  (async () => {
    try {
      console.log('=== RUNNING FREEHIRE EXPANDED INGESTION ===');
      const isDryRun = process.argv.includes('--dry-run');
      const results = await scrapeFreehire();
      console.log(`\nSuccessfully scraped ${results.length} eligible opportunities!`);

      if (!isDryRun && results.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const { upsertData } = require('./upserter');
        console.log(`\nUpserting ${results.length} records to Supabase...`);
        const upsertRes = await upsertData(results, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert complete! Summary:', upsertRes);
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
