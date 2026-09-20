-- Staff verify buyers the same way they verify vendors.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'UNVERIFIED';

DO $$
BEGIN
  ALTER TABLE public.customers
    ADD CONSTRAINT customers_verification_status_check
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS customers_verification_status_idx ON public.customers (verification_status);
