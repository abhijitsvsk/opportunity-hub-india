/**
 * Scroll diagnostic: run the scroll loop with detailed per-iteration logging
 * to confirm whether the loop exhausts all available Devfolio content.
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

    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let unchangedCount = 0;
    let scrollCount = 0;
    const MAX_SCROLLS = 50;

    console.log('--- SCROLL LOOP DIAGNOSTIC ---\n');

    while (unchangedCount < 2 && scrollCount < MAX_SCROLLS) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2500);

      const newHeight = await page.evaluate('document.body.scrollHeight');
      const cardCount = await page.evaluate(
        () => document.querySelectorAll('div[class*="CompactHackathonCard__StyledCard"]').length
      );

      scrollCount++;
      const heightChanged = newHeight !== lastHeight;

      if (!heightChanged) {
        unchangedCount++;
      } else {
        unchangedCount = 0;
        lastHeight = newHeight;
      }

      console.log(
        `Scroll #${scrollCount}: cards=${cardCount}, height=${newHeight}, ` +
        `changed=${heightChanged}, unchangedStreak=${unchangedCount}`
      );
    }

    const exitReason = scrollCount >= MAX_SCROLLS
      ? `HIT MAX CAP (${MAX_SCROLLS})`
      : `NO NEW CONTENT after ${unchangedCount} consecutive scrolls`;

    const finalCardCount = await page.evaluate(
      () => document.querySelectorAll('div[class*="CompactHackathonCard__StyledCard"]').length
    );

    console.log(`\n--- RESULT ---`);
    console.log(`Exit reason: ${exitReason}`);
    console.log(`Total scrolls: ${scrollCount}`);
    console.log(`Final card count: ${finalCardCount}`);

  } finally {
    await browser.close();
  }
})();
