-- D-462 BlogPosts featured-image relationship repair plan.
--
-- Purpose:
--   Repair the additive relationship field already declared in
--   src/collections/BlogPosts.ts as featuredImage -> media.
--
-- Current blocker proved by a local build:
--   blog_posts.featured_image_id does not exist
--
-- IMPORTANT:
--   Review this plan and run the read-only preflight before applying:
--   npm run smoke:blog-schema:read -- --confirm-read-only
--
-- This plan assumes the existing Payload collection tables blog_posts and
-- media both exist. It is deliberately limited to the missing relationship;
-- it does not attempt to create a whole collection table.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.blog_posts') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.blog_posts';
  END IF;

  IF to_regclass('public.media') IS NULL THEN
    RAISE EXCEPTION 'Missing required table: public.media';
  END IF;
END $$;

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS featured_image_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_info
    JOIN LATERAL unnest(constraint_info.conkey, constraint_info.confkey) AS key_pair(source_attnum, target_attnum) ON TRUE
    JOIN pg_attribute source_column
      ON source_column.attrelid = constraint_info.conrelid
     AND source_column.attnum = key_pair.source_attnum
    JOIN pg_attribute target_column
      ON target_column.attrelid = constraint_info.confrelid
     AND target_column.attnum = key_pair.target_attnum
    WHERE constraint_info.contype = 'f'
      AND constraint_info.conrelid = 'public.blog_posts'::regclass
      AND constraint_info.confrelid = 'public.media'::regclass
      AND source_column.attname = 'featured_image_id'
      AND target_column.attname = 'id'
      AND constraint_info.confdeltype = 'n'
  ) THEN
    ALTER TABLE blog_posts
      ADD CONSTRAINT blog_posts_featured_image_id_media_id_fk
      FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS blog_posts_featured_image_id_idx
  ON blog_posts (featured_image_id);

COMMIT;
