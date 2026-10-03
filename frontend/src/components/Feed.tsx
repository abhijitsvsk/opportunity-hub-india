"use client";

import {
  Compass, Flame, User, Star, Layers, LogOut,
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Rocket, Filter, CheckCircle2, Bookmark,
  Code2, Briefcase, LayoutGrid, Rows3, Search, X, Building2
} from "lucide-react";
import { useState, useRef, useTransition, useOptimistic, useCallback, useEffect, useMemo, startTransition as reactStartTransition } from "react";
import { toggleBookmark, updateApplicationStatus, signOut } from "@/app/actions";
import Link from "next/link";
import { Opportunity, UserSavedStatus } from "@/types";
import OpportunityCard from "./OpportunityCard";
import OpportunityRow from "./OpportunityRow";
import OpportunityGridCard from "./OpportunityGridCard";
import QuickViewDrawer from "./QuickViewDrawer";
import { Dock } from "./ui/dock-two";
import { MeshGradientSVG } from "./ui/shader-svg";
import { computeMatchScore } from "@/lib/opportunities";
import { matchesBatchFilter, BATCH_DEFINITIONS, BatchFilterKey } from "@/lib/eligibility";
import { extractCompanyName } from "@/lib/branding";
import { matchesCompanyFilter, matchesSearchQuery, DOMAIN_AND_TYPE_FILTERS } from "@/lib/filters";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'match' | 'deadline' | 'newest'>('match');
  const [selectedBatch, setSelectedBatch] = useState<BatchFilterKey>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>("All");
  const [globalCompanyList, setGlobalCompanyList] = useState<[string, number][]>([]);
  const [isCompanyFilterOpen, setIsCompanyFilterOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [drawerCard, setDrawerCard] = useState<Opportunity | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // View Mode: 'list' (Calm List) | 'grid' (Relaxed Grid) | 'card' (Snap Feed)
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'card'>('list');

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

    // Responsive initial view mode
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setViewMode('card');
    } else {
      const saved = localStorage.getItem('opphub_view_mode') as 'list' | 'grid' | 'card';
      if (saved && (saved === 'list' || saved === 'grid' || saved === 'card')) {
        setViewMode(saved);
      } else {
        setViewMode('list'); // Default to Calm List View on desktop
      }
    }
  }, []);

  const handleViewModeChange = (mode: 'list' | 'grid' | 'card') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('opphub_view_mode', mode);
    }
  };

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
    { id: "Competitions",  label: "Competitions",  icon: <Code2 size={13} />,   match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Competitions")?.match || (() => true) },
    { id: "Hackathons",    label: "Hackathons",    icon: <Zap size={13} />,     match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Hackathons")?.match || (() => true) },
    { id: "Internships",   label: "Internships",   icon: <Briefcase size={13} />, match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Internships")?.match || (() => true) },
    { id: "Full-time",     label: "Full-time",     icon: <Briefcase size={13} />, match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Full-time")?.match || (() => true) },
    { id: "Fellowships",   label: "Fellowships",   icon: <Star size={13} />,    match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Fellowships")?.match || (() => true) },
    { id: "Open Source",   label: "Open Source",   icon: <Globe size={13} />,   match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Open Source")?.match || (() => true) },
    { id: "AI & ML",       label: "AI & ML",       icon: <Brain size={13} />,   match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "AI & ML")?.match || (() => true) },
    { id: "Cybersecurity", label: "Cybersecurity", icon: <Shield size={13} />,  match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Cybersecurity")?.match || (() => true) },
    { id: "Design",        label: "Design",        icon: <Palette size={13} />, match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Design")?.match || (() => true) },
    { id: "Web3",          label: "Web3",          icon: <Globe size={13} />,   match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Web3")?.match || (() => true) },
    { id: "Low Effort",    label: "Low Effort",    icon: <Zap size={13} />,     match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "Low Effort")?.match || (() => true) },
    { id: "High Stakes",   label: "High Stakes",   icon: <Flame size={13} />,   match: DOMAIN_AND_TYPE_FILTERS.find(f => f.id === "High Stakes")?.match || (() => true) },
  ];

  const fullyFilteredOpps = activeTab === "discover"
    ? (() => {
        if (activeFilters.has("All") || activeFilters.size === 0) return activeOpps;
        const selectedDefs = FILTER_DEFS.filter(f => activeFilters.has(f.id) && f.id !== "All");
        return activeOpps.filter(op => selectedDefs.some(f => f.match(op)));
      })()
    : activeOpps;

  // Fetch global company directory across all 1,400+ opportunities
  useEffect(() => {
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data?.companies && Array.isArray(data.companies)) {
          setGlobalCompanyList(data.companies);
        }
      })
      .catch(err => console.error("Failed to load company directory:", err));
  }, []);

  // Dynamically compute company list with opportunity counts
  const companyCounts = useMemo(() => {
    if (globalCompanyList.length > 0) return globalCompanyList;
    const counts = new Map<string, number>();
    for (const op of allOpps) {
      const comp = extractCompanyName(op);
      if (comp && comp !== 'Other' && comp !== 'Opportunity') {
        counts.set(comp, (counts.get(comp) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allOpps, globalCompanyList]);

  const filteredCompanyList = useMemo(() => {
    if (!companySearchQuery.trim()) return companyCounts;
    const q = companySearchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[\s\-_]/g, '');

    return companyCounts.filter(([comp]) => {
      const lower = comp.toLowerCase();
      if (lower.includes(q)) return true;
      const cleanComp = lower.replace(/[\s\-_]/g, '');
      if (cleanComp.includes(cleanQ)) return true;
      if (cleanQ === 'yc' && (cleanComp.includes('ycombinator') || cleanComp.includes('yc'))) return true;
      return false;
    });
  }, [companyCounts, companySearchQuery]);

  // Handle selecting a company — fetches directly if not yet in client memory
  const handleSelectCompany = useCallback(async (company: string) => {
    setSelectedCompany(company);
    setIsCompanyFilterOpen(false);

    if (company !== "All") {
      const isYc = /y\s*combinator|\byc\b/i.test(company);
      const isWf = /wellfound|\bangel\b/i.test(company);

      const hasLoadedMatches = allOpps.some(op => {
        if (isYc) {
          return (op.source_url && (op.source_url.includes('workatastartup.com') || op.source_url.includes('ycombinator.com'))) ||
            (op.domain_tags && op.domain_tags.some(t => /^(yc|y combinator|ycombinator|work at a startup)$/i.test(t.trim())));
        }
        if (isWf) {
          return (op.source_url && (op.source_url.includes('wellfound.com') || op.source_url.includes('angel.co'))) ||
            (op.domain_tags && op.domain_tags.some(t => /^(wellfound|angellist)$/i.test(t.trim())));
        }
        const opComp = extractCompanyName(op).toLowerCase();
        const rawComp = (op.normalized_company || '').toLowerCase();
        const target = company.toLowerCase();
        return opComp === target || rawComp.includes(target);
      });

      if (!hasLoadedMatches || isYc || isWf) {
        setIsFetching(true);
        try {
          const res = await fetch(`/api/opportunities?company=${encodeURIComponent(company)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.opportunities && data.opportunities.length > 0) {
              setAllOpps(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newItems = data.opportunities.filter((o: Opportunity) => !existingIds.has(o.id));
                return [...newItems, ...prev];
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch opportunities for company:", err);
        } finally {
          setIsFetching(false);
        }
      }
    }
  }, [allOpps]);

  // Server-side search hook: fetch matching records across all 1,600+ opportunities
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        setIsFetching(true);
        const res = await fetch(`/api/opportunities?search=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.opportunities && data.opportunities.length > 0) {
            setAllOpps(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = data.opportunities.filter((o: Opportunity) => !existingIds.has(o.id));
              return [...newItems, ...prev];
            });
          }
        }
      } catch (err) {
        console.error("Search query failed:", err);
      } finally {
        setIsFetching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Instant text search filter, company filter & batch filter
  const displayedOpps = fullyFilteredOpps.filter(op => {
    // 1. Graduation batch filter
    if (selectedBatch !== 'all' && !matchesBatchFilter(op.eligibility, op.type, op.title, selectedBatch)) {
      return false;
    }

    // 2. Dedicated company & ecosystem filter
    if (!matchesCompanyFilter(op, selectedCompany)) {
      return false;
    }

    // 3. Smart collision-free search query filter
    return matchesSearchQuery(op, searchQuery);
  });

  // Sort displayed opportunities
  const sortedOpps = [...displayedOpps].sort((a, b) => {
    if (sortBy === 'deadline') {
      const isAVerified = a.deadline && (a.deadline_confidence === 'exact' || a.deadline_confidence === 'computed_from_countdown');
      const isBVerified = b.deadline && (b.deadline_confidence === 'exact' || b.deadline_confidence === 'computed_from_countdown');

      // 1. Both verified: sort by closing soonest
      if (isAVerified && isBVerified) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      // 2. Verified deadlines appear before unverified/rolling deadlines
      if (isAVerified && !isBVerified) return -1;
      if (!isAVerified && isBVerified) return 1;

      // 3. Both rolling/unverified: sort by closest date
      const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return aDate - bDate;
    }
    if (sortBy === 'newest') {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate; // Newest first
    }
    // 'match' — sort by match score descending (requires profile)
    const aScore = computeMatchScore(a, profile).score;
    const bScore = computeMatchScore(b, profile).score;
    return bScore - aScore;
  });

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

  const activeFilterCount = activeFilters.has("All") ? 0 : activeFilters.size;

  // Dock items — Navigation section + View mode section
  const dockItems = [
    {
      icon: Compass,
      label: "Discover",
      onClick: () => setActiveTab("discover"),
      isActive: activeTab === "discover",
    },
    {
      icon: Bookmark,
      label: `Saved (${optimisticSaved.size})`,
      onClick: () => setActiveTab("saved"),
      isActive: activeTab === "saved",
    },
    {
      icon: User,
      label: "Profile",
      onClick: () => setShowProfileMenu(prev => !prev),
      isActive: false,
    },
    // --- separator at index 2 ---
    {
      icon: Rows3,
      label: "List View",
      onClick: () => handleViewModeChange("list"),
      isActive: viewMode === "list",
    },
    {
      icon: LayoutGrid,
      label: "Grid View",
      onClick: () => handleViewModeChange("grid"),
      isActive: viewMode === "grid",
    },
    {
      icon: Layers,
      label: "Card View",
      onClick: () => handleViewModeChange("card"),
      isActive: viewMode === "card",
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* ── Header ── */}
        <header className="shrink-0 flex flex-col relative z-50 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
          {/* Row 1: Primary Controls */}
          <div className="h-14 flex items-center justify-between px-3 sm:px-5 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-[28px] h-[28px] rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-sm">
                <Compass size={14} strokeWidth={2.4} />
              </div>
              <span className="font-bold text-[15px] tracking-tight text-white hidden xs:inline sm:inline">Opp<span className="text-zinc-400">Hub</span></span>
            </div>

            {/* Filter button — discover tab */}
            {activeTab === 'discover' && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[12px] font-medium text-zinc-200 hover:text-white hover:border-zinc-700 transition-all cursor-pointer active:scale-95"
                >
                  <Filter size={13} className={activeFilterCount > 0 ? "text-white" : "text-zinc-400"} />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-white text-black w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown
                    size={12}
                    className={`transition-transform text-zinc-400 hidden sm:inline ${isFilterOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 max-w-[85vw] bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 z-50 max-h-[60vh] overflow-y-auto hide-scrollbar animate-fadeIn">
                      {!activeFilters.has("All") && activeFilters.size > 0 && (
                        <button
                          onClick={() => { handleFilterChange("All"); setIsFilterOpen(false); }}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-left mb-1"
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
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer
                              ${isActive
                                ? 'bg-zinc-800 text-white'
                                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                              }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {filter.icon}
                              {filter.label}
                            </div>
                            {isActive && <CheckCircle2 size={13} className="text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Dedicated Company Filter */}
            {activeTab === 'discover' && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsCompanyFilterOpen(!isCompanyFilterOpen)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all cursor-pointer active:scale-95 ${
                    selectedCompany !== "All"
                      ? "bg-white text-black border-white font-semibold shadow-sm"
                      : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  <Building2 size={13} className={selectedCompany !== "All" ? "text-black" : "text-zinc-400"} />
                  <span className="max-w-[75px] sm:max-w-[120px] truncate">
                    {selectedCompany === "All" ? "Company" : selectedCompany}
                  </span>
                  {selectedCompany !== "All" ? (
                    <span 
                      onClick={(e) => { e.stopPropagation(); setSelectedCompany("All"); }}
                      className="hover:bg-black/20 rounded-full px-1 text-[10px]"
                      title="Clear company filter"
                    >
                      ✕
                    </span>
                  ) : (
                    <ChevronDown size={12} className={`transition-transform text-zinc-400 hidden sm:inline ${isCompanyFilterOpen ? "rotate-180" : ""}`} />
                  )}
                </button>

                {isCompanyFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsCompanyFilterOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 max-w-[85vw] bg-zinc-950 border border-zinc-800 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 z-50 animate-fadeIn">
                      {/* Search box inside company popover */}
                      <div className="relative flex items-center">
                        <Search size={12} className="absolute left-2.5 text-zinc-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search 100+ companies..."
                          value={companySearchQuery}
                          onChange={(e) => setCompanySearchQuery(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                          autoFocus
                        />
                      </div>

                      {/* Company listing */}
                      <div className="max-h-[50vh] overflow-y-auto space-y-0.5 no-scrollbar">
                        <button
                          onClick={() => handleSelectCompany("All")}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                            selectedCompany === "All" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                          }`}
                        >
                          <span>All Companies</span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {globalCompanyList.reduce((acc, c) => acc + c[1], 0) || allOpps.length}
                          </span>
                        </button>

                        {/* Featured Ecosystems section */}
                        {filteredCompanyList.some(([c]) => /combinator|wellfound|devfolio|unstop/i.test(c)) && (
                          <div className="pt-1.5 pb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Ecosystems & Accelerators
                          </div>
                        )}
                        {filteredCompanyList
                          .filter(([c]) => /combinator|wellfound|devfolio|unstop/i.test(c))
                          .map(([company, count]) => {
                            const isSelected = selectedCompany === company;
                            return (
                              <button
                                key={company}
                                onClick={() => handleSelectCompany(company)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                                  isSelected ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="truncate">{company}</span>
                                  {/combinator/i.test(company) && (
                                    <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono">YC</span>
                                  )}
                                  {/wellfound/i.test(company) && (
                                    <span className="text-[9px] px-1 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono">AngelList</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 ml-2 shrink-0">
                                  {count}
                                </span>
                              </button>
                            );
                          })}

                        {/* Direct Companies section */}
                        {filteredCompanyList.some(([c]) => !/combinator|wellfound|devfolio|unstop/i.test(c)) && (
                          <div className="pt-2 pb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Companies & Employers
                          </div>
                        )}
                        {filteredCompanyList
                          .filter(([c]) => !/combinator|wellfound|devfolio|unstop/i.test(c))
                          .map(([company, count]) => {
                            const isSelected = selectedCompany === company;
                            return (
                              <button
                                key={company}
                                onClick={() => handleSelectCompany(company)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                                  isSelected ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                }`}
                              >
                                <span className="truncate">{company}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 ml-2 shrink-0">
                                  {count}
                                </span>
                              </button>
                            );
                          })}

                        {filteredCompanyList.length === 0 && (
                          <div className="py-4 text-center text-xs text-zinc-500">
                            No companies matching &quot;{companySearchQuery}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Instant Search Bar (Unified single bar for mobile & desktop) */}
            <div className="relative flex-1 max-w-sm flex items-center">
              <Search size={13} className="absolute left-2.5 sm:left-3 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search roles, companies, tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-7 sm:pl-8 pr-6 sm:pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'match' | 'deadline' | 'newest')}
                className="bg-zinc-900 text-zinc-200 text-[10px] sm:text-[11px] font-mono border border-zinc-800 rounded-lg px-2 sm:px-2.5 py-1.5 outline-none cursor-pointer hover:border-zinc-600 transition-colors"
              >
                <option value="match">Match</option>
                <option value="deadline">Soon</option>
                <option value="newest">New</option>
              </select>
            </div>
          </div>

          {/* Error toast */}
          {actionError && (
            <div className="absolute left-1/2 -translate-x-1/2 top-3 bg-rose-500 text-white px-4 py-2 rounded-full font-bold text-xs pointer-events-auto shadow-2xl animate-fadeIn flex items-center gap-2 z-50">
              {actionError}
              <button onClick={() => setActionError(null)} className="bg-black/20 px-1.5 py-0.5 rounded-full hover:bg-black/40 text-[10px]">✕</button>
            </div>
          )}
          </div>

          {/* Row 2: Graduation Batch Quick Filter Strip */}
          {activeTab === "discover" && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 sm:px-5 py-2 border-t border-zinc-800/40 text-[11px] font-mono bg-[#0c0c0f]/50">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold shrink-0 mr-1 hidden sm:inline">
                Cohort:
              </span>
              {BATCH_DEFINITIONS.map(batch => {
                const isSelected = selectedBatch === batch.id;
                return (
                  <button
                    key={batch.id}
                    onClick={() => setSelectedBatch(batch.id)}
                    title={batch.sublabel}
                    className={`px-2.5 py-1 rounded-md shrink-0 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-black border-white font-semibold shadow-sm"
                        : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {batch.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>
 
        {/* ── Active Filter Context Strip ── */}
        {selectedCompany !== "All" && (
          <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
              <Building2 size={13} className="text-zinc-400" />
              <span>
                Showing <strong className="text-white">{sortedOpps.length}</strong> opportunities from <strong className="text-white">{selectedCompany}</strong>
              </span>
              <button
                onClick={() => setSelectedCompany("All")}
                className="ml-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded px-1.5 py-0.5 text-[11px] cursor-pointer"
                title="Clear company filter"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Content View ── */}
        {sortedOpps.length === 0 && !isFetching ? (
          /* Empty state with interactive MeshGradient mascot */
          <div className="w-full flex-1 flex flex-col items-center justify-center text-zinc-400 gap-4 px-6 text-center">
            <MeshGradientSVG className="max-w-[160px]" />
            <h3 className="text-base font-semibold text-white tracking-tight">No Opportunities Found</h3>
            <p className="max-w-xs text-xs text-zinc-400 leading-relaxed">
              {activeTab === "saved"
                ? "You haven't bookmarked any opportunities yet."
                : searchQuery
                ? `No results for "${searchQuery}". Try a different keyword!`
                : "No listings match your current filters. Try expanding your search!"}
            </p>
            {(!activeFilters.has("All") || searchQuery || selectedCompany !== "All" || selectedBatch !== "all") && (
              <button
                onClick={() => { handleFilterChange("All"); setSearchQuery(""); setSelectedCompany("All"); setSelectedBatch("all"); }}
                className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* ══════════════════════════════════════
             MODE 1: CALM LIST VIEW (Default Desktop)
             ══════════════════════════════════════ */
          <div
            key={`list-${filterKey}`}
            className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] max-w-5xl mx-auto w-full flex flex-col gap-2.5"
          >
            {sortedOpps.map((card) => {
              const status = optimisticSaved.get(card.id);
              const isBookmarked = !!status;

              return (
                <div key={card.id}>
                  <OpportunityRow
                    card={card}
                    status={status}
                    isBookmarked={isBookmarked}
                    isMounted={isMounted}
                    profile={profile}
                    onBookmark={handleBookmark}
                    onShare={handleShare}
                    onStar={() => setActionError("Star functionality coming soon!")}
                    onStatusChange={handleStatusChange}
                    onViewDetails={(c) => setDrawerCard(c)}
                  />
                </div>
              );
            })}

            {/* Shimmer row loaders */}
            {isFetching && (
              <div className="flex flex-col gap-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-18 bg-zinc-900/60 border border-zinc-800 rounded-2xl animate-shimmer" />
                ))}
              </div>
            )}

            <div ref={triggerRef} className="h-8 w-full" />
          </div>
        ) : viewMode === 'grid' ? (
          /* ══════════════════════════════════════
             MODE 2: RELAXED GRID VIEW
             ══════════════════════════════════════ */
          <div
            key={`grid-${filterKey}`}
            className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] max-w-7xl mx-auto w-full"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedOpps.map((card) => {
                const status = optimisticSaved.get(card.id);
                const isBookmarked = !!status;

                return (
                  <div key={card.id}>
                    <OpportunityGridCard
                      card={card}
                      status={status}
                      isBookmarked={isBookmarked}
                      isMounted={isMounted}
                      profile={profile}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onStar={() => setActionError("Star functionality coming soon!")}
                      onStatusChange={handleStatusChange}
                      onViewDetails={(c) => setDrawerCard(c)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Shimmer grid loaders */}
            {isFetching && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-48 bg-zinc-900/60 border border-zinc-800 rounded-2xl animate-shimmer" />
                ))}
              </div>
            )}

            <div ref={triggerRef} className="h-8 w-full" />
          </div>
        ) : (
          /* ══════════════════════════════════════
             MODE 3: FULL-SCREEN CARD SNAP FEED (Card View)
             ══════════════════════════════════════ */
          <>
            <div
              key={`snap-${filterKey}`}
              ref={(node) => {
                feedRef.current = node;
                snapContainerRef.current = node;
              }}
              className="snap-y-container flex-1 overflow-y-auto relative animate-fadeIn pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
              style={{ animationDuration: '200ms' }}
            >
              {sortedOpps.map((card) => {
                const status = optimisticSaved.get(card.id);
                const isBookmarked = !!status;

                return (
                  <section
                    key={card.id}
                    className="snap-item w-full h-full flex flex-row items-center justify-center gap-2 sm:gap-3 xl:gap-4 py-2 sm:py-5 px-2 sm:px-4 md:px-0 relative"
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

              {/* Shimmer skeletons */}
              {isFetching && (
                <>
                  <OpportunitySkeleton />
                  <OpportunitySkeleton />
                </>
              )}

              <div ref={triggerRef} className="h-8 w-full shrink-0" />
            </div>

            {/* Desktop up/down buttons in feed mode */}
            <div className="hidden md:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex-col gap-2.5 z-50 pointer-events-auto">
              <button
                onClick={() => scrollByCard('up')}
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white shadow-lg cursor-pointer"
              >
                <ChevronUp size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => scrollByCard('down')}
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white shadow-lg cursor-pointer"
              >
                <ChevronDown size={18} strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}

        {/* ── Floating Dock Navigation (Fixed bottom center — with iOS safe area support) ── */}
        <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-16px)]">
          <Dock items={dockItems} separator={2} />

          {/* Profile popover menu */}
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <User size={14} />
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    reactStartTransition(() => { signOut(); });
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Slide-over QuickViewDrawer ── */}
        <QuickViewDrawer
          card={drawerCard}
          isOpen={Boolean(drawerCard)}
          onClose={() => setDrawerCard(null)}
          status={drawerCard ? optimisticSaved.get(drawerCard.id) : undefined}
          isBookmarked={drawerCard ? !!optimisticSaved.get(drawerCard.id) : false}
          onBookmark={handleBookmark}
          onShare={handleShare}
          profile={profile}
        />

      </main>
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <section className="snap-item w-full h-full flex flex-row items-center justify-center gap-2 sm:gap-3 xl:gap-4 py-2 sm:py-5 px-2 sm:px-4 md:px-0 relative">
      <div
        className="relative rounded-[2rem] sm:rounded-[2.5rem] bg-[#121215] overflow-hidden border border-zinc-800/80 z-10 shrink-0 grid grid-rows-[auto_minmax(0,1fr)_auto] shadow-2xl w-[calc(100vw-24px)] sm:w-[calc(100vw-40px)] max-w-[410px] md:w-[calc(var(--card-size)*0.7)] h-[clamp(420px,calc(100dvh-140px-env(safe-area-inset-bottom,0px)),660px)] md:h-[var(--card-size)]"
        style={{ '--card-size': 'min(82dvh, calc((100vw - 80px) / 0.7))' } as React.CSSProperties}
      >
        <div className="px-4 pt-5 pb-2 sm:px-6 sm:pt-6 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="w-20 h-5 bg-zinc-800 animate-shimmer rounded-lg" />
            <div className="w-24 h-5 bg-zinc-800 animate-shimmer rounded-full" />
          </div>
          <div className="w-14 h-10 bg-zinc-800 animate-shimmer rounded-lg" />
        </div>

        <div className="min-h-0 flex flex-col items-center justify-center gap-3 p-4 sm:p-5">
          <div className="w-12 h-12 bg-zinc-800 animate-shimmer rounded-xl" />
          <div className="w-3/4 h-6 bg-zinc-800 animate-shimmer rounded-lg" />
          <div className="w-1/2 h-4 bg-zinc-800 animate-shimmer rounded-lg" />
          <div className="flex gap-2">
            <div className="w-14 h-5 bg-zinc-800 animate-shimmer rounded-lg" />
            <div className="w-14 h-5 bg-zinc-800 animate-shimmer rounded-lg" />
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-5">
          <div className="w-full h-11 bg-zinc-800 animate-shimmer rounded-xl" />
        </div>
      </div>
    </section>
  );
}
