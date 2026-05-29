import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign-out error:", error);
    return NextResponse.redirect(new URL("/?error=Could not sign out", request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
