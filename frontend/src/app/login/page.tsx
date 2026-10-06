import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signIn, signUp, signInWithGoogle } from "@/app/actions";
import { SignIn1 } from "@/components/ui/modern-stunning-sign-in";

export default async function LoginPage(
  props: { searchParams: Promise<{ error?: string }> }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <SignIn1
      onSignInWithEmail={signIn}
      onSignUpWithEmail={signUp}
      onSignInWithGoogle={signInWithGoogle}
      defaultError={searchParams?.error}
    />
  );
}
