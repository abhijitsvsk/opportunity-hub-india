require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { isRelevantForIndianStudent } = require('./utils/geo-filter');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runCleanup() {
  console.log('Fetching all active opportunities for retroactive geo-filtering...');
  let allActive = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, description, source_url, is_active')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching records:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allActive.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Fetched ${allActive.length} total active records. Evaluating geo-relevance...`);
  const idsToDeactivate = [];

  for (const record of allActive) {
    const url = (record.source_url || '').toLowerCase();

    // Flagship global programs, Devfolio hackathons, and Discord community announcements are preserved
    if (url.includes('devfolio.co') || url.includes('discord.com') ||
        url.includes('summerofcode') || url.includes('mlh.io') ||
        url.includes('lfx.linuxfoundation') || url.includes('outreachy') ||
        url.includes('hacktoberfest') || url.includes('gssoc')) {
      continue;
    }

    // Extract explicit location from description (SimplifyJobs format: "located in <location>.")
    const locMatch = (record.description || '').match(/located in ([^.]+)/i);
    const location = locMatch ? locMatch[1].trim() : '';
    const text = (record.title || '') + ' ' + (record.description || '');

    if (!isRelevantForIndianStudent(location, text)) {
      idsToDeactivate.push(record.id);
    }
  }

  console.log(`Identified ${idsToDeactivate.length} US-only / ineligible records to deactivate.`);
  const BATCH_SIZE = 100;
  let deactivatedCount = 0;

  for (let i = 0; i < idsToDeactivate.length; i += BATCH_SIZE) {
    const batch = idsToDeactivate.slice(i, i + BATCH_SIZE);
    const { error: updateErr } = await supabase
      .from('opportunities')
      .update({ is_active: false })
      .in('id', batch);

    if (updateErr) {
      console.error(`Batch update error: ${updateErr.message}`);
    } else {
      deactivatedCount += batch.length;
    }
  }

  const totalProcessed = allActive.length;

  console.log('\n=========================================');
  console.log('Cleanup complete!');
  console.log(`Total active records evaluated: ${totalProcessed}`);
  console.log(`Deactivated (US-only / ineligible): ${deactivatedCount}`);
  console.log(`Remaining active opportunities: ${totalProcessed - deactivatedCount}`);
  console.log('=========================================');

  // Note 1 Verification: Check active Discord records
  const { count: discordActiveCount } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .ilike('source_url', '%discord.com%');

  console.log(`Active Discord opportunities count: ${discordActiveCount}`);
}

if (require.main === module) {
  runCleanup().catch(console.error);
}

module.exports = { runCleanup };

