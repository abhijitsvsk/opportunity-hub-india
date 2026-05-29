"use client";

import { useState } from "react";
import { updateUserProfile } from "@/app/actions";
import { Save, User, BookOpen, Target, Code, Trophy, Bookmark, Globe } from "lucide-react";

type ProfileProps = {
  profile: any;
  user: any; // Supabase user object containing github metadata
  savedCount: number;
  onSaveComplete?: () => void;
};

export default function ProfileDashboard({ profile, user, savedCount, onSaveComplete }: ProfileProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [techStack, setTechStack] = useState<string[]>(profile?.tech_stack || []);
  const popularTags = ["React", "Next.js", "Node.js", "Python", "Java", "Spring Boot", "C++", "Machine Learning", "Web3", "UI/UX"];

  const toggleTag = (tag: string) => {
    if (techStack.includes(tag)) {
      setTechStack(techStack.filter(t => t !== tag));
    } else {
      setTechStack([...techStack, tag]);
    }
  };
  
  const githubAvatar = user?.user_metadata?.avatar_url || "https://github.com/ghost.png";
  const githubName = user?.user_metadata?.full_name || user?.user_metadata?.user_name || "Developer";

  // Calculate profile completion
  const fields = ['university', 'graduation_year', 'focus_area', 'tech_stack', 'location_preference'];
  let filledFields = 0;
  if (profile) {
    fields.forEach(f => {
      if (profile[f] && profile[f].length > 0) filledFields++;
    });
  }
  const completionPercentage = Math.round((filledFields / fields.length) * 100);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    await updateUserProfile(formData);
    setIsSaving(false);
    if (onSaveComplete) {
      onSaveComplete();
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto px-8 py-24 pb-32 hide-scrollbar">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        {/* HEADER IDENTITY CARD */}
        <div className="glass-panel p-8 rounded-[2rem] border border-surface-high flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <div className="w-32 h-32 rounded-full border-4 border-surface-low overflow-hidden shadow-[0_0_30px_rgba(0,255,136,0.2)] shrink-0 bg-surface-high">
            <img src={githubAvatar} alt="GitHub Avatar" className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-2 pt-2">
            <h1 className="text-4xl font-black text-text-main tracking-tight">{githubName}</h1>
            <p className="text-primary font-mono tracking-widest text-sm uppercase flex items-center gap-2">
              <Code size={14} /> Developer Identity
            </p>
            <p className="text-text-muted mt-2 max-w-lg">
              Welcome to your command center. Keep your tech stack updated to receive the best-matched opportunities.
            </p>
          </div>
        </div>

        {/* COMMAND CENTER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6 rounded-3xl border border-surface-high flex items-center gap-6">
            <div className="w-16 h-16 rounded-full border-4 border-surface-high flex items-center justify-center relative">
              {/* Fake progress ring using conic-gradient */}
              <div 
                className="absolute inset-[-4px] rounded-full" 
                style={{
                  background: `conic-gradient(var(--color-primary) ${completionPercentage}%, transparent ${completionPercentage}%)`,
                  WebkitMask: 'radial-gradient(transparent 58%, black 60%)',
                  mask: 'radial-gradient(transparent 58%, black 60%)'
                }}
              ></div>
              <span className="font-mono font-bold text-lg text-text-main">{completionPercentage}%</span>
            </div>
            <div>
              <h3 className="text-text-muted font-bold text-sm tracking-wider uppercase mb-1">Profile Strength</h3>
              <p className="text-xs text-text-muted">Complete all fields to hit 100%.</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-surface-high flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-surface-high/50 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-secondary/30">
              <Bookmark size={24} className="text-secondary fill-secondary" />
            </div>
            <div>
              <h3 className="text-text-muted font-bold text-sm tracking-wider uppercase mb-1">Opportunities Saved</h3>
              <p className="text-3xl font-black text-text-main">{savedCount}</p>
            </div>
          </div>
        </div>

        {/* EDIT PROFILE FORM */}
        <div className="glass-panel p-8 rounded-[2rem] border border-surface-high shadow-xl relative">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
            <User className="text-primary" /> Update Your Details
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} /> University / College
                </label>
                <input 
                  type="text" 
                  name="university"
                  defaultValue={profile?.university || ""}
                  placeholder="e.g. Stanford University"
                  className="bg-surface-lowest border border-surface-high/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-main"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={14} /> Graduation Year
                </label>
                <input 
                  type="text" 
                  name="graduation_year"
                  defaultValue={profile?.graduation_year || ""}
                  placeholder="e.g. 2026"
                  className="bg-surface-lowest border border-surface-high/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-main"
                />
              </div>

            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                <Code size={14} /> Tech Stack (Click to select)
              </label>
              
              <input type="hidden" name="tech_stack" value={techStack.join(", ")} />
              
              <div className="flex flex-wrap gap-2">
                {popularTags.map(tag => {
                  const isSelected = techStack.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                        isSelected 
                          ? 'bg-primary text-[#002113] border-primary shadow-[0_0_12px_rgba(0,255,136,0.35)]' 
                          : 'bg-surface-low border-surface-high/50 text-text-muted hover:bg-surface-high hover:text-text-main'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <Target size={14} /> Current Focus
                </label>
                <select 
                  name="focus_area"
                  defaultValue={profile?.focus_area || ""}
                  className="bg-surface-lowest border border-surface-high/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-main appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select your primary goal...</option>
                  <option value="Internships">Looking for Internships</option>
                  <option value="Hackathons">Looking for Hackathons</option>
                  <option value="Open Source">Looking for Open Source PRs</option>
                  <option value="Full Time">Looking for Full-Time Roles</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                  <Globe size={14} /> Location Preference
                </label>
                <select 
                  name="location_preference"
                  defaultValue={profile?.location_preference || ""}
                  className="bg-surface-lowest border border-surface-high/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-text-main appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select preference...</option>
                  <option value="remote_only">Remote Only</option>
                  <option value="india_only">India Only</option>
                  <option value="open_to_abroad">Open to Abroad</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-high mt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="bg-gradient-to-r from-primary to-primary-container text-[#002113] font-black text-lg py-3 px-8 rounded-xl hover:brightness-110 transition-all shadow-[0_5px_20px_rgba(0,255,136,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? "Saving..." : <><Save size={20} /> Save Profile</>}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
