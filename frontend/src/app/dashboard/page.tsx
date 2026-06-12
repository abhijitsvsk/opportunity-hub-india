import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Feed from "@/components/Feed";
import { getUserProfile } from "@/app/actions";

export const dynamic = 'force-dynamic';

function parseCurrentYear(yearStr: string) {
  if (yearStr === "1st Year") return 1;
  if (yearStr === "2nd Year") return 2;
  if (yearStr === "3rd Year") return 3;
  if (yearStr === "4th Year") return 4;
  if (yearStr === "Postgraduate") return 5;
  return null;
}

function calculateScore(opp: any, profile: any) {
  let score = 0;
  
  if (!profile) return score;

  // 1. Tech Stack Match (High Signal)
  if (profile.tech_stack && profile.tech_stack.length > 0 && opp.domain_tags) {
    const matchCount = profile.tech_stack.filter((tech: string) => 
      opp.domain_tags.some((tag: string) => tag.toLowerCase().includes(tech.toLowerCase()))
    ).length;
    score += matchCount * 10;
  }

  // 2. Experience Level Match
  if (profile.experience_level) {
    const desc = (opp.description || '').toLowerCase();
    const title = (opp.title || '').toLowerCase();
    
    if (profile.experience_level === 'Fresher') {
      if (title.includes('fresher') || title.includes('entry level') || title.includes('new grad')) score += 5;
      if (title.includes('senior') || title.includes('lead')) score -= 10;
    } else if (profile.experience_level === '1 prior internship') {
      if (desc.includes('experience') || title.includes('intern')) score += 5;
    } else if (profile.experience_level === '2+ internships') {
      if (desc.includes('proven') || desc.includes('advanced') || opp.competitiveness === 'high') score += 5;
    }
  }

  // 3. College Tier Match
  if (profile.college_tier) {
    const isTopTier = profile.college_tier === 'IIT/IISc' || profile.college_tier === 'NIT/IIIT/BITS';
    if (isTopTier && opp.competitiveness === 'high') score += 5;
  }

  // 4. Focus Area
  if (profile.focus_area) {
    const focusAreas = profile.focus_area.split(',');
    for (const focus of focusAreas) {
      if (opp.type.toLowerCase().includes(focus.trim().toLowerCase().replace('looking for ', '').replace('roles', ''))) {
        score += 15;
        break;
      }
    }
  }

  // 5. Deadline Proximity
  if (opp.deadline) {
    const daysLeft = (new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft >= 0 && daysLeft <= 7) score += 10;
    else if (daysLeft > 7 && daysLeft <= 30) score += 3;
  }

  return score;
}

function isEligible(opp: any, profile: any) {
  if (!profile || !profile.current_year) return true;
  
  // If the opportunity has strict eligibility years
  if (opp.eligibility && Array.isArray(opp.eligibility.year)) {
    const userYearNum = parseCurrentYear(profile.current_year);
    if (userYearNum !== null && opp.eligibility.year.length > 0) {
      if (!opp.eligibility.year.includes(userYearNum)) {
        return false; // Hard gate: user year is strictly not allowed
      }
    }
  }
  return true;
}

export default async function DashboardPage() {
  const pageSize = 50;
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const userId = user.id;
  const profile = await getUserProfile();

  const isProfileComplete = profile && 
    profile.full_name && 
    profile.college_tier && 
    profile.current_year && 
    profile.tech_stack && profile.tech_stack.length > 0 && 
    profile.focus_area && 
    profile.location_preference;

  if (!isProfileComplete) {
    redirect("/onboarding");
  }

  // NOTE: Deep-linking to specific scroll positions or pages via URL params 
  // is intentionally disabled for this TikTok-style vertical feed architecture. 
  // The server always renders Page 1 on initial load for optimal FCP.
  const start = 0;
  const end = pageSize - 1;

  let pagedOpportunities: any[] = [];
  let totalPages = 1;

  const { data, error: oppsError, count } = await supabase
    .rpc('get_ranked_opportunities', { p_user_id: userId }, { count: 'exact' })
    .range(start, end);

  if (oppsError) {
    console.error("Error fetching ranked opportunities via RPC:", oppsError);
    // Suppress crash on PGRST202 (missing function) so UI can render Empty State
  } else {
    pagedOpportunities = data || [];
    totalPages = count ? Math.ceil(count / pageSize) : 1;
  }

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
      initialOpportunities={pagedOpportunities || []} 
      savedStatuses={savedStatuses} 
      user={user}
      profile={profile}
      initialTotalPages={totalPages}
    />
  );
}
