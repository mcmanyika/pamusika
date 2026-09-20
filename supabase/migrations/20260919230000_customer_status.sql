-- Staff may activate or suspend buyer accounts.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  ALTER TABLE public.customers
    ADD CONSTRAINT customers_status_check
    CHECK (status IN ('ACTIVE', 'SUSPENDED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS customers_status_idx ON public.customers (status);
