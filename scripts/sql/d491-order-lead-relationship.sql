-- D-491 order-to-lead relationship schema prerequisite.
-- Run only through the guarded apply helper after a clean read-only preflight.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS related_inquiry_id integer
  REFERENCES public.customer_inquiries(id) ON DELETE SET NULL;
