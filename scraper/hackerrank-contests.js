require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { upsertData } = require('./upserter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const EXCLUSION_KEYWORDS = [
  'hiring', 'recruitment', 'campus hiring', 'placement',
  'internal', 'mock', 'assessment', 'interview', 'interviewing', 'private'
];

/**
 * Scrapes active & upcoming challenges from HackerRank API.
 * Endpoint: https://www.hackerrank.com/rest/contests/upcoming?offset=0&limit=50
 */
async function scrapeHackerRankContests() {
  console.log('[HackerRank] Fetching upcoming contests from API...');
  const endpoint = 'https://www.hackerrank.com/rest/contests/upcoming?offset=0&limit=50';

  try {
    const response = await axios.get(endpoint, {
      httpsAgent: ipv4Agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const models = Array.isArray(response.data?.models) ? response.data.models : [];
    console.log(`[HackerRank] Received ${models.length} contests from API.`);

    // 1. Filter: ended === false AND epoch_endtime is in the future
    const now = Date.now();
    const activeContests = models.filter(c => c.ended === false && (c.epoch_endtime * 1000 > now));

    // 2. Keyword exclusion: filter out internal assessments, hiring drives, placement tests
    const filtered = activeContests.filter(c => {
      const text = `${c.name || ''} ${c.description || ''}`.toLowerCase();
      return !EXCLUSION_KEYWORDS.some(kw => text.includes(kw));
    });

    // 3. Sort by epoch_endtime ascending (most imminent first)
    filtered.sort((a, b) => (a.epoch_endtime || 0) - (b.epoch_endtime || 0));

    // 4. Cap at top 30 most imminent
    const top30 = filtered.slice(0, 30);
    console.log(`[HackerRank] ${top30.length} eligible contests remaining after filtering and 30-item cap.`);

    const opportunities = top30.map(c => {
      const deadline = new Date(c.epoch_endtime * 1000).toISOString();
      const desc = c.description && c.description.length > 30 && !c.description.includes('Please provide a short description')
        ? c.description
        : `Participate in the ${c.name} coding challenge on HackerRank. Solve algorithmic problems and earn badges.`;

      return {
        id: uuidv4(),
        title: c.name,
        company: 'HackerRank',
        type: 'competition',
        description: desc,
        source_url: `https://www.hackerrank.com/contests/${c.slug}`,
        deadline: deadline,
        source_of_deadline: 'HackerRank API epoch_endtime',
        domain_tags: ['Coding Challenge', 'Competitive Programming', 'Algorithms'],
        eligibility: { type: 'all' },
        effort_level: 'medium',
        competitiveness: 'medium',
        deadline_confidence: 'exact',
        is_active: true
      };
    });

    return opportunities;
  } catch (error) {
    console.error(`[HackerRank] Error scraping HackerRank: ${error.message}`);
    throw error;
  }
}

// Standalone test runner
if (require.main === module) {
  (async () => {
    try {
      console.log('--- RUNNING HACKERRANK STANDALONE TEST ---');
      const records = await scrapeHackerRankContests();
      console.log(`\nSuccessfully scraped ${records.length} records:`);
      console.dir(records, { depth: null });

      if (records.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        console.log(`\nUpserting ${records.length} records to Supabase...\n`);
        const result = await upsertData(records, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert result:', result);
      } else {
        console.log('\nNo active contests currently open on HackerRank. Standalone test passed cleanly with 0 records.');
      }
    } catch (err) {
      console.error('Standalone test failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeHackerRankContests };
