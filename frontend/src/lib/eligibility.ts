/**
 * Unified Eligibility Normalizer & Matcher
 * Handles all eligibility shapes across database & LLMs:
 * 1. { year: [2, 3, 4] }
 * 2. { batch: ["2025", "2026"] }
 * 3. { segments: ["4th year", "postgraduate"] }
 * 4. { education: ["B.Tech", "BE"], location: "India" }
 */

export type BatchFilterKey = 'all' | '2025' | '2026' | '2027';

export interface BatchDefinition {
  id: BatchFilterKey;
  label: string;
  sublabel: string;
  badge: string;
}

export const BATCH_DEFINITIONS: BatchDefinition[] = [
  { id: 'all', label: 'All Batches', sublabel: 'Entire opportunity feed', badge: 'All' },
  { id: '2025', label: '2025 Batch', sublabel: 'Immediate Joiner · Full-time Roles', badge: '2025' },
  { id: '2026', label: '2026 Batch', sublabel: 'Pre-final · Summer Intern · PPO', badge: '2026' },
  { id: '2027', label: '2027/28 Batch', sublabel: 'Early Undergrad Intern · Freshmen', badge: '2027/28' },
];

/**
 * Checks whether an opportunity matches the selected college graduation batch.
 * If eligibility is completely unspecified, returns true to prevent hiding valid opportunities.
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

  // Hackathons and open source competitions are universally open to all college students
  if (type === 'hackathon' || type === 'open-source program' || type === 'competition') {
    return true;
  }

  // 1. Direct explicit batch array from structurer (e.g. batch: ["2025", "2026"])
  if (eligibility && Array.isArray(eligibility.batch) && eligibility.batch.length > 0) {
    const batches = eligibility.batch.map((b: any) => String(b).trim());
    if (selectedBatch === '2025') {
      return batches.includes('2025') || batches.includes('2024');
    }
    if (selectedBatch === '2026') {
      return batches.includes('2026');
    }
    if (selectedBatch === '2027') {
      return batches.includes('2027') || batches.includes('2028');
    }
  }

  // 2. Year array from scraper (e.g. year: [2, 3, 4])
  const hasYearArray = eligibility && Array.isArray(eligibility.year) && eligibility.year.length > 0;
  const years: number[] = hasYearArray ? eligibility.year : [];

  // 3. Segments array from FreeHire (e.g. segments: ["4th year", "postgraduate"])
  const hasSegments = eligibility && Array.isArray(eligibility.segments) && eligibility.segments.length > 0;
  const segments: string[] = hasSegments ? eligibility.segments.map((s: string) => String(s).toLowerCase()) : [];

  // Match 2025 Batch (4th Year / Final Year / Immediate Grad)
  if (selectedBatch === '2025') {
    if (years.length > 0) {
      return years.includes(4) || years.includes(5);
    }
    if (segments.length > 0) {
      return segments.some(s => s.includes('4th') || s.includes('postgrad') || s.includes('graduat'));
    }
    if (/4th year|final year|2025/i.test(text)) return true;
    if (type === 'full-time' || /graduate|fresher|associate|sde 1|new grad/i.test(text)) return true;
    return false;
  }

  // Match 2026 Batch (3rd Year / Pre-final Year / Summer Intern / PPO)
  if (selectedBatch === '2026') {
    if (years.length > 0) {
      return years.includes(3) || years.includes(4);
    }
    if (segments.length > 0) {
      return segments.some(s => s.includes('3rd') || s.includes('pre-final') || s.includes('intern'));
    }
    // Exclude strictly full-time experienced or graduate-only postings
    if (type === 'full-time' && !/intern|trainee|apprentice/i.test(text)) return false;
    if (type === 'internship' || /intern|trainee|summer/i.test(text)) return true;
    return true;
  }

  // Match 2027/2028 Batch (1st & 2nd Year Undergrad)
  if (selectedBatch === '2027') {
    if (years.length > 0) {
      return years.includes(1) || years.includes(2);
    }
    if (segments.length > 0) {
      return segments.some(s => s.includes('1st') || s.includes('2nd') || s.includes('freshman') || s.includes('sophomore'));
    }
    // Strictly exclude full-time jobs and final-year-only programs
    if (type === 'full-time' || /4th year|final year|graduating|new grad/i.test(text)) return false;
    if (type === 'internship' || /intern|explorer|step/i.test(text)) return true;
    return true;
  }

  return true;
}
