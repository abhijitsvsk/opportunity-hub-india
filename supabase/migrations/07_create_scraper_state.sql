-- Migration 07: Create scraper_state table for persistent cursor tracking
CREATE TABLE IF NOT EXISTS public.scraper_state (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scraper_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scraper_state' AND policyname = 'Service role full access on scraper_state'
  ) THEN
    CREATE POLICY "Service role full access on scraper_state"
        ON public.scraper_state
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
  END IF;
END $$;

