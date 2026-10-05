import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
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
  }

  // URL to redirect to after sign in process completes
  const redirectPath = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
