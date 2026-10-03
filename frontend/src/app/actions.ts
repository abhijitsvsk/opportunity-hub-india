"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

const AuthSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long.")
});

const ProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required."),
  college_tier: z.string().optional(),
  current_year: z.string().optional(),
  graduation_year: z.string().optional(),
  location_preference: z.string().optional(),
  focus_area: z.string().optional(),
  gender: z.string().optional().nullable(),
  experience_level: z.string().optional().nullable(),
  tech_stack: z.string().optional()
});

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

  const parsed = ProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    college_tier: formData.get("college_tier"),
    current_year: formData.get("current_year"),
    graduation_year: formData.get("graduation_year"),
    location_preference: formData.get("location_preference"),
    focus_area: formData.get("focus_area"),
    gender: formData.get("gender"),
    experience_level: formData.get("experience_level"),
    tech_stack: formData.get("tech_stack"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const rawTechStack = parsed.data.tech_stack;
  const techStack = rawTechStack ? rawTechStack.split(',').map(s => s.trim()).filter(Boolean) : [];

  const profileData = {
    full_name: parsed.data.full_name,
    college_tier: parsed.data.college_tier || null,
    current_year: parsed.data.current_year || null,
    graduation_year: parsed.data.graduation_year || null,
    location_preference: parsed.data.location_preference || null,
    focus_area: parsed.data.focus_area || null,
    gender: parsed.data.gender || null,
    experience_level: parsed.data.experience_level || null,
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
  revalidatePath("/profile");
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
  try {
    const parsed = AuthSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (err: any) {
    if (err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("signIn error:", err);
    const msg = err?.message || "";
    if (msg.includes("fetch failed") || err?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return { error: "Authentication server timed out. The database may be waking up, please try again." };
    }
    return { error: msg || "Failed to sign in. Please try again." };
  }
}

export async function signUp(formData: FormData) {
  try {
    const parsed = AuthSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // If email confirmation is required and session is null
    if (data?.user && !data?.session) {
      return {
        success: true,
        requiresConfirmation: true,
        message: "Verification email sent! Please check your inbox and click the link to activate your account."
      };
    }

    revalidatePath("/dashboard");
    redirect("/onboarding");
  } catch (err: any) {
    if (err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("signUp error:", err);
    const msg = err?.message || "";
    if (msg.includes("fetch failed") || err?.code === "UND_ERR_CONNECT_TIMEOUT") {
      return { error: "Authentication server timed out. The database may be waking up, please try again." };
    }
    return { error: msg || "Failed to create account. Please try again." };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err: any) {
    console.error("signOut error:", err);
  }
  redirect("/");
}

export async function signInWithGithub() {
  try {
    const supabase = await createClient();
    const origin = (await headers()).get("origin");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.url) {
      redirect(data.url);
    }
  } catch (err: any) {
    if (err?.digest?.includes("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("signInWithGithub error:", err);
    redirect(`/login?error=${encodeURIComponent("Failed to initialize GitHub login.")}`);
  }
}

