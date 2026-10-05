# TODO

## Completed

- [x] Next.js 16 + React 19 web application deployed on Vercel
- [x] Obsidian & Zinc dark design system with WebGL shader mascot and 3D hero
- [x] Supabase SSR auth (Email/password, GitHub OAuth, Google OAuth)
- [x] 2-step profile onboarding (`user_profiles`) with college tier, graduation year, tech stack
- [x] Multi-view feed: Calm List (`OpportunityRow`), Relaxed Grid (`OpportunityGridCard`), Mobile Card Snap (`OpportunityCard`)
- [x] Floating Dock navigation (`dock-two.tsx`)
- [x] Match Score algorithm (35%–99%) based on tech stack, career focus, and academic year
- [x] Database RPC `get_ranked_opportunities(p_user_id)` for server-side ranking
- [x] Optimistic application stage tracking (`to_apply`, `applied`, `accepted`, `rejected`, `archived`)
- [x] Admin dashboard with `ADMIN_EMAIL` gate and manual scraper trigger
- [x] 10 data sources (Devfolio, Unstop, CodeChef, Codeforces, HackerRank, Kaggle, GitHub Internships, GitHub New Grad, Discord, Static)
- [x] 4-wave parallel/sequential scraper pipeline
- [x] Groq LLM entity structuring (`openai/gpt-oss-20b`) with batching & budget limits
- [x] Supabase upsert with two-layer deduplication (`source_url` + `deduplicate_opportunities()` RPC)
- [x] `pending_processing` backlog queue for LLM budget overflow
- [x] Discord webhook run digests and error alerts
- [x] Discord Gateway bot for scraping community announcement channels
- [x] Strict India geographic filtering (`geo-filter.js`) with US rejection rules
- [x] `send-reminders` Supabase Edge Function with Resend API integration
- [x] `pg_cron` daily schedule for sending deadline reminder emails
- [x] GitHub Actions daily 00:00 UTC scrape cron and Supabase/GitHub keepalive workflows
- [x] Auto-expiry of past-deadline opportunities
- [x] Progressive Web App (PWA) with manifest.json, service worker, and generated PNG icons
- [x] Dynamic Open Graph preview cards via @vercel/og and /api/og endpoint
- [x] Dedicated SEO Opportunity Detail pages (/opportunity/[id]) with schema.org JSON-LD
- [x] Dynamic sitemap.ts and robots.ts with custom domain support (opphunt.in)
- [x] PostHog Analytics client integration
- [x] Production hardening: security headers, global error.tsx and not-found.tsx boundaries
- [x] Dedicated `/profile` settings view with instant Match Score preference persistence
- [x] Phase 1 Link Health Reaper with 8-state classifier, SSRF protection, and domain circuit breaker
- [x] Fixed Y Combinator opportunity URL generation and repaired 96 listings in Supabase
- [x] Streamlined floating dock: nested List, Grid, and Card views under Discover popover
- [x] Anti-monopoly feed diversification algorithm ensuring balanced startup/MNC/hackathon mix from card #1
- [x] Central Ingestion URL Sanitizer & Canonicalizer (`scraper/url-sanitizer.js`) enforcing URL invariants and stripping tracking noise
- [x] Immutable Source URL Guarantee in AI structurer (`scraper/structurer.js`) preventing LLM link mutations
- [x] Multi-factor partition deduplication by location, season, and specialization (`scraper/dedup-titles.js`)
- [x] Fixed cross-source deduplication in `pipeline.js` to preserve the record with the most complete metadata rather than strictly the oldest
- [x] Applied Supabase Migration 10 (link health telemetry columns and `reaper_runs` table)
- [x] Google OAuth client integration on login and authentication callbacks

## In Progress

- [ ] Improving Devfolio scraper resilience against styled-component class changes
- [ ] Stabilizing GitHub markdown table parsing

## High Priority

- [ ] Add `GROQ_API_KEY` validation to `scraper/validate-env.js` (currently checks `GEMINI_API_KEY` while Groq is the active engine)
- [ ] Align `.vercel/project.json` configs (root vs `frontend/`) to prevent deployment targeting confusion
- [ ] Sync `frontend/DESIGN.md` with actual Obsidian/Zinc developer design tokens (`globals.css`)

## Medium Priority

- [ ] Re-test Gemini 2.5 Flash API credentials or fix access permissions to restore secondary LLM fallback
- [ ] Add automated unit/integration test suite for scrapers (`npm test`)
- [ ] Update `manually_verified_date` in `scraper/static.js` to clear staleness log warnings
- [ ] Verify production delivery of `send-reminders` edge function (Resend API key in Vault)

## Low Priority

- [ ] Push notifications support (Web Push API)
- [ ] Client-side feed query caching (TanStack Query / SWR)
- [ ] Dedicated opportunity detail pages (currently deep-links directly to external source)
- [ ] Clean up / archive old debug artifacts in `scraper/recon-output/`

## Future Ideas

- [ ] Mobile companion app (PWA or React Native)
- [ ] Personalized AI opportunity recommendations directly in Discord/Telegram
- [ ] Organizer direct opportunity submission portal with verification workflow
