async function scrapeUnstop() {
  console.log('Fetching open hackathons from Unstop API...');
  
  const records = [];
  let page = 1;
  let lastPage = 1;
  
  // We will loop through pagination just in case it grows beyond 100
  while (page <= lastPage) {
    const url = `https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&page=${page}&per_page=100&oppstatus=open`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`Unstop API failed with status: ${res.status}`);
    }
    
    const data = await res.json();
    lastPage = data.data.last_page || 1;
    
    const items = data.data.data || [];
    for (const item of items) {
      // Map directly to our structured schema
      const mappedRecord = {
        title: item.title,
        type: 'hackathon',
        // Unstop sometimes uses opportunity_config for banners, fallback to details or title
        description: extractDescription(item),
        source_url: item.seo_url,
        deadline: extractDeadline(item),
        source_of_deadline: 'Unstop API regnRequirements.end_regn_dt',
        domain_tags: extractTags(item),
        eligibility: extractEligibility(item) || { 'type': 'all' },
        effort_level: 'medium',
        competitiveness: 'medium',
        deadline_confidence: 'exact'
      };
      
      // If the API provided a deadline, we consider it valid. If not, it skips.
      if (mappedRecord.deadline) {
        records.push(mappedRecord);
      }
    }
    
    page++;
  }
  
  console.log(`Unstop API scrape complete. Mapped ${records.length} valid structured records.`);
  return records;
}

function extractDescription(item) {
  let text = item.title;
  if (item.opportunity_config?.banner_config) {
    try {
      const banner = JSON.parse(item.opportunity_config.banner_config);
      if (banner.text) text = banner.text;
    } catch (e) {
      // ignore JSON parse error
    }
  }
  
  // Append organisation if available
  if (item.organisation?.name) {
    text += ` Hosted by ${item.organisation.name}.`;
  }
  return text;
}

function extractDeadline(item) {
  if (item.regnRequirements && item.regnRequirements.end_regn_dt) {
    // API provides ISO-like strings e.g. "2026-06-11T00:00:00+05:30"
    return new Date(item.regnRequirements.end_regn_dt).toISOString();
  }
  return null;
}

function extractTags(item) {
  const tags = [];
  if (item.required_skills) {
    for (const skill of item.required_skills) {
      if (skill.skill_name) tags.push(skill.skill_name);
    }
  }
  if (item.tags) {
    for (const tag of item.tags) {
       tags.push(tag.name || tag);
    }
  }
  return [...new Set(tags)];
}

function extractEligibility(item) {
  const elig = {};
  if (item.filters) {
    const segments = item.filters.map(f => f.name);
    if (segments.length > 0) elig.segments = segments;
  }
  return Object.keys(elig).length > 0 ? elig : null;
}

module.exports = { scrapeUnstop };
