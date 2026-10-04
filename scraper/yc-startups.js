/**
 * Y Combinator Startup Jobs Scraper (Wave 5)
 * Fetches high-signal startup opportunities directly from Y Combinator's
 * official career portals (ycombinator.com/jobs and workatastartup.com).
 * Targets: India location, Global Remote, and Software Engineering Internships.
 */

const https = require('https');

const YC_URLS = [
  'https://www.ycombinator.com/jobs/location/india',
  'https://www.ycombinator.com/jobs/role/internship',
  'https://www.ycombinator.com/jobs/location/remote',
  'https://www.ycombinator.com/jobs/role/software-engineer'
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
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : `https://www.ycombinator.com${res.headers.location}`;
        return fetchHtml(redirectUrl).then(resolve);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      console.warn(`[YC Scraper] Failed to fetch ${url}:`, err.message);
      resolve('');
    }).on('timeout', () => {
      console.warn(`[YC Scraper] Timeout fetching ${url}`);
      resolve('');
    });
  });
}

function parseYcPage(html) {
  const jobs = [];
  const match = html.match(/data-page="([^"]+)"/);
  if (!match) return jobs;

  try {
    const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const pageData = JSON.parse(decoded);
    const postings = pageData.props?.jobPostings || [];

    for (const p of postings) {
      if (!p.title || !p.companyName) continue;

      const isIntern = /intern/i.test(p.title) || /intern/i.test(p.type || '');
      const oppType = isIntern ? 'internship' : 'full-time';

      // Build source URL (hosted on ycombinator.com)
      const sourceUrl = p.url 
        ? (p.url.startsWith('http') ? p.url : `https://www.ycombinator.com${p.url}`)
        : (p.applyUrl ? p.applyUrl.replace(/&amp;/g, '&') : `https://www.ycombinator.com/companies/${p.companyUrl || ''}`);

      // Domain tags
      const tags = new Set(['Startup', 'Y Combinator', 'YC', 'ycombinator', 'Work at a Startup']);
      if (p.roleSpecificType) tags.add(p.roleSpecificType);
      if (p.prettyRole) tags.add(p.prettyRole);
      if (Array.isArray(p.skills)) {
        p.skills.forEach(s => tags.add(s));
      }

      // Eligibility
      let eligibility = { segments: ["All Undergraduates", "Graduates"] };
      const exp = (p.minExperience || '').toLowerCase();
      if (exp.includes('new grad') || exp.includes('any') || isIntern) {
        eligibility = {
          batch: ["2025", "2026", "2027", "2028"],
          year: [1, 2, 3, 4],
          segments: ["Undergraduate", "Fresher", "New Grad"]
        };
      }

      // Formatted description
      const descParts = [
        `${p.companyName} (${p.companyBatchName ? `YC ${p.companyBatchName}` : 'YC Backed'}): ${p.companyOneLiner || 'High-growth technology startup.'}`,
        `Role: ${p.title} (${p.type || 'Full-time'})`,
        p.location ? `Location: ${p.location}` : null,
        p.salaryRange ? `Compensation: ${p.salaryRange}` : null,
        p.equityRange ? `Equity: ${p.equityRange}` : null,
        p.minExperience ? `Experience: ${p.minExperience}` : null,
        p.skills && p.skills.length > 0 ? `Tech Stack: ${p.skills.join(', ')}` : null,
        `Apply directly to the founders on Y Combinator Work at a Startup.`
      ].filter(Boolean);

      jobs.push({
        title: `${p.companyName} - ${p.title}`,
        type: oppType,
        description: descParts.join('\n\n'),
        source_url: sourceUrl,
        deadline: null,
        deadline_confidence: 'none',
        location: p.location || 'Remote / India',
        domain_tags: Array.from(tags).slice(0, 6),
        effort_level: isIntern ? 'low' : 'medium',
        competitiveness: 'high',
        eligibility,
        normalized_company: p.companyName.toLowerCase().trim(),
        is_active: true
      });
    }
  } catch (err) {
    console.warn('[YC Scraper] JSON parse error:', err.message);
  }

  return jobs;
}

async function scrapeYcStartups() {
  console.log('[Wave 5] Scraping Y Combinator Startup Jobs...');
  const allJobs = [];
  const seenUrls = new Set();

  for (const url of YC_URLS) {
    const html = await fetchHtml(url);
    if (!html) continue;

    const pageJobs = parseYcPage(html);
    for (const job of pageJobs) {
      if (!seenUrls.has(job.source_url)) {
        seenUrls.add(job.source_url);
        allJobs.push(job);
      }
    }
  }

  console.log(`[Wave 5] Scraped ${allJobs.length} verified Y Combinator startup roles.`);
  return allJobs;
}

module.exports = { scrapeYcStartups };

if (require.main === module) {
  scrapeYcStartups().then(jobs => {
    console.log(`Sample output (Total: ${jobs.length}):`);
    if (jobs.length > 0) {
      console.log(JSON.stringify(jobs[0], null, 2));
    }
  });
}
