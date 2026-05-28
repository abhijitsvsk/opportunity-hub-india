# Opportunity Hub — Product Requirements Document

## What this product is
A student opportunity intelligence platform for CS students in India.
It aggregates internships, hackathons, fellowships, scholarships, open-source programs,
competitions, and career events from high-quality sources, filters them by relevance,
and delivers a personalized, ranked feed through a web interface.

## Who it is for
CS students in India, primarily 2nd and 3rd year undergraduates, who are actively
looking for internships, programs, and competitions but are overwhelmed by noise
or miss deadlines because they have no reliable discovery system.

## The core problem
Students do not lack opportunities. They lack filtered, timely, relevant signal.
Most platforms dump thousands of listings with no personalization, no deadline
urgency, and no execution support. Students browse once and forget.

## What makes this different
- Curated, not scraped. Every listing is reviewed before it goes live.
- Ranked by relevance to the student profile, deadline urgency, and effort required.
- Built around execution: reminders, tracking, and gap suggestions, not just discovery.
- Narrow and deep to start. SWE internships, hackathons, and open-source programs
  for Indian CS students first. Expand only after core loop is proven.

## MVP scope (phase 1 only)
- Student onboarding: year, domain interest, skills, college tier
- Opportunity database: manually curated, 30 to 50 active listings at launch
- Personalized feed: filtered and ranked by profile match and deadline
- Save and track: students can save opportunities and mark application status
- Deadline reminders: email notifications before deadlines close
- Lightweight dashboard: feed, saved items, and profile in one view

## Out of scope for MVP
- Resume analysis or gap suggestions
- AI-assisted interview or application prep
- Social features, referrals, or community
- Automated scraping pipelines
- Mobile app or Telegram/WhatsApp bot
- Employer-facing features

## Tech stack
- Frontend and hosting: Vercel
- Database and auth: Supabase
- AI coding agent: Google Antigravity
- LLM for ranking logic (if needed): Gemini free tier

## Success criteria for MVP
- 50 students onboarded in first 2 weeks without paid promotion
- At least 30 percent of onboarded students return within 7 days
- At least 5 students report applying to an opportunity they found through the platform
