const { createClient } = require('@supabase/supabase-js');

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
 * Upserts structured data into Supabase
 */
async function upsertData(records, supabaseKey) {
  if (!process.env.SUPABASE_URL || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or Supabase key.');
  }

  const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const newRecords = [];

  // Query existing URLs to determine which records are completely new
  const incomingUrls = records.map(r => r.source_url).filter(Boolean);
  let existingUrls = new Set();
  
  if (incomingUrls.length > 0) {
    const { data: existingData } = await supabase
      .from('opportunities')
      .select('source_url')
      .in('source_url', incomingUrls);
      
    if (existingData) {
      existingUrls = new Set(existingData.map(r => r.source_url));
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

      const { data, error } = await supabase
        .from('opportunities')
        .upsert({
          title: record.title,
          type: record.type,
          description: record.description,
          source_url: record.source_url,
          deadline: record.deadline,
          deadline_confidence: record.deadline_confidence,
          domain_tags: record.domain_tags || [],
          eligibility: record.eligibility || { 'type': 'all' },
          effort_level: record.effort_level || 'medium',
          competitiveness: record.competitiveness || 'medium',
          is_active: true,
          normalized_title: normalizedTitle,
          normalized_company: normalizedCompany
        }, {
          onConflict: 'normalized_title, normalized_company'
        });

      if (error) {
        console.error(`Error upserting ${record.source_url}:`, error.message);
        failCount++;
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
    }
  }

  return { successCount, skipCount, failCount, newRecords };
}

module.exports = { upsertData };
