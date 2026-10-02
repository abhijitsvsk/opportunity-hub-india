# Project State

**Last Updated**: 2026-10-02

## Development Phase

Active development — Core platform is built, deployed, and operational. Focus is on scraper reliability, LLM pipeline maintenance, and edge reminder verification.

## What Is Working

- **Landing Page**: 3D ContainerScroll preview, WebGL shader mascot, dynamic opportunity counters.
- **Authentication**: Supabase SSR (Email/Password, GitHub OAuth, Google OAuth) with session refresh.
- **Onboarding Flow**: 2-step profile onboarding (`user_profiles`) capturing tier, graduation year, tech stack, focus area.
- **Multi-View Dashboard Feed**:
  - Calm List (`OpportunityRow.tsx`) with flexible wrapping and touch-friendly actions
  - Relaxed Grid (`OpportunityGridCard.tsx`) with responsive columns and action row
  - Mobile Card Snap (`OpportunityCard.tsx`) with dynamic viewport height, full-width mobile card, and TikTok-style overlaid action pill
  - Unified Floating Dock (`dock-two.tsx`) with navigation/view separation, active dots, profile/logout popover, and iOS safe-area insets (`env(safe-area-inset-bottom)`)
  - Compact single-bar header on mobile and desktop with unified instant search and sort controls (`Best Match | Closing Soon | Newest`)
  - Filter state, search, sort, and view mode persistence
- **Decoupled Business Logic**: `src/lib/opportunities.ts` houses `computeMatchScore` and `cleanDomainTags` independently from UI components.
- **Robust Authentication**: Dynamic Sign-In / Sign-Up toggle (`modern-stunning-sign-in.tsx`), graceful `NEXT_REDIRECT` error filtering, and React `startTransition` GitHub OAuth.
- **Application Tracking**: React 19 optimistic updates for stages (`to_apply`, `applied`, `accepted`, `rejected`, `archived`).
- **Admin Portal**: Server-gated (`ADMIN_EMAIL`) manual opportunity manager and GitHub Actions scraper trigger.
- **Scraper Pipeline (11 sources)**:
  - 4-wave parallel/sequential execution (`pipeline.js`)
  - Direct ATS Company Career Scraper (`ats-companies.js` + `companies.json`) querying 89 verified tech companies across Greenhouse, Lever, Ashby, and SmartRecruiters public APIs with fast two-stage querying and stale job reconciliation
  - Groq LLM structuring (`openai/gpt-oss-20b`) with 300-call budget and `pending_processing` overflow queue
  - Two-layer deduplication (`source_url` conflict + `deduplicate_opportunities()` RPC)
  - Strict India-focused filtering (`geo-filter.js`)
  - Discord webhook alerts (digests and failure logs)
  - Discord Gateway bot scraper for announcements
- **Email Reminders Edge Function**:
  - `send-reminders` Supabase Edge Function implemented
  - Scheduled daily at 00:00 UTC via `pg_cron` + `pg_net` + Supabase Vault
  - Consolidates opportunities closing in 3 days into a single digest email per user via Resend API
- **Infrastructure Automation**:
  - GitHub Actions daily scrape cron (`scrape.yml` at 00:00 UTC) with Playwright browser installation
  - Supabase 4-day keepalive workflow (`keepalive-supabase.yml`)
  - GitHub Actions bi-monthly activity keepalive (`keepalive-workflow.yml`)
  - Vercel production deployment

## What Is Partially Working / Needs Attention

- **Devfolio Scraper**: Relies on styled-component class prefix matching in DOM; breaks if Devfolio updates frontend classes.
- **Gemini LLM Structuring**: Circuit breaker hardcoded to `true` (`isGeminiDailyExhausted = true` in `structurer.js`) due to free-tier 403 errors; structuring currently relies 100% on Groq.
- **Environment Validation Gap**: `validate-env.js` checks for `GEMINI_API_KEY` but does not validate `GROQ_API_KEY`.
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
