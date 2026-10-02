# Project Context

## What This Is

**OpportunityHub India** — an intelligent, personalized tech opportunity aggregator tailored for Indian CS students and early-career developers. Aggregates hackathons, internships, full-time jobs, competitive programming contests, fellowships, scholarships, and open-source programs from 10+ platforms into a unified feed.

**Target users**: Indian computer science students and early-career software engineers.

## Main Technologies

| Component | Stack |
|---|---|
| Frontend | Next.js 16 (App Router, React 19, Server Actions), TypeScript 5, Tailwind CSS 4 |
| UI & Aesthetic | Obsidian & Zinc dark design tokens (`bg-white text-black` CTAs, zero green), macOS-style floating Dock (`dock-two.tsx`), WebGL shader mascot |
| Database & Backend | Supabase (PostgreSQL, `pg_cron`, `pg_net`, Supabase Vault, SSR Auth with PKCE/OAuth, RLS) |
| Personalization | PostgreSQL Stored Procedure `get_ranked_opportunities(p_user_id)` |
| Scraper Engine | Node.js, Playwright (Chromium with media blocking), Cheerio, Axios |
| AI Structuring | Groq (`openai/gpt-oss-20b`) active; Google Gemini secondary (circuit-breaker disabled) |
| Reminders & Alerts | Supabase Edge Function (`send-reminders` via Resend API) + Discord webhooks (digests & errors) |
| CI/CD & Automation | GitHub Actions (Daily 00:00 UTC scrape cron + keepalive workflows), Vercel |

## Repository Structure

```
/
├── frontend/          # Next.js web application
│   ├── src/app/       # App Router (dashboard, login, admin, onboarding, profile, api/opportunities)
│   ├── src/components/  # React components (Feed, OpportunityCard/Row/GridCard, dock-two, ui/)
│   ├── src/lib/       # Core utilities (opportunities.ts match engine, branding.ts, utils.ts)
│   ├── src/types/     # TypeScript interfaces (Opportunity, UserSavedStatus)
│   └── src/utils/supabase/  # Supabase SSR client setup (client, server, middleware)
├── scraper/           # Data collection pipeline
│   ├── pipeline.js    # 4-wave parallel/sequential orchestrator
│   ├── devfolio.js    # Playwright scraper (infinite scroll + deep inspection)
│   ├── unstop.js      # REST API scraper (hackathons, internships, jobs, fellowships)
│   ├── codechef.js, codeforces.js, hackerrank-contests.js, kaggle.js  # Contest APIs
│   ├── github-internships.js, github-new-grad.js  # GitHub markdown table parsers
│   ├── discord.js     # Discord channel message scraper (Gateway bot)
│   ├── static.js      # Curated evergreen programs (GSoC, MLH, LFX, Outreachy, etc.)
│   ├── structurer.js  # LLM data normalization (Groq/Gemini with batching & budgets)
│   ├── upserter.js    # Supabase deduplicated upsert (normalized_title/company)
│   ├── notifier.js    # Discord webhook notifications
│   └── utils/         # Helpers (geo-filter.js India relevance filter)
├── supabase/          # Database configuration
│   ├── functions/send-reminders/  # Deno Edge Function for email digests via Resend
│   └── migrations/    # 00_setup through 09_deduplicate SQL migrations
├── .github/workflows/ # Automation workflows
│   ├── scrape.yml             # Daily scraper run (00:00 UTC)
│   ├── keepalive-supabase.yml # Every 4 days REST check
│   └── keepalive-workflow.yml # Bi-monthly commit to keep Actions alive
├── rules/             # Product rules & constraints
├── PRD.md             # Product requirements document
└── IMPLEMENTATION_GUIDE.md  # Setup & reference guide
```

## Core Data Models & Supabase Schema

### Tables
- `opportunities`: Master listings. `id` (UUID), `title`, `type`, `description`, `source_url` (UNIQUE), `deadline`, `deadline_confidence`, `location`, `domain_tags` (JSONB), `eligibility` (JSONB), `effort_level`, `competitiveness`, `normalized_title`, `normalized_company`, `is_active`, `created_at`, `updated_at`.
- `user_profiles`: `user_id` (PK -> `auth.users`), `full_name`, `college_tier`, `current_year`, `graduation_year`, `location_preference`, `focus_area`, `tech_stack` (text[]), `gender`, `experience_level`.
- `user_saved_opportunities`: `user_id`, `opportunity_id`, `status` ('to_apply', 'applied', 'accepted', 'rejected', 'archived'), `updated_at`.
- `pending_processing`: LLM overflow backlog when rate budget is exhausted (`source`, `raw_data` JSONB).
- `scraper_state`: Persistent cursor storage (`discord_last_message_id`).
- `pipeline_runs`: Telemetry logs per scraper run.

### Key Database RPCs
- `get_ranked_opportunities(p_user_id)`: Calculates relevance (+10 tech stack overlap, +15 focus area, +5 tier bonus, +10 deadline in 0-7 days), strictly enforces `auth.uid() = p_user_id` and student year eligibility.
- `deduplicate_opportunities()`: Partitions by `(normalized_title, normalized_company)` and soft-deactivates duplicates (`is_active = false`).

## Data Sources (10 sources)

| Source | Method | Category |
|---|---|---|
| Devfolio | Playwright (headless browser + deep scrape) | Hackathons |
| Unstop | REST API (`/api/public/opportunity/search-result`) | Hackathons, Internships, Jobs, Fellowships |
| CodeChef | REST API (`api/list/contests/all`) | Contests |
| Codeforces | REST API (`api/contest.list`) | Contests |
| HackerRank | REST API (`rest/contests/upcoming`) | Contests |
| Kaggle | REST API (Basic Auth) | Competitions |
| GitHub (SimplifyJobs) | Cheerio markdown parsing | Internships |
| GitHub (SimplifyJobs) | Cheerio markdown parsing | New Grad Jobs |
| Discord | discord.js Gateway bot | Community announcements |
| Static | In-memory configuration | Evergreen programs (GSoC, MLH, LFX, Outreachy, etc.) |

## Non-Negotiable Constraints & Policies

1. **Zero Paid Services Policy**: Strict adherence to free tiers: Supabase free tier, Vercel free tier, Groq/Gemini free tier, Resend (100 free emails/day), GitHub Actions free minutes.
2. **Headless Scraper Runner**: Scrapers execute on GitHub Actions (`ubuntu-latest` with Chromium Playwright), NOT Edge Functions, due to execution timeout and memory constraints of headless browsers.
3. **Mandatory Row Level Security**: All public/user tables enforce RLS with `auth.uid()` checks. Pipeline and admin actions use `SUPABASE_SERVICE_ROLE_KEY`.
4. **Strict India Relevance**: `geo-filter.js` filters out US-only roles (state codes, security clearance, work authorization requirements) and permits only Indian hubs or verified worldwide remote.
