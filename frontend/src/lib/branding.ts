export interface BrandInfo {
  monogram: string;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export function getBrandInfo(title: string, sourceUrl?: string, type?: string): BrandInfo {
  const text = `${title} ${sourceUrl || ''} ${type || ''}`.toLowerCase();

  if (text.includes("devfolio")) {
    return {
      monogram: "DF",
      label: "Devfolio",
      badgeBg: "bg-indigo-500/10",
      badgeText: "text-indigo-400",
      badgeBorder: "border-indigo-500/20",
    };
  }
  if (text.includes("unstop")) {
    return {
      monogram: "UN",
      label: "Unstop",
      badgeBg: "bg-blue-500/10",
      badgeText: "text-blue-400",
      badgeBorder: "border-blue-500/20",
    };
  }
  if (text.includes("google") || text.includes("gsoc") || text.includes("summer of code")) {
    return {
      monogram: "GO",
      label: "Google",
      badgeBg: "bg-zinc-800",
      badgeText: "text-zinc-200",
      badgeBorder: "border-zinc-700",
    };
  }
  if (text.includes("amazon")) {
    return {
      monogram: "AZ",
      label: "Amazon",
      badgeBg: "bg-amber-500/10",
      badgeText: "text-amber-400",
      badgeBorder: "border-amber-500/20",
    };
  }
  if (text.includes("codeforces")) {
    return {
      monogram: "CF",
      label: "Codeforces",
      badgeBg: "bg-rose-500/10",
      badgeText: "text-rose-400",
      badgeBorder: "border-rose-500/20",
    };
  }
  if (text.includes("codechef")) {
    return {
      monogram: "CC",
      label: "CodeChef",
      badgeBg: "bg-amber-600/10",
      badgeText: "text-amber-500",
      badgeBorder: "border-amber-500/20",
    };
  }
  if (text.includes("hackerrank")) {
    return {
      monogram: "HR",
      label: "HackerRank",
      badgeBg: "bg-emerald-500/10",
      badgeText: "text-emerald-400",
      badgeBorder: "border-emerald-500/20",
    };
  }
  if (text.includes("github") || text.includes("open source")) {
    return {
      monogram: "GH",
      label: "GitHub",
      badgeBg: "bg-zinc-800",
      badgeText: "text-zinc-200",
      badgeBorder: "border-zinc-700",
    };
  }
  if (text.includes("microsoft")) {
    return {
      monogram: "MS",
      label: "Microsoft",
      badgeBg: "bg-sky-500/10",
      badgeText: "text-sky-400",
      badgeBorder: "border-sky-500/20",
    };
  }
  if (text.includes("mlh") || text.includes("major league")) {
    return {
      monogram: "ML",
      label: "MLH",
      badgeBg: "bg-rose-500/10",
      badgeText: "text-rose-400",
      badgeBorder: "border-rose-500/20",
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
  };
}
