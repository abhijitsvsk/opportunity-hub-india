# Workflow — Build MVP (Phase 1)

## Goal
Build a working web application where a student can sign up, complete a profile,
see a personalized and ranked list of opportunities, save opportunities they like,
track application status, and receive deadline reminders by email, powered by an
automated data pipeline.

## Step 1 — Supabase setup (COMPLETE)
- Create a new Supabase project.
- Create the following tables:
  - profiles: id, user_id, year, domain_interests, skills, college_tier, location_preference, created_at
  - opportunities: id, title, type, description, source_url (UNIQUE), deadline, eligibility, domain_tags,
    effort_level, competitiveness, is_active, created_at
  - saved_opportunities: id, user_id, opportunity_id, status, saved_at
    (status values: saved, applied, rejected, accepted)
- Enable row-level security on all tables.
- Set up Supabase Auth with email and Google OAuth.

## Step 2 — Automated Data Pipeline
Build the scraping and structuring pipeline before the frontend.
Data is the core value of the product; the UI is useless without it.

### Runtime: GitHub Actions
All scraping runs on GitHub Actions (Ubuntu Linux with Playwright and Chromium).
Supabase Edge Functions cannot run Playwright due to memory and timeout limits.
GitHub Actions provides real Linux, native Playwright support, free tier cron scheduling,
and built-in secrets management.

### Scraping Engine: Playwright
All target sites (Devfolio, Unstop) are React SPAs that render listings via JavaScript.
Static HTML parsers like Cheerio will return empty divs. Playwright is the only viable tool.

### AI Structuring: Gemini Free Tier
Raw scraped text is piped to Gemini with a strict JSON schema prompt.
Rate limit: 15 RPM, 1500 RPD. Pipeline processes records sequentially with 4-second delays.
Every Gemini response is validated before database write. Missing or malformed records are logged and skipped.

### Database Writes: Supabase Service Role Key
Upserts use ON CONFLICT (source_url) to deduplicate.
Service role key is stored as a GitHub Actions secret, never hardcoded.

### Build order (sequential, each verified before the next):
1. Devfolio DOM reconnaissance — screenshot and HTML dump to identify real selectors.
2. Devfolio scraper — Playwright script using verified selectors.
3. Gemini structuring layer — strict JSON extraction with validation.
4. Supabase upsert — tested with 5 records before full run.
5. GitHub Actions workflow — .github/workflows/scrape.yml with daily cron.
6. Unstop scraper — replicate pattern after Devfolio is verified in production.
7. Discord integration — only after admin access to target servers is confirmed.

## Step 3 — Onboarding flow
- After signup, route new users to an onboarding screen.
- Collect: current year, domain interests (multi-select), top 3 skills, college tier,
  and location preference (remote only, India only, open to abroad).
- Save to profiles table.
- Onboarding must be completable in under 2 minutes.
- Do not show the feed until onboarding is complete.

## Step 4 — Opportunity feed
- Fetch active opportunities from the database.
- Filter by eligibility against user profile.
- Rank results using this priority order:
  1. Profile match score (domain tags overlap with user interests)
  2. Deadline proximity (closer deadlines rank higher)
  3. Effort level (lower effort ranks higher when match scores are equal)
- Display each listing as a card with: title, type badge, deadline, effort level,
  competitiveness indicator, and a save button.
- Show empty state if no matches found with a prompt to update profile.

## Step 5 — Save and track
- Save button on each card writes to saved_opportunities table.
- Saved tab shows all saved opportunities with a status dropdown:
  saved, applied, rejected, accepted.
- Allow unsaving. Removed listings go to an archived state, not hard deleted.

## Step 6 — Deadline reminders
- Use Supabase Edge Functions (via pg_cron) to run a daily check.
- For every saved opportunity with a deadline in 3 days, send one reminder email
  to the user using Supabase's built-in email or a free tier of Resend.
- Email contains: opportunity title, deadline date, and a direct link to the source URL.
- Do not send more than one reminder per opportunity per user.

## Definition of done for MVP
- A new user can sign up, complete onboarding, see a personalized feed,
  save an opportunity, and receive a reminder email before the deadline.
- The automated pipeline runs daily via GitHub Actions, extracting and upserting
  verified opportunities from Devfolio and Unstop without manual intervention.
- All of the above works on mobile browser without breaking.
