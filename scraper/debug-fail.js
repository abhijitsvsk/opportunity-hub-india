const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to CodeStorm just like the enricher...');
  await page.goto('https://codestorm-week1-2026.devfolio.co/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait exactly 3 seconds as in devfolio.js
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'recon-output/debug-fail.png', fullPage: true });
  
  const html = await page.evaluate(() => document.documentElement.innerHTML);
  fs.writeFileSync('recon-output/debug-fail.html', html);
  
  const countdownMatch = html.match(/(?:APPLICATIONS CLOSE IN|closes? in|ends? in)[\s\S]{0,200}?(\d+d:\d+h:\d+m)/i);
  console.log('Countdown match found:', !!countdownMatch);
  if (countdownMatch) {
    console.log('Match content:', countdownMatch[1]);
  } else {
    // Check if Cloudflare is blocking
    if (html.includes('Cloudflare') || html.includes('Just a moment...')) {
      console.log('❌ BLOCKED BY CLOUDFLARE!');
    } else {
      console.log('❌ NO COUNTDOWN, NO CLOUDFLARE. Did it render?');
      // Look for the "Apply now" button to see if it even rendered the main UI
      console.log('Apply button present:', html.includes('Apply now'));
    }
  }
  
  await browser.close();
})();
