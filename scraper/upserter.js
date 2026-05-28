const { createClient } = require('@supabase/supabase-js');

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
  
  for (const record of records) {
    if (record.error) {
      console.warn(`Skipping record due to error: ${record.error}`);
      skipCount++;
      continue;
    }

    try {
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
          eligibility: record.eligibility || null,
          effort_level: record.effort_level || null,
          competitiveness: record.competitiveness || null,
          is_active: true
        }, {
          onConflict: 'source_url'
        });

      if (error) {
        console.error(`Error upserting ${record.source_url}:`, error.message);
        skipCount++;
      } else {
        console.log(`Upserted: ${record.title}`);
        successCount++;
      }
    } catch (err) {
      console.error(`Exception upserting ${record.source_url}:`, err.message);
      skipCount++;
    }
  }

  return { successCount, skipCount };
}

module.exports = { upsertData };
