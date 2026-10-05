import { Opportunity } from "@/types";

/**
 * Normalizes an opportunity into a high-level source or ecosystem category
 * to detect clustering and monopoly.
 */
export function getOpportunityEcosystem(opp: Opportunity): string {
  const url = (opp.source_url || "").toLowerCase();
  const title = (opp.title || "").toLowerCase();
  const company = (opp.normalized_company || "").toLowerCase();
  const tags = (opp.domain_tags || []).map(t => t.toLowerCase());

  // 1. Unstop ecosystem
  if (url.includes("unstop.com") || tags.includes("unstop")) {
    return "unstop";
  }

  // 2. Y Combinator ecosystem
  if (
    url.includes("ycombinator.com") || 
    url.includes("workatastartup.com") || 
    tags.includes("y combinator") || 
    tags.includes("yc")
  ) {
    return "ycombinator";
  }

  // 3. Wellfound / AngelList ecosystem
  if (url.includes("wellfound.com") || url.includes("angel.co") || tags.includes("wellfound")) {
    return "wellfound";
  }

  // 4. Devfolio hackathons & grants
  if (url.includes("devfolio.co") || tags.includes("devfolio")) {
    return "devfolio";
  }

  // 5. Open-source fellowships (GSoC, LFX, MLH, Outreachy)
  if (
    url.includes("summerofcode") || 
    url.includes("mlh.io") || 
    url.includes("linuxfoundation") || 
    url.includes("outreachy") ||
    opp.type === "open-source" ||
    tags.includes("open source")
  ) {
    return "open_source";
  }

  // 6. Direct company fallback
  if (company && company !== "unknown") {
    return `company_${company}`;
  }

  return "general";
}

/**
 * Anti-Monopoly Feed Diversification Algorithm:
 * Re-ranks opportunities using a fair-queuing sliding window so that no single
 * platform (like Unstop) or company dominates consecutive cards in the feed.
 *
 * @param items List of ranked opportunities
 * @param maxPerWindow Maximum items from the same ecosystem within any window (default: 2)
 * @param windowSize Size of the sliding window to enforce diversity (default: 5)
 */
export function diversifyFeed(
  items: Opportunity[],
  maxPerWindow: number = 2,
  windowSize: number = 5
): Opportunity[] {
  if (!items || items.length <= maxPerWindow) {
    return items;
  }

  const result: Opportunity[] = [];
  const remaining = [...items];
  const recentEcosystems: string[] = [];

  while (remaining.length > 0) {
    let chosenIndex = -1;

    // Scan for the highest-ranked item that does not violate the frequency window
    for (let i = 0; i < remaining.length; i++) {
      const eco = getOpportunityEcosystem(remaining[i]);
      const currentWindow = recentEcosystems.slice(-windowSize);
      const occurrences = currentWindow.filter(e => e === eco).length;

      if (occurrences < maxPerWindow) {
        chosenIndex = i;
        break;
      }
    }

    // If all remaining items would violate the window (e.g. at the tail of the list
    // where only one platform remains), gracefully pop the next best item
    if (chosenIndex === -1) {
      chosenIndex = 0;
    }

    const [chosen] = remaining.splice(chosenIndex, 1);
    result.push(chosen);
    recentEcosystems.push(getOpportunityEcosystem(chosen));
  }

  return result;
}
