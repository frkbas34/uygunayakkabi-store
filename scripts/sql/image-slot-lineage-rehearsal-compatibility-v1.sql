-- Image Slot Lineage V1 deterministic old-shape and new-lineage compatibility.
-- Run only against the disposable schema harness after the governed expansion.

\set ON_ERROR_STOP on

BEGIN;

-- Old runtime reads ignore every new lineage column.
SELECT id, product_ref, status, provider, legacy_result, created_at, updated_at
FROM public.image_generation_jobs
WHERE id IN (101, 102)
ORDER BY id;

SELECT id, filename, alt, mime_type, filesize, created_at, updated_at
FROM public.media
WHERE id IN (201, 202)
ORDER BY id;

-- Old-shape writes omit all seven new columns.
INSERT INTO public.image_generation_jobs
  (id, product_ref, status, provider, legacy_result, created_at, updated_at)
VALUES
  (103, 'synthetic-old-shape-c', 'pending', 'fixture', '{"fixture": "old-shape"}'::jsonb, '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z');

UPDATE public.image_generation_jobs
SET status = 'completed', updated_at = '2026-01-03T01:00:00Z'
WHERE id = 103;

INSERT INTO public.media
  (id, filename, alt, mime_type, filesize, created_at, updated_at)
VALUES
  (203, 'synthetic-old-shape-c.webp', NULL, 'image/webp', 34567, '2026-01-03T00:00:00Z', '2026-01-03T00:00:00Z');

UPDATE public.media
SET alt = 'Synthetic old-shape fixture C', updated_at = '2026-01-03T01:00:00Z'
WHERE id = 203;

DO $old_style$
BEGIN
  IF (SELECT count(*) FROM public.image_generation_jobs WHERE id IN (101, 102, 103)) <> 3 THEN
    RAISE EXCEPTION 'old-style job row count mismatch';
  END IF;
  IF (SELECT count(*) FROM public.media WHERE id IN (201, 202, 203)) <> 3 THEN
    RAISE EXCEPTION 'old-style Media row count mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.image_generation_jobs
    WHERE id IN (101, 102, 103)
      AND (generation_contract_version IS NOT NULL OR active_attempt_id IS NOT NULL OR generation_attempts IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'old-style job write injected lineage';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.media
    WHERE id IN (201, 202, 203)
      AND (
        generation_lineage_contract_version IS NOT NULL OR
        generation_lineage_job_id IS NOT NULL OR
        generation_lineage_attempt_id IS NOT NULL OR
        generation_lineage_slot_id IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'old-style Media write injected lineage';
  END IF;
END
$old_style$;

-- New-lineage job round trip.
INSERT INTO public.image_generation_jobs
  (
    id, product_ref, status, provider, legacy_result, created_at, updated_at,
    generation_contract_version, active_attempt_id, generation_attempts
  )
VALUES
  (
    104, 'synthetic-lineage-d', 'completed', 'fixture', '{"fixture": "new-lineage"}'::jsonb,
    '2026-01-04T00:00:00Z', '2026-01-04T00:00:00Z',
    'image-slot-contract/v1', 'iga_11111111-1111-4111-8111-111111111111',
    '{"attempts":[{"attemptId":"iga_11111111-1111-4111-8111-111111111111","slots":["side","hero_3q","top","back","detail"],"status":"completed"}],"contractVersion":"image-slot-contract/v1"}'::jsonb
  );

-- One Media row per canonical semantic slot.
INSERT INTO public.media
  (
    id, filename, alt, mime_type, filesize, created_at, updated_at,
    generation_lineage_contract_version, generation_lineage_job_id,
    generation_lineage_attempt_id, generation_lineage_slot_id
  )
SELECT
  204 + slot.ordinality - 1,
  'synthetic-lineage-' || slot.slot_id || '.webp',
  'Synthetic lineage ' || slot.slot_id,
  'image/webp',
  40000 + slot.ordinality,
  '2026-01-04T00:00:00Z',
  '2026-01-04T00:00:00Z',
  'image-slot-contract/v1',
  'igj_synthetic_104',
  'iga_11111111-1111-4111-8111-111111111111',
  slot.slot_id
FROM unnest(ARRAY['side', 'hero_3q', 'top', 'back', 'detail']) WITH ORDINALITY AS slot(slot_id, ordinality);

DO $new_lineage$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.image_generation_jobs
    WHERE id = 104
      AND generation_contract_version = 'image-slot-contract/v1'
      AND active_attempt_id = 'iga_11111111-1111-4111-8111-111111111111'
      AND generation_attempts #>> '{attempts,0,attemptId}' = 'iga_11111111-1111-4111-8111-111111111111'
      AND generation_attempts #>> '{attempts,0,status}' = 'completed'
      AND generation_attempts ->> 'contractVersion' = 'image-slot-contract/v1'
  ) THEN
    RAISE EXCEPTION 'new-lineage job round trip mismatch';
  END IF;
  IF (
    SELECT array_agg(generation_lineage_slot_id ORDER BY id)
    FROM public.media WHERE id BETWEEN 204 AND 208
  ) <> ARRAY['side', 'hero_3q', 'top', 'back', 'detail']::varchar[] THEN
    RAISE EXCEPTION 'canonical slot round trip mismatch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.media WHERE id BETWEEN 204 AND 208 AND (
      generation_lineage_contract_version <> 'image-slot-contract/v1' OR
      generation_lineage_job_id <> 'igj_synthetic_104' OR
      generation_lineage_attempt_id <> 'iga_11111111-1111-4111-8111-111111111111'
    )
  ) THEN
    RAISE EXCEPTION 'Media lineage tuple mismatch';
  END IF;
END
$new_lineage$;

COMMIT;

SELECT 'OLD_STYLE_COMPATIBILITY_PASS';
SELECT generation_contract_version, active_attempt_id, generation_attempts
FROM public.image_generation_jobs WHERE id = 104;
SELECT generation_lineage_slot_id, generation_lineage_contract_version,
       generation_lineage_job_id, generation_lineage_attempt_id
FROM public.media WHERE id BETWEEN 204 AND 208 ORDER BY id;
SELECT 'NEW_LINEAGE_COMPATIBILITY_PASS';
