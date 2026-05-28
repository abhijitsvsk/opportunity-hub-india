# Product Rules — Non-negotiables

## Data quality & Automated Ingestion
- Automated scraping pipelines must respect `robots.txt` and rate limits of target sites.
- All scraped listings must be passed through an AI extraction step (e.g., Gemini) to ensure fields are structured correctly.
- No opportunity is added without a confirmed, parsed deadline date.
- Every listing must have: title, source URL, deadline, eligibility criteria, domain tags, effort level estimate, and competitiveness rating.
- Listings past their deadline must be marked inactive within 24 hours (handled via scheduled cron jobs).
- No duplicate listings. Upsert logic must use source URLs to ensure one canonical entry is created with all source URLs noted.
- AI extraction must filter out fake, spam, or MLM-adjacent listings. When in doubt, exclude or flag for manual review.

## Personalization rules
- Never show an opportunity to a student who is clearly ineligible based on their year, degree, or location preference.
- Ranking must factor in: profile match, deadline proximity, and effort required.
- Do not rank by recency alone. A deadline closing in 3 days ranks above a new listing closing in 60 days, all else being equal.

## Product tone and UX
- No dark patterns. No fake urgency beyond real deadline proximity.
- No email spam. Reminders are sent only for opportunities the student saved.
- The interface must be fast and simple. Students should find what they need in under 60 seconds. No onboarding walls before showing value.

## Development constraints
- No paid APIs in MVP. Use only free tiers (Supabase, Vercel, Gemini).
- Supabase for all data persistence and scheduled edge functions. No other database or external cron provider.
- Vercel for all frontend hosting. No other deployment target.
- Build phase 1 fully before starting phase 2. No scope creep during MVP.

## Code quality
- Every database table must have row-level security enabled in Supabase.
- No hardcoded secrets. All keys go in environment variables.
- Every new feature needs a corresponding UI state for loading, empty, and error.
