"use client";

import * as React from "react";
import { useState } from "react";
import { Compass, Mail, CheckCircle2 } from "lucide-react";

export interface AuthResult {
  error?: string;
  success?: boolean;
  requiresConfirmation?: boolean;
  message?: string;
}

interface SignInProps {
  onSignInWithEmail?: (formData: FormData) => Promise<AuthResult | void>;
  onSignUpWithEmail?: (formData: FormData) => Promise<AuthResult | void>;
  onSignInWithGoogle?: () => void;
  defaultError?: string;
}

const SignIn1: React.FC<SignInProps> = ({
  onSignInWithEmail,
  onSignUpWithEmail,
  onSignInWithGoogle,
  defaultError
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(defaultError || "");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null);

  const validateEmail = (e: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  };

  const handleToggleMode = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setError("");
    setConfirmationSent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isSignUp) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setError("");

    const handler = isSignUp ? onSignUpWithEmail : onSignInWithEmail;
    if (handler) {
      setLoading(true);
      const fd = new FormData();
      fd.append("email", email);
      fd.append("password", password);
      try {
        const res = await handler(fd);
        if (res?.error) {
          setError(res.error);
        } else if (res?.requiresConfirmation) {
          setConfirmationSent(res.message || "Please check your email to activate your account.");
        }
      } catch (err: any) {
        if (err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) return;
        setError(err?.message || (isSignUp ? "Failed to sign up" : "Failed to sign in"));
      } finally {
        setLoading(false);
      }
    } else {
      alert(`${isSignUp ? "Sign up" : "Sign in"} successful! (Demo)`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] relative overflow-hidden w-full px-4 py-8">
      {/* Subtle atmospheric gradient blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-zinc-900/70 border border-zinc-800/90 backdrop-blur-xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-black mb-4 shadow-lg">
          <Compass size={24} strokeWidth={2.2} />
        </div>

        {/* Brand Title */}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1 text-center">
          Opportunity<span className="text-zinc-400 font-normal">Hub</span>
        </h2>

        {/* Mode Switcher Tabs */}
        <div className="flex w-full bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80 my-4">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              !isSignUp ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isSignUp ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {confirmationSent ? (
          /* Confirmation Success Card */
          <div className="flex flex-col items-center text-center py-4 w-full animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Mail size={22} />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Verify Your Email</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5 max-w-xs">
              {confirmationSent}
            </p>
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className="w-full bg-white text-black font-semibold px-4 py-2.5 rounded-xl shadow hover:bg-zinc-200 transition active:scale-[0.98] text-xs cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="flex flex-col w-full gap-3.5">
            <div className="w-full flex flex-col gap-2.5">
              <input
                placeholder="Email address"
                type="email"
                value={email}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder={isSignUp ? "Create a password (min. 6 chars)" : "Password"}
                type="password"
                value={password}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans"
                onChange={(e) => setPassword(e.target.value)}
              />
              {isSignUp && (
                <input
                  placeholder="Confirm password"
                  type="password"
                  value={confirmPassword}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all font-sans animate-fadeIn"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}
              {error && (
                <div className="text-xs text-rose-400 text-left bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg animate-fadeIn">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(oauthLoading)}
              className="w-full bg-white text-black font-semibold px-4 py-2.5 rounded-xl shadow hover:bg-zinc-200 transition active:scale-[0.98] text-sm cursor-pointer disabled:opacity-50"
            >
              {loading
                ? (isSignUp ? "Creating account..." : "Signing in...")
                : (isSignUp ? "Create Account" : "Sign In")}
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Google OAuth */}
            {onSignInWithGoogle && (
              <button
                type="button"
                onClick={() => {
                  setOauthLoading(true);
                  React.startTransition(() => {
                    onSignInWithGoogle();
                  });
                }}
                disabled={loading || oauthLoading}
                className="w-full flex items-center justify-center gap-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-xl px-4 py-2.5 font-medium text-white transition text-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {oauthLoading ? "Redirecting to Google..." : "Continue with Google"}
              </button>
            )}

            <div className="w-full text-center mt-2">
              <span className="text-xs text-zinc-400">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => handleToggleMode(!isSignUp)}
                  className="underline text-white hover:text-zinc-200 cursor-pointer"
                >
                  {isSignUp ? "Sign in" : "Sign up free"}
                </button>
              </span>
            </div>
          </form>
        )}
      </div>

      {/* Social proof */}
      <div className="relative z-10 mt-8 flex flex-col items-center text-center">
        <p className="text-zinc-400 text-xs mb-2">
          Tracking opportunities for <span className="font-semibold text-white">4,000+</span> CS students across India
        </p>
        <div className="flex -space-x-2">
          {["IN", "BLR", "HYD", "DEL", "PUN"].map((code, idx) => (
            <div
              key={idx}
              className="w-7 h-7 rounded-full border-2 border-[#09090b] bg-zinc-800 flex items-center justify-center text-[9px] font-mono text-zinc-300 font-bold"
            >
              {code}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
export default SignIn1;
