require('dotenv').config();
const { scrapeDevfolio } = require('./devfolio');
const { scrapeGithubInternships } = require('./github-internships');
const { scrapeGithubNewGrad } = require('./github-new-grad');
const { structureData, structureDataBatch } = require('./structurer');
const { scrapeUnstop } = require('./unstop');
const { getStaticOpportunities } = require('./static');
const { scrapeCodeforces } = require('./codeforces');
const { scrapeCodeChef } = require('./codechef');
const { scrapeHackerRankContests } = require('./hackerrank-contests');
const { scrapeKaggle } = require('./kaggle');
const { upsertData, normalizeString } = require('./upserter');
const { notifyDiscord, notifyDiscordError } = require('./notifier');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');
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

  // 2. BATCH PROCESSING: Process 5 records per LLM API call
  const batchSize = 5;
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
      
      // [CHECKPOINT UPGRADE] Verify the batch didn't suffer a catastrophic API crash
      if (structuredBatch.length > 0 && structuredBatch[0] && structuredBatch[0].error) {
         const errStr = structuredBatch[0].error;
         if (errStr.includes('malformed') || errStr.includes('groq_failed') || errStr.includes('429')) {
            console.error(`\n[Checkpoint] Fatal API Failure detected (${errStr})! Aborting and saving all ${newRecords.length - i} remaining records to the pending_processing queue.`);
            
            for (let j = i; j < newRecords.length; j++) {
               await supabase.from('pending_processing').insert({
                  raw_data: newRecords[j],
                  source: sourceName
               });
            }
            break; // Stop the pipeline for this source to protect data
         }
      }
      
      structuredBatch.forEach((structured, idx) => {
        const raw = batch[idx];
        if (structured && structured.error) {
          console.warn(`    -> Record error: ${structured.error}`);
          failedRecords.push({ raw, error: structured.error });
        } else if (structured) {
          const loc = structured.location || '';
          const context = `${structured.title || ''} ${structured.description || ''}`;
          if (isRelevantForIndianStudent(loc, context)) {
            structuredRecords.push(structured);
          } else {
            console.log(`    -> [Geo-Filter] Excluded non-Indian listing: ${structured.title}`);
          }
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
    
    // Fetch cache of existing URLs for this source to pass to scrapers
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
    const existingUrls = new Set();
    
    try {
      // Fetch all URLs to build a global cache, preventing any capitalization/source mismatches
      const { data, error } = await supabase
        .from('opportunities')
        .select('source_url');
        
      if (!error && data) {
        data.forEach(row => {
          if (row.source_url) existingUrls.add(row.source_url);
        });
      }
    } catch (e) {
      console.warn(`Could not fetch cache for ${sourceName}:`, e.message);
    }

    // Pass existingUrls to the process function
    const { scrapedCount, rawRecords, structuredRecords } = await processFn({ existingUrls });
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
        const { error: logErr } = await supabase.from('pipeline_runs').insert([{
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
        if (logErr) {
          console.warn(`[Pipeline Runs] Failed to log ${sourceName} run: ${logErr.message}`);
        }
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
   
   try {
     const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
     if (!process.env.SUPABASE_URL || !supabaseKey) {
       console.warn('[Pending Queue] SUPABASE_URL or SUPABASE_SERVICE_KEY missing. Skipping.');
       return;
     }
     const supabase = createClient(process.env.SUPABASE_URL, supabaseKey, { auth: { persistSession: false } });
     const { data: pending } = await supabase.from('pending_processing').select('*').order('created_at', { ascending: true }).limit(300);
     
     if (!pending || pending.length === 0) {
        console.log('Pending queue is empty.');
     } else {
        console.log(`Found ${pending.length} pending records in queue.`);
               const pendingBatchSize = 5;
        for (let i = 0; i < pending.length; i += pendingBatchSize) {
           if (!rateLimiter.canMakeCall()) {
              console.warn('Rate limit hit while processing pending queue. Stopping queue processing.');
              break;
           }

           const batch = pending.slice(i, i + pendingBatchSize);
           const rawCards = batch.map(b => b.raw_data);
           const ids = batch.map(b => b.id);

           rateLimiter.increment();
           console.log(`  Structuring pending batch [${Math.floor(i/pendingBatchSize) + 1}/${Math.ceil(pending.length/pendingBatchSize)}] (${batch.length} records)`);

           try {
              const structuredBatch = await structureDataBatch(rawCards);
              const eligibleRecords = [];

              for (const structured of structuredBatch) {
                 if (structured && !structured.error) {
                    const loc = structured.location || '';
                    const context = `${structured.title || ''} ${structured.description || ''}`;
                    if (isRelevantForIndianStudent(loc, context)) {
                       eligibleRecords.push(structured);
                    } else {
                       console.log(`    -> [Geo-Filter] Pending item excluded (non-Indian): ${structured.title}`);
                    }
                 }
              }

              if (eligibleRecords.length > 0) {
                 await upsertData(eligibleRecords, supabaseKey);
              }
           } catch (err) {
              console.error('Failed to structure pending batch:', err.message);
           } finally {
              await supabase.from('pending_processing').delete().in('id', ids);
           }

           if (i + pendingBatchSize < pending.length) {
              await new Promise(r => setTimeout(r, 4000));
           }
        }
     }
   } catch (e) {
     console.warn('Could not process remote pending queue:', e.message);
   }

   // Process local failed-upserts.json if present
   try {
     const path = require('path');
     const failedPath = path.join(__dirname, 'recon-output', 'failed-upserts.json');
     if (fs.existsSync(failedPath)) {
       console.log('Found local failed-upserts.json file. Retrying local cached upserts...');
       const cached = JSON.parse(fs.readFileSync(failedPath, 'utf-8'));
       if (Array.isArray(cached) && cached.length > 0) {
         console.log(`Retrying upsert for ${cached.length} locally cached records...`);
         const res = await upsertData(cached, supabaseKey);
         if (res.successCount > 0) {
           console.log(`Successfully restored ${res.successCount} cached records into Supabase!`);
           fs.unlinkSync(failedPath); // remove cached file once processed
         }
       }
     }
   } catch (err) {
     console.warn('Could not process local failed upserts cache:', err.message);
   }
}

/**
 * Auto-expire past opportunities whose deadline has passed
 */
async function autoExpireOpportunities() {
  console.log(`\n=========================================`);
  console.log(`--- STEP 0.1: AUTO-EXPIRING PAST DEADLINES ---`);
  console.log(`=========================================`);
  try {
    const nowIso = new Date().toISOString();
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

    const { data: expired, error: expireError } = await supabase
      .from('opportunities')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('deadline', nowIso)
      .not('deadline', 'is', null)
      .select('id, title, deadline');

    if (expireError) {
      console.warn(`[Auto-Expiry] Failed to deactivate expired opportunities: ${expireError.message}`);
    } else {
      const count = expired ? expired.length : 0;
      console.log(`[Auto-Expiry] Deactivated ${count} past-deadline opportunities.`);
    }
  } catch (err) {
    console.warn(`[Auto-Expiry] Exception during auto-expiry check:`, err.message);
  }
}

/**
 * Post-upsert cross-source deduplication pass
 * Deactivates newer duplicate listings that share the same normalized_title & normalized_company
 */
async function runCrossSourceDeduplication() {
  console.log(`\n=========================================`);
  console.log(`--- POST-PIPELINE: CROSS-SOURCE DEDUPLICATION ---`);
  console.log(`=========================================`);
  try {
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

    const { data: rows, error } = await supabase
      .from('opportunities')
      .select('id, normalized_title, normalized_company, created_at')
      .eq('is_active', true)
      .not('normalized_title', 'is', null)
      .not('normalized_company', 'is', null)
      .neq('normalized_company', '__no_company_fallback__')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`[Deduplication] Query error: ${error.message}`);
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('[Deduplication] No records eligible for deduplication.');
      return;
    }

    const seen = new Map();
    const dupeIds = [];

    for (const row of rows) {
      const key = `${row.normalized_title}:::${row.normalized_company}`;
      if (seen.has(key)) {
        dupeIds.push(row.id);
      } else {
        seen.set(key, row.id);
      }
    }

    if (dupeIds.length > 0) {
      console.log(`[Deduplication] Found ${dupeIds.length} cross-source duplicates. Deactivating...`);
      const { error: updateErr } = await supabase
        .from('opportunities')
        .update({ is_active: false })
        .in('id', dupeIds);

      if (updateErr) {
        console.warn(`[Deduplication] Failed to deactivate duplicates: ${updateErr.message}`);
      } else {
        console.log(`[Deduplication] Successfully deactivated ${dupeIds.length} duplicate listings.`);
      }
    } else {
      console.log('[Deduplication] No cross-source duplicates found. Database is clean.');
    }
  } catch (err) {
    console.warn(`[Deduplication] Exception during deduplication pass:`, err.message);
  }
}

async function main() {
  const pipelineStartTime = Date.now();
  const rateLimiter = new GlobalRateLimiter(300);

  // STEP 0.1: Auto-expire past opportunities
  await autoExpireOpportunities();

  // STEP 0.2: Process Rollover Queue First
  await processPendingQueue(rateLimiter);

  // WAVE 1: Competitive Programming & Contests (Parallel via Promise.allSettled)
  console.log(`\n=========================================`);
  console.log(`--- LAUNCHING WAVE 1: COMPETITIONS (PARALLEL) ---`);
  console.log(`=========================================`);

  await Promise.allSettled([
    runPipelineSource('codeforces', async () => {
      const structuredRecords = await scrapeCodeforces();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('codechef', async () => {
      const structuredRecords = await scrapeCodeChef();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('hackerrank-contests', async () => {
      const structuredRecords = await scrapeHackerRankContests();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('kaggle', async () => {
      const structuredRecords = await scrapeKaggle();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter)
  ]);

  // WAVE 2: Direct APIs & Curated Lists (Parallel via Promise.allSettled)
  console.log(`\n=========================================`);
  console.log(`--- LAUNCHING WAVE 2: DIRECT APIS & CURATED (PARALLEL) ---`);
  console.log(`=========================================`);

  await Promise.allSettled([
    runPipelineSource('unstop', async () => {
      const structuredRecords = await scrapeUnstop();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('github-internships', async () => {
      const structuredRecords = await scrapeGithubInternships();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('github-new-grad', async () => {
      const structuredRecords = await scrapeGithubNewGrad();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter),

    runPipelineSource('static', async () => {
      const structuredRecords = await getStaticOpportunities();
      return { scrapedCount: structuredRecords.length, structuredRecords };
    }, rateLimiter)
  ]);

  // WAVE 3: Headless Playwright Browser (Sequential)
  console.log(`\n=========================================`);
  console.log(`--- LAUNCHING WAVE 3: HEADLESS PLAYWRIGHT (SEQUENTIAL) ---`);
  console.log(`=========================================`);

  await runPipelineSource('devfolio', async () => {
    const scrapedRecords = await scrapeDevfolio();
    return { scrapedCount: scrapedRecords.length, rawRecords: scrapedRecords };
  }, rateLimiter);

  // WAVE 4: Discord Gateway + LLM (Sequential)
  console.log(`\n=========================================`);
  console.log(`--- LAUNCHING WAVE 4: DISCORD GATEWAY & LLM (SEQUENTIAL) ---`);
  console.log(`=========================================`);

  await runPipelineSource('discord', async () => {
    const { scrapeDiscord } = require('./discord');
    const scrapedRecords = await scrapeDiscord();
    return { scrapedCount: scrapedRecords.length, rawRecords: scrapedRecords };
  }, rateLimiter);

  // POST-PIPELINE: Cross-Source Deduplication & Expiry Verification
  await runCrossSourceDeduplication();
  await autoExpireOpportunities();

  const totalDuration = ((Date.now() - pipelineStartTime) / 1000).toFixed(1);
  console.log(`\n=========================================`);
  console.log(`=== PIPELINE COMPLETE (ALL 4 WAVES) IN ${totalDuration}s ===`);
  console.log(`=========================================`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ FATAL PIPELINE EXCEPTION:', err);
    process.exit(1);
  });
}

module.exports = { main, runPipelineSource, autoExpireOpportunities, runCrossSourceDeduplication };
