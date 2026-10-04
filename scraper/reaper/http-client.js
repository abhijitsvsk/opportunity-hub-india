const axios = require('axios');
const https = require('https');
const { validateUrlSecurity } = require('./security');

const ipv4Agent = new https.Agent({ family: 4, keepAlive: true, rejectUnauthorized: false });

const USER_AGENT = 'OppHunt-Reaper/1.0 (+https://opphunt.in/bot)';
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB max
const MAX_REDIRECTS = 10;
const TIMEOUT_MS = 10000;

function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};
  return {
    contentType: headers['content-type'] || null,
    contentLength: headers['content-length'] ? parseInt(headers['content-length'], 10) : null,
    server: headers['server'] || null,
    location: headers['location'] || null,
    retryAfter: headers['retry-after'] ? parseInt(headers['retry-after'], 10) : null
  };
}

/**
 * Safe HTTP GET client with SSRF checks, redirect tracking, and sanitized header extraction.
 */
async function safeGet(initialUrl) {
  const redirectChain = [];
  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= MAX_REDIRECTS) {
    // 1. SSRF check at each hop
    const sec = validateUrlSecurity(currentUrl);
    if (!sec.valid) {
      return {
        success: false,
        error: { code: 'SSRF_BLOCKED', message: `SSRF security violation: ${sec.reason}` },
        redirectChain,
        finalUrl: currentUrl
      };
    }

    try {
      const response = await axios.get(currentUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        httpsAgent: ipv4Agent,
        timeout: TIMEOUT_MS,
        maxRedirects: 0, // Handle manually to inspect redirects & SSRF check each step
        validateStatus: () => true, // Accept all status codes without throwing
        responseType: 'text',
        maxContentLength: MAX_BODY_BYTES,
        maxBodyLength: MAX_BODY_BYTES
      });

      const statusCode = response.status;
      const sanitized = sanitizeHeaders(response.headers);

      // Handle 3xx Redirects
      if ([301, 302, 303, 307, 308].includes(statusCode) && response.headers.location) {
        redirectsCount++;
        if (redirectsCount > MAX_REDIRECTS) {
          return {
            success: false,
            error: { code: 'MAX_REDIRECTS_EXCEEDED', message: 'Too many redirects (>10)' },
            statusCode,
            redirectChain,
            finalUrl: currentUrl
          };
        }

        const nextUrl = new URL(response.headers.location, currentUrl).href;
        redirectChain.push({ from: currentUrl, to: nextUrl, status: statusCode });
        currentUrl = nextUrl;
        continue;
      }

      // Final response reached
      const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
      return {
        success: true,
        statusCode,
        headers: sanitized,
        body,
        redirectChain,
        finalUrl: currentUrl
      };

    } catch (err) {
      return {
        success: false,
        error: {
          code: err.code || 'REQUEST_FAILED',
          message: err.message
        },
        redirectChain,
        finalUrl: currentUrl
      };
    }
  }

  return {
    success: false,
    error: { code: 'MAX_REDIRECTS_EXCEEDED', message: 'Exceeded redirect limit' },
    redirectChain,
    finalUrl: currentUrl
  };
}

module.exports = {
  safeGet,
  sanitizeHeaders,
  USER_AGENT
};
