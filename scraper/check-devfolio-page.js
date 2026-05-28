const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log('Navigating to CodeStorm...');
  await page.goto('https://codestorm-week1-2026.devfolio.co/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  // Wait a bit for React to render everything
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'recon-output/codestorm-debug.png', fullPage: true });
  
  const text = await page.evaluate(() => {
    // Specifically look around the apply button or deadline area
    const applySection = document.body.innerText.match(/.{0,200}(APPLY|CLOSE|START|END|LIVE|CLOSED).{0,200}/ig);
    return applySection ? applySection.join('\n---\n') : 'No keywords found';
  });
  
  console.log('\n--- DOM TEXT AROUND KEYWORDS ---');
  console.log(text);
  
  const html = await page.content();
  fs.writeFileSync('recon-output/codestorm-debug.html', html);
  
  await browser.close();
})();
