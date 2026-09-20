/**
 * Geographic relevance filter for Opportunity Hub India.
 *
 * Rules:
 * 1. Immediate rejection: Contains US work authorization / citizenship / clearance constraints
 *    or US-only indicators ("remote in usa", "us citizen", "sponsorship not available").
 * 2. Strict India Inclusion: Matches explicit Indian tech hubs or country name with word boundary.
 * 3. Strict Global Remote Inclusion: Location explicitly contains "worldwide", "anywhere", or "global"
 *    AND does NOT contain US state codes or North American constraints.
 * 4. Default Exclusion: Bare "Remote", ambiguous locations, US/Canada cities/states are excluded.
 */

// Indian tech hubs, states, and keywords with strict word boundaries
const INDIA_REGEX = /\b(india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|delhi[\s-]*ncr|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|kochi|coimbatore|indore|chandigarh|jaipur|kerala|karnataka|maharashtra|telangana|tamil\s*nadu)\b/i;

// US / North American work authorization and residency exclusion keywords
const US_EXCLUSION_KEYWORDS = [
  'remote in usa', 'remote in the us', 'remote in the united states',
  'remote (us)', 'remote - us', 'us only', 'usa only',
  'us citizen', 'u.s. citizen', 'security clearance',
  'us work authorization', 'authorized to work in the us',
  'authorized to work in the united states',
  'no visa sponsorship', 'does not provide sponsorship',
  'sponsorship is not available', 'will not sponsor',
  'must be authorized to work'
];

// US state 2-letter codes or USA country indicators
const US_STATE_REGEX = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|USA|United States)\b/i;

/**
 * Determines whether an opportunity is accessible to an Indian CS student.
 * @param {string} location - The raw location string
 * @param {string} text - Additional context (title, description)
 * @returns {boolean}
 */
function isRelevantForIndianStudent(location = '', text = '') {
  const locLower = (location || '').toLowerCase().trim();
  const textLower = (text || '').toLowerCase().trim();

  // 1. Check for explicit US exclusion keywords in location or context text
  for (const kw of US_EXCLUSION_KEYWORDS) {
    if (locLower.includes(kw) || textLower.includes(kw)) {
      return false;
    }
  }

  // 2. If location specifies a US state/country and does NOT mention India, reject
  if (US_STATE_REGEX.test(location) && !INDIA_REGEX.test(location)) {
    return false;
  }

  // 3. Strict India Location Match (word boundary prevents "Indianapolis")
  if (INDIA_REGEX.test(location) || INDIA_REGEX.test(text)) {
    return true;
  }

  // 4. Strict Global Remote (bare "Remote" is EXCLUDED per Issue 1)
  const isExplicitGlobal = 
    locLower.includes('worldwide') || 
    locLower.includes('anywhere') || 
    locLower.includes('global');

  if (isExplicitGlobal && !US_STATE_REGEX.test(location) && !locLower.includes('us') && !locLower.includes('canada')) {
    return true;
  }

  // 5. Default: Exclude bare "Remote", ambiguous, or non-Indian regional listings
  return false;
}

module.exports = { isRelevantForIndianStudent, INDIA_REGEX, US_EXCLUSION_KEYWORDS };

