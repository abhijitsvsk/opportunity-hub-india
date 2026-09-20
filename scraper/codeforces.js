require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { upsertData } = require('./upserter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

/**
 * Scrapes upcoming competitive programming rounds from Codeforces API.
 * Endpoint: https://codeforces.com/api/contest.list?gym=false
 */
async function scrapeCodeforces() {
  console.log('[Codeforces] Fetching contest list from API...');
  const endpoint = 'https://codeforces.com/api/contest.list?gym=false';

  try {
    const response = await axios.get(endpoint, {
      httpsAgent: ipv4Agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.data || response.data.status !== 'OK' || !Array.isArray(response.data.result)) {
      throw new Error(`Codeforces API returned invalid response status: ${response.data?.status || 'UNKNOWN'}`);
    }

    const allContests = response.data.result;
    console.log(`[Codeforces] Received ${allContests.length} total contests from API.`);

    // Filter strictly for upcoming contests (phase === "BEFORE")
    const upcomingContests = allContests.filter(c => c.phase === 'BEFORE');
    console.log(`[Codeforces] Found ${upcomingContests.length} upcoming contests.`);

    const opportunities = upcomingContests.map(c => {
      // Contest end time = startTimeSeconds + durationSeconds
      const deadline = new Date((c.startTimeSeconds + c.durationSeconds) * 1000).toISOString();
      const durationHours = Math.round((c.durationSeconds / 3600) * 10) / 10;

      return {
        id: uuidv4(),
        title: c.name,
        company: 'Codeforces',
        type: 'competition',
        description: `Codeforces competitive programming round: ${c.name}. Duration: ${durationHours} hours. Solve algorithmic problems and compete on global rating.`,
        source_url: `https://codeforces.com/contest/${c.id}`,
        deadline: deadline,
        source_of_deadline: 'Codeforces API contest.list',
        domain_tags: ['Competitive Programming', 'Algorithms', 'Data Structures'],
        eligibility: { type: 'all' },
        effort_level: 'medium',
        competitiveness: 'high',
        deadline_confidence: 'exact',
        is_active: true
      };
    });

    return opportunities;
  } catch (error) {
    console.error(`[Codeforces] Error scraping Codeforces: ${error.message}`);
    throw error;
  }
}

// Standalone test runner
if (require.main === module) {
  (async () => {
    try {
      console.log('--- RUNNING CODEFORCES STANDALONE TEST ---');
      const records = await scrapeCodeforces();
      console.log(`\nSuccessfully scraped ${records.length} records:`);
      console.dir(records, { depth: null });

      if (records.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        console.log(`\nUpserting ${records.length} records to Supabase...`);
        const result = await upsertData(records, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert result:', result);
      }
    } catch (err) {
      console.error('Standalone test failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeCodeforces };
