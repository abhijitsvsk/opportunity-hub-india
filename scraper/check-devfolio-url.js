/**
 * Decision 1: Check devfolio.co/hackathons?status=open
 * How many cards does the filtered URL return vs the homepage?
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const urls = [
      'https://devfolio.co/hackathons',
      'https://devfolio.co/hackathons?status=open',
    ];

    for (const url of urls) {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('div[class*="CompactHackathonCard__StyledCard"]', { state: 'visible', timeout: 15000 });
      await page.waitForTimeout(5000);
      // Scroll once to ensure all content loaded
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2500);
      const count = await page.evaluate(() => document.querySelectorAll('div[class*="CompactHackathonCard__StyledCard"]').length);
      await page.screenshot({ path: `recon-output/devfolio-url-test-${count}cards.png`, fullPage: true });
      console.log(`URL: ${url}`);
      console.log(`Cards: ${count}\n`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})();
