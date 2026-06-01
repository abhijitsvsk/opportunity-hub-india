"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { saveOpportunity, toggleActiveStatus } from "./actions";
import { PlusCircle, Pencil, Power, CheckCircle, XCircle } from "lucide-react";

export default function AdminClientView({ initialOpportunities }: { initialOpportunities: any[] }) {
  const [editingOpp, setEditingOpp] = useState<any | null>(null);
  const [isToggling, startTransition] = useTransition();
  const [optimisticOpps, setOptimisticOpps] = useState(initialOpportunities);

  const [state, formAction, isFormPending] = useActionState(saveOpportunity, null);

  // Sync with server on hard refreshes/revalidations
  useEffect(() => {
    setOptimisticOpps(initialOpportunities);
  }, [initialOpportunities]);

  useEffect(() => {
    if (state?.success) {
      setEditingOpp(null);
    }
  }, [state]);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setOptimisticOpps(prev => prev.map(o => o.id === id ? { ...o, is_active: !currentStatus } : o));
      
      const result = await toggleActiveStatus(id, currentStatus);
      if (result?.error) {
        // Rollback on failure
        setOptimisticOpps(prev => prev.map(o => o.id === id ? { ...o, is_active: currentStatus } : o));
      }
    });
  };

  return (
    <div className="w-full max-w-5xl flex flex-col gap-12 animate-in fade-in zoom-in-95 duration-300">
      
      {/* 1. THE FORM */}
      <div className="bg-surface-low rounded-3xl p-8 border border-surface-high/50 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            {editingOpp ? <Pencil size={24} /> : <PlusCircle size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-text-main tracking-tight">
              {editingOpp ? "Edit Opportunity" : "Publish Opportunity"}
            </h2>
            <p className="text-text-muted text-sm">
              {editingOpp ? `Editing: ${editingOpp.title}` : "Manual ingestion mechanism"}
            </p>
          </div>
          {editingOpp && (
            <button onClick={() => setEditingOpp(null)} className="ml-auto text-sm text-text-muted hover:text-text-main font-bold">
              Cancel Edit
            </button>
          )}
        </div>

        {state?.error && (
          <div className="mb-6 bg-error/20 border border-error/50 p-4 rounded-xl text-error font-bold flex items-center gap-2">
            <XCircle size={18} /> {state.error}
          </div>
        )}
        
        {state?.success && (
          <div className="mb-6 bg-primary/20 border border-primary/50 p-4 rounded-xl text-primary font-bold flex items-center gap-2">
            <CheckCircle size={18} /> {state.success}
          </div>
        )}

        <form action={formAction} className="flex flex-col gap-6" key={editingOpp?.id || "new"}>
          {editingOpp && <input type="hidden" name="id" value={editingOpp.id} />}

          <div className="flex items-center gap-4 mb-2 bg-surface-lowest p-4 rounded-xl border border-surface-high">
            <label className="text-sm font-bold text-text-main flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_active" defaultChecked={editingOpp ? editingOpp.is_active : true} className="w-5 h-5 accent-primary" />
              Published (Visible in Feed)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Title *</label>
              <input name="title" defaultValue={editingOpp?.title} required className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main" placeholder="e.g. Frontend Engineer Intern" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Type *</label>
              <select name="type" defaultValue={editingOpp?.type || "internship"} required className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main">
                <option value="internship">Internship</option>
                <option value="hackathon">Hackathon</option>
                <option value="fellowship">Fellowship</option>
                <option value="full-time">Full Time</option>
                <option value="open-source program">Open Source</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Source URL *</label>
            <input name="source_url" type="url" defaultValue={editingOpp?.source_url} required className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main" placeholder="https://..." />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Description</label>
            <textarea name="description" rows={4} defaultValue={editingOpp?.description} className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main" placeholder="Detailed description..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Deadline</label>
              <input name="deadline" type="date" defaultValue={editingOpp?.deadline ? new Date(editingOpp.deadline).toISOString().split('T')[0] : ''} className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main [color-scheme:dark]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Domain Tags (comma separated)</label>
              <input name="domain_tags" defaultValue={editingOpp?.domain_tags?.join(", ")} className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main" placeholder="react, node, aws" />
            </div>
          </div>

          <div className="bg-surface-lowest p-4 rounded-xl border border-surface-high flex flex-col gap-3">
             <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Eligibility (Years Allowed)</label>
             <p className="text-xs text-text-muted mb-2">Leave all unchecked to allow all years.</p>
             <div className="flex flex-wrap gap-4">
               {[1, 2, 3, 4, 5].map(yearNum => {
                  const label = yearNum === 5 ? "Postgraduate" : `${yearNum} Year`;
                  const isChecked = editingOpp?.eligibility?.year?.includes(yearNum) || false;
                  return (
                    <label key={yearNum} className="flex items-center gap-2 text-sm font-bold text-text-main cursor-pointer">
                      <input type="checkbox" name="eligibility_year" value={yearNum} defaultChecked={isChecked} className="w-4 h-4 accent-primary" />
                      {label}
                    </label>
                  );
               })}
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Effort Level</label>
              <select name="effort_level" defaultValue={editingOpp?.effort_level || "medium"} className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Competitiveness</label>
              <select name="competitiveness" defaultValue={editingOpp?.competitiveness || "medium"} className="bg-surface-lowest border border-surface-high rounded-xl px-4 py-3 text-sm focus:border-primary outline-none text-text-main">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isFormPending} className="mt-4 bg-primary text-[#002113] font-bold text-sm py-4 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.2)] disabled:opacity-50">
            {editingOpp ? <Pencil size={20} /> : <PlusCircle size={20} />}
            {isFormPending ? "Saving..." : editingOpp ? "Save Changes" : "Publish Opportunity"}
          </button>
        </form>
      </div>

      {/* 2. THE LIST */}
      <div className="bg-surface-low rounded-3xl p-8 border border-surface-high/50 shadow-2xl">
        <h2 className="text-xl font-black text-text-main mb-6">Existing Opportunities ({optimisticOpps.length})</h2>
        <div className="flex flex-col gap-3">
          {optimisticOpps.map((opp) => (
            <div key={opp.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${opp.is_active ? 'bg-surface-lowest border-surface-high' : 'bg-surface-lowest/50 border-error/20 opacity-70'}`}>
               <div>
                  <h3 className="font-bold text-text-main flex items-center gap-2">
                    {opp.title} 
                    {!opp.is_active && <span className="text-[10px] bg-error/20 text-error px-2 py-0.5 rounded-full uppercase tracking-wider">Inactive</span>}
                  </h3>
                  <p className="text-xs text-text-muted">{opp.type} • {new Date(opp.created_at).toLocaleDateString()}</p>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={() => setEditingOpp(opp)} className="p-2 text-text-muted hover:text-primary transition-colors bg-surface-high/30 rounded-lg">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleToggleActive(opp.id, opp.is_active)} className={`p-2 transition-colors rounded-lg flex items-center gap-2 text-xs font-bold ${opp.is_active ? 'text-error hover:bg-error/10 bg-surface-high/30' : 'text-primary hover:bg-primary/10 bg-surface-high/30'}`}>
                    <Power size={18} />
                    {opp.is_active ? "Deactivate" : "Activate"}
                  </button>
               </div>
            </div>
          ))}
          {optimisticOpps.length === 0 && (
             <p className="text-center text-text-muted py-8">No opportunities found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
