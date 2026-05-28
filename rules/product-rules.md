# Product Rules — Non-negotiables

## Data quality
- Every listing must be manually verified before entering the database.
- No opportunity is added without a confirmed deadline date.
- Every listing must have: title, source URL, deadline, eligibility criteria,
  domain tags, effort level estimate, and competitiveness rating.
- Listings past their deadline must be marked inactive within 24 hours.
- No duplicate listings. If the same opportunity appears on multiple sources,
  one canonical entry is created with all source URLs noted.
- No fake, spam, or MLM-adjacent listings ever. When in doubt, exclude.

## Personalization rules
- Never show an opportunity to a student who is clearly ineligible based on
  their year, degree, or location preference.
- Ranking must factor in: profile match, deadline proximity, and effort required.
- Do not rank by recency alone. A deadline closing in 3 days ranks above
  a new listing closing in 60 days, all else being equal.

## Product tone and UX
- No dark patterns. No fake urgency beyond real deadline proximity.
- No email spam. Reminders are sent only for opportunities the student saved.
- The interface must be fast and simple. Students should find what they need
  in under 60 seconds. No onboarding walls before showing value.

## Development constraints
- No paid APIs in MVP. Use only free tiers.
- Supabase for all data persistence. No other database.
- Vercel for all hosting. No other deployment target.
- Build phase 1 fully before starting phase 2. No scope creep during MVP.

## Code quality
- Every database table must have row-level security enabled in Supabase.
- No hardcoded secrets. All keys go in environment variables.
- Every new feature needs a corresponding UI state for loading, empty, and error.
