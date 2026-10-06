# Project State

**Last Updated**: 2026-10-03

## Development Phase

Active development — Core platform is built, deployed, and operational. Focus is on scraper reliability, LLM pipeline maintenance, and edge reminder verification.

## What Is Working

- **Landing Page**: 3D ContainerScroll preview, WebGL shader mascot, dynamic opportunity counters.
- **Dedicated `/profile` Settings Page**: Fully editable account settings (`/profile` & `ProfileForm.tsx`) for graduation cohort, college tier, primary focus area, and custom interactive tech stack pills, directly calibrating match scores with instant persistence.
- **Honest 3-Tier Deadline Badges**: Badges across all 3 card layouts transparently delineate verified hard cutoffs (`⏳ Ends [Date]`) from rolling applications (`⚡ Rolling · Apply ASAP`) using database `deadline_confidence`.
- **Verified-First Deadline Sorting**: "Closing Soon" feed sort prioritizes real verified closing countdowns ahead of rolling listings.
- **Centralized Collision-Free Filtering Engine (`filters.ts`)**: Unified matcher library enforcing strict `\b` word boundary matching, ecosystem registry (`ycombinator`, `wellfound`, `devfolio`, `unstop`), and multi-token search. Eliminates false-positive substring collisions across all domains (prevents "Lifecycle" from matching "yc", "Email" from matching "ai", "Build" from matching "ui").
- **Ecosystem & Company Directory Popover**: Grouped company popover cleanly separating **Featured Ecosystems** (Y Combinator [50], Wellfound [107], Devfolio, Unstop) from **Direct Employers** (Google, PhonePe, Microsoft), with live matching indicators and one-click reset.
- **Graduation Batch Filter Bar**: One-click cohort switcher (`All Batches` | `2025 Full-Time` | `2026 Pre-Final Intern` | `2027/28 Early Undergrad`) with unified eligibility normalization handling all 3 database formats (`year`, `segments`, `education`).
- **Slide-Over Quick-View Drawer (`QuickViewDrawer.tsx`)**: Instant preview panel on card click featuring formatted job overview, requirements breakdown, match score analysis, direct ATS link, and keyboard accessibility (`Escape` to close).
- **1-Click Google Calendar Sync**: Embedded one-click GCal event creation with title, deadline timestamps, and official application URL.
- **Company Logo Hydration**: Automated high-res favicon and brand logo resolution via Google Favicon API in `branding.ts`, with graceful fallback to styled monograms.
- **Smart Link Health Reaper Engine (`scraper/reaper/` & `.github/workflows/reaper.yml`)**: Phase 1 Audit-Only link verification featuring an 8-state classification engine (`HEALTHY`, `DEAD`, `CLOSED`, `BLOCKED`, `ACCESS_RESTRICTED`, `TEMP_ERROR`, `SUSPECT`, `SOFT_DEAD`), SSRF security guards, per-registrable-domain task queue (concurrency 12 global, max 2 per host), domain circuit breaker (min sample 10, >50% failure marks `DEGRADED`), 24h ingestion grace period, rich `$GITHUB_STEP_SUMMARY` reporting, and sanitized JSON artifact generation with 0 database deactivations (`is_active` untouched).
- **Authentication & OAuth Integration**: Supabase SSR authentication streamlined to 1-click Google OAuth and Email/Password with seamless callback handling, error propagation, and onboarding redirection.
- **Onboarding Flow**: 2-step profile onboarding (`user_profiles`) capturing tier, graduation year, tech stack, focus area. Redirects seamlessly upon first registration.
- **Multi-View Dashboard Feed**:
  - Calm List (`OpportunityRow.tsx`) with flexible wrapping and touch-friendly actions
  - Relaxed Grid (`OpportunityGridCard.tsx`) with responsive columns and action row
  - Unified Floating Dock (`dock-two.tsx`): Streamlined to 3 primary actions (`Discover`, `Saved`, `Profile`). Clicking `Discover` reveals an interactive popover allowing users to switch between `List View`, `Grid View`, and `Card Snap`.
  - Anti-Monopoly Feed Diversification (`feed-diversification.ts`): Sliding-window fair-queuing algorithm preventing any single ecosystem (such as Unstop) from dominating the feed. Automatically interleaves Y Combinator startup roles, Wellfound, Devfolio hackathons, open-source programs, and company jobs right from card #1.
  - Compact single-bar header on mobile and desktop with unified instant search and sort controls (`Best Match | Closing Soon | Newest`)
  - Filter state, search, sort, and view mode persistence
- **Decoupled Business Logic**: `src/lib/opportunities.ts` houses `computeMatchScore` and `cleanDomainTags` independently from UI components.
- **Application Tracking**: React 19 optimistic updates for stages (`to_apply`, `applied`, `accepted`, `rejected`, `archived`).
- **Admin Portal**: Server-gated (`ADMIN_EMAIL`) manual opportunity manager and GitHub Actions scraper trigger.
- **Scraper Pipeline (15 sources across 5 waves)**:
  - 5-wave parallel/sequential execution (`pipeline.js`)
  - **Wave 5: Venture & Tech Startup Hubs (`yc-startups.js` & `wellfound.js`)**:
    - **Y Combinator Startup Jobs (`yc-startups.js`)**: Direct ingestion of high-signal YC startup roles (India locations, Global Remote, and Software Engineering internships) directly from Y Combinator's official jobs platform (`ycombinator.com/jobs` and `workatastartup.com`).
    - **Wellfound (AngelList) India Tech Roles (`wellfound.js`)**: Deep server-side Apollo data extraction across India startup hubs (Mumbai, Hyderabad, Pune, Delhi/Noida, India-wide), adding over 200+ high-paying tech startup engineering listings.
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
- **Progressive Web App (PWA)**: `manifest.json`, service worker (`sw.js`) with network-first API / cache-first static strategy, SVG compass icon, iOS safe-area viewport, `ServiceWorkerRegistrar` component for "Add to Home Screen" installability.
- **Dynamic OG Images**: `@vercel/og` powered Open Graph image generation for home, dashboard, and individual opportunity pages. Dynamic `/api/og` route accepting title/company/deadline/type params for rich WhatsApp/Telegram link previews.
- **SEO Opportunity Detail Pages (`/opportunity/[id]`)**: Server-rendered detail pages with Supabase fetch, JSON-LD structured data (JobPosting schema), dynamic metadata, per-opportunity OG images, company logos, deadline badges, domain tag pills, and "Apply" CTA. Includes `sitemap.ts` (all active opportunities) and `robots.ts`.
- **PostHog Analytics**: Free-tier pageview tracking with `PostHogProvider` (Suspense-wrapped), graceful skip when `NEXT_PUBLIC_POSTHOG_KEY` not configured, route-change capture via `usePathname`/`useSearchParams`.

- **Central Ingestion URL Sanitizer & Canonicalizer (`scraper/url-sanitizer.js`)**: Enforces strict URL invariants across the entire ingestion pipeline. Automatically collapses redundant slashes, upgrades protocols, unwraps auth gates, purges tracking/session tokens, canonicalizes Y Combinator career links, and rejects private Discord channel permalinks before database insertion. Unit test suite in `tests/test-url-sanitizer.js`.
- **Immutable Source URL Guarantee (`scraper/structurer.js`)**: AI structurer strictly preserves the raw scraped source URL, preventing LLMs (NVIDIA NIM / Groq / Gemini) from mutating, truncating, or hallucinating application links.
- **Multi-Factor Partition Deduplication (`scraper/dedup-titles.js` & `scraper/pipeline.js`)**: Replaced naive title+company deduplication with multi-factor partitioning by office location (`bangalore`, `hyderabad`, `pune`, etc.), cohort/season (`Summer 2025`, `Fall 2026`), and engineering specialization (`frontend`, `backend`, `mobile`). Integrates metadata quality scoring (`getRecordScore`) so listings with verified deadlines, comprehensive descriptions, and direct company links are preserved over incomplete records.
- **Link Health Telemetry Schema (Migration 10)**: Applied to Supabase production database, adding `link_health_status`, `consecutive_failures`, `audit_failure_count`, `last_checked_at`, `last_http_status`, `last_health_reason`, `last_final_url`, `deactivated_at`, `reaper_protected`, and `reaper_runs` table with row-level security.
- **Custom Domain Integration**: Configured `opphunt.in` custom domain on Vercel with apex A record (`76.76.21.21`) and CNAME record (`cname.vercel-dns.com`).

## What Is Partially Working / Needs Attention

- **Devfolio Scraper**: Relies on styled-component class prefix matching in DOM; breaks if Devfolio updates frontend classes.
- **Gemini LLM Structuring**: Circuit breaker hardcoded to `true` (`isGeminiDailyExhausted = true` in `structurer.js`) due to free-tier 403 errors; structuring currently uses NVIDIA NIM as primary and Groq as secondary.
- **Environment Validation Gap**: `validate-env.js` checks for `GEMINI_API_KEY` but does not validate `GROQ_API_KEY` or `NVIDIA_API_KEY`.
- **Vercel Project Target Mismatch**: Root `.vercel/project.json` targets `opportunity-hub-india` while `frontend/.vercel/project.json` targets `frontend`.
- **`frontend/DESIGN.md` Divergence**: The design file references a legacy restaurant POS spec, whereas the actual codebase implements the Obsidian/Zinc developer design system (`globals.css`).
- **Static Programs Staleness**: Evergreen listings in `static.js` log warnings if `manually_verified_date` is older than 30 days.

## What Is Not Yet Implemented

- Push notifications (Web Push API)
- Frontend client caching/query deduplication layer (e.g. SWR/TanStack Query)

## Known Issues

- **Synthetic deadlines**: GitHub internship listings receive an artificial 30-day deadline with `deadline_confidence: 'unknown'`.
- **GoDaddy .in KYC Verification**: `opphunt.in` domain awaiting registry KYC processing window before public DNS resolution goes fully active.

## Important: Do Not Change Without Consideration

- `scraper/upserter.js` — Deduplication logic (`source_url` and normalized title/company collisions)
- `scraper/structurer.js` — Groq fallback prompt and batch rate limiter (4000ms delay, 300 call budget)
- `scraper/utils/geo-filter.js` — Strict regex and boundary rules for Indian relevance
- `frontend/src/middleware.ts` & `src/utils/supabase/middleware.ts` — Auth session cookie exchange
- `frontend/src/lib/opportunities.ts` — Match scoring weights (45/35/20)
- `frontend/src/app/admin/page.tsx` — Server-side email gate check (`ADMIN_EMAIL`)
- `supabase/migrations/` — Database schema, RPC functions (`get_ranked_opportunities`), and cron schedules
- `.github/workflows/` — Production cron schedules and keepalive workflows
