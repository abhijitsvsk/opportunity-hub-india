"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface DockItem {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface DockProps {
  className?: string;
  items: DockItem[];
  separator?: number; // index AFTER which to insert a separator (e.g., 2 means separator after items[2])
}

interface DockIconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, onClick, isActive, className }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        type="button"
        className={cn(
          "relative group p-2 sm:p-2.5 md:p-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95",
          isActive
            ? "bg-zinc-800 text-white"
            : "hover:bg-zinc-800/80 text-zinc-400 hover:text-white",
          className
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {/* Active indicator dot */}
        {isActive && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
        )}
        {/* Tooltip — hidden on touch/mobile to prevent sticky hover bug */}
        <span className={cn(
          "hidden md:block absolute -top-8 left-1/2 -translate-x-1/2",
          "px-2.5 py-1 rounded-md text-[11px] font-medium font-mono",
          "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-xl",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity whitespace-nowrap pointer-events-none z-50"
        )}>
          {label}
        </span>
      </button>
    );
  }
);
DockIconButton.displayName = "DockIconButton";

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  ({ items, separator, className }, ref) => {
    return (
      <div ref={ref} className={cn("w-auto flex items-center justify-center p-2", className)}>
        <div
          className={cn(
            "flex items-center gap-0.5 p-1.5 sm:p-2 rounded-2xl",
            "backdrop-blur-xl border shadow-2xl",
            "bg-zinc-900/90 border-zinc-800/90",
            "hover:shadow-zinc-950/80 hover:border-zinc-700/80 transition-all duration-300"
          )}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              <DockIconButton {...item} />
              {separator !== undefined && index === separator && (
                <div className="w-px h-6 bg-zinc-700/60 mx-1 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
);
Dock.displayName = "Dock";

export { Dock };
export type { DockItem, DockProps };
