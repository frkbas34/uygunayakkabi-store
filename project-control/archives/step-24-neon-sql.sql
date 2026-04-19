-- ============================================================================
-- Step 24 — Neon SQL: Create image_generation_jobs tables
-- ============================================================================
-- Generated: 2026-03-24
-- Source: src/collections/ImageGenerationJobs.ts (schema-derived)
-- Context: push:true is blocked in production (NODE_ENV=production guard)
--          This SQL must be run MANUALLY in Neon dashboard.
--
-- Payload v3.79 + @payloadcms/db-postgres + drizzle-orm conventions:
--   - Collection slug "image-generation-jobs" → table "image_generation_jobs"
--   - idType: serial (project default — no custom idType in payload.config.ts)
--   - select fields → PostgreSQL ENUMs: enum_{table}_{field}
--   - relationship hasMany → separate _rels join table
--   - Payload auto-columns: id, updated_at, created_at
--   - payload_locked_documents_rels needs a column for this collection
--
-- EXECUTION ORDER:
--   1. Create ENUMs (mode, status)
--   2. Create main table (image_generation_jobs)
--   3. Create rels table (image_generation_jobs_rels)
--   4. Add column to payload_locked_documents_rels
--   5. Add foreign key constraints
--   6. Create indexes
-- ============================================================================


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — REQUIRED SQL                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝


-- ── 1.1  ENUMs ──────────────────────────────────────────────────────────────
-- Payload creates a PG ENUM for each non-hasMany select field.
-- Naming convention: enum_{table_name}_{field_name}

DO $$ BEGIN
  CREATE TYPE "enum_image_generation_jobs_mode" AS ENUM (
    'hizli',
    'dengeli',
    'premium',
    'karma'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "enum_image_generation_jobs_status" AS ENUM (
    'queued',
    'generating',
    'review',
    'approved',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 1.2  Main table ────────────────────────────────────────────────────────
-- Maps 1:1 to ImageGenerationJobs.ts fields.
-- Payload auto-adds: id (serial PK), updated_at, created_at
-- relationship (non-hasMany) "product" → integer FK column "product_id"
-- relationship (hasMany) "generatedImages" → stored in _rels table (not here)

CREATE TABLE IF NOT EXISTS "image_generation_jobs" (
  "id"                       serial PRIMARY KEY NOT NULL,
  "job_title"                varchar,
  "product_id"               integer NOT NULL,
  "mode"                     "enum_image_generation_jobs_mode" NOT NULL DEFAULT 'hizli',
  "status"                   "enum_image_generation_jobs_status" NOT NULL DEFAULT 'queued',
  "prompts_used"             varchar,
  "provider_results"         varchar,
  "error_message"            varchar,
  "telegram_chat_id"         varchar,
  "requested_by_user_id"     varchar,
  "generation_started_at"    timestamp(3) with time zone,
  "generation_completed_at"  timestamp(3) with time zone,
  "image_count"              numeric DEFAULT 0,
  "updated_at"               timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at"               timestamp(3) with time zone DEFAULT now() NOT NULL
);


-- ── 1.3  Relationships table ────────────────────────────────────────────────
-- Payload creates a _rels table for collections that have hasMany relationships.
-- "generatedImages" is relationship hasMany to "media" → needs this table.
-- Columns: id (serial PK), order, parent_id (FK → image_generation_jobs.id),
--          path (varchar, stores field name), media_id (FK → media.id)

CREATE TABLE IF NOT EXISTS "image_generation_jobs_rels" (
  "id"         serial PRIMARY KEY NOT NULL,
  "order"      integer,
  "parent_id"  integer NOT NULL,
  "path"       varchar NOT NULL,
  "media_id"   integer
);


-- ── 1.4  payload_locked_documents_rels — add column for this collection ─────
-- Payload's internal locked-documents system tracks which documents are being
-- edited. The _rels table needs a column for each collection.
-- Column naming: {snake_case_collection}_id

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "image_generation_jobs_id" integer;


-- ── 1.5  Foreign key constraints ────────────────────────────────────────────
-- Main table: product_id → products(id)
DO $$ BEGIN
  ALTER TABLE "image_generation_jobs"
    ADD CONSTRAINT "image_generation_jobs_product_id_products_id_fk"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rels table: parent_id → image_generation_jobs(id)
DO $$ BEGIN
  ALTER TABLE "image_generation_jobs_rels"
    ADD CONSTRAINT "image_generation_jobs_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "image_generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rels table: media_id → media(id)
DO $$ BEGIN
  ALTER TABLE "image_generation_jobs_rels"
    ADD CONSTRAINT "image_generation_jobs_rels_media_fk"
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Locked documents rels: image_generation_jobs_id → image_generation_jobs(id)
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_image_generation_jobs_fk"
    FOREIGN KEY ("image_generation_jobs_id") REFERENCES "image_generation_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 1.6  Required indexes ───────────────────────────────────────────────────
-- Payload creates these indexes automatically via push:true.
-- We replicate them manually.

-- Main table: created_at index (Payload standard)
CREATE INDEX IF NOT EXISTS "image_generation_jobs_created_at_idx"
  ON "image_generation_jobs" USING btree ("created_at");

-- Main table: product_id index (for FK lookups)
CREATE INDEX IF NOT EXISTS "image_generation_jobs_product_idx"
  ON "image_generation_jobs" USING btree ("product_id");

-- Rels table: standard Payload indexes
CREATE INDEX IF NOT EXISTS "image_generation_jobs_rels_order_idx"
  ON "image_generation_jobs_rels" USING btree ("order");

CREATE INDEX IF NOT EXISTS "image_generation_jobs_rels_parent_idx"
  ON "image_generation_jobs_rels" USING btree ("parent_id");

CREATE INDEX IF NOT EXISTS "image_generation_jobs_rels_path_idx"
  ON "image_generation_jobs_rels" USING btree ("path");

CREATE INDEX IF NOT EXISTS "image_generation_jobs_rels_media_id_idx"
  ON "image_generation_jobs_rels" USING btree ("media_id");

-- Locked documents rels: index for the new column
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_image_generation_jobs_id_idx"
  ON "payload_locked_documents_rels" USING btree ("image_generation_jobs_id");


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — OPTIONAL / NICE-TO-HAVE SQL                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Status + created_at compound index (useful for admin list filtering)
-- CREATE INDEX IF NOT EXISTS "image_generation_jobs_status_created_idx"
--   ON "image_generation_jobs" USING btree ("status", "created_at" DESC);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — POST-RUN VERIFICATION QUERIES                              ║
-- ║  Run these AFTER executing all statements above.                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- V1: Confirm main table exists with correct columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'image_generation_jobs'
-- ORDER BY ordinal_position;

-- V2: Confirm rels table exists with correct columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'image_generation_jobs_rels'
-- ORDER BY ordinal_position;

-- V3: Confirm enums exist with correct values
-- SELECT enumlabel FROM pg_enum
-- JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
-- WHERE pg_type.typname = 'enum_image_generation_jobs_mode'
-- ORDER BY enumsortorder;

-- SELECT enumlabel FROM pg_enum
-- JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
-- WHERE pg_type.typname = 'enum_image_generation_jobs_status'
-- ORDER BY enumsortorder;

-- V4: Confirm locked_documents_rels has the new column
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'payload_locked_documents_rels'
--   AND column_name = 'image_generation_jobs_id';

-- V5: Confirm foreign keys exist
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name IN ('image_generation_jobs', 'image_generation_jobs_rels')
--   AND constraint_type = 'FOREIGN KEY';

-- V6: Quick smoke test — insert and delete a test row
-- INSERT INTO "image_generation_jobs" ("product_id", "mode", "status", "job_title")
-- VALUES (1, 'hizli', 'queued', 'TEST — sil bunu');
-- DELETE FROM "image_generation_jobs" WHERE "job_title" = 'TEST — sil bunu';
