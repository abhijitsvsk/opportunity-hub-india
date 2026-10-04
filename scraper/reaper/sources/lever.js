/**
 * Lever ATS Source Adapter
 */
const LEVER_CLOSED_PATTERNS = [
  /this job (?:posting )?is no longer (?:available|active|open)/i,
  /the job you are looking for has been filled/i,
  /this position has been filled/i
];

function checkLever(html, finalUrl, statusCode) {
  if (!html || typeof html !== 'string') return null;

  for (const pattern of LEVER_CLOSED_PATTERNS) {
    if (pattern.test(html)) {
      return {
        matched: true,
        evidenceType: 'ats_pattern',
        evidence: `Lever closed pattern: ${pattern.source}`
      };
    }
  }

  try {
    const parsed = new URL(finalUrl);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // If original was /company/job-id, but redirected to just /company
    if (pathParts.length <= 1) {
      return {
        matched: true,
        evidenceType: 'redirect_to_company_root',
        evidence: `Lever redirected to company root listing: ${finalUrl}`
      };
    }
  } catch {}

  return null;
}

module.exports = {
  name: 'lever',
  matches: (hostname) => hostname.includes('lever.co'),
  check: checkLever
};
