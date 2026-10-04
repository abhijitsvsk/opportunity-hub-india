const { getDomain, getPublicSuffix } = require('tldts');

/**
 * Extracts normalized domain and registrable domain information from a URL.
 */
function parseDomainInfo(urlString) {
  try {
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase();
    const registrableDomain = getDomain(hostname) || hostname;
    const publicSuffix = getPublicSuffix(hostname) || '';

    return {
      hostname,
      registrableDomain,
      publicSuffix,
      origin: parsed.origin
    };
  } catch {
    return {
      hostname: 'unknown',
      registrableDomain: 'unknown',
      publicSuffix: '',
      origin: ''
    };
  }
}

/**
 * High-risk / Tier-1 ecosystem domains that require manual review or 3+ confirmations.
 */
const HIGH_RISK_SOURCES = new Set([
  'google.com',
  'careers.google.com',
  'ycombinator.com',
  'workatastartup.com',
  'wellfound.com',
  'microsoft.com',
  'careers.microsoft.com',
  'amazon.jobs',
  'apple.com'
]);

function isHighRiskSource(domainInfo, sourceUrl, company) {
  if (HIGH_RISK_SOURCES.has(domainInfo.hostname) || HIGH_RISK_SOURCES.has(domainInfo.registrableDomain)) {
    return true;
  }
  const normComp = (company || '').toLowerCase();
  if (['google', 'y combinator', 'microsoft', 'apple', 'amazon'].includes(normComp)) {
    return true;
  }
  return false;
}

module.exports = {
  parseDomainInfo,
  isHighRiskSource,
  HIGH_RISK_SOURCES
};
