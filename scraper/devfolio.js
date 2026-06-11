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
  // Verified from recon-output/recon-dom.html (2026-05-28)
  // Card container: <div class="... CompactHackathonCard__StyledCard-sc-HASH ...">
  // Using the stable component name prefix. The hash suffix (sc-4be46104-0) may change
  // on Devfolio deploys, but "CompactHackathonCard__StyledCard" is the component name
  // which is stable across builds.
  CARD_CONTAINER: 'div[class*="CompactHackathonCard__StyledCard"]',

  // Link inside card: <a href="https://[slug].devfolio.co/" class="Link__LinkBase-sc-...">
  // The hackathon URL is inside the card, not wrapping it.
  // Using the Link component class prefix for stability.
  CARD_LINK: 'a[class*="Link__LinkBase"]',
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
  MIN_RAW_TEXT_LENGTH: 50,             // Calibrated: real Devfolio cards are 98-120 chars
};

// ===========================================================================
// CONTENT VALIDATION
// ===========================================================================
// Date pattern is NOT used as a hard filter because live hackathons on Devfolio
// show "LIVE" instead of a date. Instead, we validate that the card contains
// the word "Hackathon" (or similar type indicator) as a basic quality signal
// that this is a real listing card and not a navigation element.
const CARD_TYPE_PATTERN = /hackathon|fellowship|competition|challenge|buildathon/i;

/**
 * Scrapes hackathon listings from Devfolio.
 * 
 * @returns {Promise<Array<{source_url: string, raw_text: string}>>}
 * @throws {Error} If selectors are not configured, navigation fails, or zero results are extracted
 */
async function scrapeDevfolio(options = {}) {
  const existingUrls = options.existingUrls || new Set();
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
      ({ cardSelector, linkSelector, minLength, typePatternStr }) => {
        const typeRegex = new RegExp(typePatternStr, 'i');
        const cards = Array.from(document.querySelectorAll(cardSelector));
        const results = [];
        const seenUrls = new Set();

        cards.forEach(card => {
          // Get the URL from the Link__LinkBase anchor inside the card
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
          // 2. Must contain a type keyword (e.g., "Hackathon") to confirm it's a real listing
          // 3. No duplicate URLs
          if (rawText.length >= minLength && typeRegex.test(rawText) && !seenUrls.has(url)) {
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
        typePatternStr: CARD_TYPE_PATTERN.source
      }
    );

    // ---- Zero results = failure ----
    if (extractedData.length === 0) {
      throw new Error(
        'Extraction returned 0 records. This likely means the CSS selectors are wrong or ' +
        'the page structure has changed. Re-run recon-devfolio.js and update SELECTORS.'
      );
    }

    console.log(`Successfully extracted ${extractedData.length} hackathon cards from listing.`);

    // ---- Filter ENDED & Cached cards ----
    const activeCards = [];
    let endedCount = 0;
    let cachedCount = 0;
    
    extractedData.forEach(card => {
      if (/ENDED/i.test(card.raw_text)) {
        endedCount++;
      } else if (existingUrls.has(card.source_url)) {
        cachedCount++;
      } else {
        activeCards.push(card);
      }
    });

    console.log(`Filtered out ${endedCount} ended and ${cachedCount} already-scraped hackathons. ${activeCards.length} remaining for deep scrape.`);

    // ---- Deep Scrape Enricher ----
    const enrichedData = [];
    for (let i = 0; i < activeCards.length; i++) {
      const card = activeCards[i];
      console.log(`[${i + 1}/${activeCards.length}] Deep scraping: ${card.source_url}`);
      
      const detailPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      let deadline = null;
      let deadlineConfidence = 'unknown';
      let fullText = card.raw_text;

      try {
        await detailPage.goto(card.source_url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait a short bit for React to render countdowns
        await detailPage.waitForTimeout(6000);

        const pageData = await detailPage.evaluate(() => {
          const bodyText = document.body.innerText;
          const htmlText = document.documentElement.innerHTML;
          
          // Look for countdown pattern in HTML since innerText might sometimes drop it due to layout
          let countdownStr = null;
          const countdownMatch = htmlText.match(/(?:APPLICATIONS CLOSE IN|closes? in|ends? in)[\s\S]{0,200}?(\d+d:\d+h:\d+m)/i);
          if (countdownMatch && countdownMatch[1]) {
            countdownStr = countdownMatch[1];
          }

          // Fallback: look for static dates in the text like "STARTS 25/07/26", "ENDS 13/06/26"
          let staticDateStr = null;
          const staticMatch = bodyText.match(/(?:STARTS?|ENDS?|DEADLINE|CLOSES?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
          if (staticMatch && staticMatch[1]) {
            staticDateStr = staticMatch[1];
          }

          return {
            fullText: bodyText.trim(),
            countdownStr: countdownStr,
            staticDateStr: staticDateStr
          };
        });

        if (pageData.fullText) {
          // Combine card text (which has theme tags) with full page text
          fullText = card.raw_text + '\n\n--- DETAILS ---\n' + pageData.fullText;
        }

        if (pageData.countdownStr) {
          // Parse "Xd:Yh:Zm"
          const parts = pageData.countdownStr.match(/(\d+)d:(\d+)h:(\d+)m/);
          if (parts) {
            const days = parseInt(parts[1], 10);
            const hours = parseInt(parts[2], 10);
            const minutes = parseInt(parts[3], 10);
            
            const msToAdd = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
            const absoluteDeadline = new Date(Date.now() + msToAdd);
            absoluteDeadline.setMinutes(0, 0, 0);
            
            deadline = absoluteDeadline.toISOString();
            deadlineConfidence = 'computed_from_countdown';
            console.log(`  -> Found countdown: ${pageData.countdownStr} => ${deadline}`);
          }
        } else if (pageData.staticDateStr) {
          // Parse DD/MM/YY
          const parts = pageData.staticDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
          if (parts) {
            const day = parts[1].padStart(2, '0');
            const month = parts[2].padStart(2, '0');
            let year = parts[3];
            if (year.length === 2) year = '20' + year; // Convert 26 to 2026
            
            deadline = `${year}-${month}-${day}T23:59:59Z`;
            deadlineConfidence = 'extracted_from_text';
            console.log(`  -> Found static date: ${pageData.staticDateStr} => ${deadline} (Note: may be a start date, not application deadline)`);
            
            // Add explicit note to text for Gemini
            fullText += `\n\nNOTE: A date was extracted from the text: ${pageData.staticDateStr}. This may be the event start date, not the application deadline.`;
          }
        } else {
          console.log(`  -> No countdown or static date found. Marking as deadline_unknown.`);
        }
      } catch (err) {
        console.warn(`  -> Failed to load or extract from ${card.source_url}: ${err.message}. Marking as deadline_unknown.`);
      } finally {
        await detailPage.close();
      }

      // We only take the first 3000 chars of fullText to save Gemini tokens, 
      // but keep enough context to extract the needed fields.
      const truncatedText = fullText.substring(0, 3000);

      enrichedData.push({
        source_url: card.source_url,
        raw_text: truncatedText,
        deadline: deadline,
        deadline_confidence: deadlineConfidence
      });
    }

    console.log(`Deep scrape complete. Returning ${enrichedData.length} enriched records.`);
    return enrichedData;

  } finally {
    // Always close the browser, even if extraction throws
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

module.exports = { scrapeDevfolio };
