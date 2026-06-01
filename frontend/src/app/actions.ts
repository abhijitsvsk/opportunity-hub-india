"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleBookmark(opportunityId: string, currentStatus: string | null) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) return { error: "Not logged in" };

  if (currentStatus && currentStatus !== 'archived') {
    // If it exists and is not archived, archive it
    await supabase
      .from('user_saved_opportunities')
      .update({ status: 'archived' })
      .match({ user_id: user.id, opportunity_id: opportunityId });
  } else {
    // If it doesn't exist or is archived, they are bookmarking it (default status 'to_apply')
    await supabase
      .from('user_saved_opportunities')
      .upsert({
        user_id: user.id,
        opportunity_id: opportunityId,
        status: 'to_apply'
      }, { onConflict: 'user_id, opportunity_id' });
  }

  revalidatePath("/dashboard");
}

export async function updateApplicationStatus(opportunityId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) return { error: "Not logged in" };

  // Update status (upserting if they hadn't bookmarked it previously)
  await supabase
    .from('user_saved_opportunities')
    .upsert({
      user_id: user.id,
      opportunity_id: opportunityId,
      status: newStatus
    }, { onConflict: 'user_id, opportunity_id' });

  revalidatePath("/dashboard");
}

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be logged in to update your profile.");
  }

  const rawTechStack = formData.get("tech_stack") as string;
  const techStack = rawTechStack ? rawTechStack.split(',').map(s => s.trim()) : [];

  const profileData = {
    full_name: formData.get("full_name") as string,
    college_tier: formData.get("college_tier") as string,
    current_year: formData.get("current_year") as string,
    graduation_year: formData.get("graduation_year") as string,
    location_preference: formData.get("location_preference") as string,
    focus_area: formData.get("focus_area") as string,
    gender: formData.get("gender") as string || null,
    experience_level: formData.get("experience_level") as string || null,
    tech_stack: techStack,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: user.id, ...profileData });

  if (error) {
    console.error("Error updating profile:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return data;
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

