require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { upsertData } = require('./upserter');

async function main() {
  const cachePath = path.join(__dirname, 'recon-output', 'last-upsert-cache.json');
  const failedPath = path.join(__dirname, 'recon-output', 'failed-upserts.json');
  
  let records = [];
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      records = [...records, ...data];
    } catch(e) {}
  }
  if (fs.existsSync(failedPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(failedPath, 'utf-8'));
      records = [...records, ...data];
    } catch(e) {}
  }

  console.log(`Found ${records.length} records in local cache to upsert...`);
  
  // Deduplicate by source_url
  const uniqueMap = new Map();
  records.forEach(r => {
    if (r && r.source_url) uniqueMap.set(r.source_url, r);
  });
  
  const uniqueRecords = Array.from(uniqueMap.values());
  console.log(`Deduplicated to ${uniqueRecords.length} unique records.`);

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const result = await upsertData(uniqueRecords, key);
  console.log('\n--- UPSERT RESULT ---');
  console.log(`Success: ${result.successCount}`);
  console.log(`Failed: ${result.failCount}`);
  console.log(`Skipped: ${result.skipCount}`);
  console.log(`New records: ${result.newRecords ? result.newRecords.length : 0}`);
}

main().catch(err => console.error(err));
