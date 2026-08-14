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
      <nav className="w-full px-8 py-0 h-[60px] flex items-center justify-between z-50 border-b border-surface-high/20 sticky top-0 bg-background/85 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_16px_rgba(34,197,94,0.28)]">
            <Compass size={14} className="text-background" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[17px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
        </div>
        <Link
          href="/login"
          className="px-5 py-[7px] rounded-full border border-surface-highest bg-surface-low hover:bg-surface-high transition-colors font-semibold text-[13px]"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 z-10 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full bg-primary/8 border border-primary/22 text-primary text-[11px] font-bold tracking-[0.04em] mb-7">
          <span className="w-[6px] h-[6px] rounded-full bg-primary animate-live" />
          ⚡ Intelligence for Indian CS Students
        </div>

        <h1 className="text-[clamp(46px,8vw,80px)] font-black tracking-[-0.04em] leading-[0.9] mb-5">
          Find the{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(120deg, #22c55e 0%, #86efac 45%, #38bdf8 100%)" }}
          >
            signal
          </span>
          <br />in the noise.
        </h1>

        <p className="text-[16px] text-text-muted max-w-[480px] mb-9 leading-[1.7] font-[450]">
          Stop browsing irrelevant listings. We aggregate the best tech internships, hackathons, and open-source programs — ranked to match your exact profile.
        </p>

        <Link
          href="/login"
          className="group inline-flex items-center gap-2 bg-text-main text-background px-8 py-[13px] rounded-full font-black text-[15px] hover:scale-[1.04] transition-transform duration-300 shadow-[0_0_0_rgba(241,241,243,0)]"
        >
          Start Exploring
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* ── Real Dynamic Social Proof ── */}
        <div className="mt-10 flex items-center gap-3 text-[11px] text-text-muted font-semibold tracking-[0.03em]">
          <span>{totalCount.toLocaleString()}+ opportunities tracked</span>
          <span className="w-1 h-1 rounded-full bg-surface-highest" />
          <span>Live aggregation</span>
          <span className="w-1 h-1 rounded-full bg-surface-highest" />
          <span>Profile-based ranking</span>
        </div>
      </main>

      {/* ── Real Live Featured Opportunities ── */}
      <section className="w-full max-w-[1000px] mx-auto px-8 pb-14 z-10">
        <h2 className="text-center text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase mb-5">
          Live & Upcoming Opportunities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredOpps.map((opp) => {
            const tags = cleanTags(opp.domain_tags, 3);
            const isHackathon = (opp.type || '').toLowerCase().includes("hack");
            const isIntern = (opp.type || '').toLowerCase().includes("intern");

            return (
              <div
                key={opp.id}
                className="relative bg-surface-low/80 backdrop-blur-md border border-surface-high/40 p-5 rounded-[18px] flex flex-col gap-3 hover:border-primary/25 hover:-translate-y-[2px] hover:shadow-2xl transition-all duration-200 group overflow-hidden"
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />

                <div className="flex justify-between items-center relative">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${
                    isHackathon ? "bg-secondary/10 text-secondary" : isIntern ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"
                  }`}>
                    {isHackathon ? <CodeIcon size={18} /> : isIntern ? <Briefcase size={18} /> : <Star size={18} />}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-[0.09em] px-[9px] py-[3px] rounded-full border ${
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
                  <h3 className="text-[14px] font-bold leading-[1.35] group-hover:text-primary transition-colors line-clamp-2">
                    {opp.title}
                  </h3>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-[5px]">
                    {tags.map(t => (
                      <span key={t} className="text-[10px] bg-surface-high/50 text-text-muted px-2 py-[3px] rounded-[6px] font-mono border border-surface-highest/50">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-surface-high/30 flex items-center justify-between text-[10px] font-semibold text-text-muted">
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
      <section className="w-full max-w-[1000px] mx-auto px-8 pb-20 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-low p-7 rounded-[20px] border border-surface-high/40 flex flex-col gap-4 hover:border-primary/20 transition-colors">
            <div className="w-11 h-11 rounded-[12px] bg-primary/10 flex items-center justify-center">
              <Zap size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold mb-2">Automated Ingestion</h3>
              <p className="text-[13px] text-text-muted leading-[1.65]">Scrapes Devfolio, Unstop, GitHub, and Discord to aggregate verified developer opportunities.</p>
            </div>
          </div>

          <div className="bg-surface-low p-7 rounded-[20px] border border-surface-high/40 flex flex-col gap-4 hover:border-secondary/20 transition-colors">
            <div className="w-11 h-11 rounded-[12px] bg-secondary/10 flex items-center justify-center">
              <Brain size={20} className="text-secondary" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold mb-2">Smart Ranking</h3>
              <p className="text-[13px] text-text-muted leading-[1.65]">Filters out the noise by matching your specific tech stack, year of study, and career focus.</p>
            </div>
          </div>

          <div className="bg-surface-low p-7 rounded-[20px] border border-surface-high/40 flex flex-col gap-4 hover:border-warning/20 transition-colors">
            <div className="w-11 h-11 rounded-[12px] bg-warning/10 flex items-center justify-center">
              <Target size={20} className="text-warning" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold mb-2">Save & Track</h3>
              <p className="text-[13px] text-text-muted leading-[1.65]">Bookmark opportunities to your personal board and organize your application workflow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-6 text-center border-t border-surface-high/20 text-[11px] text-text-muted z-10">
        © {new Date().getFullYear()} Opportunity Hub · Built for Indian CS Students 🇮🇳
      </footer>
    </div>
  );
}
