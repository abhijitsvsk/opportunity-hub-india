/**
 * Greenhouse ATS Source Adapter
 */
const GREENHOUSE_CLOSED_PATTERNS = [
  /this job (?:is )?no longer available/i,
  /the position you are trying to view is no longer available/i,
  /this posting is no longer active/i,
  /no open positions found/i
];

function checkGreenhouse(html, finalUrl, statusCode) {
  if (!html || typeof html !== 'string') return null;

  for (const pattern of GREENHOUSE_CLOSED_PATTERNS) {
    if (pattern.test(html)) {
      return {
        matched: true,
        evidenceType: 'ats_pattern',
        evidence: `Greenhouse closed pattern: ${pattern.source}`
      };
    }
  }

  // Greenhouse generic board redirect: redirected from /jobs/12345 to /company or /
  try {
    const finalPath = new URL(finalUrl).pathname.replace(/\/$/, '');
    if (finalPath === '' || finalPath === '/embed/job_board') {
      return {
        matched: true,
        evidenceType: 'redirect_to_root',
        evidence: `Greenhouse redirected from specific job to root: ${finalUrl}`
      };
    }
  } catch {}

  return null;
}

module.exports = {
  name: 'greenhouse',
  matches: (hostname) => hostname.includes('greenhouse.io'),
  check: checkGreenhouse
};
