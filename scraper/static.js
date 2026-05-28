const STATIC_OPPORTUNITIES = [
  {
    title: "Google STEP Internship",
    type: "internship",
    description: "Student Training in Engineering Program (STEP) is a 12-week internship for first and second-year undergraduate students with a passion for computer science.",
    source_url: "https://buildyourfuture.withgoogle.com/programs/step",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["software engineering", "internship", "computer science"],
    eligibility: { "segments": ["1st year", "2nd year"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "unknown"
  },
  {
    title: "Google Summer of Code (GSoC)",
    type: "open-source program",
    description: "A global, online program focused on bringing new contributors into open source software development.",
    source_url: "https://summerofcode.withgoogle.com/",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "mentorship", "development"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "medium",
    deadline_confidence: "unknown"
  },
  {
    title: "Microsoft Explore Program",
    type: "internship",
    description: "A 12-week summer internship program specifically designed for first and second-year college students.",
    source_url: "https://careers.microsoft.com/v2/global/en/students",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["software engineering", "program management"],
    eligibility: { "segments": ["1st year", "2nd year"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "unknown"
  },
  {
    title: "Microsoft Learn Student Ambassadors (MLSA)",
    type: "fellowship",
    description: "A global group of on-campus ambassadors who are eager to help students and their communities, lead in their local tech circles, and develop technical and career skills for the future.",
    source_url: "https://studentambassadors.microsoft.com/",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["leadership", "community", "technology"],
    eligibility: { "segments": ["all"] },
    effort_level: "medium",
    competitiveness: "high",
    deadline_confidence: "unknown"
  },
  {
    title: "MLH Fellowship",
    type: "fellowship",
    description: "A 12-week internship alternative for aspiring technologists. Contribute to open source projects used by companies around the world.",
    source_url: "https://fellowship.mlh.io/",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "software engineering", "web3"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "unknown"
  },
  {
    title: "Outreachy",
    type: "internship",
    description: "Outreachy provides internships in open source and open science. Outreachy provides internships to people subject to systemic bias and impacted by underrepresentation in the technical industry.",
    source_url: "https://www.outreachy.org/",
    deadline: "2026-12-31T23:59:59Z",
    source_of_deadline: "Static configuration - check official site",
    domain_tags: ["open source", "diversity", "internship"],
    eligibility: { "segments": ["all"] },
    effort_level: "high",
    competitiveness: "high",
    deadline_confidence: "unknown"
  }
];

async function getStaticOpportunities() {
  console.log('Loading static evergreen opportunities...');
  return STATIC_OPPORTUNITIES;
}

module.exports = { getStaticOpportunities };
