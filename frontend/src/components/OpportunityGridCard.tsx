"use client";

import React from "react";
import { Bookmark, Share2, ExternalLink, Star } from "lucide-react";
import { Opportunity } from "@/types";
import { getBrandInfo } from "@/lib/branding";
import { computeMatchScore, cleanDomainTags, getDeadlineBadgeInfo } from "@/lib/opportunities";

interface OpportunityGridCardProps {
  card: Opportunity;
  status: string | undefined;
  isBookmarked: boolean;
  isMounted: boolean;
  profile?: any;
  onBookmark: (id: string, currentStatus: string | undefined) => void;
  onShare: (url: string) => void;
  onStar: () => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onViewDetails?: (card: Opportunity) => void;
}

export default function OpportunityGridCard({
  card,
  status,
  isBookmarked,
  isMounted,
  profile,
  onBookmark,
  onShare,
  onStar,
  onStatusChange,
  onViewDetails,
}: OpportunityGridCardProps) {
  const brand = getBrandInfo(card.title, card.source_url, card.type);
  const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
  const { displayTags, remainingCount } = cleanDomainTags(card.domain_tags, 4);
  const deadlineBadge = getDeadlineBadgeInfo(card.deadline, card.deadline_confidence);

  return (
    <div 
      onClick={() => onViewDetails?.(card)}
      className="bg-[#121215]/90 hover:bg-[#18181e] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 group shadow-sm hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-0.5 relative overflow-hidden cursor-pointer"
    >
      
      {/* Top row: Brand + Type Badge + Urgency + Bookmark */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-bold text-[11px] shrink-0 overflow-hidden relative ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder}`}
              title={brand.label}
            >
              <span>{brand.monogram}</span>
              {brand.logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={brand.logoUrl} 
                  alt={brand.label} 
                  className="absolute inset-0 w-full h-full object-contain p-1.5 rounded-lg bg-[#121215]"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
            <span className="text-[10.5px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
              {card.type}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isMounted && (
              <span
                className={`text-[10.5px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${deadlineBadge.badgeClass}`}
              >
                {deadlineBadge.isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                {deadlineBadge.label}
              </span>
            )}

            {/* Bookmark button */}
            <button
              onClick={(e) => { e.stopPropagation(); onBookmark(card.id, status); }}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                isBookmarked
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Bookmark size={12} className={isBookmarked ? "fill-current" : ""} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-[15px] text-white tracking-tight leading-snug group-hover:text-zinc-100 transition-colors line-clamp-2">
          {card.title}
        </h3>

        {/* Subtitle / Company */}
        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
          <span className="font-medium text-zinc-300">{brand.label}</span>
          <span className="text-zinc-600">•</span>
          <span>{card.location || "Remote / India"}</span>
        </p>

        {/* Description snippet if available */}
        {card.description && (
          <p className="text-[12.5px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed font-normal">
            {card.description}
          </p>
        )}

        {/* Tech domain tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 font-mono text-[11px]">
            {displayTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
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
      </div>

      {/* Bottom row: Match Score + Status Picker + Apply Button */}
      <div className="mt-4 pt-3.5 border-t border-zinc-800/70 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-zinc-300">
            {matchScore}% · {matchLabel}
          </span>

          {isBookmarked && status !== "archived" && (
            <select
              value={status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onStatusChange(card.id, e.target.value)}
              className="bg-zinc-900 text-zinc-200 text-[10px] font-mono border border-zinc-700/80 rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
            >
              <option value="to_apply">Saved</option>
              <option value="applied">Applied</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archive</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Share */}
          <button
            onClick={(e) => { e.stopPropagation(); onShare(card.source_url); }}
            title="Share"
            className="w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Share2 size={12} />
          </button>
          {/* Star */}
          <button
            onClick={(e) => { e.stopPropagation(); onStar(); }}
            title="Star"
            className="w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <Star size={12} />
          </button>
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
          >
            <span>Apply</span>
            <ExternalLink size={11} strokeWidth={2.5} />
          </a>
        </div>
      </div>

    </div>
  );
}
