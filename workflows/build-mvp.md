# Workflow — Build MVP (Phase 1)

## Goal
Build a working web application where a student can sign up, complete a profile,
see a personalized and ranked list of opportunities, save opportunities they like,
track application status, and receive deadline reminders by email.

## Step 1 — Supabase setup
- Create a new Supabase project.
- Create the following tables:
  - profiles: id, user_id, year, domain_interests, skills, college_tier, location_preference, created_at
  - opportunities: id, title, type, description, source_url, deadline, eligibility, domain_tags,
    effort_level, competitiveness, is_active, created_at
  - saved_opportunities: id, user_id, opportunity_id, status, saved_at
    (status values: saved, applied, rejected, accepted)
- Enable row-level security on all tables.
- Set up Supabase Auth with email and Google OAuth.

## Step 2 — Onboarding flow
- After signup, route new users to an onboarding screen.
- Collect: current year, domain interests (multi-select), top 3 skills, college tier,
  and location preference (remote only, India only, open to abroad).
- Save to profiles table.
- Onboarding must be completable in under 2 minutes.
- Do not show the feed until onboarding is complete.

## Step 3 — Opportunity feed
- Fetch active opportunities from the database.
- Filter by eligibility against user profile.
- Rank results using this priority order:
  1. Profile match score (domain tags overlap with user interests)
  2. Deadline proximity (closer deadlines rank higher)
  3. Effort level (lower effort ranks higher when match scores are equal)
- Display each listing as a card with: title, type badge, deadline, effort level,
  competitiveness indicator, and a save button.
- Show empty state if no matches found with a prompt to update profile.

## Step 4 — Save and track
- Save button on each card writes to saved_opportunities table.
- Saved tab shows all saved opportunities with a status dropdown:
  saved, applied, rejected, accepted.
- Allow unsaving. Removed listings go to an archived state, not hard deleted.

## Step 5 — Deadline reminders
- Use Supabase Edge Functions to run a daily check.
- For every saved opportunity with a deadline in 3 days, send one reminder email
  to the user using Supabase's built-in email or a free tier of Resend.
- Email contains: opportunity title, deadline date, and a direct link to the source URL.
- Do not send more than one reminder per opportunity per user.

## Step 6 — Admin data entry
- Build a simple password-protected admin page.
- Admin can add, edit, and deactivate opportunities from a form.
- This is the only way opportunities enter the database for MVP.
  No automated ingestion in phase 1.

## Definition of done for MVP
- A new user can sign up, complete onboarding, see a personalized feed,
  save an opportunity, and receive a reminder email before the deadline.
- An admin can add a new opportunity in under 2 minutes.
- All of the above works on mobile browser without breaking.
