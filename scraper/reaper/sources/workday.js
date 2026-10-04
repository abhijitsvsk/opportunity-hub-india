/**
 * Workday ATS Source Adapter
 */
const WORKDAY_CLOSED_PATTERNS = [
  /this job (?:is )?no longer available/i,
  /the job you were looking for is no longer available/i,
  /we are no longer accepting applications for this position/i
];

function checkWorkday(html, finalUrl, statusCode) {
  if (!html || typeof html !== 'string') return null;

  for (const pattern of WORKDAY_CLOSED_PATTERNS) {
    if (pattern.test(html)) {
      return {
        matched: true,
        evidenceType: 'ats_pattern',
        evidence: `Workday closed pattern: ${pattern.source}`
      };
    }
  }

  return null;
}

module.exports = {
  name: 'workday',
  matches: (hostname) => hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com'),
  check: checkWorkday
};
