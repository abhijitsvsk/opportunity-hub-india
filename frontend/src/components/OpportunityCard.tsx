"use client";

import { Compass, Bookmark, Share2, Star } from "lucide-react";
import { Opportunity } from "@/types";

interface OpportunityCardProps {
  card: Opportunity;
  status: string | undefined;
  isBookmarked: boolean;
  isMounted: boolean;
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
  onBookmark,
  onShare,
  onStar,
  onStatusChange
}: OpportunityCardProps) {
  
  // Calculate deadline safely
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(card.deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const closingSoon = diffDays >= 0 && diffDays <= 3;

  return (
    <>
      {/* THE CARD */}
      <div 
        className="relative rounded-[2.5rem] bg-surface-low overflow-hidden shadow-2xl border border-surface-high/30 z-10 shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] h-[var(--card-size)] w-[calc(var(--card-size)*0.8)]"
        style={{ '--card-size': 'min(85dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.8))' } as React.CSSProperties}
      >
        
        {/* Top-Left Green Glow Effect inside Card */}
        <div className="absolute top-0 left-0 w-[80%] h-[40%] bg-gradient-to-br from-primary/5 via-primary/5 to-transparent blur-3xl pointer-events-none"></div>

        {/* TOP SECTION */}
        <div className="p-[clamp(1.25rem,2.5dvh,2rem)] flex justify-between items-start z-20 pointer-events-auto relative pt-8">
          <div className="flex flex-col gap-3">
            {!isMounted ? (
               <div className="h-7 w-24 bg-surface-high/50 rounded-md animate-pulse"></div>
            ) : closingSoon ? (
               <span className="text-error font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5 border border-error/30 bg-error/10 px-3 py-1.5 rounded-md self-start">
                 <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></div>
                 {diffDays === 0 ? 'ENDS TODAY' : `ENDS IN ${diffDays}D`}
               </span>
            ) : diffDays > 0 ? (
               <span className="text-text-muted font-bold text-[10px] tracking-widest uppercase flex items-center gap-1.5 border border-surface-high bg-surface-high/50 px-3 py-1.5 rounded-md self-start">
                 ENDS IN {diffDays}D
               </span>
            ) : null}
            
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-high border border-surface-highest text-xs font-bold tracking-widest text-text-main uppercase shadow-sm self-start">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,136,0.8)]"></span>
              {card.type}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
            <div className="relative w-[70px] h-[70px] rounded-full border-2 border-surface-high flex items-center justify-center bg-surface-low shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <svg className="w-full h-full -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-high" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="289" strokeDashoffset="17" className="text-primary transition-all duration-1000 ease-out" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-sm font-black text-text-main">94%</span>
                <span className="text-[8px] font-bold text-text-muted uppercase tracking-wider">Match</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE CONTENT - SCROLLABLE */}
        <div className="min-h-0 flex flex-col items-center justify-center p-[clamp(1.25rem,2.5dvh,2rem)] landscape:p-4 pt-0 z-10 overflow-y-auto hide-scrollbar text-center">
          <div className="w-[clamp(3rem,6dvh,4rem)] h-[clamp(3rem,6dvh,4rem)] shrink-0 rounded-2xl bg-surface-high border border-primary/20 mb-[clamp(1rem,3dvh,1.5rem)] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.2)]">
             <Compass size={28} className="text-primary" />
          </div>
          <h2 className="text-[clamp(1.25rem,3dvh,2rem)] font-bold leading-normal tracking-tight text-text-main line-clamp-2 pb-1 shrink-0">{card.title}</h2>
          <p className="text-[clamp(0.875rem,1.5dvh,1.125rem)] text-text-muted line-clamp-4 leading-relaxed max-w-[95%] mt-[clamp(0.5rem,1.5dvh,1rem)] font-medium shrink-0 landscape:hidden">{card.description}</p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {card.domain_tags && card.domain_tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-surface-high/50 rounded-lg text-[11px] font-bold tracking-wider text-text-muted border border-surface-high/80">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="p-[clamp(1.25rem,2.5dvh,2rem)] z-20 shrink-0 bg-gradient-to-t from-surface-low via-surface-low/95 to-transparent pt-[clamp(0.5rem,1.5dvh,1rem)] pointer-events-auto">
          <div className="flex justify-between items-center px-2 mb-6">
            <div className="flex flex-col items-start gap-1">
               <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Competitiveness</span>
               <span className="text-sm font-bold text-primary capitalize">
                 {card.competitiveness || "High"}
               </span>
            </div>
            <div className="flex flex-col items-end gap-1">
               <span className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Effort Level</span>
               <span className="text-sm font-bold text-text-main capitalize">
                 {card.effort_level || "Medium"}
               </span>
            </div>
          </div>
          <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="w-full block text-center py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-[#002113] font-bold text-base tracking-wide hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(0,255,136,0.2)] active:scale-[0.98]">
            Apply Now
          </a>
        </div>
      </div>

      {/* FLOATING DETACHED PILL (Right Side) */}
      <div className="flex flex-col items-center gap-6 z-30 bg-surface-low border border-surface-high/50 p-3 rounded-2xl shadow-xl shrink-0">
        
        <button 
          onClick={() => onBookmark(card.id, status)}
          className="group/btn cursor-pointer active:scale-90 transition-transform"
        >
          <Bookmark 
            size={22} 
            strokeWidth={2.5}
            className={`transition-colors duration-150 ${isBookmarked ? "text-text-main fill-text-main" : "text-text-muted group-hover/btn:text-text-main"}`} 
          />
        </button>

        <button 
          onClick={() => onShare(card.source_url)}
          className="group/btn cursor-pointer active:scale-90 transition-transform"
        >
          <Share2 size={22} strokeWidth={2.5} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
        </button>

        <button onClick={onStar} className="group/btn cursor-pointer active:scale-90 transition-transform">
          <Star size={22} strokeWidth={2.5} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
        </button>
        
        {isBookmarked && status !== 'archived' && (
          <div className="flex flex-col items-center">
            <select 
              value={status}
              onChange={(e) => onStatusChange(card.id, e.target.value)}
              className="bg-surface-lowest text-text-main text-[10px] border border-surface-high/50 rounded-md p-1 outline-none w-16 text-center appearance-none cursor-pointer"
            >
              <option value="to_apply">Saved</option>
              <option value="applied">Applied</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archive</option>
            </select>
          </div>
        )}
        
      </div>
    </>
  );
}
