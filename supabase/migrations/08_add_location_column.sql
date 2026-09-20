-- Migration 08: Add location column to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS location text;

