require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verify() {
  console.log('--- VERIFYING SUPABASE DATABASE STATE ---');
  
  // 1. Check if scraper_state table exists
  const { data: stateData, error: stateErr } = await sb.from('scraper_state').select('*').limit(1);
  if (stateErr) {
    console.log('? scraper_state table:', stateErr.message);
  } else {
    console.log('? scraper_state table: EXISTS');
  }

  // 2. Check if type: 'competition' is allowed
  const testUrlType = 'https://check-verification.com/type-test';
  await sb.from('opportunities').delete().eq('source_url', testUrlType);
  const { error: typeErr } = await sb.from('opportunities').insert({
    title: 'Verification Test Competition',
    description: 'test',
    effort_level: 'low',
    competitiveness: 'low',
    type: 'competition',
    source_url: testUrlType
  });
  if (typeErr) {
    console.log('? opportunities_type_check allows competition:', typeErr.message);
  } else {
    console.log('? opportunities_type_check allows competition: YES');
    await sb.from('opportunities').delete().eq('source_url', testUrlType);
  }

  // 3. Check if unique_normalized_opportunity constraint is dropped
  const url1 = 'https://check-verification.com/dup1';
  const url2 = 'https://check-verification.com/dup2';
  await sb.from('opportunities').delete().in('source_url', [url1, url2]);
  const r1 = await sb.from('opportunities').insert({
    title: 'Test Duplicate',
    description: 'test',
    effort_level: 'low',
    competitiveness: 'low',
    normalized_title: 'test duplicate check',
    normalized_company: 'test company check',
    type: 'internship',
    source_url: url1
  });
  const r2 = await sb.from('opportunities').insert({
    title: 'Test Duplicate',
    description: 'test',
    effort_level: 'low',
    competitiveness: 'low',
    normalized_title: 'test duplicate check',
    normalized_company: 'test company check',
    type: 'internship',
    source_url: url2
  });
  if (r2.error && r2.error.message.includes('unique_normalized_opportunity')) {
    console.log('? unique_normalized_opportunity constraint: STILL ACTIVE');
  } else if (!r2.error) {
    console.log('? unique_normalized_opportunity constraint: DROPPED');
  } else {
    console.log('?? Other result:', r2.error.message);
  }
  await sb.from('opportunities').delete().in('source_url', [url1, url2]);
}

verify().catch(console.error);

