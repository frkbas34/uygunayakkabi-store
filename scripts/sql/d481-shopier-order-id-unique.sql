-- D-481: make non-empty Shopier order IDs unique without constraining
-- manually created/non-Shopier orders that do not have an external ID.
-- CREATE INDEX CONCURRENTLY must not run inside a transaction.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS orders_shopier_order_id_unique_idx
  ON public.orders (shopier_order_id)
  WHERE shopier_order_id IS NOT NULL AND btrim(shopier_order_id) <> '';
