"use client";

import React from "react";
import { Bookmark, Share2, Star } from "lucide-react";
import { Opportunity } from "@/types";
import { getBrandInfo } from "@/lib/branding";
import { computeMatchScore, cleanDomainTags } from "@/lib/opportunities";

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
  const brand = getBrandInfo(card.title, card.source_url, card.type);

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
  const matchColor = matchScore >= 80 ? "bg-white" : matchScore >= 60 ? "bg-amber-400" : "bg-rose-400";

  const { displayTags, remainingCount } = cleanDomainTags(card.domain_tags, 3);

  return (
    <>
      {/* ── THE CARD ── */}
      <div
        className="relative rounded-[2rem] sm:rounded-[2.5rem] bg-[#121215] overflow-hidden border border-zinc-800/80 z-10 shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] shadow-2xl w-[calc(100vw-24px)] sm:w-[calc(100vw-40px)] max-w-[410px] md:w-[calc(var(--card-size)*0.7)] h-[clamp(420px,calc(100dvh-140px-env(safe-area-inset-bottom,0px)),660px)] md:h-[var(--card-size)]"
        style={{ '--card-size': 'min(82dvh, calc((100vw - 80px) / 0.7))' } as React.CSSProperties}
      >
        {/* Inner top ambient glow */}
        <div className="absolute top-0 left-0 w-full h-[35%] bg-gradient-to-b from-zinc-800/20 to-transparent blur-2xl pointer-events-none" />

        {/* ── TOP SECTION ── */}
        <div className="px-4 pt-5 pb-2 sm:px-6 sm:pt-6 sm:pb-3 flex justify-between items-start z-20 relative">
          <div className="flex flex-col gap-2">
            {/* Deadline badge */}
            {!isMounted ? (
              <div className="h-5 w-18 bg-zinc-800/50 rounded-md animate-shimmer" />
            ) : closingSoon ? (
              <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold text-[11px] font-mono tracking-wide uppercase border border-rose-500/25 bg-rose-500/10 px-2.5 py-[3px] rounded-md self-start">
                <span className="w-[6px] h-[6px] rounded-full bg-rose-500 animate-pulse" />
                {diffDays === 0 ? 'ENDS TODAY' : `ENDS IN ${diffDays}D`}
              </span>
            ) : diffDays > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-zinc-400 font-medium text-[11px] font-mono tracking-wide uppercase border border-zinc-800 bg-zinc-900 px-2.5 py-[3px] rounded-md self-start">
                ENDS IN {diffDays}D
              </span>
            ) : null}

            {/* Type badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300 uppercase self-start">
              <span className="w-[5px] h-[5px] rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
              {card.type}
            </div>
          </div>

          {/* Match score */}
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2 min-w-[64px] sm:min-w-[72px]">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-[17px] sm:text-[19px] font-bold text-white leading-none">{matchScore}%</span>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{matchLabel}</span>
            </div>
            <div className="w-[64px] sm:w-[72px] h-[4px] bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${matchColor} transition-all duration-700`}
                style={{ width: matchBarWidth }}
              />
            </div>
            <span className="text-[10.5px] text-zinc-400 font-medium">for you</span>
          </div>
        </div>

        {/* ── MIDDLE — scrollable content ── */}
        <div className="min-h-0 flex flex-col items-center justify-center px-4 py-2 sm:px-6 sm:py-4 z-10 overflow-y-auto hide-scrollbar text-center">
          {/* Brand Monogram Icon */}
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl border mb-3 flex items-center justify-center font-mono font-bold text-base sm:text-lg shadow-xl ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder}`}
          >
            {brand.monogram}
          </div>

          <h2 className="text-[16px] sm:text-[18px] font-bold leading-snug tracking-tight text-white line-clamp-2 pb-0.5 shrink-0 px-1">
            {card.title}
          </h2>

          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {brand.label} • {card.location || "Remote / India"}
          </p>

          {card.description && (
            <p className="text-[12px] sm:text-[13px] text-zinc-400 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-[95%] mt-2 font-normal shrink-0">
              {card.description}
            </p>
          )}

          {/* Domain tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap justify-center items-center gap-1.5 mt-3 sm:mt-4 max-w-[96%] font-mono text-[11px]">
              {displayTags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-[3px] bg-zinc-900 rounded-md text-zinc-300 border border-zinc-800"
                >
                  {tag}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="px-2 py-[3px] bg-zinc-900 text-zinc-500 rounded-md border border-zinc-800 text-[10px]">
                  +{remainingCount} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM SECTION ── */}
        <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3 z-20 shrink-0 bg-gradient-to-t from-[#121215] via-[#121215]/95 to-transparent">
          {/* Stats row */}
          <div className="flex justify-between items-center px-1 mb-3 text-[11px] font-mono">
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Stakes</span>
              <span className="font-semibold text-zinc-200 capitalize">{card.competitiveness || "High"}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Effort</span>
              <span className="font-semibold text-zinc-200 capitalize">{card.effort_level || "Medium"}</span>
            </div>
          </div>

          {/* Apply Now button */}
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block text-center py-[11px] sm:py-[12px] rounded-xl font-semibold text-[13.5px] bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg"
          >
            Apply Now →
          </a>
        </div>
      </div>

      {/* ── FLOATING ACTION PILL ── */}
      <div className="flex flex-col items-center gap-1.5 z-30 bg-zinc-900/90 border border-zinc-800 p-1.5 sm:p-2 rounded-2xl shadow-xl shrink-0 backdrop-blur-md absolute right-4 sm:right-6 bottom-24 md:static md:bottom-auto md:right-auto">
        {/* Bookmark */}
        <button
          onClick={() => onBookmark(card.id, status)}
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer active:scale-90 transition-all ${
            isBookmarked
              ? "bg-white text-black"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Bookmark size={16} className={isBookmarked ? "fill-current" : ""} />
        </button>

        <div className="w-5 h-px bg-zinc-800" />

        {/* Share */}
        <button
          onClick={() => onShare(card.source_url)}
          title="Share"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer active:scale-90 transition-all text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Share2 size={16} />
        </button>

        <div className="w-5 h-px bg-zinc-800" />

        {/* Star */}
        <button
          onClick={onStar}
          title="Star"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer active:scale-90 transition-all text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Star size={16} />
        </button>

        {/* Status picker */}
        {isBookmarked && status !== 'archived' && (
          <>
            <div className="w-5 h-px bg-zinc-800" />
            <select
              value={status}
              onChange={(e) => onStatusChange(card.id, e.target.value)}
              className="bg-zinc-950 text-zinc-200 text-[10px] font-mono border border-zinc-800 rounded-lg p-1 outline-none w-[52px] text-center cursor-pointer hover:border-zinc-700"
            >
              <option value="to_apply">Saved</option>
              <option value="applied">Applied</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archive</option>
            </select>
          </>
        )}
      </div>
    </>
  );
}
