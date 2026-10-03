import { Opportunity } from "@/types";

export function computeMatchScore(opp: Opportunity, profile?: any): { score: number; label: string } {
  if (!profile) {
    return { score: 75, label: "Good Match" };
  }

  let totalPoints = 0;
  let earnedPoints = 0;

  // 1. Tech stack match (45 points)
  if (profile.tech_stack && Array.isArray(profile.tech_stack) && profile.tech_stack.length > 0) {
    totalPoints += 45;
    const oppText = `${opp.title || ''} ${(opp.domain_tags || []).join(' ')} ${opp.description || ''}`.toLowerCase();
    const matches = profile.tech_stack.filter((tech: string) =>
      oppText.includes(tech.toLowerCase())
    ).length;
    const ratio = Math.min(1, matches / Math.min(3, profile.tech_stack.length));
    earnedPoints += Math.round(ratio * 45);
  }

  // 2. Role / Focus Area match (35 points)
  if (profile.focus_area && opp.type) {
    totalPoints += 35;
    const focus = (profile.focus_area || '').toLowerCase();
    const type = (opp.type || '').toLowerCase();
    if (
      (focus.includes('intern') && type.includes('intern')) ||
      (focus.includes('hackathon') && type.includes('hackathon')) ||
      (focus.includes('open source') && type.includes('open')) ||
      (focus.includes('full-time') && type.includes('full'))
    ) {
      earnedPoints += 35;
    } else {
      earnedPoints += 10;
    }
  }

  // 3. Eligibility / Year of study (20 points)
  if (profile.current_year) {
    totalPoints += 20;
    if (opp.eligibility && typeof opp.eligibility === 'object' && Array.isArray((opp.eligibility as any).year)) {
      const yearMap: Record<string, number> = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4, "Postgraduate": 5 };
      const userYear = yearMap[profile.current_year];
      if (userYear && (opp.eligibility as any).year.length > 0) {
        if ((opp.eligibility as any).year.includes(userYear)) {
          earnedPoints += 20;
        }
      } else {
        earnedPoints += 20;
      }
    } else {
      earnedPoints += 20;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 75;
  const clampedScore = Math.min(99, Math.max(35, score));

  return {
    score: clampedScore,
    label: clampedScore >= 80 ? "Great Match" : clampedScore >= 60 ? "Good Fit" : "Possible Match"
  };
}

export function cleanDomainTags(tags: string[] | undefined, maxTags = 4): { displayTags: string[], remainingCount: number } {
  if (!tags || !Array.isArray(tags)) return { displayTags: [], remainingCount: 0 };

  const cleanedSet = new Set<string>();
  const allCleaned: string[] = [];

  for (const rawTag of tags) {
    if (!rawTag || typeof rawTag !== 'string') continue;

    const parts = rawTag
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, ' ')
      .replace(/[•|·]/g, ',')
      .split(/[,;\n]+/)
      .map(t => t.trim());

    for (const part of parts) {
      const clean = part.replace(/^[^a-zA-Z0-9+#.]+|[^a-zA-Z0-9+#.]+$/g, '').trim();
      if (!clean || clean.length < 2 || clean.length > 22) continue;

      const lower = clean.toLowerCase();
      if (['good listener', 'presentation', 'reports', 'story-telling'].includes(lower)) continue;

      if (!cleanedSet.has(lower)) {
        cleanedSet.add(lower);
        allCleaned.push(clean);
      }
    }
  }

  const displayTags = allCleaned.slice(0, maxTags);
  const remainingCount = Math.max(0, allCleaned.length - maxTags);

  return { displayTags, remainingCount };
}

export interface DeadlineBadgeInfo {
  tier: 'verified' | 'rolling' | 'none';
  label: string;
  diffDays: number | null;
  isUrgent: boolean;
  badgeClass: string;
}

export function getDeadlineBadgeInfo(deadline?: string | null, confidence?: string | null): DeadlineBadgeInfo {
  if (!deadline) {
    return {
      tier: 'none',
      label: 'Open',
      diffDays: null,
      isUrgent: false,
      badgeClass: 'text-zinc-400 bg-zinc-900 border-zinc-800'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const isVerified = confidence === 'exact' || confidence === 'computed_from_countdown';

  if (!isVerified) {
    return {
      tier: 'rolling',
      label: 'Rolling · Apply ASAP',
      diffDays,
      isUrgent: false,
      badgeClass: 'text-amber-400/90 bg-amber-500/10 border-amber-500/25 font-medium'
    };
  }

  // Verified deadline
  const isUrgent = diffDays >= 0 && diffDays <= 3;
  let label = '';
  if (diffDays < 0) {
    label = 'Expired';
  } else if (diffDays === 0) {
    label = 'Ends Today';
  } else if (diffDays === 1) {
    label = 'Ends Tomorrow';
  } else {
    label = `Ends in ${diffDays}d`;
  }

  return {
    tier: 'verified',
    label,
    diffDays,
    isUrgent,
    badgeClass: isUrgent
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/25 font-bold'
      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-medium'
  };
}
