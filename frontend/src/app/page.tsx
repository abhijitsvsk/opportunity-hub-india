import Link from "next/link";
import { Compass, Zap, Target, Brain, ArrowRight, Briefcase, Code as CodeIcon, Flame, Star } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opportunity Hub — Internships, Hackathons and Fellowships for CS Students",
  description: "Stop missing deadlines. Discover and track the best tech internships, hackathons, and open-source programs ranked for your profile.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://opportunityhub.com'),
  openGraph: {
    title: "Opportunity Hub — Internships, Hackathons and Fellowships for CS Students",
    description: "Stop missing deadlines. Discover and track the best tech internships, hackathons, and open-source programs ranked for your profile.",
    type: "website",
    images: ["/og-image.png"],
  }
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

  // 1. Fetch real dynamic count of live opportunities
  let totalCount = 2000;
  try {
    const { count } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    if (count) totalCount = count;
  } catch (err) {
    console.error("Could not fetch opportunity count for landing page:", err);
  }

  // 2. Fetch real live opportunities for preview
  let featuredOpps: any[] = [];
  try {
    const { data } = await supabase
      .from("opportunities")
      .select("id, title, type, deadline, domain_tags, effort_level, competitiveness")
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

  // Fallback items if database had no upcoming deadlines
  if (featuredOpps.length === 0) {
    featuredOpps = [
      {
        id: "f1",
        title: "Software Engineering Internship",
        type: "internship",
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        domain_tags: ["C++", "Java", "Backend"],
        effort_level: "Medium",
        competitiveness: "High",
      },
      {
        id: "f2",
        title: "National AI & Cloud Hackathon",
        type: "hackathon",
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        domain_tags: ["AI/ML", "React", "Python"],
        effort_level: "High",
        competitiveness: "Medium",
      },
      {
        id: "f3",
        title: "Open Source Fellowship Program",
        type: "open-source program",
        deadline: new Date(Date.now() + 21 * 86400000).toISOString(),
        domain_tags: ["Python", "Git", "TypeScript"],
        effort_level: "Low",
        competitiveness: "Medium",
      },
    ];
  }

  return (
    <div className="w-full min-h-screen overflow-x-hidden overflow-y-auto bg-background text-text-main flex flex-col relative selection:bg-primary/20">

      {/* Dot-grid background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* Atmospheric blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-12%] left-[-8%] w-[42%] h-[42%] bg-primary/12 blur-[90px] rounded-full" />
        <div className="absolute bottom-[-12%] right-[-8%] w-[36%] h-[36%] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      {/* ── Navigation ── */}
      <nav className="w-full px-4 sm:px-8 py-0 h-[58px] sm:h-[60px] flex items-center justify-between z-50 border-b border-surface-high/20 sticky top-0 bg-background/90 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.28)]">
            <Compass size={14} className="text-background" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[17px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
        </div>
        <Link
          href="/login"
          className="px-4 sm:px-5 py-[6px] sm:py-[7px] rounded-full border border-surface-highest bg-surface-low hover:bg-surface-high transition-colors font-semibold text-[12.5px] sm:text-[13px] active:scale-95"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16 z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full bg-primary/8 border border-primary/22 text-primary text-[10.5px] sm:text-[11px] font-bold tracking-[0.04em] mb-6 sm:mb-7">
          <span className="w-[6px] h-[6px] rounded-full bg-primary animate-live" />
          ⚡ Intelligence for Indian CS Students
        </div>

        <h1 className="text-[clamp(34px,8vw,76px)] font-black tracking-[-0.04em] leading-[0.95] mb-4 sm:mb-5">
          Find the{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(120deg, #22c55e 0%, #86efac 45%, #38bdf8 100%)" }}
          >
            signal
          </span>
          <br />in the noise.
        </h1>

        <p className="text-[14.5px] sm:text-[16px] text-text-muted max-w-[480px] mb-8 leading-[1.65] font-[450] px-2">
          Stop browsing irrelevant listings. We aggregate the best tech internships, hackathons, and open-source programs — ranked to match your exact profile.
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center justify-center gap-2 bg-text-main text-background px-7 sm:px-8 py-[12px] sm:py-[13px] rounded-full font-black text-[14px] sm:text-[15px] hover:scale-[1.04] active:scale-[0.97] transition-all duration-300 shadow-[0_0_0_rgba(241,241,243,0)] w-full sm:w-auto max-w-[280px]"
        >
          Start Exploring
          <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* ── Real Dynamic Social Proof ── */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] sm:text-[11px] text-text-muted font-semibold tracking-[0.03em] px-2">
          <span>{totalCount.toLocaleString()}+ opportunities tracked</span>
          <span className="w-1 h-1 rounded-full bg-surface-highest hidden sm:inline-block" />
          <span>Live aggregation</span>
          <span className="w-1 h-1 rounded-full bg-surface-highest hidden sm:inline-block" />
          <span>Profile-based ranking</span>
        </div>
      </main>

      {/* ── Real Live Featured Opportunities ── */}
      <section className="w-full max-w-[1000px] mx-auto px-4 sm:px-8 pb-12 sm:pb-14 z-10">
        <h2 className="text-center text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase mb-4 sm:mb-5">
          Live & Upcoming Opportunities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {featuredOpps.map((opp) => {
            const tags = cleanTags(opp.domain_tags, 3);
            const isHackathon = (opp.type || '').toLowerCase().includes("hack");
            const isIntern = (opp.type || '').toLowerCase().includes("intern");

            return (
              <div
                key={opp.id}
                className="relative bg-surface-low/80 backdrop-blur-md border border-surface-high/40 p-4 sm:p-5 rounded-[16px] sm:rounded-[18px] flex flex-col gap-3 hover:border-primary/25 hover:-translate-y-[2px] hover:shadow-2xl transition-all duration-200 group overflow-hidden"
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />

                <div className="flex justify-between items-center relative">
                  <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center ${
                    isHackathon ? "bg-secondary/10 text-secondary" : isIntern ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    {isHackathon ? <CodeIcon size={17} /> : isIntern ? <Briefcase size={17} /> : <Star size={17} />}
                  </div>
                  <span className={`text-[8.5px] sm:text-[9px] font-bold uppercase tracking-[0.09em] px-[8px] sm:px-[9px] py-[3px] rounded-full border ${
                    isHackathon
                      ? "text-secondary border-secondary/20 bg-secondary/10"
                      : isIntern
                      ? "text-primary border-primary/20 bg-primary/10"
                      : "text-warning border-warning/20 bg-warning/10"
                  }`}>
                    {opp.type}
                  </span>
                </div>

                <div>
                  <h3 className="text-[13.5px] sm:text-[14px] font-bold leading-[1.35] group-hover:text-primary transition-colors line-clamp-2">
                    {opp.title}
                  </h3>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-[4px] sm:gap-[5px]">
                    {tags.map(t => (
                      <span key={t} className="text-[9.5px] sm:text-[10px] bg-surface-high/50 text-text-muted px-2 py-[2.5px] sm:py-[3px] rounded-[5px] sm:rounded-[6px] font-mono border border-surface-highest/50">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-2.5 sm:pt-3 border-t border-surface-high/30 flex items-center justify-between text-[9.5px] sm:text-[10px] font-semibold text-text-muted">
                  <span className="flex items-center gap-1 text-primary">
                    <Flame size={11} />
                    {opp.competitiveness || "Standard"}
                  </span>
                  <span className="font-mono text-text-muted">{formatDeadline(opp.deadline)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="w-full max-w-[1000px] mx-auto px-4 sm:px-8 pb-16 sm:pb-20 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          <div className="bg-surface-low p-5 sm:p-7 rounded-[18px] sm:rounded-[20px] border border-surface-high/40 flex flex-col gap-3.5 sm:gap-4 hover:border-primary/20 transition-colors">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] sm:rounded-[12px] bg-primary/10 flex items-center justify-center">
              <Zap size={19} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[14.5px] sm:text-[15px] font-bold mb-1.5 sm:mb-2">Automated Ingestion</h3>
              <p className="text-[12.5px] sm:text-[13px] text-text-muted leading-[1.65]">Scrapes Devfolio, Unstop, GitHub, and Discord to aggregate verified developer opportunities.</p>
            </div>
          </div>

          <div className="bg-surface-low p-5 sm:p-7 rounded-[18px] sm:rounded-[20px] border border-surface-high/40 flex flex-col gap-3.5 sm:gap-4 hover:border-secondary/20 transition-colors">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] sm:rounded-[12px] bg-secondary/10 flex items-center justify-center">
              <Brain size={19} className="text-secondary" />
            </div>
            <div>
              <h3 className="text-[14.5px] sm:text-[15px] font-bold mb-1.5 sm:mb-2">Smart Ranking</h3>
              <p className="text-[12.5px] sm:text-[13px] text-text-muted leading-[1.65]">Filters out the noise by matching your specific tech stack, year of study, and career focus.</p>
            </div>
          </div>

          <div className="bg-surface-low p-5 sm:p-7 rounded-[18px] sm:rounded-[20px] border border-surface-high/40 flex flex-col gap-3.5 sm:gap-4 hover:border-warning/20 transition-colors">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[11px] sm:rounded-[12px] bg-warning/10 flex items-center justify-center">
              <Target size={19} className="text-warning" />
            </div>
            <div>
              <h3 className="text-[14.5px] sm:text-[15px] font-bold mb-1.5 sm:mb-2">Save & Track</h3>
              <p className="text-[12.5px] sm:text-[13px] text-text-muted leading-[1.65]">Bookmark opportunities to your personal board and organize your application workflow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-6 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-center border-t border-surface-high/20 text-[11px] text-text-muted z-10">
        © {new Date().getFullYear()} Opportunity Hub · Built for Indian CS Students 🇮🇳
      </footer>
    </div>
  );
}
