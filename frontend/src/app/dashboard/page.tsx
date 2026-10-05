import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Feed from "@/components/Feed";
import { getUserProfile } from "@/app/actions";
import { diversifyFeed } from "@/lib/feed-diversification";

export const dynamic = 'force-dynamic';

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

    // Hydrate normalized_company which is omitted by the RPC function
    if (pagedOpportunities.length > 0) {
      const oppIds = pagedOpportunities.map((o: any) => o.id);
      const { data: extras } = await supabase
        .from('opportunities')
        .select('id, normalized_company')
        .in('id', oppIds);

      if (extras && extras.length > 0) {
        const extrasMap = new Map(extras.map((e: any) => [e.id, e]));
        pagedOpportunities = pagedOpportunities.map((o: any) => {
          const extra = extrasMap.get(o.id);
          return {
            ...o,
            normalized_company: extra?.normalized_company || o.normalized_company,
          };
        });
      }
    }
  }

  // Fetch freshest opportunities (including newly added YC & Wellfound tech startup roles)
  const { data: newestData } = await supabase
    .from('opportunities')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(30);

  if (newestData && newestData.length > 0) {
    const existingIds = new Set(newestData.map((n: any) => n.id));
    const remainingRanked = pagedOpportunities.filter((o: any) => !existingIds.has(o.id));
    pagedOpportunities = [...newestData, ...remainingRanked];
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
      initialOpportunities={diversifyFeed(pagedOpportunities || [])} 
      savedStatuses={savedStatuses} 
      user={user}
      profile={profile}
      initialTotalPages={totalPages}
    />
  );
}
