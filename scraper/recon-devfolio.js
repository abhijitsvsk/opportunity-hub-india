/**
 * Devfolio DOM Reconnaissance Script
 * 
 * Purpose: Navigate to devfolio.co/hackathons, wait for the React app to render,
 * then dump three artifacts for manual inspection:
 *   1. A full-page screenshot (recon-screenshot.png)
 *   2. The full rendered HTML (recon-dom.html)
 *   3. A structural summary of the DOM (logged to console)
 * 
 * This script must run BEFORE writing any extraction selectors.
 * The output of this script determines what selectors devfolio.js will use.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function reconDevfolio() {
  const outputDir = path.join(__dirname, 'recon-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });

    console.log('Navigating to https://devfolio.co/hackathons ...');
    await page.goto('https://devfolio.co/hackathons', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait generously for the React app to hydrate and render content.
    // We use a broad wait here because we don't know the selectors yet.
    console.log('Waiting 10 seconds for React to render...');
    await page.waitForTimeout(10000);

    // --- Artifact 1: Full-page screenshot ---
    const screenshotPath = path.join(outputDir, 'recon-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // --- Artifact 2: Full rendered HTML dump ---
    const html = await page.content();
    const htmlPath = path.join(outputDir, 'recon-dom.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log(`Full HTML saved: ${htmlPath} (${(html.length / 1024).toFixed(0)} KB)`);

    // --- Artifact 3: DOM structural analysis ---
    const analysis = await page.evaluate(() => {
      // Find all anchor tags and categorize their href patterns
      const allAnchors = Array.from(document.querySelectorAll('a'));
      const hrefPatterns = {};
      allAnchors.forEach(a => {
        const href = a.href || '(no href)';
        // Bucket by domain pattern
        let pattern;
        try {
          const url = new URL(href);
          pattern = url.hostname;
        } catch {
          pattern = href.substring(0, 50);
        }
        hrefPatterns[pattern] = (hrefPatterns[pattern] || 0) + 1;
      });

      // Find elements that look like card containers (common patterns)
      const cardCandidates = [];
      const selectors = [
        '[class*="card"]',
        '[class*="Card"]',
        '[class*="hackathon"]',
        '[class*="Hackathon"]',
        '[class*="listing"]',
        '[class*="Listing"]',
        '[class*="event"]',
        '[class*="Event"]',
        '[class*="item"]',
        '[class*="Item"]',
        'article',
        '[data-testid]',
        '[role="listitem"]',
        '[role="article"]'
      ];

      selectors.forEach(sel => {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          // For each matching element, grab its tag, class list, and a text preview
          const samples = Array.from(elements).slice(0, 3).map(el => ({
            tag: el.tagName.toLowerCase(),
            classes: el.className ? el.className.toString().substring(0, 200) : '(none)',
            childCount: el.children.length,
            textPreview: el.innerText ? el.innerText.substring(0, 120).replace(/\n/g, ' ') : '(empty)'
          }));
          cardCandidates.push({
            selector: sel,
            count: elements.length,
            samples
          });
        }
      });

      // Find the main content area and its direct children structure
      const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('#__next') || document.body;
      const mainChildren = Array.from(main.children).slice(0, 10).map(el => ({
        tag: el.tagName.toLowerCase(),
        classes: el.className ? el.className.toString().substring(0, 200) : '(none)',
        childCount: el.children.length
      }));

      return {
        title: document.title,
        totalAnchors: allAnchors.length,
        hrefPatterns,
        cardCandidates,
        mainStructure: { tag: main.tagName.toLowerCase(), children: mainChildren },
        bodyTextLength: document.body.innerText.length
      };
    });

    // Log the analysis
    console.log('\n======= DOM STRUCTURAL ANALYSIS =======\n');
    console.log(`Page title: ${analysis.title}`);
    console.log(`Body text length: ${analysis.bodyTextLength} characters`);
    console.log(`Total anchor tags: ${analysis.totalAnchors}`);

    console.log('\n--- Anchor href patterns (by domain) ---');
    const sortedPatterns = Object.entries(analysis.hrefPatterns).sort((a, b) => b[1] - a[1]);
    sortedPatterns.forEach(([pattern, count]) => {
      console.log(`  ${count}x  ${pattern}`);
    });

    console.log('\n--- Card-like element candidates ---');
    if (analysis.cardCandidates.length === 0) {
      console.log('  (none found — selectors may need manual inspection of recon-dom.html)');
    } else {
      analysis.cardCandidates.forEach(c => {
        console.log(`\n  Selector: ${c.selector} (${c.count} matches)`);
        c.samples.forEach((s, i) => {
          console.log(`    Sample ${i + 1}: <${s.tag}> classes="${s.classes}" children=${s.childCount}`);
          console.log(`             text: "${s.textPreview}"`);
        });
      });
    }

    console.log('\n--- Main content area structure ---');
    console.log(`  Root: <${analysis.mainStructure.tag}>`);
    analysis.mainStructure.children.forEach((ch, i) => {
      console.log(`  Child ${i}: <${ch.tag}> classes="${ch.classes}" children=${ch.childCount}`);
    });

    // Save analysis as JSON too
    const analysisPath = path.join(outputDir, 'recon-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8');
    console.log(`\nAnalysis JSON saved: ${analysisPath}`);

    console.log('\n======= RECON COMPLETE =======');
    console.log('Next step: Inspect recon-screenshot.png and recon-dom.html to identify the exact selectors for hackathon cards.');

  } catch (error) {
    console.error('Recon failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

reconDevfolio();
