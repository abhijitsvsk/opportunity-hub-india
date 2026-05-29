"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleBookmark(opportunityId: string, currentStatus: string | null) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return { error: "Not logged in" };

  if (currentStatus && currentStatus !== 'archived') {
    // If it exists and is not archived, archive it
    await supabase
      .from('user_saved_opportunities')
      .update({ status: 'archived' })
      .match({ user_id: session.user.id, opportunity_id: opportunityId });
  } else {
    // If it doesn't exist or is archived, they are bookmarking it (default status 'to_apply')
    await supabase
      .from('user_saved_opportunities')
      .upsert({
        user_id: session.user.id,
        opportunity_id: opportunityId,
        status: 'to_apply'
      }, { onConflict: 'user_id, opportunity_id' });
  }

  revalidatePath("/dashboard");
}

export async function updateApplicationStatus(opportunityId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return { error: "Not logged in" };

  // Update status (upserting if they hadn't bookmarked it previously)
  await supabase
    .from('user_saved_opportunities')
    .upsert({
      user_id: session.user.id,
      opportunity_id: opportunityId,
      status: newStatus
    }, { onConflict: 'user_id, opportunity_id' });

  revalidatePath("/dashboard");
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return { error: "Not logged in" };

  const university = formData.get("university") as string;
  const graduation_year = formData.get("graduation_year") as string;
  const focus_area = formData.get("focus_area") as string;
  const location_preference = formData.get("location_preference") as string;
  
  // Parse tech stack (comma separated)
  const techStackRaw = formData.get("tech_stack") as string;
  const tech_stack = techStackRaw ? techStackRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: session.user.id,
      university,
      graduation_year,
      focus_area,
      location_preference,
      tech_stack,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error("Error updating profile:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  return data;
}

export async function testSignIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Auth error:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

