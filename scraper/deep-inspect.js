/**
 * Deep inspection: Navigate to individual hackathon pages and extract
 * the actual deadline/registration close date vs the date shown on the listing card.
 */
const { chromium } = require('playwright');

const TARGETS = [
  {
    name: 'HackPrix Season 3',
    url: 'https://hackprix-2026.devfolio.co/',
    cardDate: '13/06/26'
  },
  {
    name: 'DeerHack 2026',
    url: 'https://deerhack26.devfolio.co/',
    cardDate: '12/06/26'
  },
  {
    name: 'CodeStorm 2026',
    url: 'https://codestorm-week1-2026.devfolio.co/',
    cardDate: 'LIVE (no date)'
  }
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
      console.log(`Card date: ${target.cardDate}`);

      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

      try {
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);

        // Take a screenshot of each page
        const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        await page.screenshot({
          path: `recon-output/deep-${safeName}.png`,
          fullPage: true
        });

        // Extract all visible text that looks like dates, deadlines, or registration info
        const pageData = await page.evaluate(() => {
          const body = document.body.innerText;

          // Look for common deadline-related phrases
          const patterns = [
            /registration[s]?\s*(closes?|ends?|deadline)[:\s]*(.*)/gi,
            /application[s]?\s*(closes?|ends?|deadline)[:\s]*(.*)/gi,
            /deadline[:\s]*(.*)/gi,
            /closes?\s*on[:\s]*(.*)/gi,
            /ends?\s*on[:\s]*(.*)/gi,
            /apply\s*by[:\s]*(.*)/gi,
            /last\s*date[:\s]*(.*)/gi,
            /submissions?\s*(close|end|deadline)[:\s]*(.*)/gi,
          ];

          const matches = [];
          for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(body)) !== null) {
              matches.push(match[0].trim().substring(0, 120));
            }
          }

          // Also look for any elements that might contain timeline/date info
          const timelineElements = [];
          const candidates = document.querySelectorAll(
            '[class*="timeline"], [class*="Timeline"], [class*="date"], [class*="Date"], ' +
            '[class*="deadline"], [class*="Deadline"], [class*="schedule"], [class*="Schedule"], ' +
            '[class*="registration"], [class*="Registration"]'
          );
          candidates.forEach(el => {
            const text = el.innerText.trim();
            if (text.length > 5 && text.length < 300) {
              timelineElements.push({
                classes: el.className.toString().substring(0, 100),
                text: text
              });
            }
          });

          // Grab all text that contains date-like patterns near "register" or "deadline"
          const lines = body.split('\n').filter(l => l.trim().length > 0);
          const dateContextLines = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/register|deadline|apply|submission|close|end|start|begin/i.test(line)) {
              // Grab this line and the next 2 for context
              const context = lines.slice(i, i + 3).map(l => l.trim()).join(' | ');
              dateContextLines.push(context);
            }
          }

          return {
            title: document.title,
            bodyLength: body.length,
            deadlineMatches: matches,
            timelineElements: timelineElements.slice(0, 10),
            dateContextLines: dateContextLines.slice(0, 15)
          };
        });

        console.log(`\nPage title: ${pageData.title}`);
        console.log(`Body text length: ${pageData.bodyLength} chars`);

        console.log('\n--- Deadline pattern matches ---');
        if (pageData.deadlineMatches.length === 0) {
          console.log('  (none found via regex)');
        } else {
          pageData.deadlineMatches.forEach(m => console.log(`  ${m}`));
        }

        console.log('\n--- Timeline/Date elements ---');
        if (pageData.timelineElements.length === 0) {
          console.log('  (none found)');
        } else {
          pageData.timelineElements.forEach(el => {
            console.log(`  [${el.classes.substring(0, 60)}]`);
            console.log(`    ${el.text}`);
          });
        }

        console.log('\n--- Lines with date context ---');
        if (pageData.dateContextLines.length === 0) {
          console.log('  (none found)');
        } else {
          pageData.dateContextLines.forEach(l => console.log(`  ${l}`));
        }

      } catch (err) {
        console.error(`  Failed to load: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})();
