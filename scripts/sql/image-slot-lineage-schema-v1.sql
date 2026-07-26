-- Image Slot Lineage Schema V1 additive expansion.
--
-- This migration is intentionally nullable, default-free, index-free, and
-- foreign-key-free. Historical image jobs and Media records require no
-- backfill. This file is a transaction body: the guarded apply process must
-- open, commit, or roll back the single transaction after target verification
-- and operator approval. Manual psql use requires --single-transaction.

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
