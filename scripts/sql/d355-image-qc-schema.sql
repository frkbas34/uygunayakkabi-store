-- D-355 Image QC schema drift repair plan.
--
-- Purpose:
--   Add the Payload fields introduced by D-355 structured Image QC.
--
-- Current blocker proved by:
--   npm run smoke:imageqc:schema -- --confirm-read-only
--
-- IMPORTANT:
--   Verify this against Payload/Drizzle output or a staging database before
--   applying to production. This file follows the observed Payload v3
--   hasMany select table shape from products_channel_targets:
--   "order", parent_id, value, id SERIAL.
--
-- After applying/verification, rerun:
--   npm run smoke:imageqc:schema -- --confirm-read-only
--   npm run smoke:shopier:read -- --confirm-read-only

BEGIN;

DO $$
BEGIN
  CREATE TYPE enum_products_image_quality_status AS ENUM (
    'pending',
    'pass',
    'review',
    'fail'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE enum_products_image_quality_defect_flags AS ENUM (
    'torn_or_cracked',
    'peeling_texture',
    'deformed_toe_or_heel',
    'wrong_stitching',
    'fake_stains',
    'distorted_sole_join',
    'color_drift',
    'invented_logo_or_brand',
    'background_drift',
    'crop_or_scale_issue',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_quality_status enum_products_image_quality_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS image_quality_notes text,
  ADD COLUMN IF NOT EXISTS image_quality_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS image_quality_checked_by varchar,
  ADD COLUMN IF NOT EXISTS image_quality_source varchar;

CREATE TABLE IF NOT EXISTS products_image_quality_defect_flags (
  "order" integer NOT NULL,
  parent_id integer NOT NULL,
  value enum_products_image_quality_defect_flags,
  id SERIAL PRIMARY KEY
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_image_quality_defect_flags_parent_fk'
  ) THEN
    ALTER TABLE products_image_quality_defect_flags
      ADD CONSTRAINT products_image_quality_defect_flags_parent_fk
      FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_image_quality_defect_flags_order_idx
  ON products_image_quality_defect_flags ("order");

CREATE INDEX IF NOT EXISTS products_image_quality_defect_flags_parent_idx
  ON products_image_quality_defect_flags (parent_id);

COMMIT;

