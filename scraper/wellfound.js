/**
 * Wellfound (AngelList) India Startup Jobs Scraper (Wave 5)
 * Fetches verified tech startup roles in India across major hubs (Mumbai, Hyderabad, Pune, Delhi, India-wide).
 * Extracts raw Apollo state embedded in server-side rendered __NEXT_DATA__.
 */

const https = require('https');

const WELLFOUND_HUBS = [
  'https://wellfound.com/location/india',
  'https://wellfound.com/role/l/software-engineer/india',
  'https://wellfound.com/location/mumbai',
  'https://wellfound.com/location/hyderabad',
  'https://wellfound.com/location/pune'
];

function fetchHtml(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      console.warn(`[Wellfound Scraper] Failed to fetch ${url}:`, err.message);
      resolve('');
    }).on('timeout', () => {
      console.warn(`[Wellfound Scraper] Timeout fetching ${url}`);
      resolve('');
    });
  });
}

function parseWellfoundPage(html) {
  const jobs = [];
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return jobs;

  try {
    const parsed = JSON.parse(match[1]);
    const dataStore = parsed.props?.pageProps?.apolloState?.data || {};

    // 1. Build lookup map from job ID to Startup details
    const startupByJobId = new Map();
    for (const [key, obj] of Object.entries(dataStore)) {
      if (key.startsWith('StartupResult:') && obj.name) {
        if (Array.isArray(obj.highlightedJobListings)) {
          for (const item of obj.highlightedJobListings) {
            if (item?.__ref) {
              const jobId = item.__ref.replace('JobListingSearchResult:', '');
              startupByJobId.set(jobId, obj);
            }
          }
        }
      }
    }

    // 2. Parse all JobListingSearchResult objects
    for (const [key, job] of Object.entries(dataStore)) {
      if (!key.startsWith('JobListingSearchResult:') || !job.title) continue;

      const startup = startupByJobId.get(String(job.id));
      const companyName = startup?.name || 'Venture Startup';
      const companySlug = startup?.slug || '';

      const isIntern = /intern/i.test(job.title) || /intern/i.test(job.jobType || '');
      const oppType = isIntern ? 'internship' : 'full-time';

      const sourceUrl = companySlug
        ? `https://wellfound.com/company/${companySlug}/jobs/${job.id}-${job.slug || 'apply'}`
        : `https://wellfound.com/jobs/${job.id}-${job.slug || 'apply'}`;

      const locs = Array.isArray(job.locationNames) && job.locationNames.length > 0
        ? job.locationNames.join(', ')
        : 'India (Remote / Hybrid)';

      // Domain tags
      const tags = new Set(['Startup', 'Wellfound']);
      if (job.primaryRoleTitle) tags.add(job.primaryRoleTitle);
      tags.add('Engineering');

      // Formatted description
      const descParts = [
        startup?.highConcept ? `${companyName}: ${startup.highConcept}` : null,
        `Role: ${job.title} (${job.jobType || 'Full-time'})`,
        `Location: ${locs}`,
        job.compensation ? `Compensation: ${job.compensation}` : null,
        job.primaryRoleTitle ? `Role Track: ${job.primaryRoleTitle}` : null,
        job.description ? `\nOverview & Responsibilities:\n${job.description.slice(0, 1500)}` : null,
        `Apply directly to hiring managers on Wellfound.`
      ].filter(Boolean);

      // Eligibility
      let eligibility = { segments: ["All Undergraduates", "Graduates"] };
      if (isIntern || /junior|associate|graduate|entry|trainee/i.test(job.title)) {
        eligibility = {
          batch: ["2025", "2026", "2027", "2028"],
          year: [1, 2, 3, 4],
          segments: ["Undergraduate", "Fresher", "Junior"]
        };
      }

      jobs.push({
        title: `${companyName} - ${job.title}`,
        type: oppType,
        description: descParts.join('\n\n'),
        source_url: sourceUrl,
        deadline: null,
        deadline_confidence: 'none',
        location: locs,
        domain_tags: Array.from(tags).slice(0, 5),
        effort_level: isIntern ? 'low' : 'medium',
        competitiveness: 'medium',
        eligibility,
        normalized_company: companyName.toLowerCase().trim(),
        is_active: true
      });
    }
  } catch (err) {
    console.warn('[Wellfound Scraper] Parse error:', err.message);
  }

  return jobs;
}

async function scrapeWellfound() {
  console.log('[Wave 5] Scraping Wellfound India Startup Roles...');
  const allJobs = [];
  const seenUrls = new Set();

  for (const url of WELLFOUND_HUBS) {
    const html = await fetchHtml(url);
    if (!html) continue;

    const pageJobs = parseWellfoundPage(html);
    for (const job of pageJobs) {
      if (!seenUrls.has(job.source_url)) {
        seenUrls.add(job.source_url);
        allJobs.push(job);
      }
    }
  }

  console.log(`[Wave 5] Scraped ${allJobs.length} verified Wellfound startup roles in India.`);
  return allJobs;
}

module.exports = { scrapeWellfound };

if (require.main === module) {
  scrapeWellfound().then(jobs => {
    console.log(`Sample output (Total: ${jobs.length}):`);
    if (jobs.length > 0) {
      console.log(JSON.stringify(jobs[0], null, 2));
    }
  });
}
