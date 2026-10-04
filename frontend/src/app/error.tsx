'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Something went wrong</h1>
          <p className="text-sm text-zinc-400 mt-2">
            An unexpected error occurred. Please try again or head back to the dashboard.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all cursor-pointer"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-sm hover:text-white hover:border-zinc-700 transition-all"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="text-[10px] font-mono text-zinc-600">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
