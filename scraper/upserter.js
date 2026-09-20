const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Normalizes a string for cross-source deduplication:
 * - Lowercase all characters
 * - Strip corporate/legal suffixes (Private Limited, Pvt Ltd, Inc, LLC, Ltd, Corp, etc.)
 * - Strip 4-digit years (2024, 2025, 2026, 2027, etc.)
 * - Strip punctuation and special characters (keep alphanumeric and spaces)
 * - Collapse multiple spaces and trim leading/trailing whitespace
 * - Returns a clean string, or null if input is empty/falsy/whitespace-only
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return null;

  const cleaned = str
    .toLowerCase()
    .replace(/\b(private\s+limited|pvt\s+ltd|pvt|inc|llc|ltd|corp|corporation|gmbh|co)\b/gi, '')
    .replace(/\b20\d{2}\b/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Save records to local cache backup file
 */
function saveLocalCache(records, fileName = 'last-upsert-cache.json') {
  try {
    const dir = path.join(__dirname, 'recon-output');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Could not save local cache to ${fileName}:`, e.message);
  }
}

/**
 * Append failed records to fallback file
 */
function appendFailedUpserts(records) {
  try {
    const dir = path.join(__dirname, 'recon-output');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'failed-upserts.json');
    let existing = [];
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch (e) {}
    }
    const combined = [...existing, ...records];
    fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not save failed upserts locally:', e.message);
  }
}

function sanitizeType(val) {
  if (!val) return 'internship';
  const lower = String(val).toLowerCase().trim();
  if (lower.includes('intern')) return 'internship';
  if (lower.includes('hackathon')) return 'hackathon';
  if (lower.includes('competition') || lower.includes('contest')) return 'competition';
  if (lower.includes('fellowship')) return 'fellowship';
  if (lower.includes('scholarship')) return 'scholarship';
  if (lower.includes('open') || lower.includes('oss') || lower.includes('source')) return 'open-source program';
  if (lower.includes('full') || lower.includes('job') || lower.includes('career')) return 'full-time';
  return 'internship';
}

function sanitizeConfidence(val) {
  if (!val) return 'unknown';
  const lower = String(val).toLowerCase().trim();
  if (lower === 'exact' || lower === 'high' || lower === '1' || lower === '1.0') {
    return 'exact';
  }
  if (lower.includes('countdown') || lower.includes('computed')) {
    return 'computed_from_countdown';
  }
  return 'unknown';
}

function sanitizeCompetitiveness(val) {
  if (!val) return 'medium';
  const lower = String(val).toLowerCase().trim();
  if (lower === 'low' || lower === 'medium' || lower === 'high') return lower;
  if (lower.includes('high')) return 'high';
  if (lower.includes('low')) return 'low';
  return 'medium';
}

function sanitizeEffortLevel(val) {
  if (!val) return 'medium';
  const lower = String(val).toLowerCase().trim();
  if (lower === 'low' || lower === 'medium' || lower === 'high') return lower;
  if (lower.includes('high')) return 'high';
  if (lower.includes('low')) return 'low';
  return 'medium';
}

/**
 * Upserts structured data into Supabase using bulk operations
 */
async function upsertData(records, supabaseKey) {
  if (!process.env.SUPABASE_URL || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or Supabase key.');
  }

  // Backup records to local cache before upserting
  saveLocalCache(records);

  const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const newRecords = [];
  const failedUpserts = [];

  // Filter out error records and in-batch duplicate URLs
  const validRecords = [];
  const seenUrls = new Set();
  for (const record of records) {
    if (!record || record.error) {
      console.warn(`Skipping record due to error: ${record?.error || 'null_record'}`);
      skipCount++;
    } else if (!record.source_url) {
      console.warn(`Skipping record missing source_url: ${record.title || 'untitled'}`);
      skipCount++;
    } else if (seenUrls.has(record.source_url)) {
      // Deduplicate in-batch so PostgreSQL ON CONFLICT doesn't see identical keys in the same statement
      skipCount++;
    } else {
      seenUrls.add(record.source_url);
      validRecords.push(record);
    }
  }

  if (validRecords.length === 0) {
    return { successCount: 0, skipCount, failCount: 0, newRecords: [] };
  }

  // Pre-query existing URLs to determine which records are completely new
  const incomingUrls = validRecords.map(r => r.source_url).filter(Boolean);
  let existingUrls = new Set();

  if (incomingUrls.length > 0) {
    try {
      const { data: existingData } = await supabase
        .from('opportunities')
        .select('source_url')
        .in('source_url', incomingUrls);

      if (existingData) {
        existingUrls = new Set(existingData.map(r => r.source_url));
      }
    } catch (err) {
      console.warn(`Could not fetch existing URLs for comparison: ${err.message}`);
    }
  }

  // Check if location column exists in the database schema
  let hasLocationColumn = false;
  try {
    const { error: locColErr } = await supabase.from('opportunities').select('location').limit(1);
    hasLocationColumn = !locColErr;
  } catch {
    hasLocationColumn = false;
  }

  // Prepare normalized payloads
  const payloads = validRecords.map(record => {
    const rawCompany = record.company || record.organization || record.organisation || null;
    const payload = {
      title: record.title,
      type: sanitizeType(record.type),
      description: record.description,
      source_url: record.source_url,
      deadline: record.deadline,
      deadline_confidence: sanitizeConfidence(record.deadline_confidence),
      domain_tags: record.domain_tags || [],
      eligibility: record.eligibility || { type: 'all' },
      effort_level: sanitizeEffortLevel(record.effort_level),
      competitiveness: sanitizeCompetitiveness(record.competitiveness),
      is_active: true,
      normalized_title: normalizeString(record.title),
      normalized_company: normalizeString(rawCompany)
    };
    if (hasLocationColumn && record.location) {
      payload.location = record.location;
    }
    return payload;
  });

  // Chunk payloads into batches of 50 to prevent oversized request payloads
  const CHUNK_SIZE = 50;
  for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
    const chunk = payloads.slice(i, i + CHUNK_SIZE);
    const chunkRecords = validRecords.slice(i, i + CHUNK_SIZE);

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .upsert(chunk, { onConflict: 'source_url', ignoreDuplicates: false })
        .select('id, title, source_url');

      if (error) {
        console.warn(`Chunk upsert failed (${error.message}). Falling back to per-record upsert for this chunk...`);
        // Fallback to per-record upsert for this chunk
        for (let j = 0; j < chunk.length; j++) {
          const item = chunk[j];
          const rawItem = chunkRecords[j];
          const { error: singleErr } = await supabase
            .from('opportunities')
            .upsert(item, { onConflict: 'source_url', ignoreDuplicates: false });

          if (singleErr) {
            if (singleErr.message.includes('unique_normalized_opportunity') && item.normalized_title && item.normalized_company) {
              const { error: updateErr } = await supabase
                .from('opportunities')
                .update(item)
                .eq('normalized_title', item.normalized_title)
                .eq('normalized_company', item.normalized_company);

              if (!updateErr) {
                console.log(`Updated cross-posted record (${item.normalized_title} @ ${item.normalized_company}) for URL: ${item.source_url}`);
                successCount++;
                continue;
              }
            }
            console.error(`Error upserting ${item.source_url}: ${singleErr.message}`);
            failCount++;
            failedUpserts.push(rawItem);
          } else {
            successCount++;
            if (!existingUrls.has(item.source_url)) {
              newRecords.push(rawItem);
            }
          }
        }
      } else {
        successCount += chunk.length;
        for (const item of chunkRecords) {
          if (!existingUrls.has(item.source_url)) {
            newRecords.push(item);
          }
        }
        console.log(`Bulk upserted chunk of ${chunk.length} records successfully.`);
      }
    } catch (chunkEx) {
      console.error(`Exception during chunk upsert: ${chunkEx.message}`);
      failCount += chunk.length;
      failedUpserts.push(...chunkRecords);
    }
  }

  if (failedUpserts.length > 0) {
    appendFailedUpserts(failedUpserts);
  }

  return { successCount, skipCount, failCount, newRecords };
}

module.exports = { upsertData, saveLocalCache, normalizeString };
