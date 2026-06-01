ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS current_year text,
ADD COLUMN IF NOT EXISTS college_tier text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS experience_level text;
