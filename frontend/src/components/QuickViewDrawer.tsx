"use client";

import React, { useEffect, useRef } from "react";
import { X, ExternalLink, Calendar, Bookmark, Share2, MapPin, Briefcase, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { Opportunity } from "@/types";
import { getBrandInfo } from "@/lib/branding";
import { computeMatchScore, cleanDomainTags, getDeadlineBadgeInfo } from "@/lib/opportunities";

interface QuickViewDrawerProps {
  card: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  status: string | undefined;
  isBookmarked: boolean;
  onBookmark: (id: string, currentStatus: string | undefined) => void;
  onShare: (url: string) => void;
  profile?: any;
}

export default function QuickViewDrawer({
  card,
  isOpen,
  onClose,
  status,
  isBookmarked,
  onBookmark,
  onShare,
  profile,
}: QuickViewDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!card || !isOpen) return null;

  const brand = getBrandInfo(card.title, card.source_url, card.type);
  const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
  const { displayTags } = cleanDomainTags(card.domain_tags, 8);
  const deadlineBadge = getDeadlineBadgeInfo(card.deadline, card.deadline_confidence);

  // 1-Click Google Calendar URL generator
  const getGoogleCalendarUrl = () => {
    if (!card.deadline) return null;
    try {
      const deadlineDate = new Date(card.deadline);
      if (isNaN(deadlineDate.getTime())) return null;

      // Do not generate calendar link for past/expired events
      if (deadlineDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) return null;

      // Check if date-only format (e.g. YYYY-MM-DD)
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(card.deadline.trim());
      let datesParam = '';
      if (isDateOnly) {
        // All-day event: YYYYMMDD/YYYYMMDD (next day)
        const y = deadlineDate.getUTCFullYear();
        const m = String(deadlineDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(deadlineDate.getUTCDate()).padStart(2, '0');
        const nextDay = new Date(deadlineDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const ny = nextDay.getUTCFullYear();
        const nm = String(nextDay.getUTCMonth() + 1).padStart(2, '0');
        const nd = String(nextDay.getUTCDate()).padStart(2, '0');
        datesParam = `${y}${m}${d}/${ny}${nm}${nd}`;
      } else {
        const startTime = deadlineDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endTime = new Date(deadlineDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
        datesParam = `${startTime}/${endTime}`;
      }

      const title = `Deadline: ${card.title}`;
      const details = `Application Deadline for ${card.title}.\n\nApply here: ${card.source_url || ''}\n\nTracked via Opportunity Hub India.`;
      const location = card.location || 'Online / Remote';

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${datesParam}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    } catch {
      return null;
    }
  };

  const gcalUrl = getGoogleCalendarUrl();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark backdrop overlay */}
      <div 
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close preview"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClose(); }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200 cursor-pointer"
      />

      {/* Slide-over panel (right on desktop, bottom sheet on mobile) */}
      <div 
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative w-full max-w-xl h-full bg-[#121215] border-l border-zinc-800/90 shadow-2xl flex flex-col z-10 transition-transform duration-300 animate-in slide-in-from-right"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-[#141418]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
              {card.type}
            </span>
            <span className="text-xs text-zinc-400 font-medium">Quick Preview</span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close preview"
            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Company Brand & Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center font-mono font-bold text-sm tracking-wider shrink-0 overflow-hidden relative ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder}`}
              >
                <span>{brand.monogram}</span>
                {brand.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={brand.logoUrl} 
                    alt={brand.label} 
                    className="absolute inset-0 w-full h-full object-contain p-2 rounded-xl bg-[#121215]"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  {brand.label}
                </p>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-zinc-500" />
                    {card.location || "Remote / India"}
                  </span>
                  {card.competitiveness && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{card.competitiveness} Stakes</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <h2 id="drawer-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {card.title}
            </h2>
          </div>

          {/* Key Metrics Strip (Match Score + Deadline) */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
            <div>
              <p className="text-[11px] font-mono uppercase text-zinc-400">Match Score</p>
              <div className="flex items-baseline gap-1.5 mt-1 font-mono">
                <span className="text-xl font-bold text-white">{matchScore}%</span>
                <span className="text-xs text-emerald-400 font-medium">({matchLabel})</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-mono uppercase text-zinc-400">Application Deadline</p>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border ${deadlineBadge.badgeClass}`}>
                  {deadlineBadge.isUrgent && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                  {deadlineBadge.label}
                </span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Overview & Requirements
            </h3>
            <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60 whitespace-pre-line">
              {card.description || "Direct employer application on official career portal. Verify requirements on the host page."}
            </div>
          </div>

          {/* Domain Tags */}
          {displayTags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Technology & Focus Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {displayTags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-lg text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-800">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Direct Link Trust Callout */}
          <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 flex items-start gap-3 text-xs text-zinc-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-200 font-medium">Verified Direct Application</span>:
              Opportunity Hub India bypasses aggregators and links you straight to the employer’s official ATS board.
            </div>
          </div>

        </div>

        {/* Bottom Sticky Action Footer */}
        <div className="p-5 border-t border-zinc-800 bg-[#141418] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Bookmark button */}
            <button
              onClick={() => onBookmark(card.id, status)}
              className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                isBookmarked 
                  ? "bg-white text-black border-white" 
                  : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-800"
              }`}
              title={isBookmarked ? "Remove from Saved" : "Save Opportunity"}
              aria-label={isBookmarked ? "Remove from Saved" : "Save Opportunity"}
              aria-pressed={isBookmarked}
            >
              <Bookmark size={16} className={isBookmarked ? "fill-current" : ""} />
            </button>

            {/* Share button */}
            <button
              onClick={() => onShare(card.source_url)}
              className="p-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Share Link"
              aria-label="Share opportunity"
            >
              <Share2 size={16} />
            </button>

            {/* Google Calendar button */}
            {gcalUrl && (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center"
                title="Add Deadline to Google Calendar"
                aria-label="Add deadline to Google Calendar"
              >
                <Calendar size={16} />
              </a>
            )}
          </div>

          {/* Primary Action Button */}
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all shadow-lg active:scale-95 cursor-pointer text-center"
          >
            <span>Apply on Official Portal</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
