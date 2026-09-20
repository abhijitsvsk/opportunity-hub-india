-- Migration 06: Drop unique_normalized_opportunity constraint
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS unique_normalized_opportunity;

