-- PaySell development seed.
-- Safe to re-run: inserts use fixed UUIDs and ON CONFLICT DO NOTHING.
-- Do not use real personal information.
--
-- Apply after migrations. Categories come from 20260919100000_init.sql.
--
-- After creating the first Auth user, promote it:
--
--   UPDATE public.profiles
--   SET role = 'SUPER_ADMIN'
--   WHERE email = 'you@example.com';

INSERT INTO public.vendors (
  id, vendor_code, whatsapp_number, first_name, business_name, primary_category_id,
  country, city, area, market_name, preferred_language, status, verification_status
)
SELECT 'a1111111-1111-4111-8111-111111111111', 'PS-HRE-000101', '+263771000001', 'Tariro',
  'Tariro Fresh Produce', id, 'Zimbabwe', 'Harare', 'Mbare', 'Mbare Musika', 'en', 'ACTIVE', 'VERIFIED'
FROM public.categories WHERE slug = 'fresh-produce'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendors (
  id, vendor_code, whatsapp_number, first_name, business_name, primary_category_id,
  country, city, area, market_name, preferred_language, status, verification_status
)
SELECT 'a2222222-2222-4222-8222-222222222222', 'PS-HRE-000102', '+263771000002', 'Farai',
  'Mbare Market Foods', id, 'Zimbabwe', 'Harare', 'Mbare', 'Mbare Musika', 'en', 'ACTIVE', 'VERIFIED'
FROM public.categories WHERE slug = 'prepared-food'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendors (
  id, vendor_code, whatsapp_number, first_name, business_name, primary_category_id,
  country, city, area, market_name, preferred_language, status, verification_status
)
SELECT 'a3333333-3333-4333-8333-333333333333', 'PS-HRE-000103', '+263771000003', 'Chipo',
  'Chipo Clothing', id, 'Zimbabwe', 'Harare', 'CBD', NULL, 'en', 'ACTIVE', 'UNVERIFIED'
FROM public.categories WHERE slug = 'clothing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendors (
  id, vendor_code, whatsapp_number, first_name, business_name, primary_category_id,
  country, city, area, market_name, preferred_language, status, verification_status
)
SELECT 'a4444444-4444-4444-8444-444444444444', 'PS-HRE-000104', '+263771000004', 'Tendai',
  'Tendai Mobile Accessories', id, 'Zimbabwe', 'Harare', 'Avondale', NULL, 'en', 'ACTIVE', 'VERIFIED'
FROM public.categories WHERE slug = 'mobile-accessories'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vendors (
  id, vendor_code, whatsapp_number, first_name, business_name, primary_category_id,
  country, city, area, market_name, preferred_language, status, verification_status
)
SELECT 'a5555555-5555-4555-8555-555555555555', 'PS-HRE-000105', '+263771000005', 'Rudo',
  'Sunrise Household Goods', id, 'Zimbabwe', 'Chitungwiza', 'Unit L', 'Chitungwiza Town Centre', 'en', 'ACTIVE', 'PENDING'
FROM public.categories WHERE slug = 'household-goods'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, whatsapp_number, display_name, country, city, area, preferred_language)
VALUES
  ('b1111111-1111-4111-8111-111111111111', '+263772000001', 'Nyasha', 'Zimbabwe', 'Harare', 'Mbare', 'en'),
  ('b2222222-2222-4222-8222-222222222222', '+263772000002', 'Tinashe', 'Zimbabwe', 'Harare', 'Avondale', 'en'),
  ('b3333333-3333-4333-8333-333333333333', '+263772000003', 'Rudo', 'Zimbabwe', 'Harare', 'CBD', 'en'),
  ('b4444444-4444-4444-8444-444444444444', '+263772000004', 'Farai', 'Zimbabwe', 'Chitungwiza', 'Unit L', 'en'),
  ('b5555555-5555-4555-8555-555555555555', '+263772000005', 'Blessing', 'Zimbabwe', 'Harare', 'Mbare', 'en')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customer_addresses (
  id, customer_id, label, line1, area, city, country, is_default
)
VALUES
  ('d1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111', 'Home', 'Stand 14, Mbare Musika', 'Mbare', 'Harare', 'Zimbabwe', true),
  ('d1111111-1111-4111-8111-111111111112', 'b1111111-1111-4111-8111-111111111111', 'Work', 'Joina City, 8th floor', 'CBD', 'Harare', 'Zimbabwe', false),
  ('d2222222-2222-4222-8222-222222222221', 'b2222222-2222-4222-8222-222222222222', 'Home', '12 King George Road', 'Avondale', 'Harare', 'Zimbabwe', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (
  id, vendor_id, category_id, name, price, currency, quantity, unit, status
)
SELECT 'c1111111-1111-4111-8111-000000000001', 'a1111111-1111-4111-8111-111111111111', id, 'Tomatoes', 1.00, 'USD', 40, 'kg', 'ACTIVE' FROM public.categories WHERE slug = 'fresh-produce'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c1111111-1111-4111-8111-000000000002', 'a1111111-1111-4111-8111-111111111111', id, 'Onions', 0.80, 'USD', 25, 'kg', 'ACTIVE' FROM public.categories WHERE slug = 'fresh-produce'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c1111111-1111-4111-8111-000000000003', 'a1111111-1111-4111-8111-111111111111', id, 'Covo', 0.50, 'USD', 15, 'bundle', 'ACTIVE' FROM public.categories WHERE slug = 'fresh-produce'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c1111111-1111-4111-8111-000000000004', 'a1111111-1111-4111-8111-111111111111', id, 'Potatoes', 1.20, 'USD', 30, 'kg', 'ACTIVE' FROM public.categories WHERE slug = 'fresh-produce'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c2222222-2222-4222-8222-000000000001', 'a2222222-2222-4222-8222-222222222222', id, 'Sadza and relish', 3.00, 'USD', 12, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'prepared-food'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c2222222-2222-4222-8222-000000000002', 'a2222222-2222-4222-8222-222222222222', id, 'Chicken stew', 4.50, 'USD', 8, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'prepared-food'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c2222222-2222-4222-8222-000000000003', 'a2222222-2222-4222-8222-222222222222', id, 'Maheu', 1.00, 'USD', 20, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'prepared-food'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c2222222-2222-4222-8222-000000000004', 'a2222222-2222-4222-8222-222222222222', id, 'Maputi', 0.50, 'USD', 40, 'bag', 'ACTIVE' FROM public.categories WHERE slug = 'prepared-food'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c3333333-3333-4333-8333-000000000001', 'a3333333-3333-4333-8333-333333333333', id, 'Summer dress', 12.00, 'USD', 6, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'clothing'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c3333333-3333-4333-8333-000000000002', 'a3333333-3333-4333-8333-333333333333', id, 'Work shirt', 8.00, 'USD', 10, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'clothing'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c3333333-3333-4333-8333-000000000003', 'a3333333-3333-4333-8333-333333333333', id, 'Wrap skirt', 7.00, 'USD', 5, 'item', 'PAUSED' FROM public.categories WHERE slug = 'clothing'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c3333333-3333-4333-8333-000000000004', 'a3333333-3333-4333-8333-333333333333', id, 'Zambia wrapper', 6.50, 'USD', 9, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'clothing'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c4444444-4444-4444-8444-000000000001', 'a4444444-4444-4444-8444-444444444444', id, 'Phone cover', 2.00, 'USD', 18, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'mobile-accessories'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c4444444-4444-4444-8444-000000000002', 'a4444444-4444-4444-8444-444444444444', id, 'USB charger', 3.50, 'USD', 14, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'mobile-accessories'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c4444444-4444-4444-8444-000000000003', 'a4444444-4444-4444-8444-444444444444', id, 'Earphones', 4.00, 'USD', 11, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'mobile-accessories'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c4444444-4444-4444-8444-000000000004', 'a4444444-4444-4444-8444-444444444444', id, 'Power bank', 15.00, 'USD', 4, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'mobile-accessories'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c5555555-5555-4555-8555-000000000001', 'a5555555-5555-4555-8555-555555555555', id, 'Plastic bucket', 3.00, 'USD', 16, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'household-goods'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c5555555-5555-4555-8555-000000000002', 'a5555555-5555-4555-8555-555555555555', id, 'Broom', 2.50, 'USD', 10, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'household-goods'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c5555555-5555-4555-8555-000000000003', 'a5555555-5555-4555-8555-555555555555', id, 'Dish set', 9.00, 'USD', 3, 'box', 'ACTIVE' FROM public.categories WHERE slug = 'household-goods'
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.products (id, vendor_id, category_id, name, price, currency, quantity, unit, status)
SELECT 'c5555555-5555-4555-8555-000000000004', 'a5555555-5555-4555-8555-555555555555', id, 'Laundry soap', 1.50, 'USD', 22, 'item', 'ACTIVE' FROM public.categories WHERE slug = 'household-goods'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.orders (
  id, order_number, customer_id, vendor_id, status, subtotal, delivery_fee, total, currency,
  fulfilment_method, payment_status, created_at, accepted_at, ready_at, completed_at, cancelled_at
) VALUES
  (
    'd1111111-1111-4111-8111-111111111111', 'PS-10001',
    'b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
    'PENDING_VENDOR', 3.00, 0, 3.00, 'USD', 'COLLECTION', 'UNPAID',
    now() - interval '2 hours', NULL, NULL, NULL, NULL
  ),
  (
    'd2222222-2222-4222-8222-222222222222', 'PS-10002',
    'b2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222',
    'ACCEPTED', 4.50, 0, 4.50, 'USD', 'COLLECTION', 'UNPAID',
    now() - interval '5 hours', now() - interval '4 hours', NULL, NULL, NULL
  ),
  (
    'd3333333-3333-4333-8333-333333333333', 'PS-10003',
    'b3333333-3333-4333-8333-333333333333', 'a4444444-4444-4444-8444-444444444444',
    'READY', 4.00, 0, 4.00, 'USD', 'COLLECTION', 'UNPAID',
    now() - interval '1 day', now() - interval '20 hours', now() - interval '2 hours', NULL, NULL
  ),
  (
    'd4444444-4444-4444-8444-444444444444', 'PS-10004',
    'b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
    'COMPLETED', 6.00, 0, 6.00, 'USD', 'COLLECTION', 'PAID',
    now() - interval '3 days', now() - interval '3 days', now() - interval '2 days', now() - interval '2 days', NULL
  ),
  (
    'd5555555-5555-4555-8555-555555555555', 'PS-10005',
    'b4444444-4444-4444-8444-444444444444', 'a3333333-3333-4333-8333-333333333333',
    'DECLINED', 12.00, 0, 12.00, 'USD', 'COLLECTION', 'UNPAID',
    now() - interval '2 days', NULL, NULL, NULL, NULL
  ),
  (
    'd6666666-6666-4666-8666-666666666666', 'PS-10006',
    'b5555555-5555-4555-8555-555555555555', 'a5555555-5555-4555-8555-555555555555',
    'CANCELLED', 3.00, 0, 3.00, 'USD', 'COLLECTION', 'UNPAID',
    now() - interval '6 hours', NULL, NULL, NULL, now() - interval '5 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_items (
  id, order_id, product_id, product_name_snapshot, quantity, unit, unit_price, total
) VALUES
  ('e1111111-1111-4111-8111-111111111111', 'd1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-000000000001', 'Tomatoes', 3, 'kg', 1.00, 3.00),
  ('e2222222-2222-4222-8222-222222222222', 'd2222222-2222-4222-8222-222222222222', 'c2222222-2222-4222-8222-000000000002', 'Chicken stew', 1, 'item', 4.50, 4.50),
  ('e3333333-3333-4333-8333-333333333333', 'd3333333-3333-4333-8333-333333333333', 'c4444444-4444-4444-8444-000000000003', 'Earphones', 1, 'item', 4.00, 4.00),
  ('e4444444-4444-4444-8444-444444444444', 'd4444444-4444-4444-8444-444444444444', 'c1111111-1111-4111-8111-000000000001', 'Tomatoes', 6, 'kg', 1.00, 6.00),
  ('e5555555-5555-4555-8555-555555555555', 'd5555555-5555-4555-8555-555555555555', 'c3333333-3333-4333-8333-000000000001', 'Summer dress', 1, 'item', 12.00, 12.00),
  ('e6666666-6666-4666-8666-666666666666', 'd6666666-6666-4666-8666-666666666666', 'c5555555-5555-4555-8555-000000000001', 'Plastic bucket', 1, 'item', 3.00, 3.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.support_tickets (
  id, user_type, user_id, phone_number, category, priority, status, description
) VALUES
  (
    'f1111111-1111-4111-8111-111111111111', 'CUSTOMER', 'b5555555-5555-4555-8555-555555555555',
    '+263772000005', 'CONVERSATION', 'NORMAL', 'OPEN', 'Customer asked to talk to support about an order.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.analytics_events (event_name, user_type, user_id, metadata)
VALUES
  ('VENDOR_REGISTERED', 'VENDOR', 'a1111111-1111-4111-8111-111111111111', '{"source":"seed"}'::jsonb),
  ('PRODUCT_SEARCHED', 'CUSTOMER', 'b1111111-1111-4111-8111-111111111111', '{"query":"tomatoes"}'::jsonb),
  ('ORDER_CONFIRMED', 'CUSTOMER', 'b1111111-1111-4111-8111-111111111111', '{"orderNumber":"PS-10001"}'::jsonb),
  ('ORDER_COMPLETED', 'VENDOR', 'a1111111-1111-4111-8111-111111111111', '{"orderNumber":"PS-10004"}'::jsonb),
  ('SUPPORT_REQUESTED', 'CUSTOMER', 'b5555555-5555-4555-8555-555555555555', '{"source":"seed"}'::jsonb);

SELECT setval('public.vendor_code_seq', 105, true);
SELECT setval('public.order_number_seq', 10006, true);
