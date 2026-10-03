export interface BrandInfo {
  monogram: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  logoUrl?: string | null;
}

export function getCompanyFaviconUrl(sourceUrl?: string): string | null {
  if (!sourceUrl || typeof sourceUrl !== 'string') return null;
  try {
    const parsed = new URL(sourceUrl);
    // Ignore discord or link shorteners
    if (parsed.hostname.includes('discord.com') || parsed.hostname.includes('t.me') || parsed.hostname.includes('bit.ly')) {
      return null;
    }
    let host = parsed.hostname;
    // Strip common subdomains for clean company logo resolution
    const parts = host.split('.');
    if (parts.length >= 3 && ['jobs', 'careers', 'boards', 'apply', 'app', 'wd3', 'wd5'].includes(parts[0])) {
      host = parts.slice(1).join('.');
    }
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}

export function getBrandInfo(title: string, sourceUrl?: string, type?: string): BrandInfo {
  const text = `${title} ${sourceUrl || ''} ${type || ''}`.toLowerCase();
  const logoUrl = getCompanyFaviconUrl(sourceUrl);

  if (text.includes("devfolio")) {
    return {
      monogram: "DF",
      label: "Devfolio",
      badgeBg: "bg-indigo-500/10",
      badgeText: "text-indigo-400",
      badgeBorder: "border-indigo-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=devfolio.co&sz=128"
    };
  }
  if (text.includes("unstop")) {
    return {
      monogram: "UN",
      label: "Unstop",
      badgeBg: "bg-blue-500/10",
      badgeText: "text-blue-400",
      badgeBorder: "border-blue-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=unstop.com&sz=128"
    };
  }
  if (text.includes("google") || text.includes("gsoc") || text.includes("summer of code")) {
    return {
      monogram: "GO",
      label: "Google",
      badgeBg: "bg-zinc-800",
      badgeText: "text-zinc-200",
      badgeBorder: "border-zinc-700",
      logoUrl: "https://www.google.com/s2/favicons?domain=google.com&sz=128"
    };
  }
  if (text.includes("amazon")) {
    return {
      monogram: "AZ",
      label: "Amazon",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      badgeBorder: "border-amber-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=amazon.com&sz=128"
    };
  }
  if (text.includes("nvidia")) {
    return {
      monogram: "NV",
      label: "Nvidia",
      badgeBg: "bg-emerald-500/10",
      badgeText: "text-emerald-400",
      badgeBorder: "border-emerald-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=nvidia.com&sz=128"
    };
  }
  if (text.includes("salesforce")) {
    return {
      monogram: "SF",
      label: "Salesforce",
      badgeBg: "bg-sky-500/10",
      badgeText: "text-sky-400",
      badgeBorder: "border-sky-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=salesforce.com&sz=128"
    };
  }
  if (text.includes("apple")) {
    return {
      monogram: "AP",
      label: "Apple",
      badgeBg: "bg-zinc-800",
      badgeText: "text-zinc-200",
      badgeBorder: "border-zinc-700",
      logoUrl: "https://www.google.com/s2/favicons?domain=apple.com&sz=128"
    };
  }
  if (text.includes("codeforces")) {
    return {
      monogram: "CF",
      label: "Codeforces",
      badgeBg: "bg-rose-500/10",
      badgeText: "text-rose-400",
      badgeBorder: "border-rose-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=codeforces.com&sz=128"
    };
  }
  if (text.includes("codechef")) {
    return {
      monogram: "CC",
      label: "CodeChef",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      badgeBorder: "border-amber-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=codechef.com&sz=128"
    };
  }
  if (text.includes("microsoft")) {
    return {
      monogram: "MS",
      label: "Microsoft",
      badgeBg: "bg-sky-500/10",
      badgeText: "text-sky-400",
      badgeBorder: "border-sky-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128"
    };
  }
  if (text.includes("mlh") || text.includes("major league")) {
    return {
      monogram: "ML",
      label: "MLH",
      badgeBg: "bg-rose-500/10",
      badgeText: "text-rose-400",
      badgeBorder: "border-rose-500/20",
      logoUrl: "https://www.google.com/s2/favicons?domain=mlh.io&sz=128"
    };
  }

  // Fallback to type or initials of title
  const words = title.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 
    ? `${words[0][0]}${words[1][0]}`.toUpperCase() 
    : (words[0] ? words[0].slice(0, 2).toUpperCase() : "OP");

  return {
    monogram: initials,
    label: (type || "Opportunity").toUpperCase(),
    badgeBg: "bg-zinc-900",
    badgeText: "text-zinc-300",
    badgeBorder: "border-zinc-800",
    logoUrl
  };
}
