/**
 * Diagnostic script: dumps raw card text WITHOUT any filters
 * to understand why extraction returned 0 results.
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://devfolio.co/hackathons', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForSelector('div[class*="CompactHackathonCard__StyledCard"]', {
      state: 'visible',
      timeout: 15000
    });

    // Wait a bit for full render
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const cards = document.querySelectorAll('div[class*="CompactHackathonCard__StyledCard"]');
      return Array.from(cards).slice(0, 5).map((card, i) => {
        const link = card.querySelector('a[class*="Link__LinkBase"]');
        const rawText = card.innerText.trim();

        // Check date pattern
        const datePattern = /(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}|\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/i;

        return {
          index: i,
          textLength: rawText.length,
          hasDate: datePattern.test(rawText),
          url: link ? link.href : 'NO LINK FOUND',
          text: rawText
        };
      });
    });

    console.log('Total cards found:', data.length);
    console.log('\n--- RAW CARD DATA (first 5) ---\n');
    data.forEach(d => {
      console.log(`Card ${d.index}:`);
      console.log(`  Text length: ${d.textLength}`);
      console.log(`  Has date: ${d.hasDate}`);
      console.log(`  URL: ${d.url}`);
      console.log(`  Full text: "${d.text}"`);
      console.log('');
    });
  } finally {
    await browser.close();
  }
})();
