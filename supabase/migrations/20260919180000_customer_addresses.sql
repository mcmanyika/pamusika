CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  line1 text NOT NULL,
  line2 text,
  area text,
  city text,
  province text,
  country text NOT NULL DEFAULT 'Zimbabwe',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_customer_id_idx ON public.customer_addresses (customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_idx
  ON public.customer_addresses (customer_id)
  WHERE is_default;

DROP TRIGGER IF EXISTS set_customer_addresses_updated_at ON public.customer_addresses;
CREATE TRIGGER set_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_addresses_select_staff ON public.customer_addresses;
CREATE POLICY customer_addresses_select_staff
  ON public.customer_addresses FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS customer_addresses_write_ops_support ON public.customer_addresses;
CREATE POLICY customer_addresses_write_ops_support
  ON public.customer_addresses FOR INSERT TO authenticated
  WITH CHECK (public.can_view_pii());

DROP POLICY IF EXISTS customer_addresses_update_ops_support ON public.customer_addresses;
CREATE POLICY customer_addresses_update_ops_support
  ON public.customer_addresses FOR UPDATE TO authenticated
  USING (public.can_view_pii())
  WITH CHECK (public.can_view_pii());

REVOKE ALL ON TABLE public.customer_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customer_addresses TO authenticated;
