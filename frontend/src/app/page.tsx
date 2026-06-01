import Link from "next/link";
import { Compass, Zap, Target, Brain, ArrowRight, Briefcase, Code as CodeIcon, Flame } from "lucide-react";
import type { Metadata } from "next";

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

export default function LandingPage() {
  // Hardcoded static mockups for SEO indexability and preview
  const MOCK_OPPORTUNITIES = [
    {
      id: "mock1",
      title: "Software Engineering Internship — Major Tech Company",
      company: "Major Tech Company",
      type: "internship",
      deadline: "2026-08-01",
      tags: ["C++", "Java", "C#"],
      effort: "high",
      icon: <Briefcase className="text-primary" size={24} />
    },
    {
      id: "mock2",
      title: "Global Blockchain Hackathon",
      company: "Web3 Foundation",
      type: "hackathon",
      deadline: "2026-06-15",
      tags: ["Web3", "Solidity", "React"],
      effort: "medium",
      icon: <CodeIcon className="text-primary" size={24} />
    },
    {
      id: "mock3",
      title: "Open Source Contribution Program",
      company: "Open Source Initiative",
      type: "open source",
      deadline: "2026-04-02",
      tags: ["Open Source", "Python", "JavaScript"],
      effort: "high",
      icon: <Globe className="text-primary" size={24} />
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-background text-text-main flex flex-col relative selection:bg-primary/30">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Navigation */}
      <nav className="w-full px-8 py-6 flex items-center justify-between z-10 border-b border-surface-high/30 sticky top-0 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-surface-low border border-primary/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <Compass size={16} className="text-primary" />
          </div>
          <span className="font-black text-xl tracking-tighter">Opp<span className="text-primary">Hub</span></span>
        </div>
        <div>
          <Link href="/login" className="px-6 py-2 rounded-full border border-surface-high hover:bg-surface-low transition-colors font-bold text-sm">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 z-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono mb-8 animate-pulse">
          <Zap size={14} /> Intelligence for Indian CS Students
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-6">
          Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-300 to-secondary">signal</span> <br />
          in the noise.
        </h1>
        
        <p className="text-lg md:text-xl text-text-muted max-w-2xl mb-12 font-medium">
          Stop browsing thousands of irrelevant listings. We aggregate the best SWE internships, hackathons, and open-source programs, and rank them to match your exact profile.
        </p>

        <Link 
          href="/login"
          className="group flex items-center gap-2 bg-text-main text-background px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-transform duration-300 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          Start Exploring
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </main>

      {/* Static Mockup / Preview Section */}
      <section className="w-full max-w-5xl mx-auto px-8 py-10 z-10">
        <h2 className="text-center text-sm font-bold tracking-widest text-text-muted uppercase mb-8">Recently Added Opportunities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_OPPORTUNITIES.map((opp) => (
            <div key={opp.id} className="bg-surface-low/80 backdrop-blur-md border border-surface-high/50 p-6 rounded-2xl flex flex-col gap-4 shadow-xl hover:border-primary/50 transition-all group">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-surface-high flex items-center justify-center">
                  {opp.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20">
                  {opp.type}
                </span>
              </div>
              <div>
                <p className="text-xs text-text-muted font-bold uppercase">{opp.company}</p>
                <h3 className="text-lg font-black leading-tight mt-1 group-hover:text-primary transition-colors">{opp.title}</h3>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {opp.tags.map(t => (
                  <span key={t} className="text-xs bg-surface-high/50 text-text-muted px-2 py-1 rounded-md font-mono">{t}</span>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-surface-high/50 flex items-center justify-between text-xs font-mono text-text-muted">
                <span className="flex items-center gap-1"><Flame size={12} className="text-warning" /> High Stakes</span>
                <span>Closes: {opp.deadline}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl mx-auto px-8 py-20 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-surface-low p-8 rounded-3xl border border-surface-high/50 shadow-xl flex flex-col items-start gap-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold">Real-time Aggregation</h3>
            <p className="text-sm text-text-muted">We scrape Devfolio, Unstop, and GitHub to bring you opportunities minutes after they go live.</p>
          </div>

          <div className="bg-surface-low p-8 rounded-3xl border border-surface-high/50 shadow-xl flex flex-col items-start gap-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold">Smart Ranking</h3>
            <p className="text-sm text-text-muted">No more irrelevant noise. Our algorithm ranks roles based on your tech stack and career focus.</p>
          </div>

          <div className="bg-surface-low p-8 rounded-3xl border border-surface-high/50 shadow-xl flex flex-col items-start gap-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold">Never Miss Out</h3>
            <p className="text-sm text-text-muted">Save roles to your board and get automated email reminders 3 days before the deadline hits.</p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 text-center border-t border-surface-high/30 text-xs text-text-muted z-10">
        &copy; {new Date().getFullYear()} Opportunity Hub. The Kinetic Engine.
      </footer>
    </div>
  );
}

// Icon helper function for mockups that avoids missing imports
function Globe(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
