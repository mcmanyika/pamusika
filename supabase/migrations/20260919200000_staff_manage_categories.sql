-- Staff may add, rename, and delete product categories from the admin console.
-- Deleting a category sets products.category_id and vendors.primary_category_id to null.

DROP POLICY IF EXISTS categories_write_commerce ON public.categories;
DROP POLICY IF EXISTS categories_write_staff ON public.categories;
CREATE POLICY categories_write_staff
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS categories_update_commerce ON public.categories;
DROP POLICY IF EXISTS categories_update_staff ON public.categories;
CREATE POLICY categories_update_staff
  ON public.categories FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS categories_delete_admin ON public.categories;
DROP POLICY IF EXISTS categories_delete_staff ON public.categories;
CREATE POLICY categories_delete_staff
  ON public.categories FOR DELETE TO authenticated
  USING (public.is_staff());
