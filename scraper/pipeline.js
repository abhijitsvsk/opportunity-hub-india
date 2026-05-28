require('dotenv').config();
const { scrapeDevfolio } = require('./devfolio');
const { structureData } = require('./structurer');
const { scrapeUnstop } = require('./unstop');
const { upsertData } = require('./upserter');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

/**
 * Runs a specific source through the pipeline, handles upsert, and logs to pipeline_runs.
 */
async function runPipelineSource(sourceName, processFn) {
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
    console.log(`\n=========================================`);
    console.log(`--- STARTING PIPELINE: ${sourceName.toUpperCase()} ---`);
    console.log(`=========================================`);
    
    // Process function must return { scrapedCount, structuredRecords }
    const { scrapedCount, structuredRecords } = await processFn();
    stats.recordsScraped = scrapedCount;
    stats.recordsStructured = structuredRecords.length;

    if (structuredRecords.length === 0) {
      console.log(`No valid structured records to upsert for ${sourceName}. Skipping upsert phase.`);
      stats.status = 'success';
      return;
    }

    console.log(`\nUpserting ${structuredRecords.length} records to Supabase for ${sourceName}...`);
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_KEY. Cannot upsert.');
    }
    const result = await upsertData(structuredRecords, supabaseKey);
    
    console.log(`\n--- ${sourceName.toUpperCase()} PIPELINE COMPLETE ---`);
    console.log(`Success: ${result.successCount}`);
    console.log(`Skipped: ${result.skipCount}`);
    console.log(`Failed:  ${result.failCount}`);
    
    stats.recordsUpserted = result.successCount;
    stats.recordsSkipped = result.skipCount;
    stats.status = 'success';
    
  } catch (error) {
    console.error(`\n❌ ${sourceName.toUpperCase()} PIPELINE FAILED:`, error.message);
    stats.status = 'failed';
    stats.errorMessage = error.message;
  } finally {
    stats.completedAt = new Date().toISOString();
    
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (process.env.SUPABASE_URL && supabaseKey) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
        await supabase.from('pipeline_runs').insert([{
          source: sourceName,
          started_at: stats.startedAt,
          completed_at: stats.completedAt,
          status: stats.status,
          records_scraped: stats.recordsScraped,
          records_structured: stats.recordsStructured,
          records_upserted: stats.recordsUpserted,
          records_skipped: stats.recordsSkipped,
          error_message: stats.errorMessage
        }]);
        console.log(`Logged ${sourceName} pipeline run to database.`);
      } catch (dbErr) {
        console.error(`Failed to log ${sourceName} pipeline run to database:`, dbErr.message);
      }
    }
  }
}

/**
 * Devfolio Specific Processing Logic
 */
async function processDevfolio() {
  console.log('\n[1/2] Scraping Devfolio...');
  const scrapedRecords = await scrapeDevfolio();
  
  if (scrapedRecords.length === 0) {
    return { scrapedCount: 0, structuredRecords: [] };
  }

  console.log(`\n[2/2] Structuring data with Gemini (${scrapedRecords.length} records)...`);
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

  // Persist Failed Records
  if (failedRecords.length > 0) {
    if (!fs.existsSync('recon-output')) fs.mkdirSync('recon-output');
    fs.writeFileSync('recon-output/failed-records.json', JSON.stringify(failedRecords, null, 2));
    console.log(`\n⚠️ Wrote ${failedRecords.length} failed records to recon-output/failed-records.json for debugging.`);
  }

  // Health Check
  const nullDeadlineCount = structuredRecords.filter(r => r.deadline === null).length;
  const nullRate = structuredRecords.length > 0 ? nullDeadlineCount / structuredRecords.length : 0;
  console.log(`\nHealth Check: ${nullDeadlineCount}/${structuredRecords.length} records have null deadlines (${(nullRate * 100).toFixed(1)}%)`);
  
  if (structuredRecords.length > 0 && nullRate >= 0.3) {
    throw new Error(`PIPELINE HEALTH CHECK FAILED: Null deadline rate is ${(nullRate * 100).toFixed(1)}% (Threshold is 30%). Devfolio UI may have changed. Aborting to prevent bad data.`);
  }

  return { scrapedCount: scrapedRecords.length, structuredRecords };
}

/**
 * Unstop Specific Processing Logic
 */
async function processUnstop() {
  // Unstop natively returns structured JSON, so scrapeUnstop handles both steps in one
  const structuredRecords = await scrapeUnstop();
  return { scrapedCount: structuredRecords.length, structuredRecords };
}

async function main() {
  // Run Unstop
  await runPipelineSource('unstop', processUnstop);
  
  // Run Devfolio
  await runPipelineSource('devfolio', processDevfolio);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, runPipelineSource };
