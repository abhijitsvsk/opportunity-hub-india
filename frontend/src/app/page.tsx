import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Zap, Target, Brain, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpportunityHub | Find Your Next Tech Role",
  description: "Stop missing out on hackathons, internships, and open source gigs. We aggregate, structure, and match the best opportunities to your profile.",
  openGraph: {
    title: "OpportunityHub",
    description: "The kinetic engine for your tech career.",
    type: "website",
  }
};

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is already logged in, take them to the dashboard directly
  if (session) {
    redirect("/dashboard");
  }

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

      {/* Features Grid */}
      <section className="w-full max-w-6xl mx-auto px-8 py-20 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-surface-low p-8 rounded-3xl border border-surface-high/50 shadow-xl flex flex-col items-start gap-4 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap size={24} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold">Real-time Aggregation</h3>
            <p className="text-sm text-text-muted">We scrape Devfolio, Unstop, and more to bring you opportunities minutes after they go live.</p>
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
        &copy; {new Date().getFullYear()} OpportunityHub. The Kinetic Engine.
      </footer>
    </div>
  );
}
