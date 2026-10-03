/**
 * Unified Eligibility Normalizer & Matcher
 * Handles all 3 legacy eligibility shapes in the database:
 * 1. { year: [2, 3, 4] }
 * 2. { segments: ["4th year", "postgraduate"] }
 * 3. { education: ["B.Tech", "BE"], location: "India" }
 */

export type BatchFilterKey = 'all' | '2025' | '2026' | '2027' | '2028';

export interface BatchDefinition {
  id: BatchFilterKey;
  label: string;
  sublabel: string;
  badge: string;
}

export const BATCH_DEFINITIONS: BatchDefinition[] = [
  { id: 'all', label: 'All Batches', sublabel: 'Entire opportunity feed', badge: 'All' },
  { id: '2025', label: '2025 Batch', sublabel: 'Immediate Joiner · Full-time', badge: '2025' },
  { id: '2026', label: '2026 Batch', sublabel: 'Pre-final · Summer Intern · PPO', badge: '2026' },
  { id: '2027', label: '2027/28 Batch', sublabel: 'Early Undergrad Intern · Hackathons', badge: '2027/28' },
];

/**
 * Checks whether an opportunity matches the selected college graduation batch.
 * Crucial rule: If eligibility is completely unspecified or unknown, it returns true
 * to prevent accidentally hiding valid opportunities from students.
 */
export function matchesBatchFilter(
  eligibility: any,
  oppType: string = '',
  title: string = '',
  selectedBatch: BatchFilterKey
): boolean {
  if (selectedBatch === 'all') return true;

  const type = oppType.toLowerCase();
  const text = title.toLowerCase();

  // If hackathons or open source, open to all undergraduate batches
  if (type === 'hackathon' || type === 'open-source program' || type === 'competition') {
    return true;
  }

  // Extract year numbers if present in eligibility.year
  const hasYearArray = eligibility && Array.isArray(eligibility.year) && eligibility.year.length > 0;
  const years: number[] = hasYearArray ? eligibility.year : [];

  // Extract segments if present in eligibility.segments
  const hasSegments = eligibility && Array.isArray(eligibility.segments) && eligibility.segments.length > 0;
  const segments: string[] = hasSegments ? eligibility.segments.map((s: string) => String(s).toLowerCase()) : [];

  // Match 2025 Batch (4th Year / Final Year / Immediate Grad)
  if (selectedBatch === '2025') {
    if (years.length > 0 && (years.includes(4) || years.includes(5))) return true;
    if (segments.length > 0 && segments.some(s => s.includes('4th') || s.includes('postgrad') || s.includes('graduat'))) return true;
    if (type === 'full-time' || /graduate|fresher|associate|trainee|sde 1|new grad/i.test(text)) return true;
    // Discard 1st/2nd-year-only internships
    if (years.length > 0 && !years.includes(4) && !years.includes(5) && type === 'internship') return false;
    return true;
  }

  // Match 2026 Batch (3rd Year / Pre-final Year / Summer Intern / PPO)
  if (selectedBatch === '2026') {
    if (years.length > 0 && (years.includes(3) || years.includes(4))) return true;
    if (type === 'internship' || /intern|trainee|summer|apprentice/i.test(text)) return true;
    // Don't show strictly full-time experienced roles
    if (type === 'full-time' && !/intern|trainee/i.test(text)) return false;
    return true;
  }

  // Match 2027/2028 Batch (1st & 2nd Year Undergrad)
  if (selectedBatch === '2027' || selectedBatch === '2028') {
    if (years.length > 0 && (years.includes(1) || years.includes(2))) return true;
    if (type === 'internship' && !/4th year|final year|graduating/i.test(text)) return true;
    // Exclude full-time jobs
    if (type === 'full-time') return false;
    return true;
  }

  return true;
}
