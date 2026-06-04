require('dotenv').config();
const { scrapeDevfolio } = require('./devfolio');
const { scrapeGithubInternships } = require('./github-internships');
const { scrapeGithubNewGrad } = require('./github-new-grad');
const { structureData, structureDataBatch } = require('./structurer');
const { scrapeUnstop } = require('./unstop');
const { getStaticOpportunities } = require('./static');
const { upsertData } = require('./upserter');
const { notifyDiscord, notifyDiscordError } = require('./notifier');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

class GlobalRateLimiter {
  constructor(maxCalls) {
    this.maxCalls = maxCalls;
    this.callsMade = 0;
  }
  
  canMakeCall() {
    return this.callsMade < this.maxCalls;
  }
  
  increment() {
    this.callsMade++;
  }
}

/**
 * Normalizes title and company for deduplication
 */
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\b(inc|llc|ltd|corp)\b/g, '')
    .replace(/\b(2025|2026|2027)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Process raw records through Gemini and upsert
 */
async function processRawRecordsWithGemini(sourceName, rawRecords, rateLimiter) {
  const structuredRecords = [];
  const failedRecords = [];
  
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

  // 1. DEDUPLICATION: Find URLs that already exist in Supabase
  const urls = rawRecords.map(r => r.source_url).filter(Boolean);
  const existingUrls = new Set();
  
  if (urls.length > 0) {
    // Supabase .in() limits to 1000 items, but rawRecords is rarely that big.
    const { data, error } = await supabase
      .from('opportunities')
      .select('source_url')
      .in('source_url', urls);
      
    if (!error && data) {
      data.forEach(row => existingUrls.add(row.source_url));
    } else if (error) {
      console.warn(`Failed to query existing URLs for deduplication: ${error.message}`);
    }
  }

  const newRecords = rawRecords.filter(r => !existingUrls.has(r.source_url));
  const skippedCount = rawRecords.length - newRecords.length;
  console.log(`Checking ${rawRecords.length} records... Skipped ${skippedCount} existing records. Processing ${newRecords.length} new records with Gemini in batches.`);

  if (newRecords.length === 0) return 0;

  // 2. BATCH PROCESSING: Process 10 records per Gemini API call
  const batchSize = 10;
  for (let i = 0; i < newRecords.length; i += batchSize) {
    const batch = newRecords.slice(i, i + batchSize);
    
    // Check global budget (1 budget unit per batch call is extremely efficient)
    if (!rateLimiter.canMakeCall()) {
       console.warn(`\n[Rate Limiter] Global Gemini budget exhausted! Queuing remaining ${newRecords.length - i} records to pending_processing.`);
       for (let j = i; j < newRecords.length; j++) {
          await supabase.from('pending_processing').insert({
             raw_data: newRecords[j],
             source: sourceName
          });
       }
       break;
    }

    rateLimiter.increment();
    console.log(`  Structuring Batch [${Math.floor(i/batchSize) + 1}/${Math.ceil(newRecords.length/batchSize)}] (${batch.length} records)`);
    
    try {
      const structuredBatch = await structureDataBatch(batch);
      
      structuredBatch.forEach((structured, idx) => {
        const raw = batch[idx];
        if (structured && structured.error) {
          console.warn(`    -> Record error: ${structured.error}`);
          failedRecords.push({ raw, error: structured.error });
        } else if (structured) {
          structuredRecords.push(structured);
        }
      });
    } catch (err) {
      console.error(`  -> Failed to structure batch:`, err.message);
      batch.forEach(raw => failedRecords.push({ raw, error: err.message }));
    }
    
    // Wait briefly between batches to respect API limits (15 RPM -> 4s wait)
    if (i + batchSize < newRecords.length) {
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  if (structuredRecords.length > 0) {
     console.log(`Upserting ${structuredRecords.length} structured records for ${sourceName}...`);
     const result = await upsertData(structuredRecords, supabaseKey);
     if (result.newRecords && result.newRecords.length > 0) {
       await notifyDiscord(result.newRecords, sourceName);
     }
  }

  return structuredRecords.length;
}

/**
 * Runs a specific source through the pipeline, handles upsert, and logs to pipeline_runs.
 */
async function runPipelineSource(sourceName, processFn, rateLimiter) {
  let discordAlertSent = false;
  const stats = {
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    recordsScraped: 0,
    recordsStructured: 0,
    recordsUpserted: 0,
    recordsSkipped: 0,
    recordsFailed: 0,
    errorMessage: null
  };

  try {
    console.log(`\n=========================================`);
    console.log(`--- STARTING PIPELINE: ${sourceName.toUpperCase()} ---`);
    console.log(`=========================================`);
    
    // Most scrapers already return structured data. Only Devfolio returns raw.
    // To support priority & rate limit, we handle it inside the specific processFn or here.
    const { scrapedCount, rawRecords, structuredRecords } = await processFn();
    stats.recordsScraped = scrapedCount;
    
    let finalStructured = structuredRecords || [];

    // If scraper returned raw records, run them through Gemini under the rate limiter
    if (rawRecords && rawRecords.length > 0) {
       const structuredCount = await processRawRecordsWithGemini(sourceName, rawRecords, rateLimiter);
       stats.recordsStructured = structuredCount;
       // processRawRecordsWithGemini already handled upserting.
       stats.recordsUpserted = structuredCount; 
       stats.status = 'success';
       return;
    }

    // Standard pre-structured insert flow
    stats.recordsStructured = finalStructured.length;

    if (finalStructured.length === 0) {
      console.log(`No valid structured records to upsert for ${sourceName}. Skipping upsert phase.`);
      stats.status = 'success';
      return;
    }

    console.log(`\nUpserting ${finalStructured.length} records to Supabase for ${sourceName}...`);
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const result = await upsertData(finalStructured, supabaseKey);
    
    if (result.newRecords && result.newRecords.length > 0) {
      await notifyDiscord(result.newRecords, sourceName);
    }
    
    console.log(`\n--- ${sourceName.toUpperCase()} PIPELINE COMPLETE ---`);
    console.log(`Success: ${result.successCount}`);
    
    stats.recordsUpserted = result.successCount;
    stats.recordsSkipped = result.skipCount;
    stats.recordsFailed = result.failCount;
    stats.status = 'success';
    
  } catch (error) {
    console.error(`\n❌ ${sourceName.toUpperCase()} PIPELINE FAILED:`, error.message);
    stats.status = 'failed';
    stats.errorMessage = error.message;

    if (!discordAlertSent) {
      await notifyDiscordError(sourceName, error.message, stats);
      discordAlertSent = true;
    }
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
          records_failed: stats.recordsFailed,
          error_message: stats.errorMessage
        }]);
      } catch (dbErr) {
        console.error(`Failed to log ${sourceName} pipeline run to database:`, dbErr.message);
      }
    }
  }
}

/**
 * Process any pending raw records from the previous run
 */
async function processPendingQueue(rateLimiter) {
   console.log(`\n=========================================`);
   console.log(`--- PROCESSING PENDING QUEUE ---`);
   console.log(`=========================================`);
   
   const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
   const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
   
   const { data: pending } = await supabase.from('pending_processing').select('*').order('created_at', { ascending: true }).limit(300);
   
   if (!pending || pending.length === 0) {
      console.log('Pending queue is empty.');
      return;
   }
   
   console.log(`Found ${pending.length} pending records in queue.`);
   
   for (const item of pending) {
      if (!rateLimiter.canMakeCall()) {
         console.warn('Rate limit hit while processing pending queue. Stopping queue processing.');
         break;
      }
      
      rateLimiter.increment();
      console.log(`  Structuring pending record [ID: ${item.id}]`);
      try {
         const structured = await structureData(item.raw_data);
         if (!structured.error) {
            await upsertData([structured], supabaseKey);
         }
         // Delete from queue whether it succeeded or completely failed structureData
         await supabase.from('pending_processing').delete().eq('id', item.id);
      } catch (err) {
         console.error('Failed to structure pending record:', err.message);
         // Still delete it so it doesn't block forever
         await supabase.from('pending_processing').delete().eq('id', item.id);
      }
      
      await new Promise(r => setTimeout(r, 4000));
   }
}

async function main() {
  const rateLimiter = new GlobalRateLimiter(300);

  // 0. Process Rollover Queue First
  await processPendingQueue(rateLimiter);

  // PRIORITY 1: Hackathons (Tightest deadlines)
  await runPipelineSource('devfolio', async () => {
    const scrapedRecords = await scrapeDevfolio();
    // Devfolio returns raw records needing Gemini
    return { scrapedCount: scrapedRecords.length, rawRecords: scrapedRecords };
  }, rateLimiter);
  
  // Note: Unstop is run for all categories in one scraper file, but we'll execute it at Priority 1.
  await runPipelineSource('unstop', async () => {
    const structuredRecords = await scrapeUnstop();
    return { scrapedCount: structuredRecords.length, structuredRecords };
  }, rateLimiter);

  // PRIORITY 2: Internships
  await runPipelineSource('github-internships', async () => {
    const structuredRecords = await scrapeGithubInternships();
    return { scrapedCount: structuredRecords.length, structuredRecords };
  }, rateLimiter);

  // PRIORITY 3 & 5: Open Source & Fellowships (Static)
  await runPipelineSource('static', async () => {
    const structuredRecords = await getStaticOpportunities();
    return { scrapedCount: structuredRecords.length, structuredRecords };
  }, rateLimiter);

  // PRIORITY 4: New Grad
  await runPipelineSource('github-new-grad', async () => {
    const structuredRecords = await scrapeGithubNewGrad();
    return { scrapedCount: structuredRecords.length, structuredRecords };
  }, rateLimiter);

  // PRIORITY 6: Discord
  await runPipelineSource('discord', async () => {
    const { scrapeDiscord } = require('./discord');
    const scrapedRecords = await scrapeDiscord();
    // Discord returns raw records needing Gemini
    return { scrapedCount: scrapedRecords.length, rawRecords: scrapedRecords };
  }, rateLimiter);

}

if (require.main === module) {
  main();
}

module.exports = { main, runPipelineSource };
