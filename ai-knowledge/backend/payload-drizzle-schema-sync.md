# Payload CMS + Drizzle Schema Sync — Operational Knowledge

## Context
Payload CMS v3 uses Drizzle ORM with `push: true` for automatic schema synchronization in dev mode.
Database: Neon PostgreSQL.

---

## How push:true Works

On every server startup, Payload/Drizzle:
1. Generates a Drizzle schema from current collection TypeScript definitions
2. Compares that schema against the actual DB
3. Applies the diff (ALTER TABLE, CREATE TYPE, etc.)

The generated schema is derived from COMPILED code — meaning the `.next` build cache.

---

## Critical Constraint: Field Type Mapping

| Payload field type | PostgreSQL type |
|--------------------|----------------|
| `type: 'text'`     | varchar         |
| `type: 'select'`   | enum (e.g. `enum_table_field`) |
| `type: 'number'`   | numeric         |
| `type: 'checkbox'` | boolean         |
| `type: 'date'`     | timestamptz     |

**LOCKED RULE:** If a column was originally created as `varchar` (text field), changing it to `select` will attempt `ALTER COLUMN SET DATA TYPE enum`. This FAILS if existing data contains values not in the enum.

**Known affected fields in this project:**
- `products.brand` — must stay `type: 'text'`
- `products.category` — must stay `type: 'text'`
- `variants.size` — must stay `type: 'text'` (had "42,43,44" comma-separated values)

---

## Adding New Fields Safely

New optional fields (no `required: true`) can be added freely via push. They become nullable columns.

New `required: true` fields FAIL if the table has existing rows → push tries SET NOT NULL → fails.

**Rule:** Never add `required: true` to a new field being pushed into a table with existing data.

---

## Adding New Enum Values

Adding new options to an existing `select` field adds values to the existing enum type via:
`ALTER TYPE enum_name ADD VALUE 'new_value'`

This is generally safe BUT can fail in some edge cases with PostgreSQL transactions.

**Safe approach:** Only add new enum values when confident existing data allows it.

---

## Stale .next Cache Problem

**Symptom:** Server logs show Drizzle trying to apply schema changes that contradict current collection TypeScript files.

**Cause:** `.next` folder contains compiled JS modules. If `.next` is outdated (e.g., from before a field type change), Drizzle generates schema from old compiled code even though TypeScript files are updated.

**Resolution:**
1. Stop server
2. Delete `.next` folder entirely
3. Restart with `npm run dev`
4. Drizzle re-derives schema from freshly compiled code

---

## payload_migrations Table

In `push: true` mode, Payload uses `payload_migrations` to track push state.

If the table contains a `batch: -1` dev migration entry, Drizzle uses it as a reference point.

**When to reset:** If schema sync is in a broken state (push keeps failing on same statement), clearing `payload_migrations` forces a fresh full-schema comparison on next startup.

SQL: `DELETE FROM payload_migrations;`

---

## Current DB Enum Inventory (March 2026)

```
enum_products_status: active, soldout
enum_customer_inquiries_status: new, contacted, completed
enum_inventory_logs_source: telegram, admin, system
enum_media_type: original, enhanced
```

Do not modify these enum sets without a proper migration plan.

---

## Columns Added via push (confirmed in DB)

### products table — added via push
- original_price (numeric)
- featured (boolean)
- telegram_message_id (varchar)
- post_to_instagram (boolean)
- created_by_automation (boolean)

### variants table — added via push
- price_adjustment (numeric)

All above columns are nullable (no `required: true`) — push succeeded cleanly.
