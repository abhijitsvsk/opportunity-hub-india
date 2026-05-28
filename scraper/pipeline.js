require('dotenv').config();
const { scrapeDevfolio } = require('./devfolio');
const { structureData } = require('./structurer');
const { upsertData } = require('./upserter');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const stats = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    recordsScraped: 0,
    recordsStructured: 0,
    recordsUpserted: 0,
    recordsSkipped: 0,
    errorMessage: null
  };

  try {
    console.log('--- STARTING PIPELINE: DEVFOLIO ---');
    
    // 1. Scrape & Enrich
    console.log('\n[1/3] Scraping Devfolio...');
    const scrapedRecords = await scrapeDevfolio();
    stats.recordsScraped = scrapedRecords.length;
    
    if (scrapedRecords.length === 0) {
      console.log('No records returned from scraper. Exiting.');
      return;
    }

    // Optional: write local debug file if not in CI
    if (!process.env.CI) {
      fs.writeFileSync('recon-output/scrape-results.json', JSON.stringify(scrapedRecords, null, 2));
      console.log('Wrote intermediate scrape results to recon-output/scrape-results.json');
    }

    // ---- Health Check: Null Deadline Threshold ----
    const nullDeadlines = scrapedRecords.filter(r => r.deadline === null).length;
    const nullRate = nullDeadlines / scrapedRecords.length;
    console.log(`\nHealth Check: ${nullDeadlines}/${scrapedRecords.length} records have null deadlines (${(nullRate * 100).toFixed(1)}%)`);
    
    if (nullRate > 0.3) {
      // If more than 30% are null, the DOM likely changed or extraction logic is broken.
      // Throwing an error fails the pipeline (and triggers GitHub Actions alerts).
      throw new Error(`PIPELINE HEALTH CHECK FAILED: Null deadline rate is ${(nullRate * 100).toFixed(1)}% (Threshold is 30%). Devfolio UI may have changed. Aborting to prevent bad data.`);
    }

    // 2. Structure with Gemini
    console.log(`\n[2/3] Structuring data with Gemini (${scrapedRecords.length} records)...`);
    const structuredRecords = [];
    const failedRecords = [];
    for (let i = 0; i < scrapedRecords.length; i++) {
      const record = scrapedRecords[i];
      console.log(`  Structuring [${i+1}/${scrapedRecords.length}]: ${record.source_url}`);
      
      try {
        const structured = await structureData(record);
        if (structured.error) {
          console.warn(`  -> Structured error for ${record.source_url}: ${structured.error}`);
          failedRecords.push({ url: record.source_url, raw: record.raw_text, error: structured.error });
        } else {
          structuredRecords.push(structured);
        }
      } catch (err) {
        console.error(`  -> Failed to structure ${record.source_url}:`, err.message);
        failedRecords.push({ url: record.source_url, raw: record.raw_text, error: err.message });
      }
      
      // Delay 4 seconds to respect Gemini free tier limits (15 RPM)
      if (i < scrapedRecords.length - 1) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }
    
    stats.recordsStructured = structuredRecords.length;

    // ---- Persist Failed Records ----
    if (failedRecords.length > 0) {
      console.warn(`\n[!] ${failedRecords.length} records failed structuring. Saving raw text to failed-records.json`);
      fs.writeFileSync('recon-output/failed-records.json', JSON.stringify(failedRecords, null, 2));
    }

    if (structuredRecords.length === 0) {
      throw new Error('Zero records successfully structured. Aborting pipeline.');
    }

    // 3. Upsert to Supabase
    console.log(`\n[3/3] Upserting to Supabase...`);
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_KEY. Cannot upsert.');
    }
    const result = await upsertData(structuredRecords, supabaseKey);
    
    console.log('\n--- PIPELINE COMPLETE ---');
    console.log(`Success: ${result.successCount}`);
    console.log(`Skipped: ${result.skipCount}`);
    console.log(`Failed:  ${result.failCount}`);
    
    stats.recordsUpserted = result.successCount;
    stats.recordsSkipped = result.skipCount;
    stats.status = 'success';
    
  } catch (error) {
    console.error('\n❌ PIPELINE FAILED:', error.message);
    stats.status = 'failed';
    stats.errorMessage = error.message;
  } finally {
    stats.completedAt = new Date().toISOString();
    
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (process.env.SUPABASE_URL && supabaseKey) {
      const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
      await supabase.from('pipeline_runs').insert([{
        source: 'devfolio',
        started_at: stats.startedAt,
        completed_at: stats.completedAt,
        status: stats.status,
        records_scraped: stats.recordsScraped,
        records_structured: stats.recordsStructured,
        records_upserted: stats.recordsUpserted,
        records_skipped: stats.recordsSkipped,
        error_message: stats.errorMessage
      }]);
      console.log('Logged pipeline run to database.');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
