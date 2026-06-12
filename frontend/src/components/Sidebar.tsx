"use client";

import { Terminal, Compass, Bookmark, LogOut } from "lucide-react";
import Link from "next/link";
import { startTransition } from "react";
import { signOut } from "@/app/actions";

export default function Sidebar({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
}) {
  return (
    <nav className="w-[88px] border-r border-surface-low/30 bg-surface-lowest flex flex-col items-center py-8 gap-6 z-50 shrink-0">
      <Link href="/admin"
        className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 text-text-muted hover:text-text-main hover:bg-surface-low"
      >
        <Terminal size={24} strokeWidth={2.5} />
      </Link>
      <button 
        onClick={() => setActiveTab('discover')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${activeTab === 'discover' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,255,136,0.1)]' : 'text-text-muted hover:text-text-main hover:bg-surface-low'}`}
      >
        <Compass size={24} strokeWidth={2.5} />
      </button>
      <button 
        onClick={() => setActiveTab('saved')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${activeTab === 'saved' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,255,136,0.1)]' : 'text-text-muted hover:text-text-main hover:bg-surface-low'}`}
      >
        <Bookmark size={24} strokeWidth={2.5} />
      </button>

      <div className="mt-auto mb-4 w-full flex justify-center">
        <button 
          onClick={() => startTransition(() => { signOut(); })}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 text-text-muted hover:text-error hover:bg-error/10 cursor-pointer"
          title="Log Out"
        >
          <LogOut size={24} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}
