-- Let the admin header subscribe to commerce updates as they are written.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
