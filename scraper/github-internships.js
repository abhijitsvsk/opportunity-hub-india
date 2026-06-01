const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const SOURCE_URL = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/README.md';

/**
 * Scrapes the SimplifyJobs GitHub README for SWE Internships.
 */
async function scrapeGithubInternships() {
  console.log(`[Scraper] Fetching internships from ${SOURCE_URL}`);
  
  try {
    const response = await axios.get(SOURCE_URL);
    const text = response.data;

    // The README uses standard HTML tables. We can extract the table containing "Company", "Role", "Location"
    const $ = cheerio.load(text);
    
    const opportunities = [];

    // Find the table. Simplify uses multiple tables for different categories. We'll grab rows from all.
    $('table tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 4) {
        const companyHtml = $(cols[0]).html() || '';
        const role = $(cols[1]).text().trim();
        const location = $(cols[2]).text().trim();
        const applicationHtml = $(cols[3]).html() || '';
        
        // Extract company name and strip out emojis/strong tags
        let company = $(cols[0]).text().trim();
        company = company.replace(/^(🔥|↳)\s*/, '').trim(); // Remove fire emoji or arrow

        // The application link is usually wrapped in an a tag
        let source_url = '';
        const hrefMatch = applicationHtml.match(/href="([^"]+)"/);
        if (hrefMatch) {
          source_url = hrefMatch[1];
        }

        // We skip closed internships. The legend says "🔒 Internship application is closed"
        if (role.includes('🔒') || company.includes('🔒')) {
          return;
        }

        // We only want rows that have a valid application link
        if (!source_url || source_url.includes('SimplifyJobs')) {
            // Some links are self-referential or just anchor links, try to get the actual apply link if available
            // If it's a simplify link, we keep it because it redirects to the job
        }

        if (company && role && source_url) {
          // Generate a synthetic deadline since GitHub lists don't have them usually
          // We set it to 1 month from now by default if it's active
          const deadline = new Date();
          deadline.setMonth(deadline.getMonth() + 1);

          // Extract basic tech stack hints from the role name
          const domain_tags = [];
          const lowerRole = role.toLowerCase();
          if (lowerRole.includes('software')) domain_tags.push('Software Engineering');
          if (lowerRole.includes('data')) domain_tags.push('Data Science');
          if (lowerRole.includes('machine learning') || lowerRole.includes('ai')) domain_tags.push('AI/ML');
          if (lowerRole.includes('frontend') || lowerRole.includes('front end')) domain_tags.push('Frontend');
          if (lowerRole.includes('backend') || lowerRole.includes('back end')) domain_tags.push('Backend');

          opportunities.push({
            id: uuidv4(),
            title: `${company} - ${role}`,
            type: 'internship',
            description: `Software Engineering Internship at ${company} located in ${location}.`,
            source_url,
            deadline: deadline.toISOString(),
            source_of_deadline: 'Default assumption for active GitHub listings (30 days).',
            domain_tags: domain_tags.length > 0 ? domain_tags : ['Software Engineering'],
            effort_level: 'medium',
            competitiveness: 'high', // Top tier internships are highly competitive
            eligibility: {
                // Usually SWE internships are for 3rd years, but we'll leave it generic so it ranks decently
                year: [2, 3, 4]
            },
            raw_text: `${company} ${role} ${location}`,
            deadline_confidence: 'unknown',
            source: 'github-simplify'
          });
        }
      }
    });

    console.log(`[Scraper] Successfully parsed ${opportunities.length} active internships from GitHub.`);
    return opportunities;

  } catch (error) {
    console.error(`[Scraper] Error fetching from GitHub: ${error.message}`);
    throw error;
  }
}

module.exports = { scrapeGithubInternships };
