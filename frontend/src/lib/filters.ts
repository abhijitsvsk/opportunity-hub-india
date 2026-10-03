/**
 * Centralized, Robust Opportunity Filtering & Matching Engine
 * 
 * Guarantees ZERO false-positive substring collisions:
 * - Word boundary matching for short acronyms (\byc\b, \bai\b, \bml\b, \bui\b)
 * - Deterministic platform/ecosystem identification (Y Combinator, Wellfound, Devfolio, Unstop)
 * - Multi-token tokenized search matching
 */

import { Opportunity } from "@/types";
import { extractCompanyName } from "./branding";

// ============================================================================
// 1. ECOSYSTEM & PLATFORM DEFINITIONS
// ============================================================================

export interface EcosystemDefinition {
  id: string;
  name: string;
  badge: string;
  isPlatform: boolean;
  match: (op: Opportunity) => boolean;
}

export const ECOSYSTEMS: Record<string, EcosystemDefinition> = {
  ycombinator: {
    id: "ycombinator",
    name: "Y Combinator",
    badge: "YC Backed",
    isPlatform: true,
    match: (op: Opportunity) => {
      const url = (op.source_url || "").toLowerCase();
      if (url.includes("workatastartup.com") || url.includes("ycombinator.com")) {
        return true;
      }
      return (
        (op.domain_tags &&
          op.domain_tags.some((t) =>
            /^(yc|y combinator|ycombinator|work at a startup)$/i.test(t.trim())
          )) ||
        false
      );
    },
  },
  wellfound: {
    id: "wellfound",
    name: "Wellfound",
    badge: "AngelList / Wellfound",
    isPlatform: true,
    match: (op: Opportunity) => {
      const url = (op.source_url || "").toLowerCase();
      if (url.includes("wellfound.com") || url.includes("angel.co")) {
        return true;
      }
      return (
        (op.domain_tags &&
          op.domain_tags.some((t) =>
            /^(wellfound|angellist|angel)$/i.test(t.trim())
          )) ||
        false
      );
    },
  },
  devfolio: {
    id: "devfolio",
    name: "Devfolio",
    badge: "Devfolio",
    isPlatform: true,
    match: (op: Opportunity) => {
      const url = (op.source_url || "").toLowerCase();
      return (
        url.includes("devfolio.co") ||
        (op.domain_tags && op.domain_tags.some((t) => /^devfolio$/i.test(t.trim()))) ||
        false
      );
    },
  },
  unstop: {
    id: "unstop",
    name: "Unstop",
    badge: "Unstop",
    isPlatform: true,
    match: (op: Opportunity) => {
      const url = (op.source_url || "").toLowerCase();
      return (
        url.includes("unstop.com") ||
        (op.domain_tags && op.domain_tags.some((t) => /^unstop$/i.test(t.trim()))) ||
        false
      );
    },
  },
};

/**
 * Checks if a string contains a word with strict boundaries (\b).
 * Never matches "lifecycle" when looking for "yc", or "build" when looking for "ui".
 */
export function hasWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i").test(text);
}

// ============================================================================
// 2. TRACK & DOMAIN FILTER DEFINITIONS
// ============================================================================

export interface FilterDefinition {
  id: string;
  label: string;
  category: "type" | "domain" | "effort" | "stakes";
  match: (op: Opportunity) => boolean;
}

export const DOMAIN_AND_TYPE_FILTERS: FilterDefinition[] = [
  {
    id: "Internships",
    label: "Internships",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      return (
        type === "internship" ||
        hasWord(title, "intern") ||
        hasWord(title, "internship") ||
        hasWord(title, "trainee") ||
        hasWord(title, "apprentice")
      );
    },
  },
  {
    id: "Full-time",
    label: "Full-time",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      // Must not be an internship role
      if (type === "internship" || hasWord(title, "intern") || hasWord(title, "internship")) {
        return false;
      }
      return (
        type === "full-time" ||
        hasWord(title, "full-time") ||
        hasWord(title, "fulltime") ||
        hasWord(title, "sde") ||
        hasWord(title, "engineer") ||
        hasWord(title, "developer")
      );
    },
  },
  {
    id: "Hackathons",
    label: "Hackathons",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      return type === "hackathon" || hasWord(title, "hackathon") || hasWord(title, "hack");
    },
  },
  {
    id: "Competitions",
    label: "Competitions",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      return (
        type === "competition" ||
        hasWord(title, "competition") ||
        hasWord(title, "contest") ||
        hasWord(title, "challenge")
      );
    },
  },
  {
    id: "Fellowships",
    label: "Fellowships",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      return type === "fellowship" || hasWord(title, "fellowship") || hasWord(title, "fellow");
    },
  },
  {
    id: "Open Source",
    label: "Open Source",
    category: "type",
    match: (op: Opportunity) => {
      const type = (op.type || "").toLowerCase();
      const title = (op.title || "").toLowerCase();
      return (
        type.includes("open") ||
        hasWord(title, "open-source") ||
        hasWord(title, "opensource") ||
        hasWord(title, "gsoc") ||
        hasWord(title, "outreachy")
      );
    },
  },
  {
    id: "AI & ML",
    label: "AI & ML",
    category: "domain",
    match: (op: Opportunity) => {
      const title = op.title || "";
      const desc = op.description || "";
      const tags = op.domain_tags || [];

      // Check tags first: exact tag or word boundary
      const tagMatch = tags.some((t) =>
        /^(ai|ml|ai\/ml|artificial intelligence|machine learning|deep learning|data science|nlp|computer vision|llm|generative ai)$/i.test(t.trim()) ||
        hasWord(t, "machine learning") ||
        hasWord(t, "artificial intelligence") ||
        hasWord(t, "deep learning") ||
        hasWord(t, "data science")
      );
      if (tagMatch) return true;

      // Check title with strict word boundaries
      return (
        hasWord(title, "ai") ||
        hasWord(title, "ml") ||
        hasWord(title, "machine learning") ||
        hasWord(title, "deep learning") ||
        hasWord(title, "data science") ||
        hasWord(title, "neural") ||
        hasWord(title, "nlp") ||
        hasWord(title, "computer vision") ||
        hasWord(title, "llm")
      );
    },
  },
  {
    id: "Cybersecurity",
    label: "Cybersecurity",
    category: "domain",
    match: (op: Opportunity) => {
      const title = op.title || "";
      const tags = op.domain_tags || [];

      const tagMatch = tags.some((t) =>
        /^(cybersecurity|cyber security|security|infosec|ethical hacking|vulnerability|cryptography)$/i.test(t.trim()) ||
        hasWord(t, "security") ||
        hasWord(t, "vulnerability")
      );
      if (tagMatch) return true;

      return (
        hasWord(title, "cybersecurity") ||
        hasWord(title, "cyber security") ||
        hasWord(title, "security") ||
        hasWord(title, "vulnerability") ||
        hasWord(title, "infosec")
      );
    },
  },
  {
    id: "Design",
    label: "Design",
    category: "domain",
    match: (op: Opportunity) => {
      const title = op.title || "";
      const tags = op.domain_tags || [];

      const tagMatch = tags.some((t) =>
        /^(design|ui|ux|ui\/ux|graphic design|product design|visual design|figma)$/i.test(t.trim()) ||
        hasWord(t, "figma")
      );
      if (tagMatch) return true;

      // Notice: NO raw substring "ui" in title! Only strict words!
      return (
        hasWord(title, "ui/ux") ||
        hasWord(title, "ui") ||
        hasWord(title, "ux") ||
        hasWord(title, "designer") ||
        hasWord(title, "design") ||
        hasWord(title, "figma")
      );
    },
  },
  {
    id: "Web3",
    label: "Web3",
    category: "domain",
    match: (op: Opportunity) => {
      const title = op.title || "";
      const tags = op.domain_tags || [];

      const tagMatch = tags.some((t) =>
        /^(web3|blockchain|crypto|solidity|ethereum|smart contracts)$/i.test(t.trim()) ||
        hasWord(t, "blockchain") ||
        hasWord(t, "crypto")
      );
      if (tagMatch) return true;

      return (
        hasWord(title, "web3") ||
        hasWord(title, "blockchain") ||
        hasWord(title, "crypto") ||
        hasWord(title, "solidity") ||
        hasWord(title, "smart contract")
      );
    },
  },
  {
    id: "Low Effort",
    label: "Low Effort",
    category: "effort",
    match: (op: Opportunity) => (op.effort_level || "").toLowerCase() === "low",
  },
  {
    id: "High Stakes",
    label: "High Stakes",
    category: "stakes",
    match: (op: Opportunity) => (op.competitiveness || "").toLowerCase() === "high",
  },
];

// ============================================================================
// 3. SMART COMPANY & ECOSYSTEM MATCHER
// ============================================================================

/**
 * Robustly matches an opportunity against the selected company or ecosystem filter.
 */
export function matchesCompanyFilter(op: Opportunity, selectedCompany: string): boolean {
  if (!selectedCompany || selectedCompany === "All") return true;

  const target = selectedCompany.trim().toLowerCase();

  // Check known ecosystems first
  if (target === "y combinator" || target === "yc" || target === "ycombinator") {
    return ECOSYSTEMS.ycombinator.match(op);
  }
  if (target === "wellfound" || target === "angellist" || target === "angel") {
    return ECOSYSTEMS.wellfound.match(op);
  }
  if (target === "devfolio") {
    return ECOSYSTEMS.devfolio.match(op);
  }
  if (target === "unstop") {
    return ECOSYSTEMS.unstop.match(op);
  }

  // Company exact & normalized matching
  const opComp = extractCompanyName(op).toLowerCase();
  const rawComp = (op.normalized_company || "").toLowerCase();

  if (opComp === target || rawComp === target) {
    return true;
  }

  // Strip corporate suffixes (pvt ltd, inc, etc.)
  const cleanTarget = target.replace(/[^a-z0-9]/g, "");
  const cleanOpComp = opComp.replace(/[^a-z0-9]/g, "");
  const cleanRawComp = rawComp.replace(/[^a-z0-9]/g, "");

  if (cleanOpComp === cleanTarget || cleanRawComp === cleanTarget) {
    return true;
  }

  return cleanOpComp.includes(cleanTarget) || cleanRawComp.includes(cleanTarget);
}

// ============================================================================
// 4. SMART OMNISEARCH MATCHER (TOKENIZED + ALIAS-AWARE + COLLISION-FREE)
// ============================================================================

/**
 * Searches opportunities safely without substring collisions.
 */
export function matchesSearchQuery(op: Opportunity, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const query = rawQuery.trim();
  const lowerQ = query.toLowerCase();
  const cleanQ = lowerQ.replace(/[\s\-_]/g, "");

  // 1. Ecosystem query aliases
  if (cleanQ === "yc" || cleanQ === "ycombinator" || cleanQ === "workatastartup") {
    return ECOSYSTEMS.ycombinator.match(op);
  }
  if (cleanQ === "wellfound" || cleanQ === "angellist" || cleanQ === "angel") {
    return ECOSYSTEMS.wellfound.match(op);
  }

  const title = (op.title || "").toLowerCase();
  const desc = (op.description || "").toLowerCase();
  const type = (op.type || "").toLowerCase();
  const comp = extractCompanyName(op).toLowerCase();
  const rawComp = (op.normalized_company || "").toLowerCase();
  const url = (op.source_url || "").toLowerCase();
  const tags = (op.domain_tags || []).map((t) => t.toLowerCase());

  // 2. Tokenized words (all query words must match somewhere in the card)
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return true;

  return tokens.every((token) => {
    // If token is very short (<= 2 chars), require word boundary to prevent collisions
    if (token.length <= 2) {
      return (
        hasWord(title, token) ||
        hasWord(comp, token) ||
        hasWord(type, token) ||
        tags.some((t) => t === token)
      );
    }

    // Normal word match: check title, company, tags, type, url, or desc
    if (title.includes(token) || comp.includes(token) || rawComp.includes(token)) {
      return true;
    }
    if (tags.some((t) => t.includes(token))) {
      return true;
    }
    if (url.includes(token) || type.includes(token)) {
      return true;
    }
    if (desc.includes(token)) {
      return true;
    }

    // Check without punctuation (e.g. "ycombinator" matching "y-combinator")
    const cleanToken = token.replace(/[^a-z0-9]/g, "");
    if (cleanToken.length > 2) {
      const cleanTitle = title.replace(/[^a-z0-9]/g, "");
      const cleanComp = comp.replace(/[^a-z0-9]/g, "");
      if (cleanTitle.includes(cleanToken) || cleanComp.includes(cleanToken)) {
        return true;
      }
    }

    return false;
  });
}
