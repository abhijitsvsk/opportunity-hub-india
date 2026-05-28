/**
 * Local test runner for the Devfolio scraper.
 * 
 * Usage: node run-local.js
 * 
 * Calls scrapeDevfolio() and writes the full output to recon-output/scrape-results.json
 * for manual inspection before connecting to the Gemini structuring layer.
 */

const { scrapeDevfolio } = require('./devfolio');
const fs = require('fs');
const path = require('path');

async function run() {
  const startTime = Date.now();

  try {
    console.log('Starting local test run for Devfolio scraper...\n');
    const data = await scrapeDevfolio();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n--- LOCAL TEST COMPLETE (${elapsed}s) ---`);
    console.log(`Total records extracted: ${data.length}`);

    // Write full results to file for inspection
    const outputDir = path.join(__dirname, 'recon-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'scrape-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Full results saved: ${outputPath}`);

    // Print first 2 records as preview
    if (data.length > 0) {
      console.log('\nSample Data (First 2 records):');
      data.slice(0, 2).forEach((record, i) => {
        console.log(`\n--- Record ${i + 1} ---`);
        console.log(`URL: ${record.source_url}`);
        console.log(`Text preview: ${record.raw_text.substring(0, 200)}...`);
      });
    }

    // Exit with appropriate code
    process.exit(0);
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n--- LOCAL TEST FAILED (${elapsed}s) ---`);
    console.error(error.message);
    process.exit(1);
  }
}

run();
