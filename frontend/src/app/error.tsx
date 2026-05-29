"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-text-main gap-6">
      <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.2)]">
        <AlertTriangle size={40} className="text-error" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-black mb-2 tracking-tight">Something went wrong!</h1>
        <p className="text-text-muted max-w-md">
          {error.message || "We encountered an unexpected error while loading the page."}
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="mt-4 flex items-center gap-2 px-6 py-3 bg-surface-low hover:bg-surface-high border border-surface-high rounded-full transition-colors"
      >
        <RefreshCcw size={18} />
        <span className="font-bold">Try again</span>
      </button>
    </div>
  );
}
