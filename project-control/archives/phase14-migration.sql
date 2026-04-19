-- =========================================
-- PART 1: Enum types
-- =========================================
DO $$ BEGIN CREATE TYPE "enum_products_workflow_workflow_status" AS ENUM ('draft', 'visual_pending', 'visual_ready', 'confirmation_pending', 'confirmed', 'content_pending', 'content_ready', 'audit_pending', 'publish_ready', 'active', 'soldout', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_visual_status" AS ENUM ('pending', 'generating', 'preview', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_confirmation_status" AS ENUM ('pending', 'confirmed', 'blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_content_status" AS ENUM ('pending', 'commerce_generated', 'discovery_generated', 'ready', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_audit_status" AS ENUM ('not_required', 'pending', 'approved', 'approved_with_warning', 'needs_revision', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_publish_status" AS ENUM ('not_requested', 'pending', 'published', 'partial', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_stock_state" AS ENUM ('in_stock', 'low_stock', 'sold_out', 'restocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_workflow_last_handled_by_bot" AS ENUM ('uygunops', 'geobot', 'mentix', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_story_settings_caption_mode" AS ENUM ('auto', 'manual', 'template'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_story_settings_primary_asset" AS ENUM ('main_image', 'generative', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_content_content_generation_source" AS ENUM ('none', 'geobot', 'manual', 'import'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_audit_result_visual_audit" AS ENUM ('not_reviewed', 'pass', 'pass_with_warning', 'fail'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_audit_result_commerce_audit" AS ENUM ('not_reviewed', 'pass', 'pass_with_warning', 'fail'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_audit_result_discovery_audit" AS ENUM ('not_reviewed', 'pass', 'pass_with_warning', 'fail'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_audit_result_overall_result" AS ENUM ('not_reviewed', 'approved', 'approved_with_warning', 'needs_revision', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_products_audit_result_audited_by_bot" AS ENUM ('mentix', 'operator', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_bot_events_source_bot" AS ENUM ('uygunops', 'geobot', 'mentix', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_bot_events_target_bot" AS ENUM ('uygunops', 'geobot', 'mentix', 'system'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_bot_events_status" AS ENUM ('pending', 'processed', 'failed', 'ignored'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_story_jobs_status" AS ENUM ('queued', 'awaiting_asset', 'awaiting_approval', 'approved', 'publishing', 'published', 'partial_success', 'failed', 'blocked_officially'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_story_jobs_trigger_source" AS ENUM ('auto_publish', 'telegram_command', 'admin', 'retry'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "enum_story_jobs_approval_state" AS ENUM ('not_required', 'pending', 'approved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- PART 2: New tables
-- =========================================
CREATE TABLE IF NOT EXISTS "bot_events" (
  "id" serial PRIMARY KEY,
  "event_type" varchar NOT NULL,
  "source_bot" "enum_bot_events_source_bot" DEFAULT 'uygunops',
  "target_bot" "enum_bot_events_target_bot",
  "status" "enum_bot_events_status" DEFAULT 'pending',
  "payload" jsonb,
  "notes" varchar,
  "processed_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "story_jobs" (
  "id" serial PRIMARY KEY,
  "status" "enum_story_jobs_status" DEFAULT 'queued' NOT NULL,
  "trigger_source" "enum_story_jobs_trigger_source" DEFAULT 'auto_publish',
  "asset_url" varchar,
  "caption" varchar,
  "scheduled_for" timestamptz,
  "published_at" timestamptz,
  "error_log" varchar,
  "approval_state" "enum_story_jobs_approval_state" DEFAULT 'not_required',
  "approval_message_id" varchar,
  "attempt_count" numeric DEFAULT 0,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "homepage_merchandising_settings" (
  "id" serial PRIMARY KEY,
  "section_toggles_enable_yeni" boolean DEFAULT true,
  "section_toggles_enable_popular" boolean DEFAULT true,
  "section_toggles_enable_best_sellers" boolean DEFAULT true,
  "section_toggles_enable_deals" boolean DEFAULT false,
  "section_toggles_enable_discounted" boolean DEFAULT true,
  "item_limits_yeni_limit" numeric DEFAULT 8,
  "item_limits_popular_limit" numeric DEFAULT 8,
  "item_limits_best_seller_limit" numeric DEFAULT 8,
  "item_limits_deal_limit" numeric DEFAULT 4,
  "item_limits_discounted_limit" numeric DEFAULT 8,
  "timing_new_window_days" numeric DEFAULT 7,
  "best_seller_scoring_best_seller_recent_weight7d" numeric DEFAULT 3,
  "best_seller_scoring_best_seller_recent_weight30d" numeric DEFAULT 1,
  "best_seller_scoring_best_seller_minimum_score" numeric DEFAULT 1,
  "behavior_hide_empty_sections" boolean DEFAULT true,
  "behavior_allow_pinned_overrides" boolean DEFAULT true,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- =========================================
-- PART 3: Products new columns
-- =========================================
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_workflow_status" "enum_products_workflow_workflow_status" DEFAULT 'draft';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_visual_status" "enum_products_workflow_visual_status" DEFAULT 'pending';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_confirmation_status" "enum_products_workflow_confirmation_status" DEFAULT 'pending';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_content_status" "enum_products_workflow_content_status" DEFAULT 'pending';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_audit_status" "enum_products_workflow_audit_status" DEFAULT 'not_required';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_publish_status" "enum_products_workflow_publish_status" DEFAULT 'not_requested';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_stock_state" "enum_products_workflow_stock_state" DEFAULT 'in_stock';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_sellable" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_product_confirmed_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "workflow_last_handled_by_bot" "enum_products_workflow_last_handled_by_bot";
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_published_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_new_until" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_manual_popular" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_manual_deal" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_best_seller_pinned" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_best_seller_excluded" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_homepage_hidden" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_total_units_sold" numeric DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_recent_units_sold7d" numeric DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_recent_units_sold30d" numeric DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_best_seller_score" numeric DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "merchandising_last_merchandising_sync_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "story_settings_enabled" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "story_settings_auto_on_publish" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "story_settings_skip_approval" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "story_settings_caption_mode" "enum_products_story_settings_caption_mode" DEFAULT 'auto';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "story_settings_primary_asset" "enum_products_story_settings_primary_asset" DEFAULT 'main_image';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_website_description" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_instagram_caption" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_x_post" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_facebook_copy" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_shopier_copy" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_highlights" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_confidence" numeric;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_warnings" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_commerce_pack_generated_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_article_title" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_article_body" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_meta_title" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_meta_description" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_faq" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_keyword_entities" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_internal_link_targets" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_confidence" numeric;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_warnings" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_discovery_pack_generated_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_linked_blog_post_id" integer;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_content_generation_source" "enum_products_content_content_generation_source" DEFAULT 'none';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "content_last_content_generation_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_visual_audit" "enum_products_audit_result_visual_audit" DEFAULT 'not_reviewed';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_commerce_audit" "enum_products_audit_result_commerce_audit" DEFAULT 'not_reviewed';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_discovery_audit" "enum_products_audit_result_discovery_audit" DEFAULT 'not_reviewed';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_overall_result" "enum_products_audit_result_overall_result" DEFAULT 'not_reviewed';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_approved_for_publish" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_warnings" jsonb;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_revision_notes" varchar;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_audited_at" timestamptz;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "audit_result_audited_by_bot" "enum_products_audit_result_audited_by_bot";

-- =========================================
-- PART 4: Relationships
-- =========================================
ALTER TABLE "bot_events" ADD COLUMN IF NOT EXISTS "product_id" integer;
ALTER TABLE "story_jobs" ADD COLUMN IF NOT EXISTS "product_id" integer NOT NULL;
CREATE TABLE IF NOT EXISTS "story_jobs_targets" (
  "order" integer NOT NULL,
  "parent_id" integer NOT NULL,
  "value" varchar NOT NULL
);
CREATE TABLE IF NOT EXISTS "products_story_settings_story_targets" (
  "order" integer NOT NULL,
  "parent_id" integer NOT NULL,
  "value" varchar NOT NULL
);

-- =========================================
-- PART 5: payload_locked_documents_rels
-- =========================================
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "bot_events_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "story_jobs_id" integer;

-- =========================================
-- PART 6: Indexes
-- =========================================
CREATE INDEX IF NOT EXISTS "bot_events_created_at_idx" ON "bot_events" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "bot_events_updated_at_idx" ON "bot_events" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "bot_events_product_idx" ON "bot_events" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "story_jobs_created_at_idx" ON "story_jobs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "story_jobs_updated_at_idx" ON "story_jobs" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "story_jobs_product_idx" ON "story_jobs" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "story_jobs_targets_order_idx" ON "story_jobs_targets" USING btree ("order");
CREATE INDEX IF NOT EXISTS "story_jobs_targets_parent_idx" ON "story_jobs_targets" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "products_story_settings_story_targets_order_idx" ON "products_story_settings_story_targets" USING btree ("order");
CREATE INDEX IF NOT EXISTS "products_story_settings_story_targets_parent_idx" ON "products_story_settings_story_targets" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "homepage_merchandising_settings_created_at_idx" ON "homepage_merchandising_settings" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "homepage_merchandising_settings_updated_at_idx" ON "homepage_merchandising_settings" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_bot_events_id_idx" ON "payload_locked_documents_rels" USING btree ("bot_events_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_story_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("story_jobs_id");

-- =========================================
-- PART 7: Foreign keys
-- =========================================
DO $$ BEGIN ALTER TABLE "bot_events" ADD CONSTRAINT "bot_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "story_jobs" ADD CONSTRAINT "story_jobs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "story_jobs_targets" ADD CONSTRAINT "story_jobs_targets_parent_id_story_jobs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "story_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "products_story_settings_story_targets" ADD CONSTRAINT "products_story_settings_story_targets_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "products" ADD CONSTRAINT "products_content_linked_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("content_linked_blog_post_id") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bot_events_fk" FOREIGN KEY ("bot_events_id") REFERENCES "bot_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_story_jobs_fk" FOREIGN KEY ("story_jobs_id") REFERENCES "story_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;