const STATIC_OPPORTUNITIES = [
  {
    title: "Google Summer of Code (GSoC)",
    type: "open-source program",
    description: "A global, online program focused on bringing new contributors into open source software development.",
    source_url: "https://summerofcode.withgoogle.com/",
    deadline: "2026-04-02T18:00:00Z", // Estimated placeholder
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "mentorship", "development"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "medium",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  },
  {
    title: "MLH Fellowship",
    type: "fellowship",
    description: "A 12-week internship alternative for aspiring technologists. Contribute to open source projects used by companies around the world.",
    source_url: "https://fellowship.mlh.io/",
    deadline: "2026-05-15T23:59:59Z", // Estimated placeholder
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "software engineering", "web3"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  },
  {
    title: "LFX Mentorship",
    type: "open-source program",
    description: "Linux Foundation Mentorship Program. Contribute to open source projects like Kubernetes, Hyperledger, etc.",
    source_url: "https://lfx.linuxfoundation.org/tools/mentorship/",
    deadline: "2026-05-30T23:59:59Z", // Estimated placeholder
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "linux", "cloud native"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  },
  {
    title: "Outreachy",
    type: "internship",
    description: "Outreachy provides internships in open source and open science. Outreachy provides internships to people subject to systemic bias and impacted by underrepresentation in the technical industry.",
    source_url: "https://www.outreachy.org/",
    deadline: "2026-08-30T23:59:59Z", // Estimated placeholder
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "diversity", "internship"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  },
  {
    title: "Hacktoberfest",
    type: "open-source program",
    description: "Month-long celebration of open source projects, their maintainers, and the entire community of contributors.",
    source_url: "https://hacktoberfest.com/",
    deadline: "2026-10-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "hackathon"],
    eligibility: { "segments": ["all"] },
    effort_level: "medium",
    competitiveness: "low",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  },
  {
    title: "GirlScript Summer of Code (GSSoC)",
    type: "open-source program",
    description: "A month-long open source program by GirlScript Foundation.",
    source_url: "https://gssoc.girlscript.tech/",
    deadline: "2026-05-10T23:59:59Z", // Estimated placeholder
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "mentorship"],
    eligibility: { "segments": ["all"] },
    effort_level: "medium",
    competitiveness: "medium",
    deadline_confidence: "exact",
    manually_verified_date: new Date().toISOString()
  }
];

async function getStaticOpportunities() {
  console.log('Loading static evergreen opportunities...');
  
  const now = new Date();
  
  STATIC_OPPORTUNITIES.forEach(opp => {
    const verifiedDate = new Date(opp.manually_verified_date);
    const daysSinceVerification = (now - verifiedDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceVerification > 30) {
      console.warn(`\n⚠️ WARNING: Static entry "${opp.title}" has a manually_verified_date older than 30 days (${Math.floor(daysSinceVerification)} days). Manual re-verification required!`);
    }
  });

  return STATIC_OPPORTUNITIES;
}

module.exports = { getStaticOpportunities };
