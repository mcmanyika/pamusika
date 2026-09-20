CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  rater_type text NOT NULL CHECK (rater_type IN ('CUSTOMER', 'VENDOR')),
  rater_id uuid NOT NULL,
  ratee_type text NOT NULL CHECK (ratee_type IN ('CUSTOMER', 'VENDOR')),
  ratee_id uuid NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, rater_type),
  CHECK (rater_type <> ratee_type)
);

CREATE INDEX IF NOT EXISTS ratings_order_id_idx ON public.ratings (order_id);
CREATE INDEX IF NOT EXISTS ratings_ratee_idx ON public.ratings (ratee_type, ratee_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ratings_select_staff ON public.ratings;
CREATE POLICY ratings_select_staff
  ON public.ratings FOR SELECT TO authenticated
  USING (public.is_staff());

REVOKE ALL ON TABLE public.ratings FROM anon;
GRANT SELECT ON TABLE public.ratings TO authenticated;
