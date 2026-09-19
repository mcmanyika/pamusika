CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_type text NOT NULL CHECK (owner_type IN ('CUSTOMER', 'VENDOR')),
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.referral_codes (id) ON DELETE RESTRICT,
  referrer_type text NOT NULL CHECK (referrer_type IN ('CUSTOMER', 'VENDOR')),
  referrer_id uuid NOT NULL,
  referee_phone text NOT NULL UNIQUE,
  referee_type text CHECK (referee_type IN ('CUSTOMER', 'VENDOR')),
  referee_id uuid,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'QUALIFIED', 'REJECTED')),
  qualified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_codes_owner_idx ON public.referral_codes (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_type, referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);

DROP TRIGGER IF EXISTS set_referrals_updated_at ON public.referrals;
CREATE TRIGGER set_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_codes_select_staff ON public.referral_codes;
CREATE POLICY referral_codes_select_staff
  ON public.referral_codes FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS referrals_select_staff ON public.referrals;
CREATE POLICY referrals_select_staff
  ON public.referrals FOR SELECT TO authenticated
  USING (public.is_staff());

REVOKE ALL ON TABLE public.referral_codes FROM anon;
REVOKE ALL ON TABLE public.referrals FROM anon;
GRANT SELECT ON TABLE public.referral_codes TO authenticated;
GRANT SELECT ON TABLE public.referrals TO authenticated;
