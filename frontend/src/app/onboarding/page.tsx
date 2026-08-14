"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, CheckCircle2, ArrowRight } from "lucide-react";
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
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];
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
  "C++", "Machine Learning", "Web3", "UI/UX"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
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

    // Validation for required fields handled by HTML5 required attribute, but let's be safe
    if (selectedTags.length === 0) {
      setError("Please select at least one tech stack.");
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
      
      setCompleted(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
      setSaving(false);
    }
  };

  if (completed) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center relative font-sans w-full h-screen">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/20 blur-[120px]"></div>
        </div>
        <div className="z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(78,222,99,0.3)]">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <h2 className="text-3xl font-black mb-2">Profile Complete</h2>
          <p className="text-text-muted text-lg animate-pulse">Showing you opportunities matching your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full pt-8 sm:pt-16 px-3.5 sm:px-6 relative font-sans pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[30vh] bg-primary/10 blur-[150px] rounded-full"></div>
      </div>

      <div className="z-10 relative">
        <div className="flex items-center gap-2.5 justify-center mb-6 sm:mb-8">
          <div className="w-[32px] h-[32px] sm:w-[34px] sm:h-[34px] rounded-[10px] bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-[0_0_14px_rgba(34,197,94,0.26)]">
            <Compass size={15} className="text-background" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[18px] sm:text-[20px] tracking-tight">Opp<span className="text-primary">Hub</span></span>
        </div>

        <div className="bg-surface-low/80 backdrop-blur-xl border border-surface-high/30 rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-black mb-1.5 sm:mb-2">Developer Identity</h1>
            <p className="text-text-muted text-[12.5px] sm:text-sm leading-relaxed">Tell us about yourself. Our algorithm uses this exact data to filter out the noise and rank opportunities that match your precise eligibility.</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 sm:p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-[12.5px] sm:text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
            
            {/* MANDATORY FIELDS */}
            <div className="space-y-5 sm:space-y-6">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.12em] border-b border-surface-high/50 pb-2">Mandatory Fields</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                  <input type="text" name="full_name" required placeholder="John Doe" className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none transition-all" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">College Tier</label>
                  <select name="college_tier" required className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Select your tier...</option>
                    {COLLEGE_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Current Year of Study</label>
                  <select name="current_year" required className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Select current year...</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Expected Graduation</label>
                  <select name="graduation_year" required className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Select year...</option>
                    {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Location Preference</label>
                  <select name="location_preference" required className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Select location...</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Current Focus <span className="text-red-400">*</span></label>
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
                            ? 'bg-primary/20 text-primary border border-primary shadow-[0_0_10px_rgba(78,222,99,0.2)]' 
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

              <div className="flex flex-col gap-2 pt-2">
                <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Tech Stack <span className="text-red-400">*</span></label>
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
                          ? 'bg-primary/20 text-primary border border-primary shadow-[0_0_10px_rgba(78,222,99,0.2)]' 
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
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] border-b border-surface-high/50 pb-2">
                Optional (Recommended for Better Matching)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Gender</label>
                  <select name="gender" className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Optional: For diversity programs...</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">Experience Level</label>
                  <select name="experience_level" className="bg-surface-lowest border border-surface-high/50 rounded-[10px] px-3.5 py-[11px] text-[16px] md:text-[13px] text-text-main focus:border-primary focus:ring-2 focus:ring-primary/12 outline-none appearance-none transition-all cursor-pointer">
                    <option value="">Optional: For seniority filtering...</option>
                    {EXP_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 sm:mt-6 w-full bg-primary text-background font-black text-[14.5px] sm:text-[15px] py-[12px] sm:py-[13px] rounded-[12px] flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 group shadow-[0_4px_20px_rgba(34,197,94,0.28)]"
            >
              {saving ? "Saving Profile..." : "Complete Profile"}
              {!saving && <ArrowRight size={19} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

        </div>
      </div>
    </main>
  );
}
