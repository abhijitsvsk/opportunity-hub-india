const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const SOURCE_URL = 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md';

/**
 * Scrapes the SimplifyJobs GitHub README for New Grad Full-Time Roles.
 */
async function scrapeGithubNewGrad() {
  console.log(`[Scraper] Fetching new grad roles from ${SOURCE_URL}`);
  
  try {
    const response = await axios.get(SOURCE_URL);
    const text = response.data;

    const $ = cheerio.load(text);
    const opportunities = [];

    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 4) {
        const companyHtml = $(cols[0]).html() || '';
        const role = $(cols[1]).text().trim();
        const location = $(cols[2]).text().trim();
        const applicationHtml = $(cols[3]).html() || '';
        
        let company = $(cols[0]).text().trim();
        company = company.replace(/^(🔥|↳)\s*/, '').trim();

        let source_url = '';
        const hrefMatch = applicationHtml.match(/href="([^"]+)"/);
        if (hrefMatch) {
          source_url = hrefMatch[1];
        }

        if (role.includes('🔒') || company.includes('🔒')) {
          return;
        }

        if (company && role && source_url) {
          const domain_tags = [];
          const lowerRole = role.toLowerCase();
          if (lowerRole.includes('software')) domain_tags.push('Software Engineering');
          if (lowerRole.includes('data')) domain_tags.push('Data Science');
          if (lowerRole.includes('machine learning') || lowerRole.includes('ai')) domain_tags.push('AI/ML');
          if (lowerRole.includes('frontend') || lowerRole.includes('front end')) domain_tags.push('Frontend');
          if (lowerRole.includes('backend') || lowerRole.includes('back end')) domain_tags.push('Backend');
          
          if (domain_tags.length === 0) domain_tags.push('Software Engineering'); // Default fallback

          opportunities.push({
            id: uuidv4(),
            title: `${company} - ${role}`,
            type: 'full-time',
            description: `Full-Time New Grad position at ${company} located in ${location}.`,
            source_url,
            deadline: null, // Full-time rolling, null sorts to bottom
            source_of_deadline: 'Rolling',
            domain_tags,
            effort_level: 'medium',
            competitiveness: 'high',
            eligibility: {
                segments: ["4th year", "postgraduate"]
            },
            raw_text: `${company} ${role} ${location}`,
            deadline_confidence: 'unknown',
            source: 'github-simplify-new-grad'
          });
        }
      }
    });
    
    // Critical Issue #6 Validation
    if (opportunities.length < 10) {
      throw new Error(`Parse Failure: Scraper found only ${opportunities.length} records. GitHub README format likely changed.`);
    }

    console.log(`[Scraper] Successfully parsed ${opportunities.length} active new grad roles from GitHub.`);
    return opportunities;

  } catch (error) {
    console.error(`[Scraper] Error fetching from GitHub: ${error.message}`);
    throw error;
  }
}

module.exports = { scrapeGithubNewGrad };
