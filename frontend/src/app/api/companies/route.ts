import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { extractCompanyName } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("normalized_company, title, source_url, type")
    .eq("is_active", true)
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();

  for (const op of data || []) {
    const comp = extractCompanyName(op);
    if (comp && comp !== "Other" && comp !== "Opportunity") {
      counts.set(comp, (counts.get(comp) || 0) + 1);
    }
  }

  const companies = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return NextResponse.json(
    {
      totalActiveOpportunities: (data || []).length,
      totalCompanies: companies.length,
      companies,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
