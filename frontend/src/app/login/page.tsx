import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Code } from "lucide-react";
import { testSignIn } from "@/app/actions";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  const signInWithGithub = async () => {
    "use server";
    const supabase = await createClient();
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error);
      return redirect("/login?error=Could not authenticate user");
    }

    if (data.url) {
      redirect(data.url);
    }
  };

  return (
    <div className="bg-background text-text-main min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Atmospheric Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>
      
      {/* Login Container */}
      <main className="z-10 w-full max-w-md px-6 md:px-0">
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-primary mb-4 tracking-tight">OpportunityHub</h1>
          <p className="text-lg text-text-muted">Your next big opportunity is one scroll away.</p>
        </header>

        {/* Glassmorphic Login Card */}
        <div className="bg-surface-low/40 backdrop-blur-2xl border border-surface-high/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle internal glow top border */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
          
          <form 
            action={testSignIn} 
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="email">Email Address</label>
              <input 
                className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 placeholder-text-muted/50" 
                id="email" 
                name="email" 
                placeholder="developer@future.com" 
                defaultValue="test@example.com"
                type="email"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="password">Password</label>
                <a className="text-xs font-bold text-primary hover:brightness-125 transition-colors" href="#">Forgot?</a>
              </div>
              <input 
                className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 placeholder-text-muted/50" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                defaultValue="password123"
                type="password"
              />
            </div>
            
            <button 
              className="w-full bg-primary text-[#002113] font-bold text-base rounded-lg py-3 mt-2 hover:brightness-110 hover:shadow-[0_0_15px_rgba(78,222,99,0.3)] transition-all duration-200" 
              type="submit"
            >
              Sign In (Test Mode)
            </button>
          </form>

          <div className="mt-8 flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-surface-high/50"></div>
            <span className="text-xs font-mono text-text-muted uppercase">or</span>
            <div className="h-[1px] flex-1 bg-surface-high/50"></div>
          </div>

          {/* GitHub OAuth Button */}
          <form action={signInWithGithub} className="w-full mt-8">
            <button 
              className="w-full bg-surface-lowest/50 backdrop-blur-xl border border-surface-high hover:border-text-muted hover:bg-surface-low transition-all duration-200 rounded-lg py-3 flex items-center justify-center gap-3 group" 
              type="submit"
            >
              <Code size={20} className="text-text-main group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-text-main">Continue with GitHub</span>
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted">
              New to the hub? <a className="text-primary hover:brightness-125 font-medium transition-colors" href="#">Request Access</a>
            </p>
          </div>
          
        </div>
      </main>
    </div>
  );
}
