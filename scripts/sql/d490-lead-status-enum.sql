-- D-490 customer-inquiries status enum extension.
-- Run only through the guarded apply helper after a clean read-only preflight.

ALTER TYPE public.enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE public.enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_won';
ALTER TYPE public.enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_lost';
ALTER TYPE public.enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'spam';
