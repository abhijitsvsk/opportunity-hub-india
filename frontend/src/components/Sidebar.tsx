"use client";

import { Terminal, Compass, Bookmark, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { startTransition } from "react";
import { signOut } from "@/app/actions";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isCollapsed, onToggle }: SidebarProps) {
  const w = isCollapsed ? "w-[72px]" : "w-[176px]";

  const NavBtn = ({
    icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 w-full px-3 py-2.5
        ${isCollapsed ? "justify-center" : "justify-start"}
        ${
          isActive
            ? "bg-primary/10 text-primary border border-primary/18 shadow-[0_0_14px_rgba(34,197,94,0.08)]"
            : "text-text-muted hover:text-text-main hover:bg-surface-high/60"
        }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r-full" />
      )}
      <span className="shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-[13px] font-semibold truncate">{label}</span>
      )}
    </button>
  );

  return (
    <nav
      className={`${w} border-r border-surface-high/20 bg-surface-lowest flex flex-col items-center py-4 gap-1 z-50 shrink-0 transition-all duration-250 relative`}
    >
      {/* Logo */}
      <div className={`flex items-center ${isCollapsed ? "justify-center mb-3" : "gap-2.5 px-3 mb-3 w-full"}`}>
        <div className="w-[32px] h-[32px] shrink-0 rounded-[9px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.22)]">
          <Compass size={15} className="text-background" strokeWidth={2.5} />
        </div>
        {!isCollapsed && (
          <span className="font-black text-[15px] tracking-tight whitespace-nowrap">
            Opp<span className="text-primary">Hub</span>
          </span>
        )}
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-surface-high/50 mb-2" />

      {/* Admin link */}
      <div className="w-full px-2">
        <Link
          href="/admin"
          title={isCollapsed ? "Admin" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted hover:text-text-main hover:bg-surface-high/60 transition-all duration-200 w-full
            ${isCollapsed ? "justify-center" : "justify-start"}`}
        >
          <Terminal size={18} strokeWidth={2} className="shrink-0" />
          {!isCollapsed && <span className="text-[13px] font-semibold">Admin</span>}
        </Link>
      </div>

      {/* Nav items */}
      <div className="w-full px-2">
        <NavBtn
          icon={<Compass size={18} strokeWidth={2} />}
          label="Discover"
          isActive={activeTab === "discover"}
          onClick={() => setActiveTab("discover")}
        />
      </div>
      <div className="w-full px-2">
        <NavBtn
          icon={<Bookmark size={18} strokeWidth={2} />}
          label="Saved"
          isActive={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <div className="w-full px-2 mb-1">
        <button
          onClick={() => startTransition(() => { signOut(); })}
          title={isCollapsed ? "Log Out" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted hover:text-error hover:bg-error/8 transition-all duration-200 w-full
            ${isCollapsed ? "justify-center" : "justify-start"}`}
        >
          <LogOut size={18} strokeWidth={2} className="shrink-0" />
          {!isCollapsed && <span className="text-[13px] font-semibold">Log Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-surface-highest border border-surface-high/50 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-highest transition-all duration-200 z-10 shadow-md"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight size={12} strokeWidth={2.5} />
        ) : (
          <ChevronLeft size={12} strokeWidth={2.5} />
        )}
      </button>
    </nav>
  );
}
