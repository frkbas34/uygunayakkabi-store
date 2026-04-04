# MIGRATION NOTES — Uygunayakkabi

_Phase 1–13 cumulative schema migration guide for production (Neon PostgreSQL)_
_Last updated: 2026-04-04 (D-115 — env truth pass, exact DDL caveat added)_

## CRITICAL: push:true Does NOT Run in Production

Per D-077: `push: true` in `@payloadcms/db-postgres` is guarded by `NODE_ENV !== 'production'`.
**All schema changes on Neon MUST be applied manually via SQL.**
Payload will NOT auto-create tables, columns, or enums in production.

---

## 1. Collections — Tables Required (14)

All collections must have corresponding tables in Neon. Payload names tables by collection slug.

| Collection | Table Name | Phase | Notes |
|-----------|-----------|-------|-------|
| Users | `users` | Pre-Phase | Core CMS users |
| Products | `products` | Pre-Phase | Core — 80+ columns across field groups |
| Variants | `variants` | Pre-Phase | Size-based product variants |
| Brands | `brands` | Pre-Phase | Brand catalog (currently empty) |
| Categories | `categories` | Pre-Phase | Category catalog (currently empty) |
| Media | `media` | Pre-Phase | Image/file uploads |
| Customer Inquiries | `customer_inquiries` | Pre-Phase | Contact form submissions |
| Inventory Logs | `inventory_logs` | Pre-Phase | Stock audit trail |
| Orders | `orders` | Pre-Phase | Full order lifecycle |
| Banners | `banners` | Pre-Phase | Campaign/promo banners |
| Blog Posts | `blog_posts` | Pre-Phase | AI-generated SEO posts |
| Image Generation Jobs | `image_generation_jobs` | Step 24 | AI image gen task queue |
| Bot Events | `bot_events` | Phase 1 | Workflow event logging |
| Story Jobs | `story_jobs` | Phase 3 | Story publish job queue |

### Payload Internal Tables (auto-managed but verify exist)

| Table | Purpose |
|-------|---------|
| `payload_locked_documents` | Document locking |
| `payload_locked_documents_rels` | Lock relationships — **must have columns for ALL collections** |
| `payload_preferences` | User preferences |
| `payload_preferences_rels` | Preference relationships |
| `payload_migrations` | Migration tracking |
| `_products_v` | Product versions (if versioning enabled) |

---

## 2. Globals — Tables Required (3)

Globals are stored as single-row tables.

| Global | Table Name | Phase |
|--------|-----------|-------|
| Site Settings | `site_settings` | Pre-Phase |
| Automation Settings | `automation_settings` | Pre-Phase |
| Homepage Merchandising Settings | `homepage_merchandising_settings` | Phase 1 |

---

## 3. Products Table — Column Groups (Phases 1–12)

### 3A. Workflow Group (10 columns) — Phase 1

```sql
-- All columns are on the 'products' table, prefixed by group name
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_workflow_status varchar DEFAULT 'draft';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_visual_status varchar DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_confirmation_status varchar DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_content_status varchar DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_audit_status varchar DEFAULT 'not_required';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_publish_status varchar DEFAULT 'not_requested';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_stock_state varchar DEFAULT 'in_stock';
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_sellable boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_product_confirmed_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS workflow_last_handled_by_bot varchar;
```

### 3B. Merchandising Group (12 columns) — Phase 1

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_published_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_new_until timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_manual_popular boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_manual_deal boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_best_seller_pinned boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_best_seller_excluded boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_homepage_hidden boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_total_units_sold numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_recent_units_sold7d numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_recent_units_sold30d numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_best_seller_score numeric DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_last_merchandising_sync_at timestamptz;
```

### 3C. Content Group — Commerce Pack (9 columns) — Phase 6

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_website_description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_instagram_caption text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_x_post text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_facebook_copy text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_shopier_copy text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_highlights jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_confidence numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_warnings jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_commerce_pack_generated_at timestamptz;
```

### 3D. Content Group — Discovery Pack (10 columns) — Phase 6

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_article_title varchar;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_article_body text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_meta_title varchar;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_meta_description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_faq jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_keyword_entities jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_internal_link_targets jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_confidence numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_warnings jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_discovery_pack_generated_at timestamptz;
```

### 3E. Content Group — Blog Linkage (3 columns) — Phase 6

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_linked_blog_post integer REFERENCES blog_posts(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_content_generation_source varchar DEFAULT 'none';
ALTER TABLE products ADD COLUMN IF NOT EXISTS content_last_content_generation_at timestamptz;
```

### 3F. Audit Result Group (9 columns) — Phase 8

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_visual_audit varchar DEFAULT 'not_reviewed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_commerce_audit varchar DEFAULT 'not_reviewed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_discovery_audit varchar DEFAULT 'not_reviewed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_overall_result varchar DEFAULT 'not_reviewed';
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_approved_for_publish boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_warnings jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_revision_notes text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_audited_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit_result_audited_by_bot varchar;
```

### 3G. Story Settings Group (6 columns) — Phase 3

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_settings_enabled boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_settings_auto_on_publish boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_settings_skip_approval boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_settings_caption_mode varchar DEFAULT 'auto';
ALTER TABLE products ADD COLUMN IF NOT EXISTS story_settings_primary_asset varchar DEFAULT 'main_image';
-- story_settings_story_targets is hasMany select — stored as join table or jsonb
```

**NOTE:** Exact column names may differ based on Payload's snake_case conversion. Always verify against a local dev `push: true` run first, then replicate exact DDL to Neon.

---

## 4. New Collection Tables — Columns

### 4A. Bot Events (8 columns) — Phase 1

```sql
CREATE TABLE IF NOT EXISTS bot_events (
  id serial PRIMARY KEY,
  event_type varchar NOT NULL,
  product_id integer REFERENCES products(id),
  source_bot varchar NOT NULL,
  target_bot varchar,
  status varchar DEFAULT 'pending',
  payload jsonb,
  notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4B. Story Jobs (12 columns) — Phase 3

```sql
CREATE TABLE IF NOT EXISTS story_jobs (
  id serial PRIMARY KEY,
  product_id integer REFERENCES products(id) NOT NULL,
  status varchar DEFAULT 'queued' NOT NULL,
  trigger_source varchar DEFAULT 'auto_publish',
  -- targets is hasMany select — may be join table
  asset_url varchar,
  caption text,
  scheduled_for timestamptz,
  published_at timestamptz,
  error_log text,
  approval_state varchar DEFAULT 'not_required',
  approval_message_id varchar,
  attempt_count numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 4C. Homepage Merchandising Settings (16 columns) — Phase 1

```sql
CREATE TABLE IF NOT EXISTS homepage_merchandising_settings (
  id serial PRIMARY KEY,
  section_toggles_enable_yeni boolean DEFAULT true,
  section_toggles_enable_popular boolean DEFAULT true,
  section_toggles_enable_best_sellers boolean DEFAULT true,
  section_toggles_enable_deals boolean DEFAULT false,
  section_toggles_enable_discounted boolean DEFAULT true,
  item_limits_yeni_limit numeric DEFAULT 8,
  item_limits_popular_limit numeric DEFAULT 8,
  item_limits_best_seller_limit numeric DEFAULT 8,
  item_limits_deal_limit numeric DEFAULT 4,
  item_limits_discounted_limit numeric DEFAULT 8,
  timing_new_window_days numeric DEFAULT 7,
  best_seller_scoring_best_seller_recent_weight7d numeric DEFAULT 3,
  best_seller_scoring_best_seller_recent_weight30d numeric DEFAULT 1,
  best_seller_scoring_best_seller_minimum_score numeric DEFAULT 1,
  behavior_hide_empty_sections boolean DEFAULT true,
  behavior_allow_pinned_overrides boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 5. payload_locked_documents_rels Columns

Every collection must have a corresponding column in `payload_locked_documents_rels`:

```sql
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS bot_events_id integer;
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS story_jobs_id integer;
ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS image_generation_jobs_id integer;
```

---

## 6. Migration Procedure

### Step 1: Capture Exact DDL from Local Dev

The SQL examples above are **approximations**. Payload/Drizzle ORM may generate different exact column names, join tables, and index structures. The ONLY reliable way to get exact DDL:

```bash
# Start local dev with push:true and a FRESH local database
# (or use a Neon branch database)
DATABASE_URI=postgresql://... npm run dev

# Payload auto-creates all tables via push:true
# Then inspect the schema:
psql $DATABASE_URI -c "\dt"                  # list all tables
psql $DATABASE_URI -c "\d products"          # exact products columns
psql $DATABASE_URI -c "\d bot_events"        # exact bot_events columns
psql $DATABASE_URI -c "\d story_jobs"        # exact story_jobs columns
psql $DATABASE_URI -c "\d payload_locked_documents_rels"  # rels columns
```

### Step 2: Diff Against Production Neon

```bash
# Compare local schema with production
pg_dump --schema-only $LOCAL_DB > local_schema.sql
pg_dump --schema-only $NEON_PROD_DB > prod_schema.sql
diff local_schema.sql prod_schema.sql
```

### Step 3: Apply to Neon (in this order)

a. Create new tables (bot_events, story_jobs, homepage_merchandising_settings)
b. Add new columns to products table (workflow → merchandising → content → auditResult → storySettings)
c. Add payload_locked_documents_rels columns for new collections
d. Create any join tables for hasMany select/relationship fields
e. Verify all enum values match select field options

### Step 4: Deploy Code to Vercel

### Step 5: Post-Deploy Verification

- Payload admin loads all 14 collections without errors
- Can create/edit products (all field groups save correctly)
- BotEvents collection visible and writable
- StoryJobs collection visible
- HomepageMerchandisingSettings global editable

---

## 7. IMPORTANT CAVEATS

- **Column names**: Payload converts camelCase to snake_case but the exact mapping can vary. Always verify against actual Drizzle output.
- **hasMany selects**: Fields like `story_settings_story_targets` and `story_jobs.targets` may be stored as join tables rather than jsonb columns. Check Drizzle schema output.
- **Relationship arrays**: `products.images` (array of media) and `products.variants` (hasMany relationship) use join tables. These should already exist from pre-Phase deployment.
- **Generative gallery**: `products.generativeGallery` is an array field — stored in a separate `_products_generative_gallery` table.
- **Content group nesting**: Payload may flatten nested groups differently. Verify exact column names against local dev schema.
- **No rollback path**: SQL changes are one-way. Test on a staging/branch database first if possible.
