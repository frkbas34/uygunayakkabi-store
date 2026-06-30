# D-355 Image QC DB Drift

Last updated: 2026-06-30.

## Runtime Evidence

`npm run smoke:imageqc:schema -- --confirm-read-only` ran in read-only mode and checked PostgreSQL `information_schema`.

Result:

```text
Missing products columns:
image_quality_status
image_quality_notes
image_quality_checked_at
image_quality_checked_by
image_quality_source

Missing relation:
products_image_quality_defect_flags
```

Expected relation columns, based on the observed `products_channel_targets` Payload v3 hasMany select table shape:

```text
order
parent_id
value
id
```

`npm run smoke:shopier:read -- --confirm-read-only --limit=5` also ran in read-only mode and stopped before preview because the runtime database is behind the current repo schema.

Evidence:

```text
relation "products_image_quality_defect_flags" does not exist
code=42P01
```

The smoke confirmed:

- `PAYLOAD_DB_PUSH=false`
- no Payload writes
- no `shopier-sync` job queue writes
- no external dispatch
- no Shopier API calls
- no schema push

## Required Operator/Ops Action

Apply or verify the D-355 Image QC Payload DB migration/DDL before live-smoking Shopier Telegram commands or scaling catalog loading.

Current repo schema expects scalar Image QC columns on `products` and a has-many select relation for `imageQuality.defectFlags`.

Reviewed SQL plan:

```text
scripts/sql/d355-image-qc-schema.sql
```

Guarded apply helper:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Default mode is dry-run only and does not connect to PostgreSQL. Confirmed apply mode requires the explicit operator confirmation flag and runs the reviewed SQL plan, then performs a direct post-apply `information_schema` verification. Codex/Claude should not run the confirmed apply mode without explicit operator approval.

Likely scalar columns to verify:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_status enum_products_image_quality_status DEFAULT 'pending';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_notes text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_checked_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_checked_by varchar;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_source varchar;
```

Observed missing relation name:

```sql
-- Verify exact columns/types/indexes against Payload/Drizzle output before production.
CREATE TABLE IF NOT EXISTS products_image_quality_defect_flags (
  "order" integer NOT NULL,
  parent_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  value enum_products_image_quality_defect_flags,
  id SERIAL PRIMARY KEY
);
```

After migration/verification:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

Then live-smoke:

- `/shopier dashboard`
- `/shopier publish-ready`
- `/shopier errors`
- `/shopier retry-errors`
