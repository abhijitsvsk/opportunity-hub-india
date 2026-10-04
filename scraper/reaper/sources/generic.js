/**
 * Generic Source Adapter: Fallback patterns for general career portals and websites
 */

// High-confidence closure phrases
const GENERIC_CLOSED_PATTERNS = [
  /this (?:job|position|posting|role) (?:has been |is )?(?:no longer available|closed|expired|filled|archived)/i,
  /no longer accepting (?:applications|submissions|candidates)/i,
  /registrations? (?:have )?closed/i,
  /application (?:deadline|period) has passed/i,
  /this requisition is closed/i,
  /applications? (?:are )?now closed/i
];

// Soft-404 phrases (returning 200 OK but page is effectively a 404)
const SOFT_DEAD_PATTERNS = [
  /page not found/i,
  /404 - not found/i,
  /sorry,? (?:we )?could(?:n['’]t| not) find that (?:job|page|posting|opportunity)/i,
  /the page you (?:are looking for|requested) (?:does not exist|could not be found)/i,
  /we couldn't find what you were looking for/i
];

// Positive job content markers to ensure 200 actually contains real posting content
const POSITIVE_CONTENT_PATTERNS = [
  /(?:job description|about the role|requirements|qualifications|responsibilities|apply now|about this job)/i,
  /(?:eligibility|skills required|what you will do|what you'll do|perks & benefits|stipend|salary)/i
];

function checkGenericClosure(html) {
  if (!html || typeof html !== 'string') return null;

  for (const pattern of GENERIC_CLOSED_PATTERNS) {
    if (pattern.test(html)) {
      return {
        matched: true,
        evidenceType: 'generic_closed_pattern',
        evidence: pattern.source
      };
    }
  }
  return null;
}

function checkSoftDead(html) {
  if (!html || typeof html !== 'string') return null;

  for (const pattern of SOFT_DEAD_PATTERNS) {
    if (pattern.test(html)) {
      return {
        matched: true,
        evidenceType: 'soft_dead_pattern',
        evidence: pattern.source
      };
    }
  }
  return null;
}

function hasPositiveJobContent(html) {
  if (!html || typeof html !== 'string') return false;
  return POSITIVE_CONTENT_PATTERNS.some(p => p.test(html));
}

module.exports = {
  checkGenericClosure,
  checkSoftDead,
  hasPositiveJobContent
};
