const fs = require('fs');
const { scrapeDevfolio } = require('./devfolio');

(async () => {
  console.log('Running scraper and enricher ONLY...');
  try {
    const results = await scrapeDevfolio();
    fs.writeFileSync('recon-output/scrape-results-enriched.json', JSON.stringify(results, null, 2));
    
    console.log('\n--- FIRST 3 ENRICHED RECORDS ---');
    results.slice(0, 3).forEach((r, i) => {
      console.log(`\nRECORD ${i + 1}:`);
      console.log(`URL: ${r.source_url}`);
      console.log(`Deadline: ${r.deadline}`);
      console.log(`Confidence: ${r.deadline_confidence}`);
      console.log(`Text Length: ${r.raw_text.length}`);
      console.log(`Preview: ${r.raw_text.substring(0, 150).replace(/\n/g, ' ')}...`);
    });
  } catch (err) {
    console.error('Failed:', err);
  }
})();
