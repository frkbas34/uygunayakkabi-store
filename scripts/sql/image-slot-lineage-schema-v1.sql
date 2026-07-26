-- Image Slot Lineage Schema V1 additive expansion.
--
-- This migration is intentionally nullable, default-free, index-free, and
-- foreign-key-free. Historical image jobs and Media records require no
-- backfill. Run only through the guarded apply helper after backup evidence,
-- target verification, and operator approval.

BEGIN;

-- Fail quickly instead of waiting indefinitely for an ACCESS EXCLUSIVE lock.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.image_generation_jobs
  ADD COLUMN IF NOT EXISTS generation_contract_version varchar,
  ADD COLUMN IF NOT EXISTS active_attempt_id varchar,
  ADD COLUMN IF NOT EXISTS generation_attempts jsonb;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS generation_lineage_contract_version varchar,
  ADD COLUMN IF NOT EXISTS generation_lineage_job_id varchar,
  ADD COLUMN IF NOT EXISTS generation_lineage_attempt_id varchar,
  ADD COLUMN IF NOT EXISTS generation_lineage_slot_id varchar;

COMMIT;
