import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
    <div className="bg-background text-text-main min-h-screen grid md:grid-cols-[2fr_3fr] font-sans overflow-hidden">

      {/* ── Left decorative panel ── */}
      <div className="hidden md:flex flex-col items-center justify-center relative overflow-hidden border-r border-surface-high/20 p-12">
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Emerald glow blob */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(34,197,94,0.14), transparent 65%)" }} />

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="w-[68px] h-[68px] rounded-[20px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(34,197,94,0.32)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>

          <h1 className="text-[30px] font-black tracking-tight mb-3">
            Opp<span className="text-primary">Hub</span>
          </h1>
          <p className="text-[13px] text-text-muted leading-[1.7] max-w-[230px] mx-auto">
            Your next big opportunity is one scroll away.
          </p>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-7 max-w-[260px] mx-auto">
            {["🏆 Hackathons", "💼 Internships", "🌐 Open Source", "🤝 Fellowships", "🧠 AI & ML"].map(pill => (
              <span key={pill} className="text-[11px] font-600 px-3 py-[5px] rounded-full bg-surface-high/60 border border-surface-highest/50 text-text-muted">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right — Auth form ── */}
      <div className="flex items-center justify-center px-6 py-10 md:py-0 relative">
        {/* Mobile: faint bg blob */}
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/8 blur-[120px] pointer-events-none md:hidden" />

        <div className="w-full max-w-[380px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
              </svg>
            </div>
            <span className="font-black text-[16px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
          </div>

          <h2 className="text-[24px] font-black tracking-tight mb-1">Welcome back</h2>
          <p className="text-[13px] text-text-muted mb-7">Sign in to your account to continue</p>

          {/* Error message */}
          {searchParams?.error && (
            <div className="mb-5 bg-error/10 border border-error/40 rounded-xl p-3 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-error text-[12px] font-medium">{searchParams.error}</p>
            </div>
          )}

          {/* GitHub OAuth — promoted to top */}
          <form action={signInWithGithub} className="mb-5">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 py-[11px] px-4 rounded-[10px] bg-surface-high border border-surface-highest hover:bg-surface-highest hover:border-text-muted/40 transition-all duration-200 font-semibold text-[13px] group"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="group-hover:text-text-main transition-colors">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-surface-high/50" />
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-muted">or sign in with email</span>
            <div className="flex-1 h-px bg-surface-high/50" />
          </div>

          {/* Sign In form */}
          <form action={signIn} className="flex flex-col gap-[14px] mb-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email-signin" className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                Email Address
              </label>
              <input
                id="email-signin"
                name="email"
                type="email"
                placeholder="developer@future.com"
                required
                className="bg-surface-low border border-surface-high/60 rounded-[10px] px-[13px] py-[10px] text-[13px] text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password-signin" className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                Password
              </label>
              <input
                id="password-signin"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-surface-low border border-surface-high/60 rounded-[10px] px-[13px] py-[10px] text-[13px] text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-background font-bold text-[14px] rounded-[10px] py-[11px] hover:brightness-105 hover:shadow-[0_4px_20px_rgba(34,197,94,0.28)] transition-all duration-200"
            >
              Sign In →
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surface-high/50" />
            <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-muted">New here?</span>
            <div className="flex-1 h-px bg-surface-high/50" />
          </div>

          {/* Sign Up form */}
          <form action={signUp} className="flex flex-col gap-[14px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="email-signup" className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                Email Address
              </label>
              <input
                id="email-signup"
                name="email"
                type="email"
                placeholder="new-developer@future.com"
                required
                className="bg-surface-low border border-surface-high/60 rounded-[10px] px-[13px] py-[10px] text-[13px] text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password-signup" className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
                Password
              </label>
              <input
                id="password-signup"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="bg-surface-low border border-surface-high/60 rounded-[10px] px-[13px] py-[10px] text-[13px] text-text-main placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-transparent border border-primary/40 text-primary font-semibold text-[13px] rounded-[10px] py-[10px] hover:bg-primary/8 transition-all duration-200"
            >
              Create Account
            </button>
          </form>

          <p className="text-[11px] text-text-muted text-center mt-5 leading-[1.6]">
            By continuing, you agree to our{" "}
            <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>
            {" "}and{" "}
            <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
