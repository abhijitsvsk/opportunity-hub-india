/**
 * Devfolio Hackathon Scraper
 * 
 * Extracts raw text content from hackathon listing cards on devfolio.co/hackathons.
 * 
 * IMPORTANT: The CSS selectors in SELECTORS must be verified against the real DOM
 * by running recon-devfolio.js first. Do not guess selectors.
 * 
 * Architecture:
 *   - Playwright loads the page and executes JavaScript (required for React SPAs)
 *   - Infinite scroll loads all listings with a hard cap to prevent runaway loops
 *   - Card elements are identified using verified CSS selectors
 *   - Raw text is extracted and filtered for minimum quality signals
 *   - Output is an array of { source_url, raw_text } objects
 * 
 * This module exports scrapeDevfolio() and does not self-invoke.
 * Use run-local.js for manual testing or the pipeline orchestrator for production.
 */

const { chromium } = require('playwright');

// ===========================================================================
// SELECTORS — Update these ONLY after running recon-devfolio.js and inspecting
// the real DOM. Every selector here must be verified against recon-dom.html.
// ===========================================================================
const SELECTORS = {
  // The CSS selector that matches individual hackathon card containers.
  // Set to null until recon is complete. The scraper will refuse to run
  // if this is null, forcing you to do recon first.
  CARD_CONTAINER: null,

  // The CSS selector (relative to a card) for the anchor tag containing the hackathon URL.
  // If the card itself is an <a> tag, set this to null and the card's href will be used.
  CARD_LINK: null,
};

// ===========================================================================
// CONFIGURATION
// ===========================================================================
const CONFIG = {
  TARGET_URL: 'https://devfolio.co/hackathons',
  NAVIGATION_TIMEOUT_MS: 30000,
  CARD_WAIT_TIMEOUT_MS: 15000,
  SCROLL_PAUSE_MS: 2500,
  MAX_SCROLL_ITERATIONS: 50,          // Hard cap to prevent infinite loops
  UNCHANGED_SCROLLS_BEFORE_STOP: 2,   // Stop scrolling after N scrolls with no new content
  MAX_NAVIGATION_RETRIES: 3,
  RETRY_DELAY_MS: 3000,
  MIN_RAW_TEXT_LENGTH: 150,            // Minimum characters for a card to be considered valid
};

// ===========================================================================
// DATE VALIDATION — Require a real date pattern, not just any number
// ===========================================================================
// Matches patterns like: "Jan 15", "15 Jan", "2025-01-15", "01/15/2025", "January 15"
const DATE_PATTERN = new RegExp(
  [
    // Full or abbreviated month names followed by a number
    '(?:january|february|march|april|may|june|july|august|september|october|november|december|' +
    'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)' +
    '\\s+\\d{1,2}',
    // Number followed by month name
    '\\d{1,2}\\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|' +
    'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',
    // ISO-like dates: 2025-01-15
    '\\d{4}-\\d{2}-\\d{2}',
    // Slash dates: 01/15/2025 or 15/01/2025
    '\\d{1,2}/\\d{1,2}/\\d{2,4}',
  ].join('|'),
  'i'
);

/**
 * Scrapes hackathon listings from Devfolio.
 * 
 * @returns {Promise<Array<{source_url: string, raw_text: string}>>}
 * @throws {Error} If selectors are not configured, navigation fails, or zero results are extracted
 */
async function scrapeDevfolio() {
  // ---- Guard: Refuse to run with unconfigured selectors ----
  if (!SELECTORS.CARD_CONTAINER) {
    throw new Error(
      'SELECTORS.CARD_CONTAINER is null. Run recon-devfolio.js first to identify ' +
      'the correct CSS selector for hackathon cards, then update SELECTORS in devfolio.js.'
    );
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

    // ---- Navigation with retry ----
    let navigationSuccess = false;
    for (let attempt = 1; attempt <= CONFIG.MAX_NAVIGATION_RETRIES; attempt++) {
      try {
        console.log(`Navigating to ${CONFIG.TARGET_URL} (attempt ${attempt}/${CONFIG.MAX_NAVIGATION_RETRIES})...`);
        await page.goto(CONFIG.TARGET_URL, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.NAVIGATION_TIMEOUT_MS
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        console.warn(`Navigation attempt ${attempt} failed: ${error.message}`);
        if (attempt === CONFIG.MAX_NAVIGATION_RETRIES) {
          throw new Error(
            `Failed to navigate to ${CONFIG.TARGET_URL} after ${CONFIG.MAX_NAVIGATION_RETRIES} attempts. ` +
            `Last error: ${error.message}`
          );
        }
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS));
      }
    }

    // ---- Wait for cards to render ----
    console.log(`Waiting for card elements to appear (selector: "${SELECTORS.CARD_CONTAINER}")...`);
    try {
      await page.waitForSelector(SELECTORS.CARD_CONTAINER, {
        state: 'visible',
        timeout: CONFIG.CARD_WAIT_TIMEOUT_MS
      });
    } catch (error) {
      throw new Error(
        `Card selector "${SELECTORS.CARD_CONTAINER}" did not appear within ${CONFIG.CARD_WAIT_TIMEOUT_MS}ms. ` +
        `The DOM structure may have changed. Re-run recon-devfolio.js to verify selectors. ` +
        `Original error: ${error.message}`
      );
    }

    // ---- Infinite scroll with hard cap ----
    console.log('Scrolling to load all listings...');
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let unchangedCount = 0;
    let scrollCount = 0;

    while (unchangedCount < CONFIG.UNCHANGED_SCROLLS_BEFORE_STOP && scrollCount < CONFIG.MAX_SCROLL_ITERATIONS) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(CONFIG.SCROLL_PAUSE_MS);

      const newHeight = await page.evaluate('document.body.scrollHeight');
      scrollCount++;

      if (newHeight === lastHeight) {
        unchangedCount++;
      } else {
        unchangedCount = 0;
        lastHeight = newHeight;
      }

      // Log progress every 5 scrolls
      if (scrollCount % 5 === 0) {
        const cardCount = await page.evaluate(
          (sel) => document.querySelectorAll(sel).length,
          SELECTORS.CARD_CONTAINER
        );
        console.log(`  Scroll ${scrollCount}: ${cardCount} cards loaded so far...`);
      }
    }

    if (scrollCount >= CONFIG.MAX_SCROLL_ITERATIONS) {
      console.warn(`Hit maximum scroll cap (${CONFIG.MAX_SCROLL_ITERATIONS}). Some listings may not be loaded.`);
    }

    // ---- Extract card data ----
    console.log('Extracting raw card data...');
    const extractedData = await page.evaluate(
      ({ cardSelector, linkSelector, minLength, datePatternStr }) => {
        const dateRegex = new RegExp(datePatternStr, 'i');
        const cards = Array.from(document.querySelectorAll(cardSelector));
        const results = [];
        const seenUrls = new Set();

        cards.forEach(card => {
          // Get the URL: either from a child link element or from the card itself if it's an <a>
          let url;
          if (linkSelector) {
            const linkEl = card.querySelector(linkSelector);
            url = linkEl ? linkEl.href : null;
          } else {
            url = card.href || card.closest('a')?.href || null;
          }

          if (!url) return;

          const rawText = card.innerText.trim();

          // Quality filters:
          // 1. Minimum text length to exclude nav elements and buttons
          // 2. Must contain a recognizable date pattern (not just any number)
          // 3. No duplicate URLs
          if (rawText.length >= minLength && dateRegex.test(rawText) && !seenUrls.has(url)) {
            seenUrls.add(url);
            results.push({
              source_url: url,
              raw_text: rawText
            });
          }
        });

        return results;
      },
      {
        cardSelector: SELECTORS.CARD_CONTAINER,
        linkSelector: SELECTORS.CARD_LINK,
        minLength: CONFIG.MIN_RAW_TEXT_LENGTH,
        datePatternStr: DATE_PATTERN.source
      }
    );

    // ---- Zero results = failure ----
    if (extractedData.length === 0) {
      throw new Error(
        'Extraction returned 0 records. This likely means the CSS selectors are wrong or ' +
        'the page structure has changed. Re-run recon-devfolio.js and update SELECTORS.'
      );
    }

    console.log(`Successfully extracted ${extractedData.length} hackathon cards.`);
    return extractedData;

  } finally {
    // Always close the browser, even if extraction throws
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

module.exports = { scrapeDevfolio };
