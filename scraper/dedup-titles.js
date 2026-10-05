require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

/**
 * Normalizes title for deduplication comparison:
 * - lowercase, trim
 * - strip leading company name if separated by hyphen/colon/pipe: "Google - Software Engineer" -> "software engineer"
 * - normalize punctuation and extra spaces
 */
function cleanTitle(title) {
  if (!title) return '';
  let cleaned = title.toLowerCase().trim();

  // Strip common prefix delimiters like "Company - Job" or "Company | Job" or "Company: Job"
  const delimiterMatch = cleaned.match(/^([a-z0-9\s&.]+)\s*[-:|–—]\s*(.+)$/);
  if (delimiterMatch) {
    // If the right-hand part has at least 3 characters, take it as the core title
    if (delimiterMatch[2].length >= 3) {
      cleaned = delimiterMatch[2].trim();
    }
  }

  // Remove non-alphanumeric except spaces
  return cleaned
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes company for deduplication comparison
 */
function cleanCompany(company, title) {
  if (company && typeof company === 'string') {
    return company.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }
  if (!title) return '';
  const delimiterMatch = title.toLowerCase().match(/^([a-z0-9\s&.]+)\s*[-:|–—]\s*(.+)$/);
  if (delimiterMatch) {
    return delimiterMatch[1].replace(/[^\w\s]/g, '').trim();
  }
  return '';
}

/**
 * Extracts location partition so different office locations (e.g. Bangalore vs Hyderabad)
 * are NEVER collapsed into duplicates.
 */
function extractLocationPartition(record) {
  const locString = typeof record.eligibility?.location === 'string' ? record.eligibility.location : '';
  const text = `${record.title || ''} ${locString}`.toLowerCase();
  const cities = ['bangalore', 'bengaluru', 'hyderabad', 'pune', 'gurgaon', 'gurugram', 'noida', 'mumbai', 'delhi', 'chennai', 'kolkata', 'remote'];
  for (const city of cities) {
    if (text.includes(city)) return city.replace('bengaluru', 'bangalore').replace('gurugram', 'gurgaon');
  }
  return 'any';
}

/**
 * Extracts cohort or seasonal batch (e.g. Summer 2025 vs Summer 2026)
 */
function extractSeasonPartition(record) {
  const text = `${record.title || ''} ${record.description || ''}`.toLowerCase();
  const seasons = ['summer 2025', 'summer 2026', 'fall 2025', 'fall 2026', 'winter 2025', 'winter 2026', 'spring 2025', 'spring 2026', 'batch 2025', 'batch 2026'];
  for (const s of seasons) {
    if (text.includes(s)) return s;
  }
  return 'any';
}

/**
 * Extracts distinct engineering specializations (Backend != Frontend != Mobile)
 */
function extractSpecialization(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('frontend') || t.includes('front end') || t.includes('ui/ux') || t.includes('web developer')) return 'frontend';
  if (t.includes('backend') || t.includes('back end') || t.includes('api')) return 'backend';
  if (t.includes('fullstack') || t.includes('full stack')) return 'fullstack';
  if (t.includes('data science') || t.includes('machine learning') || t.includes('ai') || t.includes('ml')) return 'ai_ml';
  if (t.includes('devops') || t.includes('sre') || t.includes('cloud')) return 'devops';
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'mobile';
  if (t.includes('cybersecurity') || t.includes('security')) return 'security';
  return 'general';
}

/**
 * Computes a quality score for an opportunity record:
 * - Higher confidence deadlines score higher
 * - Actual deadline presence adds points
 * - Description length adds points
 * - Domain tags add points
 */
function getRecordScore(record) {
  let score = 0;
  if (record.deadline_confidence === 'exact') score += 100;
  else if (record.deadline_confidence === 'computed_from_countdown') score += 75;
  else if (record.deadline_confidence === 'unknown') score += 25;

  if (record.deadline) score += 50;
  if (record.description && record.description.length > 80) score += 20;
  if (record.domain_tags && record.domain_tags.length > 0) score += 10;
  if (record.source_url && !record.source_url.includes('discord.com')) score += 15; // Prefer direct website over discord

  // Tie-breaker: creation timestamp
  const ts = new Date(record.created_at || 0).getTime() / 1e12;
  score += ts;

  return score;
}

async function runSemanticDeduplication(dryRun = true) {
  console.log(`=== RUNNING SEMANTIC TITLE DEDUPLICATION (${dryRun ? 'DRY RUN' : 'LIVE DEACTIVATION'}) ===`);

  let records = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, type, normalized_company, deadline, deadline_confidence, description, domain_tags, source_url, created_at, eligibility')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Failed to fetch active opportunities:', error);
      return;
    }
    if (!data || data.length === 0) break;
    records.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Fetched ${records.length} active opportunities.`);

  // Grouping map: key -> records[]
  const groups = new Map();

  for (const record of records) {
    const normTitle = cleanTitle(record.title);
    const normCompany = cleanCompany(record.normalized_company, record.title);
    const locPart = extractLocationPartition(record);
    const seasonPart = extractSeasonPartition(record);
    const specPart = extractSpecialization(record.title);

    // If hackathon or competition, group primarily by cleaned title + season
    // If job/internship, partition by company + title + specialization + location + season
    let key;
    if (record.type === 'hackathon' || record.type === 'competition' || record.type === 'open-source program') {
      key = `hackathon:::${normTitle}:::${seasonPart}`;
    } else {
      key = normCompany 
        ? `job:::${normCompany}:::${normTitle}:::${specPart}:::${locPart}:::${seasonPart}` 
        : `generic_job:::${normTitle}:::${specPart}:::${locPart}`;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(record);
  }

  let duplicateGroupsCount = 0;
  let totalDeactivations = 0;
  const toDeactivateIds = [];
  const sampleDeactivations = [];

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      duplicateGroupsCount++;

      // Sort by score descending - first record is the one to KEEP
      group.sort((a, b) => getRecordScore(b) - getRecordScore(a));

      const winner = group[0];
      const losers = group.slice(1);

      totalDeactivations += losers.length;
      losers.forEach(l => toDeactivateIds.push(l.id));

      if (sampleDeactivations.length < 10) {
        sampleDeactivations.push({
          key,
          totalCopies: group.length,
          keptTitle: winner.title,
          keptConfidence: winner.deadline_confidence,
          keptDeadline: winner.deadline,
          discardedCount: losers.length
        });
      }
    }
  }

  console.log(`\nFound ${duplicateGroupsCount} duplicate groups containing ${totalDeactivations} duplicate records.`);
  console.log('\n--- SAMPLE DEDUPLICATION ACTIONS ---');
  console.table(sampleDeactivations);

  if (!dryRun && toDeactivateIds.length > 0) {
    console.log(`\nDeactivating ${toDeactivateIds.length} duplicate records in Supabase...`);
    // Batch updates in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < toDeactivateIds.length; i += chunkSize) {
      const chunk = toDeactivateIds.slice(i, i + chunkSize);
      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ is_active: false })
        .in('id', chunk);

      if (updateError) {
        console.error(`Batch update error (${i}-${i + chunk.length}):`, updateError.message);
      }
    }
    console.log('Semantic deduplication deactivation complete!');
  }

  return { duplicateGroupsCount, totalDeactivations, toDeactivateIds };
}

if (require.main === module) {
  const isLive = process.argv.includes('--live');
  runSemanticDeduplication(!isLive);
}

module.exports = { runSemanticDeduplication, cleanTitle, cleanCompany, getRecordScore };
