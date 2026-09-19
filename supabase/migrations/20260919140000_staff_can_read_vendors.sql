-- Let every staff role see vendor and customer records in the admin console.
-- WhatsApp numbers stay hidden in the UI for ANALYST via canViewPii().

DROP POLICY IF EXISTS vendors_select_pii_roles ON public.vendors;
DROP POLICY IF EXISTS vendors_select_staff ON public.vendors;
CREATE POLICY vendors_select_staff
  ON public.vendors FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS customers_select_pii_roles ON public.customers;
DROP POLICY IF EXISTS customers_select_staff ON public.customers;
CREATE POLICY customers_select_staff
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_staff());
