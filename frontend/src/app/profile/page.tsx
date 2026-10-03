import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const profile = await getUserProfile();

  return (
    <ProfileForm 
      initialProfile={profile} 
      userEmail={user.email} 
    />
  );
}
