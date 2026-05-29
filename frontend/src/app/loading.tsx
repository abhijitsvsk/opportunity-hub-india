import { Compass } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-text-main gap-6">
      <div className="w-20 h-20 rounded-full bg-surface-low flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.1)] animate-pulse">
        <Compass size={40} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
      </div>
      <div className="text-center animate-pulse">
        <h2 className="text-2xl font-black mb-2 tracking-tight">Loading Opportunities...</h2>
        <p className="text-text-muted">Fetching the latest matched roles for you.</p>
      </div>
    </div>
  );
}
