import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Feed from "@/components/Feed";
import { getUserProfile } from "@/app/actions";

export const dynamic = 'force-dynamic';

function calculateScore(opp: any, profile: any) {
  let score = 0;
  
  // 1. Profile Match
  if (profile) {
    if (profile.focus_area && opp.type.toLowerCase().includes(profile.focus_area.toLowerCase().replace('looking for ', ''))) {
      score += 20;
    }
    if (profile.tech_stack && profile.tech_stack.length > 0 && opp.domain_tags) {
      const matchCount = profile.tech_stack.filter((tech: string) => 
        opp.domain_tags.some((tag: string) => tag.toLowerCase().includes(tech.toLowerCase()))
      ).length;
      score += matchCount * 5;
    }
  }

  // 2. Deadline Proximity
  if (opp.deadline) {
    const daysLeft = (new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= 7) score += 15;
    else if (daysLeft > 7 && daysLeft <= 30) score += 5;
  }

  // 3. Effort Level
  if (opp.effort_level?.toLowerCase() === 'low') score += 10;
  if (opp.effort_level?.toLowerCase() === 'medium') score += 5;

  return score;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const profile = await getUserProfile();

  // Fetch up to 300 active opportunities to rank in memory
  const { data: opportunities, error: oppsError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('is_active', true)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(300);

  if (oppsError) {
    console.error("Error fetching opportunities:", oppsError);
  }

  // Apply ranking algorithm
  let rankedOpportunities = opportunities || [];
  if (profile) {
    rankedOpportunities = rankedOpportunities.sort((a, b) => calculateScore(b, profile) - calculateScore(a, profile));
  }
  
  // Return top 50 to avoid overwhelming the client
  const topOpportunities = rankedOpportunities.slice(0, 50);

  let savedStatuses: any[] = [];

  const { data: dbSavedStatuses, error: savedError } = await supabase
    .from('user_saved_opportunities')
    .select('opportunity_id, status')
    .eq('user_id', userId);

  if (savedError) {
    console.error("Error fetching saved statuses:", savedError);
  } else {
    savedStatuses = dbSavedStatuses || [];
  }
  
  return (
    <Feed 
      opportunities={topOpportunities} 
      savedStatuses={savedStatuses} 
      user={session.user}
      profile={profile}
    />
  );
}
