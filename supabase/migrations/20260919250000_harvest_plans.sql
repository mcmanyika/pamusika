CREATE TABLE IF NOT EXISTS public.harvest_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  crop_name text NOT NULL,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'kg',
  harvest_year integer NOT NULL CHECK (harvest_year BETWEEN 2020 AND 2100),
  harvest_month integer NOT NULL CHECK (harvest_month BETWEEN 1 AND 12),
  expected_on date NOT NULL,
  city text,
  area text,
  status text NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'READY', 'LISTED', 'CANCELLED', 'MISSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expected_on = make_date(harvest_year, harvest_month, 1))
);

CREATE INDEX IF NOT EXISTS harvest_plans_vendor_id_idx ON public.harvest_plans (vendor_id);
CREATE INDEX IF NOT EXISTS harvest_plans_expected_on_idx ON public.harvest_plans (expected_on);
CREATE INDEX IF NOT EXISTS harvest_plans_status_idx ON public.harvest_plans (status);

DROP TRIGGER IF EXISTS set_harvest_plans_updated_at ON public.harvest_plans;
CREATE TRIGGER set_harvest_plans_updated_at
  BEFORE UPDATE ON public.harvest_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.harvest_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvest_plans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS harvest_plans_select_staff ON public.harvest_plans;
CREATE POLICY harvest_plans_select_staff
  ON public.harvest_plans FOR SELECT TO authenticated
  USING (public.is_staff());

REVOKE ALL ON TABLE public.harvest_plans FROM anon;
GRANT SELECT ON TABLE public.harvest_plans TO authenticated;
