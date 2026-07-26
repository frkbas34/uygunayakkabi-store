-- Image Slot Lineage V1 runtime-first rollback compatibility proof.
-- The expanded columns remain; old-shape reads and writes must still succeed.

\set ON_ERROR_STOP on

BEGIN;

SELECT id, product_ref, status, provider, legacy_result, created_at, updated_at
FROM public.image_generation_jobs ORDER BY id;

INSERT INTO public.image_generation_jobs
  (id, product_ref, status, provider, legacy_result, created_at, updated_at)
VALUES
  (105, 'synthetic-runtime-rollback-e', 'pending', NULL, NULL, '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z');

UPDATE public.image_generation_jobs
SET status = 'completed', updated_at = '2026-01-05T01:00:00Z'
WHERE id = 105;

INSERT INTO public.media
  (id, filename, alt, mime_type, filesize, created_at, updated_at)
VALUES
  (209, 'synthetic-runtime-rollback-e.webp', NULL, 'image/webp', 45678, '2026-01-05T00:00:00Z', '2026-01-05T00:00:00Z');

UPDATE public.media
SET alt = 'Synthetic runtime rollback fixture E', updated_at = '2026-01-05T01:00:00Z'
WHERE id = 209;

DO $runtime_first$
BEGIN
  IF (SELECT count(*) FROM public.image_generation_jobs) <> 5 THEN
    RAISE EXCEPTION 'runtime-first job row count mismatch';
  END IF;
  IF (SELECT count(*) FROM public.media) <> 9 THEN
    RAISE EXCEPTION 'runtime-first Media row count mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.image_generation_jobs
    WHERE id IN (101, 102, 103, 105)
      AND (generation_contract_version IS NOT NULL OR active_attempt_id IS NOT NULL OR generation_attempts IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'runtime-first old-shape job gained lineage';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.media
    WHERE id IN (201, 202, 203, 209)
      AND (
        generation_lineage_contract_version IS NOT NULL OR
        generation_lineage_job_id IS NOT NULL OR
        generation_lineage_attempt_id IS NOT NULL OR
        generation_lineage_slot_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'runtime-first old-shape Media gained lineage';
  END IF;
  IF (SELECT count(*) FROM public.media WHERE id BETWEEN 204 AND 208) <> 5 THEN
    RAISE EXCEPTION 'runtime-first proof changed new-lineage rows';
  END IF;
END
$runtime_first$;

COMMIT;

SELECT 'RUNTIME_FIRST_ROLLBACK_PASS';
