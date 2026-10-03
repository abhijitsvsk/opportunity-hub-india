# Project State

**Last Updated**: 2026-10-02

## Development Phase

Active development — Core platform is built, deployed, and operational. Focus is on scraper reliability, LLM pipeline maintenance, and edge reminder verification.

## What Is Working

- **Landing Page**: 3D ContainerScroll preview, WebGL shader mascot, dynamic opportunity counters.
- **Dedicated `/profile` Settings Page**: Fully editable account settings (`/profile` & `ProfileForm.tsx`) for graduation cohort, college tier, primary focus area, and custom interactive tech stack pills, directly calibrating match scores with instant persistence.
- **Honest 3-Tier Deadline Badges**: Badges across all 3 card layouts transparently delineate verified hard cutoffs (`⏳ Ends [Date]`) from rolling applications (`⚡ Rolling · Apply ASAP`) using database `deadline_confidence`.
- **Verified-First Deadline Sorting**: "Closing Soon" feed sort prioritizes real verified closing countdowns ahead of rolling listings.
- **Graduation Batch Filter Bar**: One-click cohort switcher (`All Batches` | `2025 Full-Time` | `2026 Pre-Final Intern` | `2027/28 Early Undergrad`) with unified eligibility normalization handling all 3 database formats (`year`, `segments`, `education`).
- **Slide-Over Quick-View Drawer (`QuickViewDrawer.tsx`)**: Instant preview panel on card click featuring formatted job overview, requirements breakdown, match score analysis, direct ATS link, and keyboard accessibility (`Escape` to close).
- **1-Click Google Calendar Sync**: Embedded one-click GCal event creation with title, deadline timestamps, and official application URL.
- **Company Logo Hydration**: Automated high-res favicon and brand logo resolution via Google Favicon API in `branding.ts`, with graceful fallback to styled monograms.
- **Semantic Title Deduplication (`dedup-titles.js`)**: Post-processing pipeline deduplicator eliminates multi-source duplicate listings (e.g. 21x copies of same hackathons) by clustering normalized titles, scoring metadata quality, and keeping the single best record.
- **Smart Dead-Link Reaper Engine (`reaper.js` & `.github/workflows/reaper.yml`)**: Two-tier link health verification detecting HTTP 404/410 errors and ATS-specific closure text ("no longer accepting applications", "position has been filled") with daily automated cleanup.
- **Authentication**: Supabase SSR (Email/Password, GitHub OAuth, Google OAuth) with session refresh. Dynamic Sign-In / Sign-Up toggle (`modern-stunning-sign-in.tsx`), graceful `NEXT_REDIRECT` error filtering, client & server validation, and try/catch network timeout resilience in `actions.ts`.
- **Onboarding Flow**: 2-step profile onboarding (`user_profiles`) capturing tier, graduation year, tech stack, focus area. Redirects seamlessly upon first registration.
- **Multi-View Dashboard Feed**:
  - Calm List (`OpportunityRow.tsx`) with flexible wrapping and touch-friendly actions
  - Relaxed Grid (`OpportunityGridCard.tsx`) with responsive columns and action row
  - Mobile Card Snap (`OpportunityCard.tsx`) with dynamic viewport height, full-width mobile card, and TikTok-style overlaid action pill
  - Unified Floating Dock (`dock-two.tsx`) with navigation/view separation, active dots, profile/logout popover, and iOS safe-area insets (`env(safe-area-inset-bottom)`)
  - Compact single-bar header on mobile and desktop with unified instant search and sort controls (`Best Match | Closing Soon | Newest`)
  - Filter state, search, sort, and view mode persistence
- **Decoupled Business Logic**: `src/lib/opportunities.ts` houses `computeMatchScore` and `cleanDomainTags` independently from UI components.
- **Application Tracking**: React 19 optimistic updates for stages (`to_apply`, `applied`, `accepted`, `rejected`, `archived`).
- **Admin Portal**: Server-gated (`ADMIN_EMAIL`) manual opportunity manager and GitHub Actions scraper trigger.
- **Scraper Pipeline (13 sources)**:
  - 4-wave parallel/sequential execution (`pipeline.js`)
  - **FreeHire Live API Ingestor** (`freehire.js`): Deep 32-page high-throughput query engine querying FreeHire's open REST API across 92 ATS platforms, expanding active opportunities to 1,545+ with direct company career links.
  - **Workday Enterprise Adapter** (`workday-companies.js`): Direct CXS JSON API client pulling student and early-career tech listings for Fortune 500 MNCs (Nvidia, Adobe, Salesforce, Target) without headless browser overhead.
  - **Direct ATS Company Career Scraper** (`ats-companies.js` + `companies.json`): Scaled company registry with verified active endpoints across Greenhouse, Lever, Ashby, and SmartRecruiters (including Paytm, Meesho, CRED, InMobi, Sarvam AI, Mindtickle, Rubrik, Thoughtworks, Stripe) with stale job reconciliation.
  - **Primary LLM Structuring (NVIDIA NIM)**: `structurer.js` upgraded to use NVIDIA NIM (`meta/llama-3.2-11b-vision-instruct`) with sub-second latency, rigorous JSON validation, and intelligent date/eligibility extraction.
  - **Fallback LLM Structuring**: Seamless cascade to Groq (`openai/gpt-oss-20b`) and Gemini with 300-call budget and `pending_processing` overflow queue
  - Two-layer deduplication (`source_url` conflict + `deduplicate_opportunities()` RPC)
  - Strict India-focused filtering (`geo-filter.js`)
  - Discord webhook alerts (digests and failure logs)
  - Discord Gateway bot scraper for announcements
- **Email Reminders Edge Function**:
  - `send-reminders` Supabase Edge Function implemented
  - Scheduled daily at 00:00 UTC via `pg_cron` + `pg_net` + Supabase Vault
  - Consolidates opportunities closing in 3 days into a single digest email per user via Resend API
- **Infrastructure Automation**:
  - GitHub Actions daily scrape cron (`scrape.yml` at 00:00 UTC) with Playwright browser installation and `NVIDIA_API_KEY` injection
  - Supabase 4-day keepalive workflow (`keepalive-supabase.yml`)
  - GitHub Actions bi-monthly activity keepalive (`keepalive-workflow.yml`)
  - Vercel production deployment

## What Is Partially Working / Needs Attention

- **Devfolio Scraper**: Relies on styled-component class prefix matching in DOM; breaks if Devfolio updates frontend classes.
- **Gemini LLM Structuring**: Circuit breaker hardcoded to `true` (`isGeminiDailyExhausted = true` in `structurer.js`) due to free-tier 403 errors; structuring currently uses NVIDIA NIM as primary and Groq as secondary.
- **Environment Validation Gap**: `validate-env.js` checks for `GEMINI_API_KEY` but does not validate `GROQ_API_KEY` or `NVIDIA_API_KEY`.
- **Vercel Project Target Mismatch**: Root `.vercel/project.json` targets `opportunity-hub-india` while `frontend/.vercel/project.json` targets `frontend`.
- **`frontend/DESIGN.md` Divergence**: The design file references a legacy restaurant POS spec, whereas the actual codebase implements the Obsidian/Zinc developer design system (`globals.css`).
- **Profile Page**: `/profile` currently redirects directly to `/onboarding`.
- **Static Programs Staleness**: Evergreen listings in `static.js` log warnings if `manually_verified_date` is older than 30 days.

## What Is Not Yet Implemented

- Push notifications (Web Push API)
- Automated scraper test suite (`npm test` is a no-op placeholder)
- Frontend client caching/query deduplication layer (e.g. SWR/TanStack Query)

## Known Issues

- **Oldest record preference**: Cross-source deduplication preserves the oldest record (`created_at ASC`), potentially deactivating newer listings that have richer metadata.
- **Synthetic deadlines**: GitHub internship listings receive an artificial 30-day deadline with `deadline_confidence: 'unknown'`.

## Important: Do Not Change Without Consideration

- `scraper/upserter.js` — Deduplication logic (`source_url` and normalized title/company collisions)
- `scraper/structurer.js` — Groq fallback prompt and batch rate limiter (4000ms delay, 300 call budget)
- `scraper/utils/geo-filter.js` — Strict regex and boundary rules for Indian relevance
- `frontend/src/middleware.ts` & `src/utils/supabase/middleware.ts` — Auth session cookie exchange
- `frontend/src/lib/opportunities.ts` — Match scoring weights (45/35/20)
- `frontend/src/app/admin/page.tsx` — Server-side email gate check (`ADMIN_EMAIL`)
- `supabase/migrations/` — Database schema, RPC functions (`get_ranked_opportunities`), and cron schedules
- `.github/workflows/` — Production cron schedules and keepalive workflows
