const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
  if (lower.includes('fellowship')) return 'fellowship';
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

/**
 * Upserts structured data into Supabase
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

  // Query existing URLs to determine which records are completely new
  const incomingUrls = records.map(r => r.source_url).filter(Boolean);
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
  
  for (const record of records) {
    if (record.error) {
      console.warn(`Skipping record due to error: ${record.error}`);
      skipCount++;
      continue;
    }

    try {
      const normalizedTitle = normalizeString(record.title);
      const company = record.company || record.organization || record.organisation || '';
      const normalizedCompany = company ? normalizeString(company) : '__no_company_fallback__';

      const payload = {
        title: record.title,
        type: sanitizeType(record.type),
        description: record.description,
        source_url: record.source_url,
        deadline: record.deadline,
        deadline_confidence: sanitizeConfidence(record.deadline_confidence),
        domain_tags: record.domain_tags || [],
        eligibility: record.eligibility || { 'type': 'all' },
        effort_level: record.effort_level || 'medium',
        competitiveness: record.competitiveness || 'medium',
        is_active: true,
        normalized_title: normalizedTitle,
        normalized_company: normalizedCompany
      };

      // Check if opportunity already exists by source_url OR normalized title & company
      let existingMatch = null;
      try {
        const { data: byUrl } = await supabase
          .from('opportunities')
          .select('id')
          .eq('source_url', record.source_url)
          .maybeSingle();

        if (byUrl) {
          existingMatch = byUrl;
        } else {
          const { data: byNorm } = await supabase
            .from('opportunities')
            .select('id')
            .eq('normalized_title', normalizedTitle)
            .eq('normalized_company', normalizedCompany)
            .maybeSingle();
          if (byNorm) existingMatch = byNorm;
        }
      } catch (err) {
        // Ignore select error, proceed to fallback
      }

      let res;
      if (existingMatch && existingMatch.id) {
        res = await supabase
          .from('opportunities')
          .update(payload)
          .eq('id', existingMatch.id);
      } else {
        res = await supabase
          .from('opportunities')
          .insert(payload);
      }

      const error = res.error;

      if (error) {
        console.error(`Error upserting ${record.source_url}:`, error.message);
        failCount++;
        failedUpserts.push(record);
      } else {
        console.log(`Upserted: ${record.title}`);
        successCount++;
        
        if (!existingUrls.has(record.source_url)) {
          newRecords.push(record);
        }
      }
    } catch (err) {
      console.error(`Exception upserting ${record.source_url}:`, err.message);
      failCount++;
      failedUpserts.push(record);
    }
  }

  if (failedUpserts.length > 0) {
    appendFailedUpserts(failedUpserts);
  }

  return { successCount, skipCount, failCount, newRecords };
}

module.exports = { upsertData, saveLocalCache };
