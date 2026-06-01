import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Code } from "lucide-react";
import { signIn, signUp } from "@/app/actions";

export default async function LoginPage(
  props: { searchParams: Promise<{ error?: string }> }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
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
    <div className="bg-background text-text-main min-h-screen flex flex-col relative overflow-x-hidden overflow-y-auto font-sans p-4">
      
      {/* Atmospheric Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 blur-[150px]"></div>
      </div>
      
      {/* Login Container */}
      <main className="z-10 w-full max-w-md px-6 md:px-0 mx-auto my-auto py-12">
        
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-primary mb-4 tracking-tight">OpportunityHub</h1>
          <p className="text-lg text-text-muted">Your next big opportunity is one scroll away.</p>
        </header>

        {/* Glassmorphic Login Card */}
        <div className="bg-surface-low/40 backdrop-blur-2xl border border-surface-high/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle internal glow top border */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          {searchParams?.error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center justify-center">
              <p className="text-red-400 text-sm font-medium text-center">{searchParams.error}</p>
            </div>
          )}

          {/* Auth Forms Container */}
          <div className="flex flex-col gap-6 relative z-10">
            {/* Sign In Form */}
            <form action={signIn} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="email-signin">Email Address</label>
                <input 
                  className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                  id="email-signin" 
                  name="email" 
                  placeholder="developer@future.com" 
                  required
                  type="email"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="password-signin">Password</label>
                <input 
                  className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                  id="password-signin" 
                  name="password" 
                  placeholder="••••••••" 
                  required
                  type="password"
                />
              </div>
              
              <button 
                className="w-full bg-primary text-[#002113] font-bold text-base rounded-lg py-3 hover:brightness-110 hover:shadow-[0_0_15px_rgba(78,222,99,0.3)] transition-all duration-200" 
                type="submit"
              >
                Sign In
              </button>
            </form>

            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-surface-high/50"></div>
              <span className="text-xs font-mono text-text-muted uppercase">or create new account</span>
              <div className="h-[1px] flex-1 bg-surface-high/50"></div>
            </div>

            {/* Sign Up Form */}
            <form action={signUp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="email-signup">New Email Address</label>
                <input 
                  className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                  id="email-signup" 
                  name="email" 
                  placeholder="new-developer@future.com" 
                  required
                  type="email"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider" htmlFor="password-signup">New Password</label>
                <input 
                  className="bg-surface-lowest border border-surface-high/50 rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200" 
                  id="password-signup" 
                  name="password" 
                  placeholder="••••••••" 
                  required
                  type="password"
                />
              </div>

              <button 
                className="w-full bg-transparent border border-primary/50 text-primary font-bold text-base rounded-lg py-3 hover:bg-primary/10 transition-all duration-200" 
                type="submit"
              >
                Create Account
              </button>
            </form>
          </div>

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
          
        </div>
      </main>
    </div>
  );
}
