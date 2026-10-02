import Link from "next/link";
import { Compass, Zap, Target, Brain, ArrowRight, Flame, Star, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { getBrandInfo } from "@/lib/branding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunity Hub — Internships, Hackathons & Fellowships for Indian CS Students 🇮🇳",
  description: "Stop missing deadlines. Discover and track 460+ verified tech internships, hackathons, and open-source programs ranked for your profile.",
  metadataBase: new URL('https://opportunity-hub-india.vercel.app'),
  openGraph: {
    title: "Opportunity Hub — Tech Opportunities for Indian CS Students 🇮🇳",
    description: "Discover and track 460+ verified internships, hackathons, and open-source programs ranked for your profile.",
    url: "https://opportunity-hub-india.vercel.app",
    siteName: "Opportunity Hub",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Opportunity Hub — Tech Opportunities for Indian CS Students 🇮🇳",
    description: "Discover and track 460+ verified internships, hackathons, and open-source programs ranked for your profile.",
  },
};

function formatDeadline(deadlineStr: string | null | undefined): string {
  if (!deadlineStr) return "Rolling basis";
  try {
    const d = new Date(deadlineStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Ongoing";
  }
}

function cleanTags(tags: string[] | undefined, max = 3): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  const cleaned: string[] = [];
  const set = new Set<string>();

  for (const raw of tags) {
    if (!raw || typeof raw !== "string") continue;
    const parts = raw
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, " ")
      .replace(/[•|·]/g, ",")
      .split(/[,;\n]+/)
      .map(t => t.trim());

    for (const part of parts) {
      const clean = part.replace(/^[^a-zA-Z0-9+#.]+|[^a-zA-Z0-9+#.]+$/g, "").trim();
      if (!clean || clean.length < 2 || clean.length > 20) continue;
      const lower = clean.toLowerCase();
      if (['good listener', 'presentation', 'reports', 'story-telling'].includes(lower)) continue;
      if (!set.has(lower)) {
        set.add(lower);
        cleaned.push(clean);
      }
    }
  }
  return cleaned.slice(0, max);
}

export default async function LandingPage() {
  const supabase = await createClient();

  // 1. Fetch real count of live opportunities
  let totalCount = 465;
  try {
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    if (count) totalCount = count;
  } catch (err) {
    console.error("Could not fetch opportunity count:", err);
  }

  // 2. Fetch real live opportunities for preview
  let featuredOpps: any[] = [];
  try {
    const { data } = await supabase
      .from("opportunities")
      .select("id, title, type, deadline, domain_tags, effort_level, competitiveness, source_url")
      .eq("is_active", true)
      .not("deadline", "is", null)
      .gt("deadline", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(3);

    if (data && data.length > 0) {
      featuredOpps = data;
    }
  } catch (err) {
    console.error("Could not fetch featured opportunities:", err);
  }

  if (featuredOpps.length === 0) {
    featuredOpps = [
      {
        id: "f1",
        title: "Software Development Engineer Intern",
        type: "internship",
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        domain_tags: ["Java", "C++", "Backend"],
        effort_level: "Medium",
        competitiveness: "High",
        source_url: "https://amazon.jobs",
      },
      {
        id: "f2",
        title: "ETHIndia 2026 — Asia's Biggest Web3 Hackathon",
        type: "hackathon",
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        domain_tags: ["Solidity", "React", "Web3"],
        effort_level: "High",
        competitiveness: "Medium",
        source_url: "https://devfolio.co",
      },
      {
        id: "f3",
        title: "Google Summer of Code 2026",
        type: "open-source program",
        deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
        domain_tags: ["Python", "Git", "Rust"],
        effort_level: "Low",
        competitiveness: "Medium",
        source_url: "https://summerofcode.withgoogle.com",
      },
    ];
  }

  return (
    <div className="w-full min-h-screen overflow-x-hidden overflow-y-auto bg-[#09090b] text-[#ededed] flex flex-col relative selection:bg-zinc-800 selection:text-white">

      {/* Atmospheric subtle radial glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[55rem] h-[35rem] bg-zinc-800/20 blur-[130px] rounded-full" />
      </div>

      {/* ── Navigation ── */}
      <nav className="w-full px-4 sm:px-8 h-15 flex items-center justify-between z-50 border-b border-zinc-800/80 sticky top-0 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center font-bold text-xs shadow-md">
            <Compass size={15} strokeWidth={2.4} />
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            Opportunity<span className="text-zinc-400 font-normal">Hub</span>
          </span>
        </div>
        <Link
          href="/login"
          className="px-4 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 transition-colors font-medium text-xs text-white"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero with 3D Container Scroll ── */}
      <div className="z-10 pt-8 sm:pt-14">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center px-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono mb-6">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ⚡ {totalCount.toLocaleString()}+ Verified Active Listings for Indian CS Students
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.02] mb-6">
                Find the signal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-400">
                  in the noise.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed font-normal">
                Stop browsing expired or spam listings. Discover and track verified internships, hackathons, and open-source programs curated and ranked for your exact profile.
              </p>

              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all duration-200 shadow-lg"
                >
                  Start Exploring Free
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          }
        >
          {/* Inside 3D perspective card: Live preview mockup */}
          <div className="w-full h-full p-3 sm:p-5 flex flex-col gap-2.5 overflow-hidden bg-[#09090b] rounded-xl text-left">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <span className="text-xs font-mono text-zinc-400">Dashboard Preview • Live Ranked Feed</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                Calm List View
              </span>
            </div>

            {featuredOpps.map((opp) => {
              const brand = getBrandInfo(opp.title, opp.source_url, opp.type);
              const tags = cleanTags(opp.domain_tags, 3);

              return (
                <div
                  key={opp.id}
                  className="w-full bg-[#121215] border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${brand.badgeBg} ${brand.badgeText} ${brand.badgeBorder}`}>
                      {brand.monogram}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">{opp.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 hidden sm:inline">
                          {opp.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
                        {brand.label} • {formatDeadline(opp.deadline)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex gap-1 font-mono text-[10px]">
                      {tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="px-3 py-1 rounded-md bg-white text-black font-semibold text-xs">
                      Apply
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ContainerScroll>
      </div>

      {/* ── Features ── */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-16 sm:py-24 z-10">
        <h2 className="text-center text-xs font-mono uppercase tracking-widest text-zinc-500 mb-8">
          Designed for High-Agency Developers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121215] p-6 rounded-2xl border border-zinc-800/80 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Zap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Automated Ingestion</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Continuous scrapers verify listings from Devfolio, Unstop, Codeforces, and GitHub so you never see dead links.</p>
            </div>
          </div>

          <div className="bg-[#121215] p-6 rounded-2xl border border-zinc-800/80 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Brain size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Zero Cognitive Overload</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Switch seamlessly between a Calm List view for fast scanning and a Relaxed Grid view with rich details.</p>
            </div>
          </div>

          <div className="bg-[#121215] p-6 rounded-2xl border border-zinc-800/80 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Target size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Application Pipeline</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">Save opportunities with one click and track statuses from Saved → Applied → Accepted seamlessly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-6 px-4 text-center border-t border-zinc-800/80 text-xs text-zinc-500 font-mono z-10">
        © {new Date().getFullYear()} Opportunity Hub · Built for Indian CS Students 🇮🇳
      </footer>
    </div>
  );
}
