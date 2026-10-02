# 🛠️ Implementation Guide for Gemini 3.8

> **Project:** Opportunity Hub India  
> **Root:** `d:\Z_shared\NEW ONE IG\frontend\src\`  
> **Stack:** Next.js 16 (App Router), Tailwind CSS v4, Supabase, TypeScript, framer-motion  
> **Theme:** Obsidian/zinc dark palette. Primary action = white (`bg-white text-black`). No green. No old-school elements.

---

## TABLE OF CONTENTS

| Task | File(s) | Effort |
|---|---|---|
| 1. Delete Sidebar entirely | `Sidebar.tsx`, `Feed.tsx` | Medium |
| 2. Upgrade Dock — add separator, active states, Card View, Profile, Logout | `dock-two.tsx`, `Feed.tsx` | Medium |
| 3. Remove header segmented view toggle | `Feed.tsx` | Small |
| 4. Kill floating bounce animation on Dock | `dock-two.tsx` | Tiny |
| 5. Show Dock on mobile (replace mobile bottom nav) | `Feed.tsx` | Medium |
| 6. Fix login — error handling | `modern-stunning-sign-in.tsx` | Small |
| 7. Fix login — add sign-up flow | `modern-stunning-sign-in.tsx`, `login/page.tsx`, `actions.ts` | Medium |
| 8. Fix login — GitHub wiring | `modern-stunning-sign-in.tsx` | Small |
| 9. Add sort dropdown | `Feed.tsx` | Medium |
| 10. Move shared helpers to `lib/opportunities.ts` | NEW file + 3 card files | Small |
| 11. Fix location fallback inconsistency | `OpportunityGridCard.tsx` | Tiny |
| 12. Add `onStar` to Row and GridCard | `OpportunityRow.tsx`, `OpportunityGridCard.tsx`, `Feed.tsx` | Small |
| 13. Show match score labels | All 3 card components | Small |
| 14. Fix duplicate `triggerRef` | `Feed.tsx` | Tiny |
| 15. Delete dead code from dashboard | `dashboard/page.tsx` | Tiny |

---

## TASK 1 — Delete Sidebar Entirely

### Why
The Sidebar duplicates navigation already in the Dock (Discover, Saved, Profile). It takes up 72-176px of horizontal space and adds complexity (collapse state, toggle button). Everything it does will be handled by the upgraded Dock.

### Steps

**Step 1.1 — Delete the file:**
```
DELETE: src/components/Sidebar.tsx
```

**Step 1.2 — Remove Sidebar from Feed.tsx:**

Remove the import (line 12):
```tsx
// DELETE THIS LINE:
import Sidebar from "./Sidebar";
```

Remove the sidebar collapsed state (lines 53-55):
```tsx
// DELETE THESE LINES:
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const sidebarWidth = sidebarCollapsed ? 72 : 176;
```

Remove the CSS variable from the root div (line 337):
```tsx
// CHANGE FROM:
<div
  className="flex h-screen w-full overflow-hidden bg-background"
  style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
>

// CHANGE TO:
<div className="flex h-screen w-full overflow-hidden bg-background">
```

Remove the sidebar rendering block (lines 339-347):
```tsx
// DELETE THIS ENTIRE BLOCK:
{/* ── Sidebar (desktop) ── */}
<div className="hidden md:flex">
  <Sidebar
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    isCollapsed={sidebarCollapsed}
    onToggle={() => setSidebarCollapsed(c => !c)}
  />
</div>
```

**Step 1.3 — Fix OpportunityCard CSS variable reference:**

In `OpportunityCard.tsx` line 151, the `--card-size` CSS variable references `--sidebar-width`. Since the sidebar is gone, update it:
```tsx
// CHANGE FROM:
style={{ '--card-size': 'min(82dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.7))' } as React.CSSProperties}

// CHANGE TO:
style={{ '--card-size': 'min(82dvh, calc((100vw - 80px) / 0.7))' } as React.CSSProperties}
```

Also update the skeleton in `Feed.tsx` (line 753) which has the same CSS variable:
```tsx
// CHANGE FROM:
style={{ '--card-size': 'min(82dvh, calc((100vw - var(--sidebar-width) - 80px) / 0.7))' } as React.CSSProperties}

// CHANGE TO:
style={{ '--card-size': 'min(82dvh, calc((100vw - 80px) / 0.7))' } as React.CSSProperties}
```

**Step 1.4 — Remove unused imports from Feed.tsx:**

After removing the sidebar, the `ChevronLeft`, `ChevronRight` icons from Sidebar.tsx are no longer needed (they were only in Sidebar.tsx, not Feed.tsx, so no change needed in Feed.tsx imports). However, remove `User` from Feed.tsx imports ONLY if you confirm it's not used elsewhere in Feed.tsx. Currently `User` IS used on line 511 (header profile icon) — so keep it.

---

## TASK 2 — Upgrade Dock Component

### Why
The Dock needs to become the ONLY navigation — replacing both the Sidebar and the header toggle. It needs:
- A visual separator between nav items and view mode items
- Active state indicators (dot under active item)
- Card View button (renamed from Feed)
- Profile button with a popover (Profile, Logout)
- Support for `isActive` prop on each item

### Steps

**Step 2.1 — Update the DockProps interface in `dock-two.tsx`:**

Replace the entire file `src/components/ui/dock-two.tsx` with:

```tsx
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
          "relative group p-2.5 sm:p-3 rounded-xl transition-all duration-200 cursor-pointer",
          isActive
            ? "bg-zinc-800 text-white"
            : "hover:bg-zinc-800/80 text-zinc-400 hover:text-white",
          className
        )}
      >
        <Icon className="w-5 h-5" />
        {/* Active indicator dot */}
        {isActive && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
        )}
        {/* Tooltip */}
        <span className={cn(
          "absolute -top-8 left-1/2 -translate-x-1/2",
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
```

**Key changes from original:**
- Removed framer-motion entirely (no more floating animation — Task 4)
- Added `isActive` prop with a white dot indicator
- Added `separator` prop to insert a vertical `|` divider between nav and view items
- Replaced `motion.button` with regular `button` (simpler, no deps)
- Replaced `motion.div` with regular `div`

**Step 2.2 — Update dockItems in Feed.tsx:**

Replace the dock items definition (lines 310-332) with:

```tsx
// Dock items — Navigation section + View mode section
const dockItems = [
  {
    icon: Compass,
    label: "Discover",
    onClick: () => setActiveTab("discover"),
    isActive: activeTab === "discover",
  },
  {
    icon: Bookmark,
    label: `Saved (${optimisticSaved.size})`,
    onClick: () => setActiveTab("saved"),
    isActive: activeTab === "saved",
  },
  {
    icon: User,
    label: "Profile",
    onClick: () => setShowProfileMenu(prev => !prev),
    isActive: false,
  },
  // --- separator goes here (index 2) ---
  {
    icon: Rows3,
    label: "List View",
    onClick: () => handleViewModeChange("list"),
    isActive: viewMode === "list",
  },
  {
    icon: LayoutGrid,
    label: "Grid View",
    onClick: () => handleViewModeChange("grid"),
    isActive: viewMode === "grid",
  },
  {
    icon: Layers,
    label: "Card View",
    onClick: () => handleViewModeChange("card"),
    isActive: viewMode === "card",
  },
];
```

**Step 2.3 — Add missing imports to Feed.tsx:**

Add `Layers` to the lucide-react import:
```tsx
// CHANGE FROM:
import {
  Compass, Flame, User, Star,
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Trophy, Rocket, Filter, CheckCircle2, Bookmark,
  Code2, Briefcase, LayoutGrid, Rows3, Search, X
} from "lucide-react";

// CHANGE TO:
import {
  Compass, Flame, User, Star, Layers, LogOut,
  ChevronUp, ChevronDown, Zap, Brain, Shield, Palette, Globe, Trophy, Rocket, Filter, CheckCircle2, Bookmark,
  Code2, Briefcase, LayoutGrid, Rows3, Search, X
} from "lucide-react";
```

Also add `signOut` import:
```tsx
import { toggleBookmark, updateApplicationStatus } from "@/app/actions";
// ADD:
import { toggleBookmark, updateApplicationStatus, signOut } from "@/app/actions";
```

And add `Link` is already imported, but also add `startTransition`:
```tsx
// CHANGE FROM:
import { useState, useRef, useTransition, useOptimistic, useCallback, useEffect } from "react";
// CHANGE TO:
import { useState, useRef, useTransition, useOptimistic, useCallback, useEffect, startTransition as reactStartTransition } from "react";
```

**Step 2.4 — Add profile menu state in Feed.tsx:**

Add after the `viewMode` state (after line 51):
```tsx
const [showProfileMenu, setShowProfileMenu] = useState(false);
```

**Step 2.5 — Update the Dock render in Feed.tsx:**

Replace the dock rendering (lines 707-710) with:
```tsx
{/* ── Floating Dock Navigation (Fixed bottom center — all screens) ── */}
<div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40">
  <Dock items={dockItems} separator={2} />
  
  {/* Profile popover menu */}
  {showProfileMenu && (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setShowProfileMenu(false)} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50 animate-fadeIn">
        <Link
          href="/onboarding"
          onClick={() => setShowProfileMenu(false)}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <User size={14} />
          View Profile
        </Link>
        <button
          onClick={() => {
            setShowProfileMenu(false);
            reactStartTransition(() => { signOut(); });
          }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={14} />
          Log Out
        </button>
      </div>
    </>
  )}
</div>
```

**IMPORTANT:** Notice the `className` no longer has `hidden md:block` — the dock now shows on ALL screen sizes (Task 5).

---

## TASK 3 — Remove Header Segmented View Toggle

### Steps

In `Feed.tsx`, DELETE lines 444-484 entirely (the `{/* Desktop View Mode Toggle */}` block):

```tsx
// DELETE THIS ENTIRE BLOCK (lines 444-484):
{/* Desktop View Mode Toggle (21st.dev segmented control) */}
<div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5 shrink-0">
  ... (3 buttons for List, Grid, Feed)
</div>
```

Also remove the "SAVED" counter badge from the header (lines 498-504) since "Saved" is now accessible from the Dock:
```tsx
// DELETE THIS BLOCK (lines 498-504):
<div className="bg-zinc-900 px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-zinc-800" title="Your saved opportunities">
  <Bookmark size={12} className={optimisticSaved.size > 0 ? "text-white fill-white" : "text-zinc-500"} />
  <span className="font-mono text-[11px] text-zinc-400">
    SAVED: <span className="text-white font-semibold">{optimisticSaved.size}</span>
  </span>
</div>
```

Also remove the header Profile icon link (lines 506-512) since Profile is now in the Dock:
```tsx
// DELETE THIS BLOCK (lines 506-512):
<Link
  href="/onboarding"
  className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
  title="Profile & Preferences"
>
  <User size={15} strokeWidth={2} />
</Link>
```

After removing those, the `{/* Right actions */}` div (line 497) should contain only the error toast above it. You can also delete the now-empty right actions wrapper:
```tsx
// DELETE if empty:
<div className="flex items-center gap-2 sm:gap-3 shrink-0">
</div>
```

---

## TASK 4 — Kill Floating Bounce Animation

Already handled in Task 2 — the new `dock-two.tsx` removes framer-motion entirely and uses a static `<div>` instead of `<motion.div>`.

After this change, if `framer-motion` is still used by other components (it IS — `container-scroll-animation.tsx`, `shader-svg.tsx`), keep it in `package.json`. But it's no longer needed for the Dock.

---

## TASK 5 — Show Dock on Mobile (Replace Mobile Bottom Nav)

### Steps

**Step 5.1 — Already done in Task 2.5** — removed `hidden md:block` from the dock container.

**Step 5.2 — Delete the mobile bottom nav entirely from Feed.tsx (lines 715-743):**

```tsx
// DELETE THIS ENTIRE BLOCK:
{/* ── Mobile bottom nav ── */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800 flex items-center justify-around z-50 px-4 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
  ... (Discover, Saved, Profile buttons)
</nav>
```

**Step 5.3 — Add bottom padding to content areas** so they don't get hidden behind the dock:

In each content view, add `pb-20` (or similar) to the content container to account for the fixed dock:

For list view (currently line ~561):
```tsx
// CHANGE:
className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full flex flex-col gap-2.5 mobile-content-pad"
// TO:
className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 max-w-5xl mx-auto w-full flex flex-col gap-2.5"
```

For grid view (currently line ~603):
```tsx
// CHANGE:
className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full mobile-content-pad"
// TO:
className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 max-w-7xl mx-auto w-full"
```

For card/snap view (currently line ~652):
```tsx
// CHANGE:
className="snap-y-container flex-1 overflow-y-auto relative animate-fadeIn mobile-content-pad"
// TO:
className="snap-y-container flex-1 overflow-y-auto relative animate-fadeIn pb-20"
```

Remove the `mobile-content-pad` CSS class from `globals.css` if it exists (it was there to pad for the old mobile nav).

---

## TASK 6 — Fix Login Error Handling

### Why
The `signIn` server action calls `redirect()` on error, which throws `NEXT_REDIRECT`. The component catches this and shows a confusing error. Fix: filter out redirect errors.

### Steps

In `src/components/ui/modern-stunning-sign-in.tsx`, update the `handleSignIn` function (lines 29-57):

```tsx
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email || !password) {
    setError("Please enter both email and password.");
    return;
  }
  if (!validateEmail(email)) {
    setError("Please enter a valid email address.");
    return;
  }
  setError("");

  if (onSignInWithEmail) {
    setLoading(true);
    const fd = new FormData();
    fd.append("email", email);
    fd.append("password", password);
    try {
      const res = await onSignInWithEmail(fd);
      if (res?.error) setError(res.error);
    } catch (err: any) {
      // Next.js redirect() throws NEXT_REDIRECT — don't show this as an error
      if (err?.digest?.includes("NEXT_REDIRECT")) return;
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  } else {
    alert("Sign in successful! (Demo)");
  }
};
```

The key change is the single line:
```tsx
if (err?.digest?.includes("NEXT_REDIRECT")) return;
```

---

## TASK 7 — Fix Login: Add Sign-Up Flow

### Why
The "Sign up free" link goes to `/login` (same page). The `signUp` action exists but has no UI.

### Steps

**Step 7.1 — Add a toggle state for sign-in vs sign-up in `modern-stunning-sign-in.tsx`:**

Update the interface and add state:
```tsx
interface SignInProps {
  onSignInWithEmail?: (formData: FormData) => Promise<{ error?: string } | void>;
  onSignUpWithEmail?: (formData: FormData) => Promise<{ error?: string } | void>;
  onSignInWithGoogle?: () => void;
  onSignInWithGithub?: () => void;
  defaultError?: string;
}

const SignIn1: React.FC<SignInProps> = ({
  onSignInWithEmail,
  onSignUpWithEmail,
  onSignInWithGithub,
  onSignInWithGoogle,
  defaultError
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(defaultError || "");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
```

**Step 7.2 — Update handleSignIn to handle both modes:**

```tsx
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
  if (isSignUp && password.length < 6) {
    setError("Password must be at least 6 characters.");
    return;
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
      if (res?.error) setError(res.error);
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT")) return;
      setError(err.message || (isSignUp ? "Failed to sign up" : "Failed to sign in"));
    } finally {
      setLoading(false);
    }
  }
};
```

**Step 7.3 — Update the form's onSubmit:**
```tsx
// CHANGE FROM:
<form onSubmit={handleSignIn} ...>
// CHANGE TO:
<form onSubmit={handleSubmit} ...>
```

**Step 7.4 — Update the submit button text:**
```tsx
// CHANGE FROM:
{loading ? "Signing in..." : "Sign in with Email"}
// CHANGE TO:
{loading
  ? (isSignUp ? "Creating account..." : "Signing in...")
  : (isSignUp ? "Create Account" : "Sign in with Email")
}
```

**Step 7.5 — Update the title/subtitle:**
```tsx
// CHANGE FROM:
<h2 ...>Opportunity<span ...>Hub</span></h2>
<p ...>Sign in to access 460+ verified tech opportunities</p>

// CHANGE TO:
<h2 ...>Opportunity<span ...>Hub</span></h2>
<p className="text-xs text-zinc-400 mb-6 text-center">
  {isSignUp
    ? "Create your free account to get started"
    : "Sign in to access 460+ verified tech opportunities"
  }
</p>
```

**Step 7.6 — Update the bottom toggle link (replace line 149-156):**
```tsx
<div className="w-full text-center mt-2">
  <span className="text-xs text-zinc-400">
    {isSignUp ? "Already have an account? " : "Don\u0027t have an account? "}
    <button
      type="button"
      onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
      className="underline text-white hover:text-zinc-200 cursor-pointer"
    >
      {isSignUp ? "Sign in" : "Sign up free"}
    </button>
  </span>
</div>
```

**Step 7.7 — Wire `signUp` in `login/page.tsx`:**

```tsx
import { signIn, signUp, signInWithGithub } from "@/app/actions";

// ...

return (
  <SignIn1
    onSignInWithEmail={signIn}
    onSignUpWithEmail={signUp}
    onSignInWithGithub={signInWithGithub}
    defaultError={searchParams?.error}
  />
);
```

---

## TASK 8 — Fix GitHub Sign-In Wiring

### Why
Server actions should be called via `startTransition`, not directly in `onClick`.

### Steps

In `modern-stunning-sign-in.tsx`, update the GitHub button (lines 120-131):

```tsx
{onSignInWithGithub && (
  <button
    type="button"
    onClick={() => {
      setLoading(true);
      React.startTransition(() => {
        onSignInWithGithub();
      });
    }}
    disabled={loading}
    className="w-full flex items-center justify-center gap-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 font-medium text-white transition text-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
    {loading ? "Redirecting..." : "Continue with GitHub"}
  </button>
)}
```

---

## TASK 9 — Add Sort Dropdown

### Steps

**Step 9.1 — Add sort state in Feed.tsx** (after `searchQuery` state, around line 46):

```tsx
const [sortBy, setSortBy] = useState<'match' | 'deadline' | 'newest'>('match');
```

**Step 9.2 — Add sort logic** after `displayedOpps` (after line 192):

```tsx
// Sort displayed opportunities
const sortedOpps = [...displayedOpps].sort((a, b) => {
  if (sortBy === 'deadline') {
    const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDate - bDate; // Closing soonest first
  }
  if (sortBy === 'newest') {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate; // Newest first
  }
  // 'match' — sort by match score descending (requires profile)
  const aScore = computeMatchScore(a, profile).score;
  const bScore = computeMatchScore(b, profile).score;
  return bScore - aScore;
});
```

**IMPORTANT:** You'll need to import `computeMatchScore` from the new location (see Task 10). If you do Task 10 first:
```tsx
import { computeMatchScore } from "@/lib/opportunities";
```

**Step 9.3 — Replace `displayedOpps` with `sortedOpps`** in all three view mode renderers (search for `displayedOpps.map` and replace with `sortedOpps.map`). There are 3 occurrences:
- List view: `displayedOpps.map((card, index) => {` → `sortedOpps.map((card, index) => {`
- Grid view: same
- Card view: same

Also update the empty state check:
```tsx
// CHANGE FROM:
{displayedOpps.length === 0 && !isFetching ? (
// CHANGE TO:
{sortedOpps.length === 0 && !isFetching ? (
```

**Step 9.4 — Add sort UI** in the header, after the search bar (after line 442):

```tsx
{/* Sort dropdown */}
<div className="hidden sm:flex items-center shrink-0">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as 'match' | 'deadline' | 'newest')}
    className="bg-zinc-900 text-zinc-200 text-[11px] font-mono border border-zinc-800 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:border-zinc-600 transition-colors appearance-none"
  >
    <option value="match">Best Match</option>
    <option value="deadline">Closing Soon</option>
    <option value="newest">Newest</option>
  </select>
</div>
```

> **Note:** I know the user said "don't add old school things" and `<select>` is old school. If you want to make it fancier, use a custom dropdown with a button + popover (like the filter dropdown). But for a first pass, this works.

---

## TASK 10 — Move Shared Helpers to `lib/opportunities.ts`

### Why
`computeMatchScore` and `cleanDomainTags` are defined in `OpportunityCard.tsx` but imported by `OpportunityRow.tsx` and `OpportunityGridCard.tsx`. This is a bad pattern — utility functions shouldn't live in UI components.

### Steps

**Step 10.1 — Create `src/lib/opportunities.ts`:**

```tsx
import { Opportunity } from "@/types";

export function computeMatchScore(opp: Opportunity, profile?: any): { score: number; label: string } {
  if (!profile) {
    return { score: 75, label: "Good Match" };
  }

  let totalPoints = 0;
  let earnedPoints = 0;

  // 1. Tech stack match (45 points)
  if (profile.tech_stack && Array.isArray(profile.tech_stack) && profile.tech_stack.length > 0) {
    totalPoints += 45;
    const oppText = `${opp.title || ''} ${(opp.domain_tags || []).join(' ')} ${opp.description || ''}`.toLowerCase();
    const matches = profile.tech_stack.filter((tech: string) =>
      oppText.includes(tech.toLowerCase())
    ).length;
    const ratio = Math.min(1, matches / Math.min(3, profile.tech_stack.length));
    earnedPoints += Math.round(ratio * 45);
  }

  // 2. Role / Focus Area match (35 points)
  if (profile.focus_area && opp.type) {
    totalPoints += 35;
    const focus = (profile.focus_area || '').toLowerCase();
    const type = (opp.type || '').toLowerCase();
    if (
      (focus.includes('intern') && type.includes('intern')) ||
      (focus.includes('hackathon') && type.includes('hackathon')) ||
      (focus.includes('open source') && type.includes('open')) ||
      (focus.includes('full-time') && type.includes('full'))
    ) {
      earnedPoints += 35;
    } else {
      earnedPoints += 10;
    }
  }

  // 3. Eligibility / Year of study (20 points)
  if (profile.current_year) {
    totalPoints += 20;
    if (opp.eligibility && typeof opp.eligibility === 'object' && Array.isArray((opp.eligibility as any).year)) {
      const yearMap: Record<string, number> = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4, "Postgraduate": 5 };
      const userYear = yearMap[profile.current_year];
      if (userYear && (opp.eligibility as any).year.length > 0) {
        if ((opp.eligibility as any).year.includes(userYear)) {
          earnedPoints += 20;
        }
      } else {
        earnedPoints += 20;
      }
    } else {
      earnedPoints += 20;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 75;
  const clampedScore = Math.min(99, Math.max(35, score));

  return {
    score: clampedScore,
    label: clampedScore >= 80 ? "Great Match" : clampedScore >= 60 ? "Good Fit" : "Possible Match"
  };
}

export function cleanDomainTags(tags: string[] | undefined, maxTags = 4): { displayTags: string[], remainingCount: number } {
  if (!tags || !Array.isArray(tags)) return { displayTags: [], remainingCount: 0 };

  const cleanedSet = new Set<string>();
  const allCleaned: string[] = [];

  for (const rawTag of tags) {
    if (!rawTag || typeof rawTag !== 'string') continue;

    const parts = rawTag
      .replace(/[\u0000-\u001F\u007F-\u009F\uFFFD]/g, ' ')
      .replace(/[•|·]/g, ',')
      .split(/[,;\n]+/)
      .map(t => t.trim());

    for (const part of parts) {
      const clean = part.replace(/^[^a-zA-Z0-9+#.]+|[^a-zA-Z0-9+#.]+$/g, '').trim();
      if (!clean || clean.length < 2 || clean.length > 22) continue;

      const lower = clean.toLowerCase();
      if (['good listener', 'presentation', 'reports', 'story-telling'].includes(lower)) continue;

      if (!cleanedSet.has(lower)) {
        cleanedSet.add(lower);
        allCleaned.push(clean);
      }
    }
  }

  const displayTags = allCleaned.slice(0, maxTags);
  const remainingCount = Math.max(0, allCleaned.length - maxTags);

  return { displayTags, remainingCount };
}
```

**Step 10.2 — Update imports in ALL consuming files:**

In `OpportunityCard.tsx`, remove the function definitions (lines 20-116) and add import:
```tsx
import { computeMatchScore, cleanDomainTags } from "@/lib/opportunities";
```
Keep the `export` keyword removed — the functions now live in `lib/opportunities.ts`.

In `OpportunityRow.tsx` (line 7):
```tsx
// CHANGE FROM:
import { computeMatchScore, cleanDomainTags } from "./OpportunityCard";
// CHANGE TO:
import { computeMatchScore, cleanDomainTags } from "@/lib/opportunities";
```

In `OpportunityGridCard.tsx` (line 7):
```tsx
// CHANGE FROM:
import { computeMatchScore, cleanDomainTags } from "./OpportunityCard";
// CHANGE TO:
import { computeMatchScore, cleanDomainTags } from "@/lib/opportunities";
```

In `Feed.tsx` (if used for sort, Task 9):
```tsx
import { computeMatchScore } from "@/lib/opportunities";
```

---

## TASK 11 — Fix Location Fallback Inconsistency

In `OpportunityGridCard.tsx` line 98:
```tsx
// CHANGE FROM:
<span>{card.location || "Remote"}</span>

// CHANGE TO:
<span>{card.location || "Remote / India"}</span>
```

---

## TASK 12 — Add `onStar` to Row and GridCard

### Steps

**Step 12.1 — Update OpportunityRow interface** (add `onStar` prop):

In `OpportunityRow.tsx`, update the interface (line 9-18):
```tsx
interface OpportunityRowProps {
  card: Opportunity;
  status: string | undefined;
  isBookmarked: boolean;
  isMounted: boolean;
  profile?: any;
  onBookmark: (id: string, currentStatus: string | undefined) => void;
  onShare: (url: string) => void;
  onStar: () => void;
  onStatusChange: (id: string, newStatus: string) => void;
}
```

Add `onStar` to destructuring (line 20-29):
```tsx
export default function OpportunityRow({
  card, status, isBookmarked, isMounted, profile,
  onBookmark, onShare, onStar, onStatusChange,
}: OpportunityRowProps) {
```

Add a Star button in the action icons section (after the Share button, around line 126):
```tsx
{/* Star */}
<button
  onClick={onStar}
  title="Star"
  className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
>
  <Star size={13} />
</button>
```

Add `Star` to the imports:
```tsx
import { Bookmark, Share2, ExternalLink, Star } from "lucide-react";
```

**Step 12.2 — Do the same for OpportunityGridCard** (`OpportunityGridCard.tsx`):

Update interface, destructuring, add the Star button, and import `Star`.

**Step 12.3 — Pass `onStar` in Feed.tsx** for list and grid views:

In the list view `OpportunityRow` render (around line 572):
```tsx
<OpportunityRow
  card={card}
  status={status}
  isBookmarked={isBookmarked}
  isMounted={isMounted}
  profile={profile}
  onBookmark={handleBookmark}
  onShare={handleShare}
  onStar={() => setActionError("Star functionality coming soon!")}
  onStatusChange={handleStatusChange}
/>
```

In the grid view `OpportunityGridCard` render (around line 615):
```tsx
<OpportunityGridCard
  card={card}
  status={status}
  isBookmarked={isBookmarked}
  isMounted={isMounted}
  profile={profile}
  onBookmark={handleBookmark}
  onShare={handleShare}
  onStar={() => setActionError("Star functionality coming soon!")}
  onStatusChange={handleStatusChange}
/>
```

---

## TASK 13 — Show Match Score Labels

In all 3 card components, the `label` from `computeMatchScore()` is computed but never displayed.

### Steps

In `OpportunityRow.tsx`, update the destructuring:
```tsx
// CHANGE FROM:
const { score: matchScore } = computeMatchScore(card, profile);
// CHANGE TO:
const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
```

Then show the label next to the score (line 73):
```tsx
// CHANGE FROM:
<span className="font-mono text-zinc-300 font-semibold">{matchScore}% Match</span>
// CHANGE TO:
<span className="font-mono text-zinc-300 font-semibold">{matchScore}% · {matchLabel}</span>
```

Do the same in `OpportunityGridCard.tsx` (line 128-130):
```tsx
// CHANGE FROM:
<span className="text-xs font-mono font-semibold text-zinc-300">
  {matchScore}% Match
</span>
// CHANGE TO:
const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
// ...
<span className="text-xs font-mono font-semibold text-zinc-300">
  {matchScore}% · {matchLabel}
</span>
```

In `OpportunityCard.tsx` (line 184), the label area already shows "match" hardcoded:
```tsx
// CHANGE FROM:
<span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">match</span>
// CHANGE TO (using the computed label):
<span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{matchLabel}</span>
```

And update the destructuring in OpportunityCard.tsx:
```tsx
// CHANGE FROM:
const { score: matchScore } = computeMatchScore(card, profile);
// CHANGE TO:
const { score: matchScore, label: matchLabel } = computeMatchScore(card, profile);
```

---

## TASK 14 — Fix Duplicate triggerRef

In Feed.tsx, the `triggerRef` is assigned to both a card 6 items from the end AND a sentinel div at the bottom. The sentinel overwrites the early trigger, making it dead code.

### Steps

**Remove the early-trigger `ref` from the card wrappers** in all 3 views:

List view (around line 570):
```tsx
// CHANGE FROM:
ref={index === displayedOpps.length - 6 ? triggerRef : undefined}
// CHANGE TO:
// (remove the ref entirely from this div)
```

Grid view (around line 613):
```tsx
// CHANGE FROM:
ref={index === displayedOpps.length - 6 ? triggerRef : undefined}
// CHANGE TO:
// (remove the ref entirely from this div)
```

Card view (around line 662):
```tsx
// CHANGE FROM:
ref={index === displayedOpps.length - 5 ? triggerRef : undefined}
// CHANGE TO:
// (remove the ref entirely from this section)
```

Keep ONLY the sentinel `<div ref={triggerRef} className="h-8 w-full" />` at the bottom of list and grid views.

For card view, add a sentinel at the end of the map:
```tsx
{/* After the map closes and shimmer loaders */}
<div ref={triggerRef} className="h-8 w-full shrink-0" />
```

---

## TASK 15 — Delete Dead Code from Dashboard

In `src/app/dashboard/page.tsx`, delete:

1. `parseCurrentYear` function (lines 8-15)
2. `calculateScore` function (lines 17-70)  
3. `isEligible` function (lines 72-85)

That's 78 lines of dead code removed. The file should start directly with the imports + `DashboardPage` function.

---

## VERIFICATION CHECKLIST

After all changes, run:
```bash
cd d:\Z_shared\NEW ONE IG\frontend
npm run build
```

Expected:
- **0 TypeScript errors**
- All pages should compile
- No import errors (all moved functions should resolve)

Then test in dev:
```bash
npm run dev
```

Check:
1. ✅ No sidebar visible
2. ✅ Dock at bottom center on ALL screen sizes
3. ✅ Dock has separator between nav (Discover|Saved|Profile) and views (List|Grid|Card)
4. ✅ Active dock item has white dot indicator
5. ✅ Clicking Profile shows popover with "View Profile" and "Log Out"
6. ✅ No header view toggle (removed)
7. ✅ Dock doesn't bounce/float
8. ✅ Sort dropdown appears next to search bar
9. ✅ Login page: enter wrong password → shows error from URL param, not "NEXT_REDIRECT"
10. ✅ Login page: "Sign up free" toggles to sign-up mode (not a broken link)
11. ✅ GitHub button calls via startTransition
12. ✅ Star button visible in all 3 views
13. ✅ Match score shows label ("Great Match", "Good Fit", etc.)
14. ✅ Location shows "Remote / India" consistently in all views
15. ✅ No dead code in dashboard/page.tsx

---

## FILES SUMMARY

| Action | File |
|---|---|
| **DELETE** | `src/components/Sidebar.tsx` |
| **CREATE** | `src/lib/opportunities.ts` |
| **REWRITE** | `src/components/ui/dock-two.tsx` |
| **MAJOR EDIT** | `src/components/Feed.tsx` |
| **MAJOR EDIT** | `src/components/ui/modern-stunning-sign-in.tsx` |
| **MINOR EDIT** | `src/app/login/page.tsx` |
| **MINOR EDIT** | `src/components/OpportunityCard.tsx` |
| **MINOR EDIT** | `src/components/OpportunityRow.tsx` |
| **MINOR EDIT** | `src/components/OpportunityGridCard.tsx` |
| **MINOR EDIT** | `src/app/dashboard/page.tsx` |
