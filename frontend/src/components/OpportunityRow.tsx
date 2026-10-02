"use client";

import React from "react";
import { Bookmark, Share2, ExternalLink, Star } from "lucide-react";
import { Opportunity } from "@/types";
import { getBrandInfo } from "@/lib/branding";
import { computeMatchScore, cleanDomainTags } from "@/lib/opportunities";

interface OpportunityRowProps {
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

export default function OpportunityRow({
  card,
  status,
  isBookmarked,
  isMounted,
  profile,
  onBookmark,
  onShare,
  onStar,
  onStatusChange,
}: OpportunityRowProps) {
  const brand = getBrandInfo(card.title, card.source_url, card.type);
  const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
  const { displayTags, remainingCount } = cleanDomainTags(card.domain_tags, 3);

  // Deadline calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(card.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const closingSoon = diffDays >= 0 && diffDays <= 3;

  return (
    <div className="w-full bg-[#121215]/80 hover:bg-[#18181e] border border-zinc-800/80 hover:border-zinc-700/90 rounded-2xl p-3.5 sm:p-4.5 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 group shadow-sm hover:shadow-xl hover:shadow-black/40">
      
      {/* ── Left side: Brand Logo + Details ── */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {/* Monogram Badge */}
        <div
          className={`w-11 h-11 rounded-xl border flex items-center justify-center font-mono font-bold text-xs tracking-wider shrink-0 transition-transform group-hover:scale-105 ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder}`}
          title={brand.label}
        >
          {brand.monogram}
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-[14px] sm:text-[15px] text-white tracking-tight leading-snug group-hover:text-zinc-100 transition-colors line-clamp-1">
              {card.title}
            </h3>
            {/* Type badge */}
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800/90 shrink-0">
              {card.type}
            </span>
          </div>

          {/* Meta line */}
          <div className="flex items-center gap-2 mt-1 text-[12px] text-zinc-400 flex-wrap">
            <span className="font-medium text-zinc-300">{brand.label}</span>
            <span className="text-zinc-600">•</span>
            <span>{card.location || "Remote / India"}</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-zinc-300 font-semibold">{matchScore}% · {matchLabel}</span>
            {card.competitiveness && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="capitalize">{card.competitiveness} Stakes</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right side: Tags + Urgency + Actions ── */}
      <div className="flex items-center justify-between lg:justify-end gap-2 sm:gap-3.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60 flex-wrap sm:flex-nowrap">
        
        {/* Tech tags */}
        {displayTags.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px]">
            {displayTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-300 border border-zinc-800">
                {tag}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-500 border border-zinc-800 text-[10px]">
                +{remainingCount}
              </span>
            )}
          </div>
        )}

        {/* Deadline urgency */}
        {isMounted && diffDays >= 0 && (
          <span
            className={`text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 shrink-0 ${
              closingSoon
                ? "text-rose-400 bg-rose-500/10 border-rose-500/25 font-bold"
                : "text-zinc-400 bg-zinc-900 border-zinc-800 font-medium"
            }`}
          >
            {closingSoon && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
            {diffDays === 0 ? "Ends Today" : `Ends in ${diffDays}d`}
          </span>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Share */}
          <button
            onClick={() => onShare(card.source_url)}
            title="Share"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Share2 size={13} />
          </button>

          {/* Star */}
          <button
            onClick={onStar}
            title="Star"
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Star size={13} />
          </button>

          {/* Bookmark */}
          <button
            onClick={() => onBookmark(card.id, status)}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
              isBookmarked
                ? "bg-white text-black border-white"
                : "bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Bookmark size={13} className={isBookmarked ? "fill-current" : ""} />
          </button>
        </div>

        {/* Status tracker dropdown if saved */}
        {isBookmarked && status !== "archived" && (
          <div className="shrink-0">
            <select
              value={status}
              onChange={(e) => onStatusChange(card.id, e.target.value)}
              className="bg-zinc-900 text-zinc-200 text-[10px] font-mono border border-zinc-700/80 rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <option value="to_apply">Saved</option>
              <option value="applied">Applied</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archive</option>
            </select>
          </div>
        )}

        {/* Apply Now button */}
        <a
          href={card.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-sm active:scale-95 shrink-0"
        >
          <span>Apply</span>
          <ExternalLink size={11} strokeWidth={2.5} />
        </a>

      </div>
    </div>
  );
}
