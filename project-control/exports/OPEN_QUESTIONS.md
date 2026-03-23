# OPEN_QUESTIONS.md — Uygunayakkabi / Mentix
_Consolidated: 2026-03-16_

---

## 🔴 REQUIRES ACTION

### OQ-001 — Duplicate D-Numbers in DECISIONS.md
**Issue**: Source `DECISIONS.md` has two D-052s, two D-053s, and two D-054s — different content in each. Likely caused by parallel sessions writing to the same file independently.
**Risk**: Future sessions may use the wrong decision when the number is referenced.
**Action**: Renumber the duplicates. Suggested: keep original numbers for older content, assign D-065+ to newer content from the 2026-03-15 session.
**Status**: UNRESOLVED

### OQ-002 — 3rd Telegram Group Member
**Issue**: Two user IDs in allowlist (`[5450039553, 8049990232]`). A third user was mentioned but ID not yet added.
**Action**: Get their Telegram numeric user ID → append to `groupAllowFrom` in openclaw.json → restart OpenClaw.
**Status**: PENDING — waiting for user ID

### OQ-003 — push: true vs Migrations
**Issue**: `push: true` in production is a risk — Drizzle will attempt schema changes on startup. Acceptable now, risky as schema stabilizes.
**Decision needed**: When to switch to Payload migrations? Before or after Phase 2B?
**Status**: DEFERRED — not urgent but should be decided before channel adapter work begins

---

## 🟡 NEEDS CLARIFICATION

### OQ-004 — Mentix Skill Stack Rollout Timing
**Issue**: `MENTIX_SYSTEM_PROMPT.md` defines a full skill stack (Level A/B/C) but it hasn't been started.
**Question**: Is this the next major parallel track after Step 11, or is it dependent on something else?
**Status**: UNRESOLVED — no explicit priority assigned

### OQ-005 — AutomationSettings.autoActivateProducts Behavior
**Issue**: The toggle exists but current pipeline always creates drafts. It's unclear if the n8n workflow actually reads this toggle or ignores it.
**Risk**: Admin thinks toggle controls behavior, but it may not be wired in n8n.
**Action**: Verify n8n workflow reads `autoActivateProducts` from Payload global and conditionally sets `status: 'active'`.
**Status**: UNVERIFIED — needs a code + n8n workflow audit

### OQ-006 — Storefront product.images[] vs Vercel Blob
**Issue**: Automation-created products attach media via the reverse-link path (payload.create media → payload.update product.images). Need to confirm Vercel Blob URLs are correctly stored and served, not local dev paths.
**Action**: Inspect a live automation-created product's media URLs in DB — should be `blob.vercel-storage.com/...` not `/api/media/file/...`
**Status**: NOT YET VALIDATED (Step 12 in TASK_QUEUE)

### OQ-007 — n8n API Key Rotation
**Issue**: Current n8n API key in environment was generated during initial setup session. Unclear if it was rotated with the other credentials in Step 1.
**Status**: UNVERIFIED — check if n8n API key is still the original

### OQ-008 — lockFields Behavior on Products
**Issue**: `automationMeta.lockFields` checkbox is defined in D-057 but never referenced in actual code logic. When `lockFields = true`, automation should not overwrite manual admin edits.
**Action**: Verify if this field has any actual enforcement in automation endpoint or hooks.
**Status**: UNVERIFIED — likely defined but not implemented

---

## 🟢 LOW PRIORITY / KNOWN GAPS

### OQ-009 — Instagram Graph API Setup
**Status**: App ID registered (1572212040560949). Full OAuth + business account connection not done. Will be needed for Step 13.

### OQ-010 — Shopier API Research
**Status**: No research done. Depends on Shopier API availability/terms.

### OQ-011 — Dolap API Research
**Status**: No research done. Depends on Dolap API availability/terms.

### OQ-012 — InventoryLogs afterChange Hook
**Status**: Collection exists but nothing writes to it. Intentionally deferred. Will need implementation before stock management becomes important.

### OQ-013 — BlogPosts Frontend Routes
**Status**: Collection scaffolded. `/blog` and `/blog/[slug]` routes do not exist yet.

### OQ-014 — Products [slug] Route Not Linked from Storefront
**Status**: `/products/[slug]/page.tsx` exists and returns 404 for drafts. But the storefront catalog cards don't link to it — no anchor tags.

### OQ-015 — DECISIONS.md Source File Maintenance
**Status**: Source file grew via many sessions. Contains some outdated entries marked SUPERSEDED but not removed. Should be cleaned up in a dedicated session.
