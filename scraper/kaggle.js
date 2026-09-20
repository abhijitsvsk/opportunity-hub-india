require('dotenv').config();
const axios = require('axios');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { upsertData } = require('./upserter');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true });

const ALLOWED_CATEGORIES = new Set(['featured', 'research', 'recruitment', 'playground']);

/**
 * Scrapes competitive ML and data science competitions from Kaggle API.
 * Endpoint: https://www.kaggle.com/api/v1/competitions/list
 * Requires KAGGLE_USERNAME and KAGGLE_KEY for HTTP Basic Authentication.
 */
async function scrapeKaggle() {
  const username = process.env.KAGGLE_USERNAME;
  const key = process.env.KAGGLE_KEY;

  // Graceful skip if credentials missing
  if (!username || !key) {
    console.warn('[Kaggle] KAGGLE_USERNAME or KAGGLE_KEY missing. Skipping Kaggle scraper gracefully.');
    return [];
  }

  console.log('[Kaggle] Fetching competitions from Kaggle API...');
  const endpoint = 'https://www.kaggle.com/api/v1/competitions/list';

  try {
    const response = await axios.get(endpoint, {
      httpsAgent: ipv4Agent,
      timeout: 15000,
      auth: {
        username: username,
        password: key
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const competitions = Array.isArray(response.data) ? response.data : [];
    console.log(`[Kaggle] Received ${competitions.length} competitions from API.`);

    const now = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setDate(now.getDate() + 365);

    const eligible = competitions.filter(c => {
      // Filter 1: Category
      const cat = (c.category || '').toLowerCase();
      if (!ALLOWED_CATEGORIES.has(cat)) return false;

      // Filter 2: Deadline within (NOW, NOW + 365 days]
      if (!c.deadline) return false;
      const d = new Date(c.deadline);
      if (isNaN(d.getTime())) return false;
      if (d <= now || d > oneYearFromNow) return false;

      return true;
    });

    console.log(`[Kaggle] Found ${eligible.length} eligible upcoming ML competitions.`);

    const opportunities = eligible.map(c => {
      const deadline = new Date(c.deadline).toISOString();
      const desc = c.description
        ? c.description
        : `Kaggle data science competition: ${c.title}. Category: ${c.category}. Compete and build machine learning solutions.`;

      return {
        id: uuidv4(),
        title: c.title,
        company: 'Kaggle',
        type: 'competition',
        description: desc,
        source_url: c.url || `https://www.kaggle.com/competitions/${c.ref || c.id}`,
        deadline: deadline,
        source_of_deadline: 'Kaggle API deadline',
        domain_tags: ['AI/ML', 'Data Science', 'Machine Learning'],
        eligibility: { type: 'all' },
        effort_level: 'high',
        competitiveness: 'high',
        deadline_confidence: 'exact',
        is_active: true
      };
    });

    return opportunities;
  } catch (error) {
    console.error(`[Kaggle] Error scraping Kaggle: ${error.message}`);
    throw error;
  }
}

// Standalone test runner
if (require.main === module) {
  (async () => {
    try {
      console.log('--- RUNNING KAGGLE STANDALONE TEST ---');
      const records = await scrapeKaggle();
      console.log(`\nSuccessfully scraped ${records.length} records:`);
      console.dir(records, { depth: null });

      if (records.length > 0 && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        console.log(`\nUpserting ${records.length} records to Supabase...\n`);
        const result = await upsertData(records, process.env.SUPABASE_SERVICE_KEY);
        console.log('Upsert result:', result);
      } else {
        console.log('\nStandalone test completed cleanly.');
      }
    } catch (err) {
      console.error('Standalone test failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { scrapeKaggle };
