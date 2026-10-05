/**
 * Central Ingestion URL Sanitizer & Canonicalizer
 * Enforces strict URL invariants across all 15 scrapers before storage or structuring.
 */

// Tracking and ephemeral session parameters to strip
const STRIP_QUERY_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'session_id', 'jsessionid', 'trk',
  'ref', 'source', 'spm', 'feature', 'app_click', '_ga', '_gl'
]);

/**
 * Sanitizes and canonicalizes any raw opportunity URL.
 * Returns: { valid: boolean, url: string, originalUrl: string, error?: string }
 */
function sanitizeOpportunityUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, url: '', originalUrl: rawUrl, error: 'empty_or_non_string' };
  }

  let cleaned = rawUrl.trim();

  // Strip wrapping markdown, brackets, or quotes: <http://...>, [http://...], "http://..."
  cleaned = cleaned.replace(/^<|>$/g, '').replace(/^\[|\]$/g, '').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();

  // 1. Scheme Check & Auto-upgrade
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned;
  } else if (cleaned.startsWith('http://')) {
    // Attempt https upgrade for standard domains
    cleaned = 'https://' + cleaned.slice(7);
  } else if (!cleaned.startsWith('https://')) {
    return { valid: false, url: cleaned, originalUrl: rawUrl, error: 'missing_http_scheme' };
  }

  // 2. Collapse double or triple slashes in pathname (e.g. https://company.com//careers//job/123)
  // Preserve protocol slashes: https://
  cleaned = cleaned.replace(/(https?:\/\/)(.*)/i, (_, proto, rest) => {
    return proto + rest.replace(/\/{2,}/g, '/');
  });

  // 3. Fix double URL encoding (e.g. %2520 -> %20)
  if (cleaned.includes('%25')) {
    try {
      cleaned = decodeURI(cleaned);
    } catch {}
  }

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch {
    return { valid: false, url: cleaned, originalUrl: rawUrl, error: 'malformed_url_syntax' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Invariant: Discord Private Message Links
  // Discord message permalinks require private guild auth and must never be stored as public application URLs
  if (hostname.includes('discord.com') && parsed.pathname.includes('/channels/')) {
    return {
      valid: false,
      url: cleaned,
      originalUrl: rawUrl,
      error: 'raw_discord_channel_permalink_forbidden'
    };
  }

  // 5. Invariant: Y Combinator Job URL Domain Canonicalization
  // Workatastartup.com returns 404 for /companies/<slug>/jobs/<id-slug>.
  // The actual public posting is strictly hosted on www.ycombinator.com
  if (
    (hostname.includes('workatastartup.com') || hostname.includes('ycombinator.com')) &&
    parsed.pathname.includes('/companies/') &&
    parsed.pathname.includes('/jobs/')
  ) {
    parsed.protocol = 'https:';
    parsed.hostname = 'www.ycombinator.com';
  }

  // 6. Invariant: Auth Gate Unwrapping (e.g. YC or portal authentication gateways)
  if (hostname.includes('account.ycombinator.com') && parsed.pathname.includes('/authenticate')) {
    const continueParam = parsed.searchParams.get('continue');
    if (continueParam) {
      try {
        const decodedContinue = decodeURIComponent(continueParam);
        // If continue is a workatastartup application link, preserve company page fallback if known
        parsed = new URL(decodedContinue);
      } catch {}
    }
  }

  // 7. Strip tracking & session noise from query string
  const cleanedParams = new URLSearchParams();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (!STRIP_QUERY_PARAMS.has(key.toLowerCase()) && !key.toLowerCase().startsWith('utm_')) {
      cleanedParams.append(key, value);
    }
  }

  parsed.search = cleanedParams.toString() ? `?${cleanedParams.toString()}` : '';

  // 8. Normalize pathname (strip trailing slash for consistency on slugs, except root /)
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  const finalUrl = parsed.toString();

  return {
    valid: true,
    url: finalUrl,
    originalUrl: rawUrl
  };
}

module.exports = {
  sanitizeOpportunityUrl
};
