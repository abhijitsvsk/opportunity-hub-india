/**
 * Recon script: Navigate to unstop.com/hackathons and unstop.com/internships
 * to inspect the DOM structure, check for infinite scroll, and observe deadline formats.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TARGETS = [
  { name: 'Unstop Hackathons', url: 'https://unstop.com/hackathons' },
  { name: 'Unstop Internships', url: 'https://unstop.com/internships' }
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const target of TARGETS) {
      console.log(`\n========== ${target.name} ==========`);
      console.log(`URL: ${target.url}`);
      
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      try {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(10000); // Wait for Unstop's heavy React SPA to load
        
        // Take a screenshot
        const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await page.screenshot({ path: `recon-output/unstop-${safeName}.png`, fullPage: true });

        // Save HTML snippet to check for card components
        const html = await page.content();
        fs.writeFileSync(`recon-output/unstop-${safeName}-dom.html`, html);

        // Analyze basic card metrics
        const analysis = await page.evaluate(() => {
          // Look for common Unstop card wrappers (often have generic generated class names, but we can look for links)
          // As a heuristic, let's look for anchors that contain standard card elements like images and headings
          const anchors = Array.from(document.querySelectorAll('a'));
          const probableCards = anchors.filter(a => {
            const hasImage = a.querySelector('img') !== null;
            const hasHeading = a.querySelector('h1, h2, h3, h4, h5, h6') !== null;
            const hasEnoughText = a.innerText.trim().length > 50;
            return hasImage && hasHeading && hasEnoughText;
          });

          const buttons = Array.from(document.querySelectorAll('button'));
          const hasLoadMoreButton = buttons.some(b => b.innerText.toLowerCase().includes('load') || b.innerText.toLowerCase().includes('more'));

          return {
            probableCardCount: probableCards.length,
            sampleTexts: probableCards.slice(0, 3).map(c => c.innerText.trim().substring(0, 200)),
            hasLoadMoreButton: hasLoadMoreButton,
            pageHeight: document.body.scrollHeight
          };
        });

        console.log(`Probable Cards Found: ${analysis.probableCardCount}`);
        console.log(`Has 'Load More' button: ${analysis.hasLoadMoreButton}`);
        console.log(`Page Height: ${analysis.pageHeight}`);
        console.log('\nSample Card Texts:');
        analysis.sampleTexts.forEach((text, i) => {
          console.log(`\n--- Card ${i + 1} ---\n${text.replace(/\n+/g, ' | ')}`);
        });

        // Test one scroll
        console.log('\nTesting scroll for pagination/infinite scroll...');
        const initialHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(3000);
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        console.log(`Height changed after scroll: ${initialHeight} -> ${newHeight} (Delta: ${newHeight - initialHeight})`);
        
      } catch (err) {
        console.error(`Failed to analyze ${target.name}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})();
