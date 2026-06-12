"use client";

import { 
  Compass, Flame, User, Star,
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Trophy, Rocket, Filter, CheckCircle2
} from "lucide-react";
import { useState, useRef, useTransition, useOptimistic, useCallback, useEffect } from "react";
import { toggleBookmark, updateApplicationStatus } from "@/app/actions";
import Link from "next/link";
import { Opportunity, UserSavedStatus } from "@/types";
import Sidebar from "./Sidebar";
import OpportunityCard from "./OpportunityCard";

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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterKey, setFilterKey] = useState(0); 
  const [, startTransition] = useTransition();
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

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeOpps = allOpps.filter(op => {
    if (activeTab === "saved") return optimisticSaved.has(op.id);
    
    // Skip date filtering during SSR to prevent hydration mismatch due to server/client timezone differences
    if (!isMounted) return true;

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
        return activeOpps.filter(op => selectedDefs.every(f => f.match(op)));
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
    <div 
      className="flex h-screen w-full overflow-hidden bg-background"
      style={{ '--sidebar-width': '88px' } as React.CSSProperties}
    >
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        <header className="h-20 shrink-0 flex items-center justify-between px-4 md:px-8 relative z-50">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                <span className="text-background font-black text-xl tracking-tighter">O</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-text-main hidden lg:block">
                Opp<span className="text-primary">Hub</span>
              </h1>
            </div>

            {/* FILTER DROPDOWN */}
            {activeTab === 'discover' && (
              <div className="relative">
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-low border border-surface-high/50 text-sm font-bold text-text-main hover:bg-surface-high transition-all shadow-lg active:scale-95"
                >
                  <Filter size={16} className={activeFilters.has("All") ? "text-text-muted" : "text-primary"} />
                  <span className="hidden sm:inline">Filters</span>
                  {!activeFilters.has("All") && (
                    <span className="bg-primary text-[#002113] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                      {activeFilters.size}
                    </span>
                  )}
                  <ChevronDown size={16} className={`transition-transform text-text-muted ${isFilterOpen ? "rotate-180" : ""}`} />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-64 bg-surface-low border border-surface-high/50 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-50 max-h-[60vh] overflow-y-auto hide-scrollbar">
                      {!activeFilters.has("All") && activeFilters.size > 0 && (
                        <button
                          onClick={() => { handleFilterChange("All"); setIsFilterOpen(false); }}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold bg-error/10 text-error hover:bg-error/20 transition-all text-left mb-1"
                        >
                          Clear Filters
                        </button>
                      )}
                      {FILTER_DEFS.map(filter => {
                        const isActive = activeFilters.has(filter.id);
                        return (
                          <button
                            key={filter.id}
                            onClick={() => {
                              handleFilterChange(filter.id);
                              if (filter.id === "All") setIsFilterOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-muted hover:text-text-main hover:bg-surface-high/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {filter.icon}
                              {filter.label}
                            </div>
                            {isActive && <CheckCircle2 size={16} className="text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {actionError && (
             <div className="absolute left-1/2 -translate-x-1/2 top-6 bg-error text-background px-4 py-2 rounded-full font-bold text-xs pointer-events-auto shadow-2xl animate-in fade-in slide-in-from-top-4">
               {actionError}
               <button onClick={() => setActionError(null)} className="ml-2 bg-background/20 px-2 py-0.5 rounded-full hover:bg-background/40">✕</button>
             </div>
          )}

          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="bg-surface-low px-4 py-2.5 rounded-full flex items-center gap-2 border border-surface-high/50">
              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(0,255,136,0.8)]"></div>
              <span className="font-bold text-xs tracking-wider text-text-muted">STREAK: <span className="text-text-main">12</span></span>
            </div>
            <Link href="/onboarding" className="w-10 h-10 rounded-full bg-surface-low border border-surface-high flex items-center justify-center hover:bg-surface-high transition-colors text-text-muted hover:text-text-main overflow-hidden">
              <User size={20} />
            </Link>
          </div>
        </header>

        <>

            {/* SHORTS-STYLE VERTICAL FEED */}
            <div 
              key={filterKey}
              ref={(node) => {
                feedRef.current = node;
                snapContainerRef.current = node;
              }}
              className="snap-y-container flex-1 overflow-y-auto relative animate-fadeIn"
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

                return (
                <section 
                  key={card.id}
                  ref={index === fullyFilteredOpps.length - 5 ? triggerRef : undefined}
                  /* SNAP TARGET: The wrapper section itself is the snap target to ensure card and pill stay vertically aligned */
                  className="snap-item w-full h-full flex flex-row items-center justify-center gap-3 xl:gap-4 py-6 px-4 md:px-0 relative"
                >
                  <OpportunityCard 
                    card={card}
                    status={status}
                    isBookmarked={isBookmarked}
                    isMounted={isMounted}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onStar={() => setActionError("Star functionality coming soon!")}
                    onStatusChange={handleStatusChange}
                  />
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
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 pointer-events-auto">
              <button 
                onClick={() => scrollByCard('up')}
                className="w-10 h-10 rounded-2xl bg-surface-low border border-surface-high/50 flex items-center justify-center hover:bg-surface-high hover:scale-110 transition-all text-text-muted hover:text-text-main shadow-lg"
              >
                <ChevronUp size={20} strokeWidth={2.5} />
              </button>
              <button 
                onClick={() => scrollByCard('down')}
                className="w-10 h-10 rounded-2xl bg-surface-low border border-surface-high/50 flex items-center justify-center hover:bg-surface-high hover:scale-110 transition-all text-text-muted hover:text-text-main shadow-lg"
              >
                <ChevronDown size={20} strokeWidth={2.5} />
              </button>
            </div>
            
          </>
      </main>
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <section className="snap-item w-full h-full flex flex-row items-center justify-center gap-3 xl:gap-4 py-6 px-4 md:px-0 relative">
      {/* 
        CRITICAL: The className and inline style of this wrapper MUST stay perfectly synced verbatim
        with the real card wrapper to prevent layout shifts during skeleton replacement!
      */}
      <div 
        className="relative rounded-[2.5rem] bg-surface-low overflow-hidden shadow-2xl border border-surface-high/30 z-10 animate-pulse shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] h-[var(--card-size)] w-[calc(var(--card-size)*0.8)]"
        style={{ '--card-size': 'min(85dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.8))' } as React.CSSProperties}
      >
        <div className="p-[clamp(1.25rem,2.5dvh,2rem)] flex flex-col gap-2">
          <div className="w-24 h-[clamp(1rem,2dvh,1.5rem)] bg-surface-high rounded-full"></div>
          <div className="w-32 h-[clamp(0.75rem,1.5dvh,1rem)] bg-surface-high rounded-full mt-1"></div>
        </div>
        <div className="min-h-0 flex flex-col items-center justify-center gap-[clamp(1rem,3dvh,1.5rem)] p-[clamp(1.25rem,2.5dvh,2rem)] landscape:p-4">
          <div className="w-[clamp(3rem,6dvh,4rem)] h-[clamp(3rem,6dvh,4rem)] bg-surface-high rounded-2xl"></div>
          <div className="w-3/4 h-[clamp(1.5rem,3dvh,2rem)] bg-surface-high rounded-lg"></div>
          <div className="w-1/2 h-[clamp(0.75rem,1.5dvh,1rem)] bg-surface-high rounded-lg landscape:hidden"></div>
        </div>
        <div className="p-[clamp(1.25rem,2.5dvh,2rem)]">
          <div className="w-full h-[clamp(3rem,6dvh,3.5rem)] bg-surface-high rounded-xl"></div>
        </div>
      </div>
    </section>
  );
}

