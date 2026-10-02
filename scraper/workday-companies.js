require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const STUDENT_ROLE_REGEX = /\b(intern|internship|internships|new grad|new graduate|fresher|entry level|associate|graduate|trainee|apprentice|campus|early career)\b/i;
const EXCLUDE_ROLE_REGEX = /\b(senior|staff|principal|lead|director|vp|vice president|manager|head of|5\+|6\+|7\+|8\+|10\+ years)\b/i;
const TECH_KEYWORD_REGEX = /\b(developer|software|engineer|engineering|data|ai|ml|machine learning|cloud|backend|frontend|fullstack|devops|security|qa|testing|mobile|systems|infrastructure|analytics|analyst|architect|network|programmer|coder|sde)\b/i;

const WORKDAY_TENANTS = [
  {
    name: 'Nvidia',
    endpoint: 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs',
    baseUrl: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite'
  },
  {
    name: 'Adobe',
    endpoint: 'https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs',
    baseUrl: 'https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced'
  },
  {
    name: 'Salesforce',
    endpoint: 'https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/jobs',
    baseUrl: 'https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site'
  },
  {
    name: 'Target',
    endpoint: 'https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers/jobs',
    baseUrl: 'https://target.wd5.myworkdayjobs.com/en-US/targetcareers'
  }
];

function deriveDomainTags(title = '') {
  const t = title.toLowerCase();
  const tags = new Set();
  if (/\b(ai|ml|machine learning|artificial intelligence|deep learning)\b/.test(t)) tags.add('ai');
  if (/\b(backend|api|systems|c\+\+|golang|java|python)\b/.test(t)) tags.add('backend');
  if (/\b(frontend|react|ui|web|javascript)\b/.test(t)) tags.add('frontend');
  if (/\b(data|analyst|analytics|bi)\b/.test(t)) tags.add('data');
  if (/\b(cloud|devops|infra|infrastructure)\b/.test(t)) tags.add('devops');
  if (/\b(qa|testing|automation)\b/.test(t)) tags.add('qa');
  if (tags.size === 0) tags.add('software-engineering');
  return Array.from(tags);
}

/**
 * Scrapes student & early career tech roles directly from Workday enterprise endpoints
 */
async function scrapeWorkdayCompanies() {
  console.log('[Workday Scraper] Querying Workday enterprise career portals...');
  const opportunities = [];
  const seenUrls = new Set();
  const now = new Date();
  const rollingDeadline = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const tenant of WORKDAY_TENANTS) {
    try {
      console.log(`[Workday Scraper] Querying ${tenant.name}...`);
      const searchQueries = ['India intern', 'India campus', 'India graduate'];

      for (const query of searchQueries) {
        const response = await axios.post(
          tenant.endpoint,
          {
            appliedFacets: {},
            limit: 20,
            offset: 0,
            searchText: query
          },
          {
            httpsAgent: ipv4Agent,
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OpportunityHubIndia/1.0'
            }
          }
        );

        const postings = response.data?.jobPostings || [];
        for (const job of postings) {
          if (!job.title || !job.externalPath) continue;

          const title = job.title.trim();
          if (!STUDENT_ROLE_REGEX.test(title)) continue;
          if (EXCLUDE_ROLE_REGEX.test(title)) continue;
          if (!TECH_KEYWORD_REGEX.test(title)) continue;

          const location = job.locationsText || 'India';
          if (!isRelevantForIndianStudent(location, `${tenant.name} - ${title}`)) {
            continue;
          }

          const jobUrl = `${tenant.baseUrl}${job.externalPath}`;
          if (seenUrls.has(jobUrl)) continue;
          seenUrls.add(jobUrl);

          const isIntern = /\b(intern|internship|trainee|apprentice)\b/i.test(title);

          opportunities.push({
            id: uuidv4(),
            title: `${tenant.name} - ${title}`,
            company: tenant.name,
            type: isIntern ? 'internship' : 'full-time',
            location: location,
            mode: 'in-office',
            description: `${title} at ${tenant.name}. Direct application via official Workday career portal. Location: ${location}.`,
            source_url: jobUrl,
            deadline: rollingDeadline,
            source_of_deadline: 'Rolling',
            domain_tags: deriveDomainTags(title),
            effort_level: 'medium',
            competitiveness: 'high',
            eligibility: isIntern ? { year: [2, 3, 4] } : { segments: ['4th year', 'postgraduate'] },
            deadline_confidence: 'unknown',
            is_active: true,
            source: 'workday'
          });
        }
      }
    } catch (err) {
      console.warn(`[Workday Scraper] Warning: Failed to query ${tenant.name}: ${err.message}`);
    }
  }

  console.log(`[Workday Scraper] Completed extraction. Found ${opportunities.length} high-quality verified opportunities.`);
  return opportunities;
}

// Standalone runner for testing and verification
if (require.main === module) {
  (async () => {
    try {
      console.log('=== RUNNING WORKDAY STANDALONE TEST ===');
      const isDryRun = process.argv.includes('--dry-run');
      const results = await scrapeWorkdayCompanies();
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

module.exports = { scrapeWorkdayCompanies };
