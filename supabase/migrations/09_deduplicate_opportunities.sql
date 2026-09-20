-- ==============================================================================
-- Migration 09: Cross-Source Deduplication Function
-- Deactivates newer duplicate listings sharing the same normalized_title
-- and normalized_company (excluding fallback placeholders).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.deduplicate_opportunities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH ranked_dups AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY normalized_title, normalized_company 
        ORDER BY created_at ASC, id ASC
      ) as rn
    FROM public.opportunities
    WHERE is_active = true
      AND normalized_title IS NOT NULL
      AND normalized_title != ''
      AND normalized_company IS NOT NULL
      AND normalized_company != '__no_company_fallback__'
  ),
  to_deactivate AS (
    SELECT id FROM ranked_dups WHERE rn > 1
  )
  UPDATE public.opportunities
  SET is_active = false,
      updated_at = NOW()
  WHERE id IN (SELECT id FROM to_deactivate);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
