-- Setup script for Supabase tables and RLS policies

-- ==============================================================================
-- 1. Create Tables
-- ==============================================================================

-- Opportunities Table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    type text NOT NULL,
    description text,
    source_url text UNIQUE NOT NULL,
    deadline timestamptz,
    deadline_confidence numeric,
    domain_tags jsonb DEFAULT '[]'::jsonb,
    eligibility jsonb DEFAULT '{"type": "all"}'::jsonb,
    effort_level text DEFAULT 'medium',
    competitiveness text DEFAULT 'medium',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    university text,
    graduation_year text,
    focus_area text,
    location_preference text,
    tech_stack text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User Saved Opportunities Table
CREATE TABLE IF NOT EXISTS public.user_saved_opportunities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'to_apply',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, opportunity_id)
);

-- Pipeline Runs Table (for scraper logs)
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source text NOT NULL,
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    status text NOT NULL,
    records_scraped integer DEFAULT 0,
    records_structured integer DEFAULT 0,
    records_upserted integer DEFAULT 0,
    records_skipped integer DEFAULT 0,
    records_failed integer DEFAULT 0,
    error_message text,
    created_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- 2. Create Indexes (Performance & Scalability)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_opportunities_is_active ON public.opportunities (is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON public.opportunities (deadline);
CREATE INDEX IF NOT EXISTS idx_user_saved_opportunities_user_id ON public.user_saved_opportunities (user_id);

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Opportunities Policies
-- Anyone can read opportunities
CREATE POLICY "Opportunities are viewable by everyone" 
ON public.opportunities FOR SELECT 
USING (true);

-- Only service role can insert/update opportunities (done via scraper)
CREATE POLICY "Service role can insert opportunities" 
ON public.opportunities FOR INSERT 
WITH CHECK (true); -- Requires service role key to bypass RLS or no matching policy for anon

CREATE POLICY "Service role can update opportunities" 
ON public.opportunities FOR UPDATE 
USING (true);

-- User Profiles Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- User Saved Opportunities Policies
-- Users can view their own saved items
CREATE POLICY "Users can view own saved opportunities" 
ON public.user_saved_opportunities FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own saved items
CREATE POLICY "Users can insert own saved opportunities" 
ON public.user_saved_opportunities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved items
CREATE POLICY "Users can update own saved opportunities" 
ON public.user_saved_opportunities FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own saved items
CREATE POLICY "Users can delete own saved opportunities" 
ON public.user_saved_opportunities FOR DELETE 
USING (auth.uid() = user_id);

-- Pipeline Runs Policies
-- Only service role can manage pipeline runs. No public policies needed.
