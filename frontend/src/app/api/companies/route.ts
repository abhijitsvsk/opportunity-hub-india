import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { extractCompanyName } from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("normalized_company, title, source_url, type, domain_tags")
    .eq("is_active", true)
    .limit(2500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  let ycCount = 0;
  let wellfoundCount = 0;

  for (const op of data || []) {
    const isYc = (op.source_url && (op.source_url.includes('workatastartup.com') || op.source_url.includes('ycombinator.com'))) ||
                 (op.domain_tags && op.domain_tags.some((t: string) => /^(yc|y combinator|ycombinator|work at a startup)$/i.test(t.trim())));
    if (isYc) ycCount++;

    const isWf = (op.source_url && (op.source_url.includes('wellfound.com') || op.source_url.includes('angel.co'))) ||
                 (op.domain_tags && op.domain_tags.some((t: string) => /^(wellfound|angellist)$/i.test(t.trim())));
    if (isWf) wellfoundCount++;

    const comp = extractCompanyName(op);
    if (comp && comp !== "Other" && comp !== "Opportunity") {
      counts.set(comp, (counts.get(comp) || 0) + 1);
    }
  }

  // Set aggregated ecosystem counts
  if (ycCount > 0) {
    counts.set("Y Combinator", ycCount);
  }
  if (wellfoundCount > 0) {
    counts.set("Wellfound", wellfoundCount);
  }

  const companies = Array.from(counts.entries()).sort((a, b) => {
    // Keep Y Combinator and Wellfound near the top of the directory
    if (a[0] === "Y Combinator") return -1;
    if (b[0] === "Y Combinator") return 1;
    if (a[0] === "Wellfound") return -1;
    if (b[0] === "Wellfound") return 1;
    return b[1] - a[1];
  });

  return NextResponse.json(
    {
      totalActiveOpportunities: (data || []).length,
      totalCompanies: companies.length,
      companies,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
