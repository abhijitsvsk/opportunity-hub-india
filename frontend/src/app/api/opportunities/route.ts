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
          orConditions.push("type.ilike.%hackathon%");
          break;
        case "Internships":
          orConditions.push("type.ilike.%intern%");
          break;
        case "Competitions":
          orConditions.push("type.ilike.%competition%");
          break;
        case "Fellowships":
          orConditions.push("type.ilike.%fellowship%");
          break;
        case "Open Source":
          orConditions.push("type.ilike.%open%");
          break;
        case "Full-time":
          orConditions.push("type.ilike.%full-time%");
          break;
        case "AI & ML":
          orConditions.push("domain_tags.ov.{AI,ML,AI/ML,\"Artificial Intelligence\",\"Machine Learning\",NLP,\"Deep Learning\",ai,ml,\"machine learning\",\"artificial intelligence\",nlp,\"deep learning\",data,\"Data Science\"}");
          break;
        case "Cybersecurity":
          orConditions.push("domain_tags.ov.{Cybersecurity,cybersecurity,\"Cyber Security\",\"cyber security\",Security,security,Hacking,hacking,Forensics,forensics,Vulnerability,vulnerability}");
          break;
        case "Design":
          orConditions.push("domain_tags.ov.{Design,design,UI/UX,UI,UX,ui/ux,ui,ux,\"Graphic Design\",\"graphic design\",Visual,visual,Figma,figma}");
          break;
        case "Web3":
          orConditions.push("domain_tags.ov.{Web3,web3,Blockchain,blockchain,Crypto,crypto,Solidity,solidity}");
          break;
        case "Low Effort":
          orConditions.push("effort_level.ilike.%low%");
          break;
        case "High Stakes":
          orConditions.push("competitiveness.ilike.%high%");
          break;
      }
    }

    if (orConditions.length > 0) {
      // The Feed.tsx UI uses `.some()` which acts as an OR gate across all selected filters.
      query = query.or(orConditions.join(","));
    }
  }

  const searchParam = searchParams.get("search");
  if (searchParam && searchParam.trim()) {
    const rawQ = searchParam.trim();
    const cleanQ = rawQ.toLowerCase().replace(/[\s\-_]/g, '');

    const terms = new Set<string>([rawQ]);
    let tagOv: string[] = [];

    if (cleanQ === 'yc' || cleanQ === 'ycombinator' || cleanQ === 'ycombinations' || cleanQ === 'workatastartup') {
      terms.add('Y Combinator');
      terms.add('YC');
      terms.add('ycombinator');
      terms.add('workatastartup');
      tagOv.push('"Y Combinator"', 'YC', 'ycombinator', '"Work at a Startup"');
    } else if (cleanQ === 'wellfound' || cleanQ === 'angel' || cleanQ === 'angellist') {
      terms.add('Wellfound');
      terms.add('angel.co');
      terms.add('angellist');
      tagOv.push('Wellfound', 'AngelList', 'wellfound');
    }

    const orParts: string[] = [];
    for (const term of terms) {
      if (term.length <= 2) {
        // Guard short <= 2 char queries from matching inside words in descriptions (e.g. "lifecycle")
        orParts.push(`title.ilike.% ${term} %`);
        orParts.push(`title.ilike.${term} %`);
        orParts.push(`title.ilike.% ${term}`);
        orParts.push(`normalized_company.ilike.%${term}%`);
        orParts.push(`source_url.ilike.%${term}%`);
      } else {
        orParts.push(`title.ilike.%${term}%`);
        orParts.push(`description.ilike.%${term}%`);
        orParts.push(`normalized_company.ilike.%${term}%`);
        orParts.push(`source_url.ilike.%${term}%`);
      }
    }

    if (tagOv.length > 0) {
      orParts.push(`domain_tags.ov.{${tagOv.join(',')}}`);
    } else if (rawQ.length >= 2) {
      orParts.push(`domain_tags.ov.{"${rawQ}"}`);
    }

    const { data: searchData, error: searchErr } = await supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true)
      .or(orParts.join(','))
      .order('created_at', { ascending: false })
      .range(start, end);

    if (searchErr) {
      console.error("Search API error:", searchErr);
      return NextResponse.json({ error: searchErr.message }, { status: 500 });
    }
    return NextResponse.json({ opportunities: searchData || [] });
  }

  const companyParam = searchParams.get("company");
  if (companyParam && companyParam !== "All") {
    const isYc = /y\s*combinator|\byc\b/i.test(companyParam);
    const isWellfound = /wellfound|\bangel\b/i.test(companyParam);

    let compQuery = supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true);

    if (isYc) {
      compQuery = compQuery.or('domain_tags.ov.{"Y Combinator",YC,ycombinator,"Work at a Startup"},source_url.ilike.%workatastartup%,source_url.ilike.%ycombinator.com%');
    } else if (isWellfound) {
      compQuery = compQuery.or('domain_tags.ov.{Wellfound,AngelList,wellfound},source_url.ilike.%wellfound%');
    } else {
      compQuery = compQuery.or(`normalized_company.ilike.%${companyParam}%,title.ilike.%${companyParam}%`);
    }

    const { data: compData, error: compErr } = await compQuery
      .order('created_at', { ascending: false })
      .range(start, end);

    if (compErr) {
      return NextResponse.json({ error: compErr.message }, { status: 500 });
    }
    return NextResponse.json({ opportunities: compData || [] });
  }

  // Finally, apply the pagination limit/offset via .range()
  const { data, error } = await query.range(start, end);

  if (error) {
    console.error("Error fetching paginated opportunities:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let opportunities = data || [];
  if (opportunities.length > 0) {
    const oppIds = opportunities.map((o: any) => o.id);
    const { data: extras } = await supabase
      .from('opportunities')
      .select('id, normalized_company, location')
      .in('id', oppIds);

    if (extras && extras.length > 0) {
      const extrasMap = new Map(extras.map((e: any) => [e.id, e]));
      opportunities = opportunities.map((o: any) => {
        const extra = extrasMap.get(o.id);
        return {
          ...o,
          normalized_company: extra?.normalized_company || o.normalized_company,
          location: extra?.location || o.location,
        };
      });
    }
  }

  return NextResponse.json({ opportunities });
}
