"use client";

import {
  Compass, Flame, User, Star,
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Trophy, Rocket, Filter, CheckCircle2, Bookmark
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

  // Sidebar collapsed state — drives --sidebar-width CSS variable
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? 72 : 176;

  const [optimisticSaved, updateOptimisticSaved] = useOptimistic(
    new Map(savedStatuses.map(s => [s.opportunity_id, s.status])),
    (currentMap, { id, action }: { id: string; action: string }) => {
      const newMap = new Map(currentMap);
      if (action === "add") {
        newMap.set(id, "to_apply");
      } else if (action === "remove") {
        newMap.delete(id);
      } else {
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
    setIsMounted(true);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeOpps = allOpps.filter(op => {
    if (activeTab === "saved") return optimisticSaved.has(op.id);
    if (!isMounted) return true;
    if (op.deadline) {
      const d = new Date(op.deadline);
      d.setHours(0, 0, 0, 0);
      if (d < today) return false;
    }
    return true;
  });

  const FILTER_DEFS = [
    { id: "All",           label: "All",           icon: <Rocket size={13} />,  match: (_: Opportunity) => true },
    { id: "Hackathons",    label: "Hackathons",    icon: <Zap size={13} />,     match: (op: Opportunity) => (op.type || '').toLowerCase() === "hackathon" || /hackathon/i.test(op.title || "") },
    { id: "Internships",   label: "Internships",   icon: <Trophy size={13} />,  match: (op: Opportunity) => (op.type || '').toLowerCase() === "internship" || /intern/i.test(op.title || "") },
    { id: "Fellowships",   label: "Fellowships",   icon: <Star size={13} />,    match: (op: Opportunity) => (op.type || '').toLowerCase() === "fellowship" || /fellowship/i.test(op.title || "") },
    { id: "Open Source",   label: "Open Source",   icon: <Globe size={13} />,   match: (op: Opportunity) => (op.type || '').toLowerCase().includes("open") || /open.source|gsoc|outreachy/i.test(op.title || "") },
    { id: "AI & ML",       label: "AI & ML",       icon: <Brain size={13} />,   match: (op: Opportunity) => op.domain_tags?.some(t => /ai|machine learning|nlp|neural|deep learning|data/i.test(t)) || /ai|machine learning|nlp|neural|deep learning|data science|intelligence/i.test(op.title || "") },
    { id: "Cybersecurity", label: "Cybersecurity", icon: <Shield size={13} />,  match: (op: Opportunity) => op.domain_tags?.some(t => /cyber|security|hacking|forensic|vulnerability/i.test(t)) || /cyber|security|vulnerability/i.test(op.title || "") },
    { id: "Design",        label: "Design",        icon: <Palette size={13} />, match: (op: Opportunity) => op.domain_tags?.some(t => /design|ux|ui|graphic|visual|figma|adobe/i.test(t)) || /design|ux|ui|figma/i.test(op.title || "") },
    { id: "Web3",          label: "Web3",          icon: <Globe size={13} />,   match: (op: Opportunity) => op.domain_tags?.some(t => /web3|blockchain|crypto|solidity/i.test(t)) || /web3|blockchain|crypto|solidity/i.test(op.title || "") },
    { id: "Low Effort",    label: "Low Effort",    icon: <Zap size={13} />,     match: (op: Opportunity) => (op.effort_level || '').toLowerCase() === "low" },
    { id: "High Stakes",   label: "High Stakes",   icon: <Flame size={13} />,   match: (op: Opportunity) => (op.competitiveness || '').toLowerCase() === "high" },
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

  // Infinite scroll trigger
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

  const activeFilterCount = activeFilters.has("All") ? 0 : activeFilters.size;

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-background"
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* ── Sidebar (desktop) ── */}
      <div className="hidden md:flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
      </div>

      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* ── Header ── */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-5 relative z-50 border-b border-surface-high/20">
          <div className="flex items-center gap-3">
            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-[28px] h-[28px] rounded-[8px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
                <Compass size={13} className="text-background" strokeWidth={2.5} />
              </div>
              <span className="font-black text-[15px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
            </div>

            {/* Filter dropdown — only on discover tab */}
            {activeTab === 'discover' && (
              <div className="relative">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface-low border border-surface-high/40 text-[12px] font-semibold text-text-main hover:bg-surface-high transition-all active:scale-95"
                >
                  <Filter size={13} className={activeFilterCount > 0 ? "text-primary" : "text-text-muted"} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-background w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    size={13}
                    className={`transition-transform text-text-muted ${isFilterOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-surface-low border border-surface-high/40 rounded-2xl p-1.5 shadow-2xl flex flex-col gap-0.5 z-50 max-h-[60vh] overflow-y-auto hide-scrollbar animate-fadeIn">
                      {/* Clear filters button */}
                      {!activeFilters.has("All") && activeFilters.size > 0 && (
                        <button
                          onClick={() => { handleFilterChange("All"); setIsFilterOpen(false); }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold bg-error/8 text-error hover:bg-error/15 transition-all text-left mb-1"
                        >
                          Clear All Filters
                          <span>✕</span>
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
                            className={`flex items-center justify-between px-3 py-[9px] rounded-xl text-[12px] font-semibold transition-all text-left
                              ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-text-muted hover:text-text-main hover:bg-surface-high/50'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {filter.icon}
                              {filter.label}
                            </div>
                            {isActive && <CheckCircle2 size={14} className="text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error toast */}
          {actionError && (
            <div className="absolute left-1/2 -translate-x-1/2 top-3 bg-error text-background px-4 py-2 rounded-full font-bold text-[11px] pointer-events-auto shadow-2xl animate-fadeIn flex items-center gap-2">
              {actionError}
              <button onClick={() => setActionError(null)} className="bg-background/20 px-1.5 py-0.5 rounded-full hover:bg-background/40 text-[10px]">✕</button>
            </div>
          )}

          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Real-time saved count */}
            <div className="bg-surface-low px-3 py-[6px] rounded-full flex items-center gap-2 border border-surface-high/40" title="Your saved opportunities">
              <Bookmark size={13} className={optimisticSaved.size > 0 ? "text-primary fill-primary" : "text-text-muted"} />
              <span className="font-bold text-[11px] tracking-wide text-text-muted">
                SAVED: <span className="text-text-main font-mono">{optimisticSaved.size}</span>
              </span>
            </div>
            <Link
              href="/onboarding"
              className="w-9 h-9 rounded-full bg-surface-low border border-surface-high/40 flex items-center justify-center hover:bg-surface-high transition-colors text-text-muted hover:text-text-main overflow-hidden"
              title="Profile & Preferences"
            >
              <User size={17} strokeWidth={2} />
            </Link>
          </div>
        </header>

        {/* ── Vertical snap feed ── */}
        <>
          <div
            key={filterKey}
            ref={(node) => {
              feedRef.current = node;
              snapContainerRef.current = node;
            }}
            className="snap-y-container flex-1 overflow-y-auto relative animate-fadeIn mobile-content-pad"
            style={{ animationDuration: '200ms' }}
          >
            {/* Empty state */}
            {fullyFilteredOpps.length === 0 && !isFetching && (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-4">
                <Compass size={44} className="opacity-20" />
                <p className="max-w-xs text-center leading-relaxed text-[13px]">{getEmptyStateMessage()}</p>
              </div>
            )}

            {fullyFilteredOpps.map((card, index) => {
              const status = optimisticSaved.get(card.id);
              const isBookmarked = !!status;

              return (
                <section
                  key={card.id}
                  ref={index === fullyFilteredOpps.length - 5 ? triggerRef : undefined}
                  className="snap-item w-full h-full flex flex-row items-center justify-center gap-3 xl:gap-4 py-5 px-4 md:px-0 relative"
                >
                  <OpportunityCard
                    card={card}
                    status={status}
                    isBookmarked={isBookmarked}
                    isMounted={isMounted}
                    profile={profile}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onStar={() => setActionError("Star functionality coming soon!")}
                    onStatusChange={handleStatusChange}
                  />
                </section>
              );
            })}

            {/* Shimmer skeletons while fetching */}
            {isFetching && (
              <>
                <OpportunitySkeleton />
                <OpportunitySkeleton />
                <OpportunitySkeleton />
              </>
            )}
          </div>

          {/* Up/Down navigation arrows */}
          <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 z-50 pointer-events-auto">
            <button
              onClick={() => scrollByCard('up')}
              className="w-9 h-9 rounded-[10px] bg-surface-low border border-surface-high/40 flex items-center justify-center hover:bg-surface-high hover:scale-110 transition-all text-text-muted hover:text-text-main shadow-lg"
            >
              <ChevronUp size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => scrollByCard('down')}
              className="w-9 h-9 rounded-[10px] bg-surface-low border border-surface-high/40 flex items-center justify-center hover:bg-surface-high hover:scale-110 transition-all text-text-muted hover:text-text-main shadow-lg"
            >
              <ChevronDown size={18} strokeWidth={2.5} />
            </button>
          </div>
        </>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-lowest/95 backdrop-blur-xl border-t border-surface-high/20 flex items-center justify-around z-50 px-4">
        <button
          onClick={() => setActiveTab("discover")}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
            activeTab === "discover" ? "text-primary" : "text-text-muted"
          }`}
        >
          <Compass size={22} strokeWidth={activeTab === "discover" ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">Discover</span>
        </button>

        <button
          onClick={() => setActiveTab("saved")}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
            activeTab === "saved" ? "text-primary" : "text-text-muted"
          }`}
        >
          <Bookmark size={22} strokeWidth={activeTab === "saved" ? 2.5 : 2} />
          <span className="text-[10px] font-semibold">Saved</span>
        </button>

        <Link
          href="/onboarding"
          className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl text-text-muted hover:text-text-main transition-all"
        >
          <User size={22} strokeWidth={2} />
          <span className="text-[10px] font-semibold">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <section className="snap-item w-full h-full flex flex-row items-center justify-center gap-3 xl:gap-4 py-5 px-4 md:px-0 relative">
      <div
        className="relative rounded-[2.5rem] bg-surface-low overflow-hidden border border-surface-high/20 z-10 shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] h-[var(--card-size)] w-[calc(var(--card-size)*0.7)]"
        style={{ '--card-size': 'min(82dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.7))' } as React.CSSProperties}
      >
        {/* Top row */}
        <div className="p-5 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="w-20 h-5 animate-shimmer rounded-lg" />
            <div className="w-28 h-6 animate-shimmer rounded-full" />
          </div>
          <div className="w-14 h-14 animate-shimmer rounded-full" />
        </div>

        {/* Middle */}
        <div className="min-h-0 flex flex-col items-center justify-center gap-4 p-5">
          <div className="w-12 h-12 animate-shimmer rounded-[14px]" />
          <div className="w-3/4 h-7 animate-shimmer rounded-lg" />
          <div className="w-1/2 h-4 animate-shimmer rounded-lg" />
          <div className="flex gap-2">
            <div className="w-14 h-6 animate-shimmer rounded-lg" />
            <div className="w-14 h-6 animate-shimmer rounded-lg" />
            <div className="w-14 h-6 animate-shimmer rounded-lg" />
          </div>
        </div>

        {/* Bottom */}
        <div className="p-5">
          <div className="w-full h-12 animate-shimmer rounded-xl" />
        </div>
      </div>
    </section>
  );
}
