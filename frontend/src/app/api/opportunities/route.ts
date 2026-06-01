import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // 1. Explicitly check for cancellation to save database compute
  if (request.signal.aborted) {
    return new Response(null, { status: 499 }); // 499 Client Closed Request
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const filtersParam = searchParams.get("filters");
  const pageSize = 50;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase.rpc("get_ranked_opportunities", { p_user_id: user.id });

  // 2. Map active filters to PostgREST modifiers
  if (filtersParam && filtersParam !== "All") {
    const activeFilters = filtersParam.split(",").filter(Boolean);
    const orConditions: string[] = [];

    for (const filter of activeFilters) {
      switch (filter) {
        case "Hackathons":
          orConditions.push("type.ilike.hackathon");
          break;
        case "Internships":
          orConditions.push("type.ilike.internship");
          break;
        case "Fellowships":
          orConditions.push("type.ilike.fellowship");
          break;
        case "Open Source":
          orConditions.push("type.ilike.%open%");
          break;
        case "AI & ML":
          orConditions.push("domain_tags.ov.{ai,machine learning,nlp,neural,deep learning}");
          break;
        case "Cybersecurity":
          orConditions.push("domain_tags.ov.{cyber,security,hacking,forensic,vulnerability}");
          break;
        case "Design":
          orConditions.push("domain_tags.ov.{design,ux,ui,graphic,visual,figma,adobe}");
          break;
        case "Web3":
          orConditions.push("domain_tags.ov.{web3,blockchain,crypto}");
          break;
        case "Low Effort":
          orConditions.push("effort_level.ilike.low");
          break;
        case "High Stakes":
          orConditions.push("competitiveness.ilike.high");
          break;
      }
    }

    if (orConditions.length > 0) {
      // The Feed.tsx UI uses `.some()` which acts as an OR gate across all selected filters.
      query = query.or(orConditions.join(","));
    }
  }

  // Finally, apply the pagination limit/offset via .range()
  const { data, error } = await query.range(start, end);

  if (error) {
    console.error("Error fetching paginated opportunities:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ opportunities: data || [] });
}
