const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const apiUrls = [];
  page.on('response', async response => {
    const url = response.url();
    // Look for XHR/fetch requests returning JSON
    if (response.request().resourceType() === 'fetch' || response.request().resourceType() === 'xhr') {
      if (url.includes('api') || url.includes('hackathons') || url.includes('search')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            apiUrls.push(url);
            console.log(`\nPotential API Endpoint: ${url}`);
            // Let's print a small preview of the JSON
            const json = await response.json();
            const preview = JSON.stringify(json).substring(0, 200);
            console.log(`Preview: ${preview}...`);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  });

  console.log('Navigating to Unstop...');
  await page.goto('https://unstop.com/hackathons', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Try to trigger pagination
  console.log('Scrolling...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);
  
  // Try scrolling within potential scrollable containers
  await page.evaluate(() => {
    const scrollables = Array.from(document.querySelectorAll('div')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll';
    });
    if (scrollables.length > 0) {
      scrollables[0].scrollTop = scrollables[0].scrollHeight;
    }
  });
  await page.waitForTimeout(3000);

  console.log(`\nFound ${apiUrls.length} potential JSON API requests.`);
  await browser.close();
})();
