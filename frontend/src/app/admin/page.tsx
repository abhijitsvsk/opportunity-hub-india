import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import AdminClientView from "./AdminClientView";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();
  
  // ISSUE 1: Strict admin auth check using ADMIN_EMAIL and getUser
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (authError || !user || user.email !== adminEmail) {
    redirect("/");
  }

  // Fetch all opportunities for the admin dashboard list view
  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch opportunities:", error);
  }

  return (
    <div className="min-h-screen bg-background p-8 flex flex-col items-center gap-12">
       <div className="w-full max-w-5xl text-center mb-[-20px]">
          <h1 className="text-3xl font-black text-text-main tracking-tight">Admin Dashboard</h1>
          <p className="text-text-muted mt-2">Manage opportunities and ingestion</p>
       </div>
       <AdminClientView initialOpportunities={opportunities || []} />
    </div>
  );
}
