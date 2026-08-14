"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, CheckCircle2, ArrowRight, ArrowLeft, User, Sparkles } from "lucide-react";
import { updateUserProfile } from "@/app/actions";

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
  "React", "Next.js", "Node.js", "Python", "Java", "Spring Boot", 
  "C++", "Machine Learning", "Web3", "UI/UX", "Golang", "Rust",
  "DevOps", "Cybersecurity", "Data Science"
];

interface OnboardingFormProps {
  initialProfile: any | null;
  userEmail?: string;
}

export default function OnboardingForm({ initialProfile, userEmail }: OnboardingFormProps) {
  const router = useRouter();
  const isExisting = Boolean(initialProfile?.full_name);

  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Pre-fill existing tags and focus areas
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
    return [];
  });

  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleFocusArea = (focus: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(focus) ? prev.filter(f => f !== focus) : [...prev, focus]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("tech_stack", selectedTags.join(","));
    formData.set("focus_area", selectedFocusAreas.join(","));

    if (selectedTags.length === 0) {
      setError("Please select at least one tech stack skill.");
      setSaving(false);
      return;
    }
    if (selectedFocusAreas.length === 0) {
      setError("Please select at least one focus area.");
      setSaving(false);
      return;
    }

    try {
      const result = await updateUserProfile(formData);
      if (result?.error) {
        setError(result.error);
        setSaving(false);
        return;
      }
      
      if (isExisting) {
        setToastMsg("Profile updated successfully!");
        setSaving(false);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 800);
      } else {
        setCompleted(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      }
      
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
      setSaving(false);
    }
  };

  if (completed) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center relative font-sans w-full h-screen">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]"></div>
        </div>
        <div className="z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 px-4">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-2">Profile Complete!</h2>
          <p className="text-text-muted text-base sm:text-lg animate-pulse">Calculating your personalized opportunity matches...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full pt-4 sm:pt-8 px-3.5 sm:px-6 relative font-sans pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      {/* Background glow */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[30vh] bg-primary/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="z-10 relative">
        
        {/* ── Top Bar with Back Link & Logo ── */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          {isExisting ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-low border border-surface-high/50 text-text-muted hover:text-text-main text-[12px] font-semibold transition-all active:scale-95 shadow-sm"
            >
              <ArrowLeft size={14} />
              <span>Back to Feed</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.24)]">
              <Compass size={14} className="text-background" strokeWidth={2.5} />
            </div>
            <span className="font-black text-[16px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
          </div>
        </div>

        {/* ── Toast Message ── */}
        {toastMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-background font-bold px-5 py-2.5 rounded-full shadow-2xl animate-fadeIn flex items-center gap-2 text-[13px]">
            <CheckCircle2 size={16} />
            {toastMsg}
          </div>
        )}

        {/* ── Card Container ── */}
        <div className="bg-surface-low/80 backdrop-blur-xl border border-surface-high/30 rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-black">
                {isExisting ? "Profile & Preferences" : "Developer Identity"}
              </h1>
              {isExisting && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles size={11} /> Active
                </span>
              )}
            </div>
            <p className="text-text-muted text-[12.5px] sm:text-sm leading-relaxed">
              {isExisting
                ? "Your saved profile details below are used to rank match percentages across 2,000+ opportunities. Edit anytime."
                : "Tell us about yourself. Our algorithm uses this data to filter out the noise and rank opportunities matching your precise eligibility."}
            </p>
            {userEmail && (
              <p className="text-[11px] text-text-muted/80 mt-2 font-mono flex items-center gap-1.5">
                <User size={12} className="text-primary" />
                Signed in as: <span className="text-text-main font-semibold">{userEmail}</span>
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-3.5 sm:p-4 bg-error/10 border border-error/50 rounded-xl text-error text-[12.5px] sm:text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
            
            {/* MANDATORY FIELDS */}
            <div className="space-y-5 sm:space-y-6">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.12em] border-b border-surface-high/50 pb-2 flex items-center justify-between">
                <span>Core Match Parameters</span>
                <span className="text-[9px] text-text-muted font-normal uppercase">Required for Ranking</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    required
                    defaultValue={initialProfile?.full_name || ""}
                    placeholder="e.g. Abhijit Sharma"
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">College Tier</label>
                  <select
                    name="college_tier"
                    required
                    defaultValue={initialProfile?.college_tier || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select college tier...</option>
                    {COLLEGE_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Current Year of Study</label>
                  <select
                    name="current_year"
                    required
                    defaultValue={initialProfile?.current_year || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select current year...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Expected Graduation</label>
                  <select
                    name="graduation_year"
                    required
                    defaultValue={initialProfile?.graduation_year || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select graduation year...</option>
                    {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Location Preference</label>
                  <select
                    name="location_preference"
                    required
                    defaultValue={initialProfile?.location_preference || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Select location preference...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Focus Areas Multi-select */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                    <span>What are you looking for? <span className="text-primary">*</span></span>
                    <span className="text-[10px] text-text-muted font-normal">Select 1 or more</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map(focus => {
                      const isSelected = selectedFocusAreas.includes(focus);
                      return (
                        <button
                          key={focus}
                          type="button"
                          onClick={() => toggleFocusArea(focus)}
                          className={`px-3.5 py-2 rounded-xl text-[12.5px] sm:text-sm font-medium transition-all active:scale-95 ${
                            isSelected 
                            ? 'bg-primary/20 text-primary border border-primary shadow-[0_0_10px_rgba(34,197,94,0.25)] font-semibold' 
                            : 'bg-surface-highest/50 text-text-muted border border-surface-highest hover:bg-surface-highest hover:text-text-main'
                          }`}
                        >
                          {focus}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tech Stack Multi-select */}
              <div className="flex flex-col gap-2 pt-2">
                <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Your Tech Stack & Skills <span className="text-primary">*</span></span>
                  <span className="text-[10px] text-text-muted font-normal">Used for match % scoring</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {TECH_TAGS.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3.5 py-2 rounded-xl text-[12.5px] sm:text-sm font-medium transition-all active:scale-95 ${
                          isSelected 
                          ? 'bg-primary/20 text-primary border border-primary shadow-[0_0_10px_rgba(34,197,94,0.25)] font-semibold' 
                          : 'bg-surface-highest/50 text-text-muted border border-surface-highest hover:bg-surface-highest hover:text-text-main'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* OPTIONAL FIELDS */}
            <div className="space-y-5 sm:space-y-6 mt-2 sm:mt-4">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] border-b border-surface-high/50 pb-2 flex items-center justify-between">
                <span>Optional (Diversity & Experience)</span>
                <span className="text-[9px] text-text-muted font-normal uppercase">Optional</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Gender</label>
                  <select
                    name="gender"
                    defaultValue={initialProfile?.gender || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Optional: For diversity programs...</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Experience Level</label>
                  <select
                    name="experience_level"
                    defaultValue={initialProfile?.experience_level || ""}
                    className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer"
                  >
                    <option value="">Optional: For seniority filtering...</option>
                    {EXP_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Submit & Action Buttons ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {isExisting && (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-1/3 py-[12px] sm:py-[13px] rounded-[12px] border border-surface-high/60 bg-surface-lowest hover:bg-surface-high/40 text-text-muted hover:text-text-main font-bold text-[14px] text-center transition-all active:scale-[0.98]"
                >
                  Cancel
                </Link>
              )}
              
              <button
                type="submit"
                disabled={saving}
                className={`${isExisting ? 'w-full sm:w-2/3' : 'w-full'} bg-primary text-background font-black text-[14.5px] sm:text-[15px] py-[12px] sm:py-[13px] rounded-[12px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 group shadow-[0_4px_20px_rgba(34,197,94,0.28)]`}
              >
                {saving
                  ? "Saving Changes..."
                  : isExisting
                  ? "Save Changes →"
                  : "Complete Profile →"}
                {!saving && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

        </div>
      </div>
    </main>
  );
}
