-- PaySell Phase 1 schema, RLS, storage, and category seed.
-- Apply in the Supabase SQL editor or via the Supabase CLI.
--
-- Inventory behaviour (MVP, enforced in Phase 2 services/RPC):
--   products.quantity is available sellable stock.
--   Pending orders do not reserve stock.
--   Stock is decremented only on COMPLETED, inside a transaction that
--   locks the product row and rejects a negative remainder.
--
-- Unique WhatsApp sessions:
--   conversation_sessions.is_active = true is unique per phone_number.
--   New sessions must deactivate any previous active session first.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS public.vendor_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 10001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_vendor_code(p_city text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  loc_code text;
BEGIN
  loc_code := CASE
    WHEN p_city ILIKE '%harare%' OR p_city ILIKE '%mbare%' THEN 'HRE'
    WHEN p_city ILIKE '%bulawayo%' THEN 'BYO'
    WHEN p_city ILIKE '%mutare%' THEN 'MUT'
    WHEN p_city ILIKE '%gweru%' THEN 'GWE'
    WHEN p_city ILIKE '%masvingo%' THEN 'MVG'
    ELSE 'ZWE'
  END;

  RETURN 'PS-' || loc_code || '-' || lpad(nextval('public.vendor_code_seq')::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'PS-' || nextval('public.order_number_seq')::text;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'ANALYST'
    CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SUPPORT', 'ANALYST')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'INACTIVE')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code text NOT NULL UNIQUE,
  whatsapp_number text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  business_name text,
  primary_category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  country text NOT NULL DEFAULT 'Zimbabwe',
  province text,
  city text,
  area text,
  market_name text,
  preferred_language text NOT NULL DEFAULT 'en',
  profile_image_url text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE')),
  verification_status text NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL UNIQUE,
  display_name text,
  country text NOT NULL DEFAULT 'Zimbabwe',
  city text,
  area text,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'USD',
  quantity numeric(12, 3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'item',
  image_url text,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'PAUSED', 'REMOVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE RESTRICT,
  vendor_id uuid NOT NULL REFERENCES public.vendors (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING_VENDOR'
    CHECK (status IN (
      'PENDING_VENDOR', 'ACCEPTED', 'PREPARING', 'READY',
      'COMPLETED', 'DECLINED', 'CANCELLED'
    )),
  subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  currency text NOT NULL DEFAULT 'USD',
  fulfilment_method text NOT NULL DEFAULT 'COLLECTION'
    CHECK (fulfilment_method IN ('COLLECTION', 'DELIVERY')),
  payment_method text CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'OTHER')),
  payment_status text NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  total numeric(12, 2) NOT NULL CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  user_type text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (user_type IN ('VENDOR', 'CUSTOMER', 'UNKNOWN')),
  user_id uuid,
  current_state text NOT NULL DEFAULT 'NEW',
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_message_id text UNIQUE,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type text NOT NULL DEFAULT 'text',
  message_text text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'RECEIVED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text CHECK (user_type IN ('VENDOR', 'CUSTOMER', 'UNKNOWN')),
  user_id uuid,
  phone_number text,
  category text NOT NULL DEFAULT 'GENERAL',
  priority text NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  description text NOT NULL,
  assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_type text,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS vendors_status_idx ON public.vendors (status);
CREATE INDEX IF NOT EXISTS vendors_area_idx ON public.vendors (area);
CREATE INDEX IF NOT EXISTS vendors_verification_status_idx ON public.vendors (verification_status);
CREATE INDEX IF NOT EXISTS vendors_primary_category_id_idx ON public.vendors (primary_category_id);
CREATE INDEX IF NOT EXISTS vendors_business_name_trgm_idx ON public.vendors USING gin (business_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS customers_area_idx ON public.customers (area);

CREATE INDEX IF NOT EXISTS products_vendor_id_idx ON public.products (vendor_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_vendor_id_idx ON public.orders (vendor_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_sessions_one_active_per_phone_idx
  ON public.conversation_sessions (phone_number)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS conversation_sessions_phone_idx
  ON public.conversation_sessions (phone_number);

CREATE INDEX IF NOT EXISTS message_logs_phone_idx ON public.message_logs (phone_number);
CREATE INDEX IF NOT EXISTS message_logs_created_at_idx ON public.message_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx ON public.support_tickets (assigned_to);

CREATE INDEX IF NOT EXISTS analytics_events_name_idx ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_admin_user_id_idx ON public.audit_logs (admin_user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_vendors_updated_at ON public.vendors;
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_conversation_sessions_updated_at ON public.conversation_sessions;
CREATE TRIGGER set_conversation_sessions_updated_at
  BEFORE UPDATE ON public.conversation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER set_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'ANALYST'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = ANY (allowed_roles), false)
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SUPPORT', 'ANALYST'])
$$;

CREATE OR REPLACE FUNCTION public.can_manage_commerce()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'])
$$;

CREATE OR REPLACE FUNCTION public.can_view_pii()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SUPPORT'])
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN'])
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.current_user_role() = 'SUPER_ADMIN' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only SUPER_ADMIN can change staff roles';
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_role_changes ON public.profiles;
CREATE TRIGGER enforce_profile_role_changes
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_changes();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Documented policies:
-- profiles_select_self_or_staff     authenticated may read own profile or any profile if staff
-- profiles_update_self              authenticated may update own profile (role changes blocked by trigger)
-- profiles_update_super_admin       SUPER_ADMIN may update any profile
-- categories_select_staff           staff may read categories
-- categories_write_commerce         SUPER_ADMIN/ADMIN/OPERATIONS may insert/update categories
-- categories_delete_admin           SUPER_ADMIN/ADMIN may delete unused categories
-- vendors_select_pii_roles          SUPER_ADMIN/ADMIN/OPERATIONS/SUPPORT may read vendors
-- vendors_write_commerce            SUPER_ADMIN/ADMIN/OPERATIONS may insert/update vendors
-- customers_select_pii_roles        SUPER_ADMIN/ADMIN/OPERATIONS/SUPPORT may read customers
-- customers_write_ops_support       SUPER_ADMIN/ADMIN/OPERATIONS/SUPPORT may insert/update customers
-- products_select_staff             staff may read products
-- products_write_commerce           SUPER_ADMIN/ADMIN/OPERATIONS may insert/update products
-- orders_select_staff               staff may read orders
-- orders_write_commerce             SUPER_ADMIN/ADMIN/OPERATIONS may insert/update orders
-- order_items_select_staff          staff may read order items
-- order_items_write_commerce        SUPER_ADMIN/ADMIN/OPERATIONS may insert/update order items
-- conversation_sessions_select_ops  SUPER_ADMIN/ADMIN/SUPPORT may read sessions
-- message_logs_select_ops           SUPER_ADMIN/ADMIN/SUPPORT may read message logs
-- support_tickets_select_ops        SUPER_ADMIN/ADMIN/OPERATIONS/SUPPORT may read tickets
-- support_tickets_write_support     SUPER_ADMIN/ADMIN/SUPPORT may insert/update tickets
-- analytics_events_select_staff     staff may read analytics events
-- audit_logs_select_admin           SUPER_ADMIN/ADMIN may read audit logs
-- audit_logs_insert_admin           SUPER_ADMIN/ADMIN may insert audit logs
--
-- anon has no policies and is revoked from all user-facing tables.
-- service_role bypasses RLS and must only be used from trusted server code.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_self_or_staff ON public.profiles;
CREATE POLICY profiles_select_self_or_staff
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_super_admin ON public.profiles;
CREATE POLICY profiles_update_super_admin
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['SUPER_ADMIN']))
  WITH CHECK (public.has_role(ARRAY['SUPER_ADMIN']));

DROP POLICY IF EXISTS categories_select_staff ON public.categories;
CREATE POLICY categories_select_staff
  ON public.categories FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS categories_write_commerce ON public.categories;
CREATE POLICY categories_write_commerce
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS categories_update_commerce ON public.categories;
CREATE POLICY categories_update_commerce
  ON public.categories FOR UPDATE TO authenticated
  USING (public.can_manage_commerce())
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS categories_delete_admin ON public.categories;
CREATE POLICY categories_delete_admin
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS vendors_select_pii_roles ON public.vendors;
CREATE POLICY vendors_select_pii_roles
  ON public.vendors FOR SELECT TO authenticated
  USING (public.can_view_pii());

DROP POLICY IF EXISTS vendors_write_commerce ON public.vendors;
CREATE POLICY vendors_write_commerce
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS vendors_update_commerce ON public.vendors;
CREATE POLICY vendors_update_commerce
  ON public.vendors FOR UPDATE TO authenticated
  USING (public.can_manage_commerce())
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS customers_select_pii_roles ON public.customers;
CREATE POLICY customers_select_pii_roles
  ON public.customers FOR SELECT TO authenticated
  USING (public.can_view_pii());

DROP POLICY IF EXISTS customers_write_ops_support ON public.customers;
CREATE POLICY customers_write_ops_support
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_view_pii());

DROP POLICY IF EXISTS customers_update_ops_support ON public.customers;
CREATE POLICY customers_update_ops_support
  ON public.customers FOR UPDATE TO authenticated
  USING (public.can_view_pii())
  WITH CHECK (public.can_view_pii());

DROP POLICY IF EXISTS products_select_staff ON public.products;
CREATE POLICY products_select_staff
  ON public.products FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS products_write_commerce ON public.products;
CREATE POLICY products_write_commerce
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS products_update_commerce ON public.products;
CREATE POLICY products_update_commerce
  ON public.products FOR UPDATE TO authenticated
  USING (public.can_manage_commerce())
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS orders_select_staff ON public.orders;
CREATE POLICY orders_select_staff
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS orders_write_commerce ON public.orders;
CREATE POLICY orders_write_commerce
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS orders_update_commerce ON public.orders;
CREATE POLICY orders_update_commerce
  ON public.orders FOR UPDATE TO authenticated
  USING (public.can_manage_commerce())
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS order_items_select_staff ON public.order_items;
CREATE POLICY order_items_select_staff
  ON public.order_items FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS order_items_write_commerce ON public.order_items;
CREATE POLICY order_items_write_commerce
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS order_items_update_commerce ON public.order_items;
CREATE POLICY order_items_update_commerce
  ON public.order_items FOR UPDATE TO authenticated
  USING (public.can_manage_commerce())
  WITH CHECK (public.can_manage_commerce());

DROP POLICY IF EXISTS conversation_sessions_select_ops ON public.conversation_sessions;
CREATE POLICY conversation_sessions_select_ops
  ON public.conversation_sessions FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

DROP POLICY IF EXISTS message_logs_select_ops ON public.message_logs;
CREATE POLICY message_logs_select_ops
  ON public.message_logs FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

DROP POLICY IF EXISTS support_tickets_select_ops ON public.support_tickets;
CREATE POLICY support_tickets_select_ops
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SUPPORT']));

DROP POLICY IF EXISTS support_tickets_write_support ON public.support_tickets;
CREATE POLICY support_tickets_write_support
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

DROP POLICY IF EXISTS support_tickets_update_support ON public.support_tickets;
CREATE POLICY support_tickets_update_support
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'SUPPORT']))
  WITH CHECK (public.has_role(ARRAY['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

DROP POLICY IF EXISTS analytics_events_select_staff ON public.analytics_events;
CREATE POLICY analytics_events_select_staff
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS audit_logs_insert_admin ON public.audit_logs;
CREATE POLICY audit_logs_insert_admin
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND admin_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.categories FROM anon;
REVOKE ALL ON TABLE public.vendors FROM anon;
REVOKE ALL ON TABLE public.customers FROM anon;
REVOKE ALL ON TABLE public.products FROM anon;
REVOKE ALL ON TABLE public.orders FROM anon;
REVOKE ALL ON TABLE public.order_items FROM anon;
REVOKE ALL ON TABLE public.conversation_sessions FROM anon;
REVOKE ALL ON TABLE public.message_logs FROM anon;
REVOKE ALL ON TABLE public.support_tickets FROM anon;
REVOKE ALL ON TABLE public.analytics_events FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM anon;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.vendors TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.order_items TO authenticated;
GRANT SELECT ON TABLE public.conversation_sessions TO authenticated;
GRANT SELECT ON TABLE public.message_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.support_tickets TO authenticated;
GRANT SELECT ON TABLE public.analytics_events TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_commerce() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_pii() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_vendor_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_number() TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- Application code must still validate file type from content, not MIME.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'vendor-profile-images',
    'vendor-profile-images',
    false,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'product-images',
    'product-images',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS vendor_profile_images_select_staff ON storage.objects;
CREATE POLICY vendor_profile_images_select_staff
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vendor-profile-images' AND public.is_staff());

DROP POLICY IF EXISTS vendor_profile_images_write_commerce ON storage.objects;
CREATE POLICY vendor_profile_images_write_commerce
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vendor-profile-images' AND public.can_manage_commerce());

DROP POLICY IF EXISTS vendor_profile_images_update_commerce ON storage.objects;
CREATE POLICY vendor_profile_images_update_commerce
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vendor-profile-images' AND public.can_manage_commerce())
  WITH CHECK (bucket_id = 'vendor-profile-images' AND public.can_manage_commerce());

DROP POLICY IF EXISTS product_images_select_staff ON storage.objects;
CREATE POLICY product_images_select_staff
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.is_staff());

DROP POLICY IF EXISTS product_images_write_commerce ON storage.objects;
CREATE POLICY product_images_write_commerce
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.can_manage_commerce());

DROP POLICY IF EXISTS product_images_update_commerce ON storage.objects;
CREATE POLICY product_images_update_commerce
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.can_manage_commerce())
  WITH CHECK (bucket_id = 'product-images' AND public.can_manage_commerce());

-- ---------------------------------------------------------------------------
-- Category seed
-- ---------------------------------------------------------------------------

INSERT INTO public.categories (name, slug, status, sort_order)
VALUES
  ('Fresh Produce', 'fresh-produce', 'ACTIVE', 10),
  ('Prepared Food', 'prepared-food', 'ACTIVE', 20),
  ('Groceries', 'groceries', 'ACTIVE', 30),
  ('Clothing', 'clothing', 'ACTIVE', 40),
  ('Footwear', 'footwear', 'ACTIVE', 50),
  ('Mobile Accessories', 'mobile-accessories', 'ACTIVE', 60),
  ('Electronics', 'electronics', 'ACTIVE', 70),
  ('Household Goods', 'household-goods', 'ACTIVE', 80),
  ('Personal Care', 'personal-care', 'ACTIVE', 90),
  ('Other', 'other', 'ACTIVE', 100)
ON CONFLICT (slug) DO NOTHING;
