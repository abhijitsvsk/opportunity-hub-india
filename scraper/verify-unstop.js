const { chromium } = require('playwright');
const fs = require('fs');

async function checkUnstopAPI() {
  console.log('--- 1. Testing Auth & Headers ---');
  // Fetch with ZERO headers (not even User-Agent)
  const res1 = await fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=5&oppstatus=open');
  if (res1.ok) {
    console.log('✅ API works with absolutely zero headers/cookies.');
  } else {
    console.log('❌ API blocked bare request. Status:', res1.status);
    return;
  }

  const data = await res1.json();
  const records = data.data.data;
  
  console.log('\n--- 2. Testing Pagination Limit ---');
  // Try requesting 100 items
  const resMax = await fetch('https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=1&per_page=100&oppstatus=open');
  const maxData = await resMax.json();
  console.log(`Requested 100 items per page. Received: ${maxData.data.data.length} items.`);
  console.log(`Pagination structure uses: current_page: ${maxData.data.current_page}, last_page: ${maxData.data.last_page}`);

  console.log('\n--- 3. Cross-Checking Deadlines ---');
  // Pick the first 3 records to cross check
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  for (let i = 0; i < Math.min(3, records.length); i++) {
    const record = records[i];
    const url = record.seo_url;
    const apiDeadline = record.regnRequirements.end_regn_dt;
    const apiEventEnd = record.end_date;
    
    console.log(`\nChecking Record ${i+1}: ${record.title}`);
    console.log(`API Application Deadline: ${apiDeadline}`);
    console.log(`API Event End Date:     ${apiEventEnd}`);
    console.log(`URL: ${url}`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(4000); // Wait for React to load
      
      const html = await page.evaluate(() => document.documentElement.innerHTML);
      // We will look for anything matching dates or countdowns in the HTML
      const dateText = html.match(/.{0,50}(registration deadline|apply by|closes?|ends?|deadline).{0,50}/ig);
      
      if (dateText && dateText.length > 0) {
        console.log(`Found deadline-related text on page:`);
        console.log(`  "${dateText[0].trim()}"`);
      } else {
        console.log('No obvious deadline text found on page to cross-check.');
      }
    } catch (e) {
      console.log(`Failed to load page for cross-checking: ${e.message}`);
    }
  }

  await browser.close();
}

checkUnstopAPI().catch(console.error);
