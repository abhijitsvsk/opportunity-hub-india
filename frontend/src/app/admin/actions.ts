"use server";

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function verifyAdmin(): Promise<void> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (error || !user || user.email !== adminEmail) {
    throw new Error("Unauthorized");
  }
}

// Helper to get Admin Client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export async function saveOpportunity(prevState: any, formData: FormData) {
  try {
    await verifyAdmin();
    
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) return { error: "Missing Service Role Key configuration." };

    const id = formData.get("id") as string | null;
    const title = formData.get("title") as string;
    const type = formData.get("type") as string;
    const description = formData.get("description") as string;
    const source_url = formData.get("source_url") as string;
    const deadline = formData.get("deadline") as string;
    const tagsString = formData.get("domain_tags") as string;
    const is_active = formData.get("is_active") === "on";
    
    const domain_tags = tagsString ? tagsString.split(",").map(t => t.trim()) : [];

    // Parse Eligibility checkboxes
    const years = formData.getAll("eligibility_year").map(y => parseInt(y as string, 10));
    const eligibility = years.length > 0 ? { year: years } : { type: "all" };

    const record: any = {
      title,
      type,
      description,
      source_url,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      domain_tags,
      eligibility,
      effort_level: formData.get("effort_level") as string || "medium",
      competitiveness: formData.get("competitiveness") as string || "medium",
      is_active
    };

    if (id) {
      record.id = id;
      record.updated_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('opportunities')
      .upsert(record, { onConflict: id ? 'id' : 'source_url' });

    if (error) {
      console.error("Admin save error:", error.message);
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: id ? "Opportunity updated successfully" : "Opportunity published successfully", timestamp: Date.now() };
  } catch (err: any) {
    return { error: err.message || "Unauthorized" };
  }
}

export async function toggleActiveStatus(id: string, currentStatus: boolean) {
  try {
    await verifyAdmin();
    
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) return { error: "Missing Service Role Key configuration." };

    const { error } = await supabaseAdmin
      .from('opportunities')
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error("Admin toggle error:", error.message);
      return { error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unauthorized" };
  }
}
