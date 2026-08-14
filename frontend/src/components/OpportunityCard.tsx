"use client";

import { Compass, Bookmark, Share2, Star } from "lucide-react";
import { Opportunity } from "@/types";

interface OpportunityCardProps {
  card: Opportunity;
  status: string | undefined;
  isBookmarked: boolean;
  isMounted: boolean;
  profile?: any;
  onBookmark: (id: string, currentStatus: string | undefined) => void;
  onShare: (url: string) => void;
  onStar: () => void;
  onStatusChange: (id: string, newStatus: string) => void;
}

function computeMatchScore(opp: Opportunity, profile?: any): { score: number; label: string } {
  if (!profile) {
    return { score: 75, label: "match" };
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
    label: clampedScore >= 80 ? "match" : clampedScore >= 60 ? "fit" : "match"
  };
}

function cleanDomainTags(tags: string[] | undefined, maxTags = 4): { displayTags: string[], remainingCount: number } {
  if (!tags || !Array.isArray(tags)) return { displayTags: [], remainingCount: 0 };

  const cleanedSet = new Set<string>();
  const allCleaned: string[] = [];

  for (const rawTag of tags) {
    if (!rawTag || typeof rawTag !== 'string') continue;

    // Split on commas, semicolons, bullets, and newlines
    const parts = rawTag
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, ' ')
      .replace(/[•|·]/g, ',')
      .split(/[,;\n]+/)
      .map(t => t.trim());

    for (const part of parts) {
      // Clean leading/trailing non-alphanumeric symbols except #, +, .
      const clean = part.replace(/^[^a-zA-Z0-9+#.]+|[^a-zA-Z0-9+#.]+$/g, '').trim();
      if (!clean || clean.length < 2 || clean.length > 22) continue;

      const lower = clean.toLowerCase();
      // Filter out overly generic or noisy filler words
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

export default function OpportunityCard({
  card,
  status,
  isBookmarked,
  isMounted,
  profile,
  onBookmark,
  onShare,
  onStar,
  onStatusChange,
}: OpportunityCardProps) {

  // Deadline calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(card.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const closingSoon = diffDays >= 0 && diffDays <= 3;

  // Real computed match score from user profile
  const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
  const matchBarWidth = `${matchScore}%`;
  const matchColor =
    matchScore >= 80 ? "bg-primary" : matchScore >= 60 ? "bg-warning" : "bg-error";

  const { displayTags, remainingCount } = cleanDomainTags(card.domain_tags, 4);

  return (
    <>
      {/* ── THE CARD ── */}
      <div
        className="relative rounded-[2.5rem] bg-surface-low overflow-hidden border border-surface-high/20 z-10 shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] shadow-2xl h-[var(--card-size)] w-[calc(var(--card-size)*0.7)]"
        style={{ '--card-size': 'min(82dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.7))' } as React.CSSProperties}
      >
        {/* Inner top-left glow */}
        <div className="absolute top-0 left-0 w-[75%] h-[45%] bg-gradient-to-br from-primary/6 via-primary/4 to-transparent blur-3xl pointer-events-none" />

        {/* ── TOP SECTION ── */}
        <div className="p-[clamp(1.1rem,2.2dvh,1.75rem)] flex justify-between items-start z-20 relative pt-7">
          <div className="flex flex-col gap-2.5">
            {/* Deadline badge */}
            {!isMounted ? (
              <div className="h-6 w-20 bg-surface-high/50 rounded-md animate-shimmer" />
            ) : closingSoon ? (
              <span className="inline-flex items-center gap-1.5 text-error font-bold text-[9px] tracking-[0.09em] uppercase border border-error/25 bg-error/8 px-2.5 py-[5px] rounded-[7px] self-start">
                <span className="w-[5px] h-[5px] rounded-full bg-error animate-pulse" />
                {diffDays === 0 ? 'ENDS TODAY' : `ENDS IN ${diffDays}D`}
              </span>
            ) : diffDays > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-text-muted font-bold text-[9px] tracking-[0.09em] uppercase border border-surface-high bg-surface-high/40 px-2.5 py-[5px] rounded-[7px] self-start">
                ENDS IN {diffDays}D
              </span>
            ) : null}

            {/* Type badge */}
            <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full bg-surface-high border border-surface-highest/60 text-[10px] font-bold tracking-[0.07em] text-text-main uppercase self-start">
              <span className="w-[6px] h-[6px] rounded-full bg-primary shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              {card.type}
            </div>
          </div>

          {/* Match score — horizontal bar (top-right) */}
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2 min-w-[72px]">
            <div className="flex items-baseline gap-1">
              <span className="text-[18px] font-black text-text-main leading-none">{matchScore}%</span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">match</span>
            </div>
            <div className="w-[72px] h-[5px] bg-surface-highest rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${matchColor} transition-all duration-700`}
                style={{ width: matchBarWidth }}
              />
            </div>
            <span className="text-[9px] text-text-muted font-medium">for your profile</span>
          </div>
        </div>

        {/* ── MIDDLE — scrollable content ── */}
        <div className="min-h-0 flex flex-col items-center justify-center p-[clamp(1rem,2dvh,1.75rem)] landscape:p-4 pt-0 z-10 overflow-y-auto hide-scrollbar text-center">
          {/* Company icon */}
          <div className="w-[clamp(2.75rem,5.5dvh,3.75rem)] h-[clamp(2.75rem,5.5dvh,3.75rem)] shrink-0 rounded-[14px] bg-gradient-to-br from-surface-high to-surface-highest border border-primary/15 mb-[clamp(0.8rem,2.2dvh,1.2rem)] flex items-center justify-center shadow-[0_0_18px_rgba(0,0,0,0.2)]">
            <Compass size={24} className="text-primary" />
          </div>

          <h2 className="text-[clamp(1.1rem,2.6dvh,1.75rem)] font-bold leading-[1.25] tracking-tight text-text-main line-clamp-2 pb-1 shrink-0">
            {card.title}
          </h2>

          {card.description && (
            <p className="text-[clamp(0.8rem,1.4dvh,1.05rem)] text-text-muted line-clamp-3 leading-relaxed max-w-[92%] mt-[clamp(0.3rem,1dvh,0.8rem)] font-medium shrink-0 landscape:hidden">
              {card.description}
            </p>
          )}

          {/* Sanitized domain tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap justify-center items-center gap-[6px] mt-5 max-w-[95%]">
              {displayTags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-[4px] bg-surface-high/50 rounded-[7px] text-[10px] font-semibold tracking-wide text-text-muted border border-surface-highest/60 font-mono"
                >
                  {tag}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="px-2.5 py-[4px] bg-primary/10 text-primary rounded-[7px] text-[10px] font-bold border border-primary/20">
                  +{remainingCount} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM SECTION ── */}
        <div className="p-[clamp(1rem,2dvh,1.75rem)] z-20 shrink-0 bg-gradient-to-t from-surface-low via-surface-low/96 to-transparent pt-[clamp(0.4rem,1.2dvh,0.9rem)]">
          {/* Stats row */}
          <div className="flex justify-between items-center px-1 mb-4">
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[9px] font-bold tracking-[0.1em] text-text-muted uppercase">Competitiveness</span>
              <span className="text-[12px] font-bold text-primary capitalize">{card.competitiveness || "High"}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] font-bold tracking-[0.1em] text-text-muted uppercase">Effort Level</span>
              <span className="text-[12px] font-bold text-text-main capitalize">{card.effort_level || "Medium"}</span>
            </div>
          </div>

          {/* Apply Now — with shimmer sweep */}
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center py-[13px] rounded-[14px] font-bold text-[14px] tracking-wide hover:brightness-105 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(34,197,94,0.22)] hover:shadow-[0_8px_30px_rgba(34,197,94,0.38)]"
            style={{
              background: "linear-gradient(135deg, #22c55e 0%, #10b981 50%, #22c55e 100%)",
              backgroundSize: "200% auto",
              color: "#071a0d",
            }}
          >
            Apply Now →
          </a>
        </div>
      </div>

      {/* ── FLOATING ACTION PILL ── */}
      <div className="flex flex-col items-center gap-1 z-30 bg-surface-low border border-surface-high/40 p-2.5 rounded-[18px] shadow-xl shrink-0">

        {/* Bookmark */}
        <button
          onClick={() => onBookmark(card.id, status)}
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          className="group/btn w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-surface-high"
        >
          <Bookmark
            size={17}
            strokeWidth={2}
            className={`transition-colors duration-150 ${
              isBookmarked ? "text-text-main fill-text-main" : "text-text-muted group-hover/btn:text-text-main"
            }`}
          />
        </button>

        <div className="w-5 h-px bg-surface-high/60" />

        {/* Share */}
        <button
          onClick={() => onShare(card.source_url)}
          title="Share"
          className="group/btn w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-surface-high"
        >
          <Share2 size={17} strokeWidth={2} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
        </button>

        <div className="w-5 h-px bg-surface-high/60" />

        {/* Star */}
        <button
          onClick={onStar}
          title="Star"
          className="group/btn w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer active:scale-90 transition-all hover:bg-surface-high"
        >
          <Star size={17} strokeWidth={2} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
        </button>

        {/* Status picker — shown when bookmarked */}
        {isBookmarked && status !== 'archived' && (
          <>
            <div className="w-5 h-px bg-surface-high/60" />
            <div className="flex flex-col items-center">
              <select
                value={status}
                onChange={(e) => onStatusChange(card.id, e.target.value)}
                className="bg-surface-lowest text-text-main text-[9px] border border-surface-high/50 rounded-lg p-1 outline-none w-[52px] text-center appearance-none cursor-pointer focus:border-primary"
              >
                <option value="to_apply">Saved</option>
                <option value="applied">Applied</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archive</option>
              </select>
            </div>
          </>
        )}
      </div>
    </>
  );
}
