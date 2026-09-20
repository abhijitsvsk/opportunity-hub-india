require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { upsertData } = require('./upserter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

/**
 * Scrapes active and upcoming competitive programming contests from CodeChef API.
 * Endpoint: https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all
 */
async function scrapeCodeChef() {
  console.log('[CodeChef] Fetching contest list from API...');
  const endpoint = 'https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all';

  try {
    const response = await axios.get(endpoint, {
      httpsAgent: ipv4Agent,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.data || response.data.status !== 'success') {
      throw new Error(`CodeChef API returned non-success status: ${response.data?.status || 'UNKNOWN'}`);
    }

    const present = Array.isArray(response.data.present_contests) ? response.data.present_contests : [];
    const future = Array.isArray(response.data.future_contests) ? response.data.future_contests : [];
    const combined = [...present, ...future];

    console.log(`[CodeChef] Found ${present.length} active and ${future.length} upcoming contests (${combined.length} total).`);

    const opportunities = combined.map(c => {
      let deadline = null;
      if (c.contest_end_date_iso) {
        try {
          deadline = new Date(c.contest_end_date_iso).toISOString();
        } catch {}
      }

      return {
        id: uuidv4(),
        title: c.contest_name,
        company: 'CodeChef',
        type: 'competition',
        description: `CodeChef competitive programming contest: ${c.contest_name} (${c.contest_code}). Solve algorithmic problems and improve your competitive ranking.`,
        source_url: `https://www.codechef.com/${c.contest_code}`,
        deadline: deadline,
        source_of_deadline: 'CodeChef API contest_end_date_iso',
        domain_tags: ['Competitive Programming', 'Algorithms', 'Problem Solving'],
        eligibility: { type: 'all' },
        effort_level: 'medium',
        competitiveness: 'medium',
        deadline_confidence: 'exact',
        is_active: true
      };
    });

    return opportunities;
  } catch (error) {
    console.error(`[CodeChef] Error scraping CodeChef: ${error.message}`);
    throw error;
  }
}

// Standalone test runner
if (require.main === module) {
  (async () => {
    try {
      console.log('--- RUNNING CODECHEF STANDALONE TEST ---');
      const records = await scrapeCodeChef();
      console.log(`\nSuccessfully scraped ${records.length} records:`);
      console.dir(records, { depth: null });

      if (records.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        console.log(`\nUpserting ${records.length} records to Supabase...\n`);
        const result = await upsertData(records, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert result:', result);
      }
    } catch (err) {
      console.error('Standalone test failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeCodeChef };
