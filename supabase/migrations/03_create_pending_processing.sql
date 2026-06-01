-- Create the pending_processing table for the Gemini scraper rollover queue
CREATE TABLE IF NOT EXISTS public.pending_processing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    source text NOT NULL,
    raw_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on the table
ALTER TABLE public.pending_processing ENABLE ROW LEVEL SECURITY;

-- Only service role can access pending_processing (via the scraper pipeline)
CREATE POLICY "No direct user access" 
ON public.pending_processing FOR ALL 
USING (false);
