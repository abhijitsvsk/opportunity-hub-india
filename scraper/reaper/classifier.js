const { getSourceAdapter, generic } = require('./sources');

/**
 * 8-State Classification Engine with Strict Precedence
 * States:
 *   1. HEALTHY
 *   2. DEAD
 *   3. CLOSED
 *   4. BLOCKED
 *   5. ACCESS_RESTRICTED
 *   6. TEMP_ERROR
 *   7. SUSPECT
 *   8. SOFT_DEAD
 */

const CLOUDFLARE_WAF_PATTERNS = [
  /attention required! \| cloudflare/i,
  /cf-browser-verification/i,
  /challenge-platform/i,
  /just a moment\.\.\.<\/title>/i,
  /<div id="challenge-stage">/i
];

function isWafChallenge(html) {
  if (!html || typeof html !== 'string') return false;
  return CLOUDFLARE_WAF_PATTERNS.some(p => p.test(html));
}

function isCareerRootRedirect(initialUrl, finalUrl) {
  try {
    const initObj = new URL(initialUrl);
    const finalObj = new URL(finalUrl);

    const initPath = initObj.pathname.replace(/\/$/, '');
    const finalPath = finalObj.pathname.replace(/\/$/, '');

    // If initial URL had a specific path slug (> 5 chars), but final URL redirected to generic root or search
    if (initPath.length > 5 && (finalPath === '' || finalPath === '/jobs' || finalPath === '/careers' || finalPath === '/search' || finalPath === '/en-US/careers')) {
      return {
        redirected: true,
        reason: `redirected_from_${initPath}_to_${finalPath || 'root'}`
      };
    }
  } catch {}
  return { redirected: false };
}

function classifyResponse({ initialUrl, httpResult, domainInfo }) {
  const { success, statusCode, error, body, finalUrl } = httpResult;

  // ── 1. NETWORK / DNS / SYSTEM LEVEL ──
  if (!success) {
    if (error?.code === 'ENOTFOUND') {
      return {
        status: 'SUSPECT',
        evidenceType: 'network_dns',
        evidence: 'DNS resolution failure (ENOTFOUND)',
        statusCode: null
      };
    }
    if (error?.code === 'SSRF_BLOCKED') {
      return {
        status: 'ACCESS_RESTRICTED',
        evidenceType: 'security',
        evidence: error.message,
        statusCode: null
      };
    }
    if (error?.code === 'MAX_REDIRECTS_EXCEEDED') {
      return {
        status: 'TEMP_ERROR',
        evidenceType: 'network_redirect_loop',
        evidence: 'Redirect loop (>10 hops)',
        statusCode
      };
    }
    // Timeout or transient connection error
    return {
      status: 'TEMP_ERROR',
      evidenceType: 'network_transient',
      evidence: error?.message || 'Connection failed',
      statusCode: null
    };
  }

  // ── 2. HTTP STATUS CODES ──
  if (statusCode === 401) {
    return {
      status: 'ACCESS_RESTRICTED',
      evidenceType: 'http_status',
      evidence: 'HTTP 401 Unauthorized (Auth required)',
      statusCode
    };
  }

  if (statusCode === 403) {
    return {
      status: 'BLOCKED',
      evidenceType: 'http_status',
      evidence: 'HTTP 403 Forbidden (WAF / Bot Protection)',
      statusCode
    };
  }

  if (statusCode === 404 || statusCode === 410) {
    return {
      status: 'DEAD',
      evidenceType: 'http_status',
      evidence: `HTTP ${statusCode} Not Found / Gone`,
      statusCode
    };
  }

  if (statusCode === 429) {
    return {
      status: 'TEMP_ERROR',
      evidenceType: 'http_status',
      evidence: 'HTTP 429 Too Many Requests (Rate limited)',
      statusCode
    };
  }

  if (statusCode >= 500 && statusCode < 600) {
    return {
      status: 'TEMP_ERROR',
      evidenceType: 'http_status',
      evidence: `HTTP ${statusCode} Server Error`,
      statusCode
    };
  }

  // ── 3. WAF / BOT CHALLENGE CHECK (on 200 OK) ──
  if (isWafChallenge(body)) {
    return {
      status: 'BLOCKED',
      evidenceType: 'waf_challenge',
      evidence: 'Cloudflare / Captcha verification challenge page',
      statusCode
    };
  }

  // ── 4. REDIRECT ANALYSIS ──
  const redirectCheck = isCareerRootRedirect(initialUrl, finalUrl);
  if (redirectCheck.redirected) {
    return {
      status: 'SUSPECT',
      evidenceType: 'redirect_to_root',
      evidence: redirectCheck.reason,
      statusCode
    };
  }

  // ── 5. SOURCE-SPECIFIC ATS ANALYSIS ──
  const adapter = getSourceAdapter(domainInfo.hostname);
  if (adapter) {
    const adapterResult = adapter.check(body, finalUrl, statusCode);
    if (adapterResult && adapterResult.matched) {
      return {
        status: 'CLOSED',
        evidenceType: adapterResult.evidenceType,
        evidence: adapterResult.evidence,
        statusCode
      };
    }
  }

  // ── 6. GENERIC CLOSURE DETECTION ──
  const genericClosure = generic.checkGenericClosure(body);
  if (genericClosure && genericClosure.matched) {
    return {
      status: 'CLOSED',
      evidenceType: genericClosure.evidenceType,
      evidence: genericClosure.evidence,
      statusCode
    };
  }

  // ── 7. SOFT-404 DETECTION ──
  const softDead = generic.checkSoftDead(body);
  if (softDead && softDead.matched) {
    return {
      status: 'SOFT_DEAD',
      evidenceType: softDead.evidenceType,
      evidence: softDead.evidence,
      statusCode
    };
  }

  // ── 8. POSITIVE JOB CONTENT VERIFICATION ──
  if (generic.hasPositiveJobContent(body)) {
    return {
      status: 'HEALTHY',
      evidenceType: 'positive_content',
      evidence: 'HTTP 200 with verified job content',
      statusCode
    };
  }

  // Fallback: 200 OK with suspiciously thin or non-job content
  return {
    status: 'SUSPECT',
    evidenceType: 'missing_positive_content',
    evidence: 'HTTP 200 but lacks clear job description markers',
    statusCode
  };
}

module.exports = {
  classifyResponse
};
