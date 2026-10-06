"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, User, Sparkles, AlertCircle, Save, ExternalLink, Compass, Bookmark, LogOut } from "lucide-react";
import { updateUserProfile, signOut } from "@/app/actions";
import { Dock, DockItem } from "@/components/ui/dock-two";

const COLLEGE_TIERS = [
  "IIT/IISc", 
  "NIT/IIIT/BITS", 
  "Other Central University", 
  "State Government College", 
  "Private Tier-1", 
  "Private Tier-2", 
  "Other"
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029", "2030"];
const LOCATIONS = ["Remote Only", "India Only", "Open to Abroad", "Any Location / No Preference"];
const FOCUS_AREAS = [
  "Looking for Internships", 
  "Looking for Hackathons", 
  "Looking for Open Source PRs", 
  "Looking for Full-Time Roles"
];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const EXP_LEVELS = ["None / Fresher", "1 prior internship", "2+ internships"];

const TECH_TAGS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Java", "Spring Boot", 
  "C++", "Machine Learning", "AI/ML", "Web3", "UI/UX", "Golang", "Rust",
  "DevOps", "Docker", "AWS", "Cybersecurity", "Data Science", "PostgreSQL"
];

interface ProfileFormProps {
  initialProfile: any | null;
  userEmail?: string;
}

export default function ProfileForm({ initialProfile, userEmail }: ProfileFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dockItems: DockItem[] = [
    {
      icon: Compass,
      label: "Discover",
      onClick: () => router.push("/dashboard"),
      isActive: false,
    },
    {
      icon: Bookmark,
      label: "Saved",
      onClick: () => router.push("/dashboard?tab=saved"),
      isActive: false,
    },
    {
      icon: User,
      label: "Profile",
      onClick: () => {},
      isActive: true,
    },
  ];

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (initialProfile?.tech_stack && Array.isArray(initialProfile.tech_stack)) {
      return initialProfile.tech_stack;
    }
    return [];
  });

  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(() => {
    if (initialProfile?.focus_area) {
      return initialProfile.focus_area.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    return ["Looking for Internships"];
  });

  const [customTagInput, setCustomTagInput] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const cleanTag = customTagInput.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanTag && cleanTag.length >= 2 && cleanTag.length <= 24 && !selectedTags.includes(cleanTag)) {
      if (selectedTags.length >= 25) {
        setErrorMsg("Maximum of 25 tech stack skills reached.");
        return;
      }
      setSelectedTags(prev => [...prev, cleanTag]);
      setCustomTagInput("");
    }
  };

  const toggleFocusArea = (focus: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(focus) ? prev.filter(f => f !== focus) : [...prev, focus]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const rawFullName = formData.get("full_name") as string;
    const cleanName = (rawFullName || "").trim();
    if (cleanName.length < 2) {
      setErrorMsg("Please enter a valid full name (at least 2 characters).");
      setSaving(false);
      return;
    }
    formData.set("full_name", cleanName);
    formData.set("tech_stack", selectedTags.join(","));
    formData.set("focus_area", selectedFocusAreas.join(","));

    if (selectedTags.length === 0) {
      setErrorMsg("Please select at least one tech stack skill.");
      setSaving(false);
      return;
    }
    if (selectedFocusAreas.length === 0) {
      setErrorMsg("Please select at least one primary focus area.");
      setSaving(false);
      return;
    }

    try {
      const result = await updateUserProfile(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("Profile preferences saved successfully! Feed match scores have been updated.");
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 pb-32">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/80">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
              Account Settings
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Title Card */}
        <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shrink-0">
              <User size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Profile & Opportunity Preferences
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Your profile calibrates the Match Score on every opportunity and drives your personalized digest alerts.
              </p>
            </div>
          </div>

          {/* Feedback alerts */}
          {successMsg && (
            <div className="mt-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm animate-in fade-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Basic Identity */}
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              1. Basic Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  defaultValue={initialProfile?.full_name || ""}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Account Email
                </label>
                <input
                  type="email"
                  disabled
                  value={userEmail || initialProfile?.email || ""}
                  className="w-full bg-[#18181c]/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: College & Academic Cohort */}
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              2. Academic Cohort & Eligibility
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  College Tier / Type
                </label>
                <select
                  name="college_tier"
                  defaultValue={initialProfile?.college_tier || COLLEGE_TIERS[1]}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {COLLEGE_TIERS.map(tier => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Current Year of Study
                </label>
                <select
                  name="current_year"
                  defaultValue={initialProfile?.current_year || YEARS[2]}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {YEARS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Graduation Batch Year
                </label>
                <select
                  name="graduation_year"
                  defaultValue={initialProfile?.graduation_year || "2026"}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {GRAD_YEARS.map(gy => (
                    <option key={gy} value={gy}>{gy} Batch</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Prior Internship Experience
                </label>
                <select
                  name="experience_level"
                  defaultValue={initialProfile?.experience_level || EXP_LEVELS[0]}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {EXP_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Primary Focus Areas */}
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              3. Primary Opportunity Focus
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_AREAS.map(focus => {
                const isSelected = selectedFocusAreas.includes(focus);
                return (
                  <button
                    key={focus}
                    type="button"
                    onClick={() => toggleFocusArea(focus)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left text-sm transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-black border-white font-medium"
                        : "bg-[#18181c] text-zinc-300 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span>{focus}</span>
                    {isSelected && <CheckCircle2 size={16} className="text-black shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Tech Stack Skills */}
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                4. Tech Stack Skills ({selectedTags.length} selected)
              </h2>
              <span className="text-xs text-zinc-500">
                Powers your personal Match Score algorithm
              </span>
            </div>

            {/* Clickable pill list */}
            <div className="flex flex-wrap gap-2">
              {TECH_TAGS.map(tag => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                      active
                        ? "bg-white text-black border-white font-semibold shadow-sm"
                        : "bg-[#18181c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {active ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>

            {/* Custom skill adder */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={e => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Add other skill (e.g. Flutter, PyTorch, GraphQL)..."
                className="flex-1 bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Add Skill
              </button>
            </div>
          </div>

          {/* Location & Diversity Preference */}
          <div className="bg-[#121215] border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              5. Preferences & Diversity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Location Preference
                </label>
                <select
                  name="location_preference"
                  defaultValue={initialProfile?.location_preference || LOCATIONS[1]}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Gender (Used for Diversity Programs like Flipkart Runway / Google STEP)
                </label>
                <select
                  name="gender"
                  defaultValue={initialProfile?.gender || GENDERS[3]}
                  className="w-full bg-[#18181c] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
                >
                  {GENDERS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Action Row */}
          <div className="pt-4 pb-12 flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all shadow-lg hover:shadow-white/10 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? "Saving Changes..." : "Save Profile Preferences"}
            </button>
          </div>

        </form>
      </div>

      {/* ── Floating Navigation Dock (Fixed bottom center) ── */}
      <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-16px)]">
        <Dock items={dockItems} />
      </div>
    </div>
  );
}
