-- Enable the pg_cron, pg_net, and vault extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- Create the SECURITY DEFINER function to invoke the edge function
-- This allows the cron job to dynamically read from vault.decrypted_secrets
CREATE OR REPLACE FUNCTION public.invoke_send_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_key text;
  v_project_url text;
BEGIN
  -- Retrieve the service role key from the vault
  SELECT secret INTO v_service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;

  -- Retrieve the project URL from the vault (or fallback to environment/hardcoded if necessary, but we enforce Vault)
  SELECT secret INTO v_project_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'project_url' 
  LIMIT 1;

  IF v_project_url IS NULL THEN
    RAISE EXCEPTION 'project_url not found in vault.decrypted_secrets';
  END IF;

  IF v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
        url := v_project_url || '/functions/v1/send-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        )
    );
  ELSE
    RAISE WARNING 'service_role_key not found in vault.decrypted_secrets';
  END IF;
END;
$$;

-- Schedule the send-reminders edge function to run every day at midnight (UTC)
SELECT cron.schedule(
  'invoke-send-reminders', -- name of the cron job
  '0 0 * * *',             -- every day at 00:00 UTC
  'SELECT public.invoke_send_reminders();'
);
