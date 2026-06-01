"use client";

import { 
  Compass, Bookmark, Flame, User, Share2, Star, 
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Trophy, Rocket, Filter, Sparkles, CheckCircle2, LogOut
} from "lucide-react";
import { useState, useRef, useTransition, useOptimistic, useCallback, useEffect } from "react";
import { toggleBookmark, updateApplicationStatus, signOut } from "@/app/actions";
import Link from "next/link";

type Opportunity = {
  id: string;
  title: string;
  type: string;
  description: string;
  source_url: string;
  deadline: string;
  domain_tags: string[];
  effort_level: string;
  competitiveness: string;
};

type UserSavedStatus = {
  opportunity_id: string;
  status: string;
};

export default function Feed({ 
  initialOpportunities, 
  savedStatuses,
  user,
  profile,
  initialTotalPages
}: { 
  initialOpportunities: Opportunity[], 
  savedStatuses: UserSavedStatus[],
  user?: any,
  profile?: any,
  initialTotalPages?: number
}) {

  const [allOpps, setAllOpps] = useState<Opportunity[]>(initialOpportunities);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(initialTotalPages ? initialTotalPages > 1 : true);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const snapContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  const [activeTab, setActiveTab] = useState("discover");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(["All"]));
  const [filterKey, setFilterKey] = useState(0); 
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [optimisticSaved, updateOptimisticSaved] = useOptimistic(
    new Map(savedStatuses.map(s => [s.opportunity_id, s.status])),
    (currentMap, { id, action }: { id: string; action: string }) => {
      const newMap = new Map(currentMap);
      if (action === "add") {
        newMap.set(id, "to_apply");
      } else if (action === "remove") {
        newMap.delete(id);
      } else {
        // If action is a specific status like 'applied' or 'rejected'
        newMap.set(id, action);
      }
      return newMap;
    }
  );

  const feedRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: 'up' | 'down') => {
    if (feedRef.current) {
      const height = feedRef.current.clientHeight;
      feedRef.current.scrollBy({
        top: direction === 'down' ? height : -height,
        behavior: 'smooth'
      });
    }
  };

  const handleShare = async (url: string) => {
    if (navigator.share) {
      await navigator.share({ title: "Check out this opportunity!", url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleBookmark = (id: string, currentStatus: string | undefined) => {
    setActionError(null);
    const action = currentStatus && currentStatus !== 'archived' ? "remove" : "add";
    startTransition(async () => {
      updateOptimisticSaved({ id, action });
      try {
        const res = await toggleBookmark(id, currentStatus || null);
        if (res?.error) setActionError(res.error);
      } catch (err: any) {
        setActionError(err.message || "Failed to save opportunity");
      }
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setActionError(null);
    startTransition(async () => {
      // Use the optimistic updater function so the UI updates instantly
      updateOptimisticSaved({ id, action: newStatus as any });
      try {
        const res = await updateApplicationStatus(id, newStatus);
        if (res?.error) setActionError(res.error);
      } catch (err: any) {
        setActionError(err.message || "Failed to update status");
      }
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeOpps = allOpps.filter(op => {
    if (activeTab === "saved") return optimisticSaved.has(op.id);
    if (op.deadline) {
      const d = new Date(op.deadline);
      d.setHours(0, 0, 0, 0);
      if (d < today) return false;
    }
    return true;
  });

  const FILTER_DEFS = [
    { id: "All",            label: "All",          icon: <Rocket size={13} />,  match: (_: Opportunity) => true },
    { id: "Hackathons",     label: "Hackathons",   icon: <Zap size={13} />,     match: (op: Opportunity) => op.type.toLowerCase() === "hackathon" },
    { id: "Internships",    label: "Internships",  icon: <Trophy size={13} />,  match: (op: Opportunity) => op.type.toLowerCase() === "internship" },
    { id: "Fellowships",    label: "Fellowships",  icon: <Star size={13} />,    match: (op: Opportunity) => op.type.toLowerCase() === "fellowship" },
    { id: "Open Source",    label: "Open Source",  icon: <Globe size={13} />,   match: (op: Opportunity) => op.type.toLowerCase().includes("open") },
    { id: "AI & ML",        label: "AI & ML",      icon: <Brain size={13} />,   match: (op: Opportunity) => op.domain_tags?.some(t => /ai|machine learning|nlp|neural|deep learning/i.test(t)) },
    { id: "Cybersecurity",  label: "Cybersecurity",icon: <Shield size={13} />,  match: (op: Opportunity) => op.domain_tags?.some(t => /cyber|security|hacking|forensic|vulnerability/i.test(t)) },
    { id: "Design",         label: "Design",       icon: <Palette size={13} />, match: (op: Opportunity) => op.domain_tags?.some(t => /design|ux|ui|graphic|visual|figma|adobe/i.test(t)) },
    { id: "Web3",           label: "Web3",         icon: <Globe size={13} />,   match: (op: Opportunity) => op.domain_tags?.some(t => /web3|blockchain|crypto/i.test(t)) },
    { id: "Low Effort",     label: "Low Effort",   icon: <Zap size={13} />,     match: (op: Opportunity) => op.effort_level?.toLowerCase() === "low" },
    { id: "High Stakes",    label: "High Stakes",  icon: <Flame size={13} />,   match: (op: Opportunity) => op.competitiveness?.toLowerCase() === "high" },
  ];

  const fullyFilteredOpps = activeTab === "discover"
    ? (() => {
        if (activeFilters.has("All") || activeFilters.size === 0) return activeOpps;
        const selectedDefs = FILTER_DEFS.filter(f => activeFilters.has(f.id) && f.id !== "All");
        return activeOpps.filter(op => selectedDefs.some(f => f.match(op)));
      })()
    : activeOpps;

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (filterId === "All") {
        return new Set(["All"]);
      }
      if (next.has(filterId)) {
        next.delete(filterId);
        if (next.size === 0 || (next.size === 1 && next.has("All"))) return new Set(["All"]);
      } else {
        next.delete("All");
        next.add(filterId);
      }
      return next;
    });
    setFilterKey(k => k + 1);
  }, []);

  // Reset feed when filters change
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    setAllOpps([]);
    setPage(1);
    setHasMore(true);
    setIsFetching(true);

    const filterArray = Array.from(activeFilters).filter(f => f !== "All");
    const filterParam = filterArray.length > 0 ? filterArray.join(",") : "All";

    fetch(`/api/opportunities?page=1&filters=${encodeURIComponent(filterParam)}`, {
      signal: abortCtrl.signal
    })
    .then(res => res.json())
    .then(data => {
      if (data.opportunities) {
        setAllOpps(data.opportunities);
        setHasMore(data.opportunities.length === 50);
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError') console.error(err);
    })
    .finally(() => {
      setIsFetching(false);
    });

    return () => abortCtrl.abort();
  }, [activeFilters]);

  // Infinite Scroll Trigger
  const triggerRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetching || !hasMore) return;
    
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        const nextPage = page + 1;
        setPage(nextPage);
        setIsFetching(true);
        
        const filterArray = Array.from(activeFilters).filter(f => f !== "All");
        const filterParam = filterArray.length > 0 ? filterArray.join(",") : "All";
        
        const abortCtrl = new AbortController();
        abortControllerRef.current = abortCtrl;
        
        fetch(`/api/opportunities?page=${nextPage}&filters=${encodeURIComponent(filterParam)}`, {
          signal: abortCtrl.signal
        })
        .then(res => res.json())
        .then(data => {
          if (data.opportunities && data.opportunities.length > 0) {
            setAllOpps(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newUniques = data.opportunities.filter((op: any) => !existingIds.has(op.id));
              
              if (newUniques.length > 0 && snapContainerRef.current) {
                snapContainerRef.current.style.scrollSnapType = 'none';
                setTimeout(() => {
                  if (snapContainerRef.current) {
                    snapContainerRef.current.style.scrollSnapType = 'y mandatory';
                  }
                }, 0);
              }
              
              return [...prev, ...newUniques];
            });
            setHasMore(data.opportunities.length === 50);
          } else {
            setHasMore(false);
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') console.error(err);
        })
        .finally(() => {
          setIsFetching(false);
        });
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isFetching, hasMore, page, activeFilters]);

  const getEmptyStateMessage = () => {
    if (activeTab === "saved") return "You haven't bookmarked any opportunities yet.";
    if (!activeFilters.has("All") && activeFilters.size > 0) {
      return `No results for: ${[...activeFilters].join(" + ")}. Try adjusting your filters!`;
    }
    return "No opportunities match your current profile preferences. Try broadening your tech stack or wait for new ones!";
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      <nav className="w-24 border-r border-surface-low/30 bg-surface-lowest flex flex-col items-center py-8 gap-8 z-50 shrink-0">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 w-full ${activeTab === 'discover' ? 'bg-surface-high text-primary border-r-2 border-primary' : 'text-text-muted hover:text-text-main hover:bg-surface-low'}`}
        >
          <Compass size={28} />
          <span className="text-[10px] font-bold tracking-wider">DISCOVER</span>
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 w-full ${activeTab === 'saved' ? 'bg-surface-high text-primary border-r-2 border-primary' : 'text-text-muted hover:text-text-main hover:bg-surface-low'}`}
        >
          <Bookmark size={28} />
          <span className="text-[10px] font-bold tracking-wider">SAVED</span>
        </button>

        <div className="mt-auto mb-4 w-full px-2">
          <form action={signOut}>
            <button 
              type="submit"
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 w-full text-text-muted hover:text-red-400 hover:bg-red-500/10"
              title="Log Out"
            >
              <LogOut size={24} />
              <span className="text-[10px] font-bold tracking-wider">EXIT</span>
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        <header className="h-20 flex items-center justify-between px-8 absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.2)]">
              <span className="text-background font-black text-xl tracking-tighter">O</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-text-main">
              Opp<span className="text-primary">Hub</span>
            </h1>
          </div>
          
          {actionError && (
             <div className="absolute left-1/2 -translate-x-1/2 top-6 bg-error text-background px-4 py-2 rounded-full font-bold text-xs pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-top-4">
               {actionError}
               <button onClick={() => setActionError(null)} className="ml-2 bg-background/20 px-2 py-0.5 rounded-full hover:bg-background/40">✕</button>
             </div>
          )}

          <div className="flex items-center gap-6 pointer-events-auto">
            <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 border border-surface-low/50">
              <Flame size={20} className="text-warning fill-warning" />
              <span className="font-mono font-bold">12</span>
            </div>
            <form action="/auth/signout" method="post">
              <button className="w-12 h-12 rounded-full bg-surface-low border border-surface-high flex items-center justify-center hover:bg-surface-high transition-colors text-text-muted hover:text-error">
                <User size={24} />
              </button>
            </form>
          </div>
        </header>

        <>
            {activeTab === 'discover' && (
              <div className="absolute top-20 left-0 right-0 z-40 px-4 py-4 flex gap-2 overflow-x-auto pointer-events-auto hide-scrollbar items-center">
                {!activeFilters.has("All") && activeFilters.size > 0 && (
                  <button
                    onClick={() => handleFilterChange("All")}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-error/20 text-error border border-error/30 hover:bg-error/30 transition-all duration-150 active:scale-95 shrink-0"
                  >
                    ✕ Clear ({activeFilters.size})
                  </button>
                )}
                {FILTER_DEFS.map(filter => {
                  const count = activeOpps.filter(op => filter.match(op)).length;
                  const isActive = activeFilters.has(filter.id);
                  return (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterChange(filter.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 backdrop-blur-md border active:scale-95 shrink-0 ${
                        isActive
                          ? 'bg-primary text-[#002113] border-primary shadow-[0_0_12px_rgba(0,255,136,0.35)]'
                          : 'bg-surface-low/60 text-text-muted border-surface-high/40 hover:bg-surface-high/70 hover:text-text-main hover:border-surface-high'
                      }`}
                    >
                      <span className={isActive ? 'text-[#002113]' : 'text-text-muted'}>{filter.icon}</span>
                      {filter.label}
                      <span className={`ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-[#002113]/20 text-[#002113]' : 'bg-surface-high text-text-muted'
                      }`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* SHORTS-STYLE VERTICAL FEED */}
            <div 
              key={filterKey}
              ref={(node) => {
                feedRef.current = node;
                snapContainerRef.current = node;
              }}
              className="snap-y-container flex-1 pt-0 pb-[10vh] relative animate-fadeIn"
              style={{ animationDuration: '200ms' }}
            >
              {fullyFilteredOpps.length === 0 && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-4">
                    <Compass size={48} className="opacity-20" />
                    <p className="max-w-xs text-center leading-relaxed">{getEmptyStateMessage()}</p>
                 </div>
              )}

              {fullyFilteredOpps.map((card, index) => {
                const status = optimisticSaved.get(card.id);
                const isBookmarked = !!status;

                // Deadline badge logic
                const deadlineDate = new Date(card.deadline);
                deadlineDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const closingSoon = diffDays >= 0 && diffDays <= 3;

                return (
                <section 
                  key={card.id}
                  ref={index === fullyFilteredOpps.length - 5 ? triggerRef : undefined}
                  className="snap-item w-full h-[95vh] flex items-center justify-center pt-20 pb-10 relative"
                >
                  {/* THE CARD */}
                  <div className="w-full max-w-[420px] h-full max-h-[750px] relative rounded-[2rem] bg-surface-low overflow-hidden shadow-2xl flex flex-col border border-surface-high/30 z-10">
                    
                    {/* Top-Left Green Glow Effect inside Card */}
                    <div className="absolute top-0 left-0 w-[80%] h-[40%] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none"></div>

                    <div className="absolute left-6 right-6 flex justify-between items-start z-10 top-6">
                      <div className="flex flex-col gap-2">
                        {closingSoon && (
                           <span className="text-text-main font-bold text-[10px] tracking-widest uppercase z-20 mb-1 flex items-center gap-1">
                             <Flame size={12} className="text-warning fill-warning" /> 
                             {diffDays === 0 ? "Closing Today!" : `${diffDays}d left`}
                           </span>
                        )}
                        <span className="bg-transparent text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-primary uppercase self-start">
                          {card.type}
                        </span>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-text-muted bg-surface-high/50 border border-surface-high/30 self-start mt-1">
                          Deadline: {card.deadline ? new Date(card.deadline).toLocaleDateString() : 'Rolling'}
                        </div>
                      </div>
                      
                      {/* Match Score Ring */}
                      <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center relative">
                        <div className="absolute w-full h-full rounded-full border-[3px] border-surface-high"></div>
                        <div className="absolute w-full h-full rounded-full border-[3px] border-primary border-r-transparent border-b-transparent rotate-45"></div>
                        <span className="font-bold text-sm z-10 text-text-main">94%</span>
                        <span className="text-[8px] text-text-muted mt-[-2px]">Match</span>
                      </div>
                    </div>

                    <div className="absolute bottom-[90px] left-0 right-0 p-8 pb-4 flex flex-col items-center text-center justify-end z-10 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-surface-high mb-6 flex items-center justify-center border border-surface-high/50 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                         <Compass size={28} className="text-primary" />
                      </div>
                      <h2 className="text-2xl font-black leading-[1.2] tracking-tight">{card.title}</h2>
                      <p className="text-sm text-text-muted line-clamp-3 leading-relaxed max-w-[90%] mt-3">{card.description}</p>
                      
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {card.domain_tags && card.domain_tags.slice(0, 4).map(tag => (
                          <span key={tag} className="px-3 py-1 bg-surface-high rounded-full text-xs font-mono text-text-muted">
                            {tag}
                          </span>
                        ))}
                        {card.domain_tags && card.domain_tags.length > 4 && (
                          <span className="px-3 py-1 bg-surface-high/50 border border-surface-high rounded-full text-xs font-mono text-text-muted">
                            +{card.domain_tags.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Apply Now Section */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-surface-lowest via-surface-lowest/90 to-transparent z-20 flex flex-col pointer-events-auto">
                      <div className="flex justify-between items-center px-2 mb-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-text-main capitalize">
                             {card.competitiveness}
                           </span>
                           <span className="text-xs text-text-muted">Competitiveness</span>
                        </div>
                      </div>
                      <a href={card.source_url} target="_blank" rel="noopener noreferrer" className="w-full block text-center py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-[#002113] font-bold text-base tracking-wide hover:brightness-110 transition-all shadow-[0_5px_20px_rgba(0,255,136,0.2)] active:scale-[0.98]">
                        Apply Now
                      </a>
                    </div>
                  </div>

                  {/* FLOATING DETACHED PILL (Right Side) */}
                  <div className="absolute right-4 md:right-[calc(50%-280px)] top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-30 pointer-events-auto bg-surface-low/80 backdrop-blur-xl border border-surface-high/50 p-4 rounded-full shadow-2xl">
                    
                    <button 
                      onClick={() => handleBookmark(card.id, status)}
                      className="flex flex-col items-center gap-1 group/btn cursor-pointer active:scale-90 transition-transform"
                    >
                      <Bookmark 
                        size={24} 
                        className={`transition-colors duration-150 ${isBookmarked ? "text-primary fill-primary" : "text-text-muted group-hover/btn:text-text-main"}`} 
                      />
                      <span className="text-[10px] font-mono text-text-muted mt-1">{isBookmarked ? '1' : '0'}</span>
                    </button>

                    <div className="w-8 h-[1px] bg-surface-high/50"></div>

                    <button 
                      onClick={() => handleShare(card.source_url)}
                      className="flex flex-col items-center gap-1 group/btn cursor-pointer active:scale-90 transition-transform"
                    >
                      <Share2 size={24} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
                      <span className="text-[10px] font-mono text-text-muted mt-1">5</span>
                    </button>

                    <div className="w-8 h-[1px] bg-surface-high/50"></div>

                    <button className="flex flex-col items-center gap-1 group/btn cursor-pointer active:scale-90 transition-transform">
                      <Star size={24} className="text-text-muted group-hover/btn:text-text-main transition-colors duration-150" />
                      <span className="text-[10px] font-mono text-text-muted mt-1">3</span>
                    </button>
                    
                    {isBookmarked && status !== 'archived' && (
                      <>
                        <div className="w-8 h-[1px] bg-surface-high/50"></div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-mono text-text-muted mb-1">Status</span>
                          <select 
                            value={status}
                            onChange={(e) => handleStatusChange(card.id, e.target.value)}
                            className="bg-surface-lowest text-text-main text-[10px] border border-surface-high/50 rounded-md p-1 outline-none w-20 text-center"
                          >
                            <option value="to_apply">Saved</option>
                            <option value="applied">Applied</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="archived">Archived</option>
                          </select>
                        </div>
                      </>
                    )}
                    
                  </div>

                </section>
              )})}

              {/* SKELETON PLACEHOLDERS WHILE FETCHING */}
              {isFetching && (
                <>
                  <OpportunitySkeleton />
                  <OpportunitySkeleton />
                  <OpportunitySkeleton />
                </>
              )}
            </div>

            {/* UP/DOWN NAVIGATION ARROWS */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50 pointer-events-auto">
              <button 
                onClick={() => scrollByCard('up')}
                className="w-12 h-12 rounded-full glass-panel border border-surface-high/50 flex items-center justify-center hover:bg-surface-high hover:scale-110 transition-all text-text-muted hover:text-text-main shadow-2xl"
              >
                <ChevronUp size={24} />
              </button>
              <button 
                onClick={() => scrollByCard('down')}
                className="w-12 h-12 rounded-full bg-surface-high border border-surface-high flex items-center justify-center hover:bg-surface-high/80 hover:scale-110 transition-all text-text-main shadow-2xl"
              >
                <ChevronDown size={24} />
              </button>
            </div>
            
          </>
      </main>
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <section className="snap-item w-full h-[95vh] flex items-center justify-center pt-20 pb-10 relative">
      <div className="w-full max-w-[420px] h-full max-h-[750px] relative rounded-[2rem] bg-surface-low overflow-hidden shadow-2xl flex flex-col border border-surface-high/30 z-10 animate-pulse">
        <div className="absolute top-6 left-6 right-6 flex flex-col gap-2">
          <div className="w-24 h-6 bg-surface-high rounded-full"></div>
          <div className="w-32 h-4 bg-surface-high rounded-full mt-1"></div>
        </div>
        <div className="absolute top-6 right-6 w-16 h-16 rounded-full bg-surface-high"></div>
        <div className="absolute bottom-[90px] left-0 right-0 p-8 pb-4 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-surface-high mb-6"></div>
          <div className="w-3/4 h-8 bg-surface-high rounded-md mb-4"></div>
          <div className="w-full h-4 bg-surface-high rounded-sm mb-2"></div>
          <div className="w-5/6 h-4 bg-surface-high rounded-sm mb-4"></div>
          <div className="flex gap-2"><div className="w-16 h-6 bg-surface-high rounded-full"></div><div className="w-20 h-6 bg-surface-high rounded-full"></div></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-surface-lowest/90 z-20 flex flex-col">
          <div className="w-full h-14 rounded-xl bg-surface-high"></div>
        </div>
      </div>
    </section>
  );
}

