-- Phase 2: order completion RPC, transition guard, and idempotency keys.
-- Prerequisite: run 20260919100000_init.sql first.
--
-- Inventory behaviour:
--   products.quantity is sellable stock. Pending/accepted/ready orders do
--   not reserve stock. Stock is decremented only when an order is completed
--   by complete_order_and_decrement_stock(), which locks the order and
--   product rows and rejects a negative remainder.
--   Completing an already COMPLETED order is a no-op.

DO $$
BEGIN
  IF to_regclass('public.orders') IS NULL THEN
    RAISE EXCEPTION 'public.orders does not exist. Run supabase/migrations/20260919100000_init.sql before this file.';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, operation)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.idempotency_keys FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PENDING_VENDOR' AND NEW.status IN ('ACCEPTED', 'DECLINED', 'CANCELLED') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'ACCEPTED' AND NEW.status IN ('PREPARING', 'READY', 'CANCELLED') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PREPARING' AND NEW.status IN ('READY', 'CANCELLED') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'READY' AND NEW.status = 'COMPLETED' THEN
    IF current_setting('paysell.completing_order', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'INVALID_ORDER_TRANSITION: orders can only be completed via complete_order_and_decrement_stock';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'INVALID_ORDER_TRANSITION: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_status_transition ON public.orders;
CREATE TRIGGER enforce_order_status_transition
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

CREATE OR REPLACE FUNCTION public.complete_order_and_decrement_stock(p_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_available numeric;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_order.status = 'COMPLETED' THEN
    RETURN v_order;
  END IF;

  IF v_order.status <> 'READY' THEN
    RAISE EXCEPTION 'INVALID_ORDER_TRANSITION: % -> COMPLETED', v_order.status;
  END IF;

  FOR v_item IN
    SELECT * FROM public.order_items WHERE order_id = p_order_id
  LOOP
    IF v_item.product_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT quantity INTO v_available
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;

    IF v_available < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY';
    END IF;

    UPDATE public.products
    SET
      quantity = quantity - v_item.quantity,
      status = CASE
        WHEN quantity - v_item.quantity <= 0 THEN 'OUT_OF_STOCK'
        ELSE status
      END
    WHERE id = v_item.product_id;
  END LOOP;

  PERFORM set_config('paysell.completing_order', 'on', true);

  UPDATE public.orders
  SET
    status = 'COMPLETED',
    completed_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_order_and_decrement_stock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_order_and_decrement_stock(uuid) TO service_role;
