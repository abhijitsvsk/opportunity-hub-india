# Architecture

## High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│               GitHub Actions Automation Pipeline               │
│                                                                │
│  [scrape.yml] Daily 00:00 UTC (05:30 IST)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                      pipeline.js                       │    │
│  │                                                        │    │
│  │  Step 0: Auto-expire past deadlines                    │    │
│  │  Step 0: Drain pending_processing queue (up to 300)    │    │
│  │                                                        │    │
│  │  WAVE 1 (parallel): Codeforces, CodeChef,              │    │
│  │                      HackerRank, Kaggle                │    │
│  │                                                        │    │
│  │  WAVE 2 (parallel): Unstop, GitHub Internships,        │    │
│  │                      GitHub New Grad, Static           │    │
│  │                                                        │    │
│  │  WAVE 3 (sequential): Devfolio (Playwright browser)    │    │
│  │                                                        │    │
│  │  WAVE 4 (sequential): Discord (Gateway bot)            │    │
│  │                                                        │    │
│  │  Post: Cross-source deduplication                      │    │
│  │  Post: Final auto-expiry pass                          │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                           │                                    │
│                ┌──────────┴──────────┐                         │
│                │   structurer.js     │                         │
│                │ (Groq / Gemini LLM) │ ← Only for raw text     │
│                │ Batches of 5        │   (Devfolio, Discord)   │
│                │ Budget: 300 calls   │                         │
│                └──────────┬──────────┘                         │
│                           │                                    │
│                ┌──────────┴──────────┐                         │
│                │    upserter.js      │                         │
│                │ (Supabase Upsert)   │                         │
│                │ Chunks of 50        │                         │
│                └──────────┬──────────┘                         │
│                           │                                    │
│                ┌──────────┴──────────┐                         │
│                │    notifier.js      │                         │
│                │ (Discord Webhook)   │                         │
│                └─────────────────────┘                         │
└────────────────────────────┼───────────────────────────────────┘
                             │
                      ┌──────┴──────┐
                      │  Supabase   │
                      │ PostgreSQL  │
                      │ + Auth SSR  │
                      │ + Realtime  │
                      │ + RLS       │
                      └──────┬──────┘
                             │
     ┌───────────────────────┴───────────────────────┐
     │                                               │
     ▼                                               ▼
┌─────────────────────────────┐        ┌────────────────────────────┐
│   Supabase Edge Functions   │        │     Next.js 16 Frontend    │
│                             │        │          (Vercel)          │
│ • send-reminders (Deno)     │        │                            │
│ • Scheduled via pg_cron     │        │ • Obsidian Zinc dark theme │
│ • Batched digest per user   │        │ • Floating Dock Navigation │
│ • Delivered via Resend API  │        │ • Match Score Engine       │
│                             │        │ • RPC get_ranked_opps      │
└─────────────────────────────┘        └────────────────────────────┘
```

## Major Subsystems

### 1. Scraper Ingestion Engine (`scraper/`)
* **Wave 1 (Parallel Contest APIs)**: REST queries to Codeforces, CodeChef, HackerRank, Kaggle. Fast, pre-structured responses.
* **Wave 2 (Parallel Direct APIs & Lists)**: Unstop REST API, GitHub Internships/New Grad markdown tables, Static programs. Geo-filtered via `geo-filter.js`.
* **Wave 3 (Sequential Headless Browser)**: Devfolio via Playwright (Chromium). Blocks media/fonts for throughput, inspects countdown timers, sends raw text to `structurer.js`.
* **Wave 4 (Sequential Gateway Bot)**: Discord bot queries community channels incrementally using `scraper_state` cursor.
* **LLM Entity Normalization (`structurer.js`)**:
  * Active: Groq (`openai/gpt-oss-20b`).
  * Fallback: Google Gemini (circuit-breaker disabled due to free-tier 403).
  * Rate-safety: 300 calls budget per run, 4s inter-batch pause. Overflows diverted to `pending_processing`.
* **Upserter (`upserter.js`)**:
  * Generates `normalized_title` and `normalized_company`.
  * Chunks of 50 on `source_url` unique conflict. Collision fallback updates existing record.

### 2. Database & Extensions (`supabase/`)
* **Core Tables**: `opportunities`, `user_profiles`, `user_saved_opportunities`, `pending_processing`, `scraper_state`, `pipeline_runs`.
* **Database Extensions**: `pg_cron`, `pg_net`, `supabase_vault`.
* **Scheduled DB Cron (`invoke-send-reminders`)**: Runs daily at midnight UTC via `net.http_post()` to trigger `send-reminders` Edge Function using Vault credentials.
* **RPC `get_ranked_opportunities`**: Personalizes listings by scoring tech stack match (+10), focus area (+15), college tier (+5), and imminent deadlines (+10 in 0-7 days), enforcing student year limits.
* **RPC `deduplicate_opportunities`**: Deactivates duplicate records across sources using window function `ROW_NUMBER() OVER (PARTITION BY normalized_title, normalized_company)`.

### 3. Edge Function & Email Notifications (`supabase/functions/send-reminders/`)
* Runs in Deno environment on Supabase Edge Runtime.
* Identifies opportunities closing in 3 days bookmarked as `to_apply`.
* Consolidates items into a single daily email digest per user to respect Resend free tier (100 emails/day).
* Dispatches email via Resend API from `Opportunity Hub <notifications@opportunityhub.com>`.

### 4. Next.js 16 Web Application (`frontend/`)
* **Server Actions**: `src/app/actions.ts` handles Auth (email/password, GitHub/Google OAuth), Profile onboarding, and Bookmarks.
* **Design System**: Obsidian & dark Zinc palette (`#09090b` obsidian background, `#18181b` surface-high, `#f4f4f5` text, pure white `#ffffff` actions, zero green).
* **Multi-View Feed**:
  * Calm List View (`OpportunityRow.tsx`)
  * Relaxed Grid View (`OpportunityGridCard.tsx`)
  * Mobile Card Snap View (`OpportunityCard.tsx`)
  * Floating Dock navigation (`dock-two.tsx`)
* **Admin Console (`src/app/admin/`)**: Protected by server-side `ADMIN_EMAIL` check; triggers GitHub Actions scrape dispatch via API.

## Known Architectural Weaknesses & Debt

1. **Vercel Project Target Mismatch**: Root `.vercel/project.json` targets `opportunity-hub-india` while `frontend/.vercel/project.json` targets `frontend`. Root Directory in Vercel settings must be explicitly set to `frontend`.
2. **Devfolio DOM Fragility**: Scraper queries styled-component class prefix `CompactHackathonCard__StyledCard`. Any Devfolio redesign breaks parsing.
3. **Environment Validation Gap**: `scraper/validate-env.js` checks `GEMINI_API_KEY` but does not check `GROQ_API_KEY` (the active structuring engine).
4. **Oldest Record Preference in Dedup**: Cross-source deduplication preserves the oldest record (`created_at ASC`), potentially deactivating newer listings that have richer metadata.
5. **No Scraper Unit Tests**: Scraper `npm test` is a no-op placeholder.
6. **Frontend Design Doc Drift**: `frontend/DESIGN.md` contains an older POS terminal spec; the actual codebase implements the Obsidian/Zinc developer design system (`globals.css`).
