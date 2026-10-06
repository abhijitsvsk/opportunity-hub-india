import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;
  const error = requestUrl.searchParams.get("error_description") || requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("Exchange code for session error:", exchangeError);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`);
    }

    // Explicit onboarding check: new Google/OAuth users MUST complete onboarding first
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, college_tier, current_year, tech_stack, focus_area, location_preference')
        .eq('user_id', user.id)
        .single();

      const isProfileComplete = profile &&
        profile.full_name &&
        profile.college_tier &&
        profile.current_year &&
        profile.tech_stack && profile.tech_stack.length > 0 &&
        profile.focus_area &&
        profile.location_preference;

      if (!isProfileComplete) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  // URL to redirect to for users who already have completed profiles
  const redirectPath = next && next.startsWith("/") && next !== "/" ? next : "/dashboard";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
