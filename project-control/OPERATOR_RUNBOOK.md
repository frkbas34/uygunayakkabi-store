# OPERATOR RUNBOOK — Uygunayakkabi Daily Operations

_Last updated: 2026-04-06 (Phase 21 — Post Instagram/Facebook dispatch validation)_

---

## 1. DAILY OPERATOR FLOW (Recommended Order)

### Morning Routine

1. **System Health Check** — `/diagnostics` in Telegram
   - Confirms DB connectivity, env vars, recent activity
   - If anything looks wrong: stop, investigate, do not proceed

2. **Check Telegram for Overnight Alerts**
   - Stock alerts (⚠️ low stock, 🔴 soldout, 🔄 restocked)
   - Dispatch results (Instagram/Facebook post confirmations or errors)

3. **Review New Intake Products**
   - Products created from Telegram photo intake appear as drafts
   - Run `/pipeline <id>` on new products to see their lifecycle state

### Core Pipeline Work (repeat per product)

4. **Visual Approval** — Review image generation previews
   - If images exist: approve via inline keyboard buttons ✅ or reject ❌
   - If no images: trigger with `#gorsel <id>` → wait → approve/reject
   - NEVER skip visual approval — it gates the entire pipeline

5. **Confirmation Wizard** — `/confirm <id>`
   - Only works after visual approval (visualStatus=approved)
   - Collects: category → productType → price → sizes → stock → brand → channel targets
   - Review summary carefully before clicking "Onayla"

6. **Content Generation** — Auto-triggers after confirmation
   - Wait ~30s for AI to generate commerce + discovery packs
   - Check status: `/content <id>`
   - If failed or partial: `/content <id> retry`

7. **Audit** — Auto-triggers after content is ready
   - Check: `/audit <id>`
   - If needs revision: fix the underlying issue, then `/audit <id> run`

8. **Activation** — `/activate <id>`
   - Only works when 6/6 publish readiness dimensions pass
   - Triggers: channel dispatch (Instagram, Facebook), homepage inclusion, Shopier sync
   - After activation: product is LIVE

### Afternoon / As Needed

9. **Homepage Check** — Visit https://www.uygunayakkabi.com
   - Verify new products appear in "Yeni" section
   - Check merchandising sections look correct

10. **Stock Management** — As orders come in
    - Monitor stock alerts in Telegram
    - Restock: update variant stock via admin panel or `STOCK SKU:` command
    - System auto-handles: low_stock alerts, soldout transitions, restock recovery

---

## 2. COMMAND-BY-COMMAND REFERENCE

### Product Lifecycle Commands

| Command | When to Use | Example |
|---------|-------------|---------|
| `/pipeline <id>` | Check full lifecycle status (13 stages) | `/pipeline 180` |
| `#gorsel <id>` | Trigger AI image generation | `#gorsel 180` |
| `/confirm <id>` | Start confirmation wizard (after visual approval) | `/confirm 180` |
| `/confirm <id> force` | Re-confirm already-confirmed product | `/confirm 180 force` |
| `/confirm_cancel` | Cancel active wizard | `/confirm_cancel` |
| `/content <id>` | Check content generation status | `/content 180` |
| `/content <id> trigger` | Manually trigger content generation | `/content 180 trigger` |
| `/content <id> retry` | Retry failed/partial content | `/content 180 retry` |
| `/audit <id>` | Check audit status | `/audit 180` |
| `/audit <id> run` | Force run/re-run audit | `/audit 180 run` |
| `/activate <id>` | Activate publish-ready product | `/activate 180` |

### Stock Commands

| Command | When to Use | Example |
|---------|-------------|---------|
| `/stok <id>` | Check stock levels and variant breakdown | `/stok 180` |
| `STOCK SKU: ...` | Batch update stock (multi-line format) | See format below |

**Stock update format:**
```
STOCK SKU: ABC-123
38 +5
39 -2
41 +10
```

### Merchandising Commands

| Command | When to Use | Example |
|---------|-------------|---------|
| `/merch preview` | Show all homepage section summaries | `/merch preview` |
| `/merch status <id>` | Check product's merchandising state | `/merch status 180` |
| `/merch popular add <id>` | Mark as manually popular | `/merch popular add 180` |
| `/merch popular remove <id>` | Remove popular flag | `/merch popular remove 180` |
| `/merch deal add <id>` | Mark as deal/fırsat | `/merch deal add 180` |
| `/merch deal remove <id>` | Remove deal flag | `/merch deal remove 180` |
| `/merch bestseller pin <id>` | Pin to best sellers | `/merch bestseller pin 180` |

### Channel & Dispatch Commands

| Command | When to Use | Example |
|---------|-------------|---------|
| `/shopier publish <id>` | Queue product for Shopier sync | `/shopier publish 180` |
| `/shopier status <id>` | Check Shopier sync status | `/shopier status 180` |

**Redispatch (Instagram/Facebook):**
No direct Telegram command. To re-trigger dispatch:
1. Open admin panel: `https://www.uygunayakkabi.com/admin/collections/products/<id>`
2. In "Source Meta" section, check "Force Redispatch" checkbox
3. Save — dispatch fires automatically on save

### Story Commands

| Command | When to Use | Example |
|---------|-------------|---------|
| `/story <id>` | Create story job | `/story 180` |
| `/restory <id>` | Retry story | `/restory 180` |
| `/targets <id>` | Show story platform targets | `/targets 180` |
| `/approve_story <jobId>` | Approve pending story | `/approve_story abc123` |
| `/reject_story <jobId>` | Reject story job | `/reject_story abc123` |

**Note:** Telegram Bot API does not support story publishing yet. Story jobs can be queued and approved but actual publishing is blocked pending API support.

### System Commands

| Command | When to Use |
|---------|-------------|
| `/diagnostics` | System health check (DB, env vars, counts) |

---

## 3. PRODUCT LIFECYCLE — PIPELINE STAGES

```
INTAKE (Telegram photo) → Draft created
    ↓
IMAGE GENERATION (#gorsel) → AI generates product images
    ↓
VISUAL APPROVAL (inline buttons) → Operator approves/rejects images
    ↓
CONFIRMATION WIZARD (/confirm) → Category, price, sizes, stock, brand, targets
    ↓
CONTENT GENERATION (auto) → AI commerce pack + discovery pack (SEO article)
    ↓
AUDIT (auto) → 4-dimension quality check
    ↓
ACTIVATION (/activate) → Product goes LIVE
    ↓
CHANNEL DISPATCH (auto) → Instagram, Facebook, Shopier, etc.
    ↓
HOMEPAGE (auto) → Appears in "Yeni" section for 7 days
    ↓
STOCK LIFECYCLE (ongoing) → in_stock → low_stock → sold_out → restocked
```

**Key Pipeline States:**

| Stage | visualStatus | confirmStatus | contentStatus | auditStatus | workflowStatus |
|-------|-------------|---------------|---------------|-------------|----------------|
| After intake | pending | pending | pending | not_required | draft |
| After image gen | preview/approved | pending | pending | not_required | visual_ready |
| After confirm | approved | confirmed | pending | pending | content_pending |
| After content | approved | confirmed | ready | pending | content_ready |
| After audit | approved | confirmed | ready | approved | publish_ready |
| After activate | approved | confirmed | ready | approved | active |

---

## 4. WHAT HAPPENS AUTOMATICALLY (No Operator Action Needed)

These fire without any command:

| Trigger | What Happens |
|---------|-------------|
| Product status draft → active | Channel dispatch (IG, FB, Shopier), story job creation |
| Confirmation completed | Content generation auto-triggers (commerce + discovery packs) |
| Content generation complete | Audit auto-triggers (4-dimension quality check) |
| Variant stock changes | Stock state recalculated, Telegram alerts sent |
| New order (non-Shopier) | Stock decremented, inventory log created, stock state updated |
| Shopier refund | Stock restored, inventory log created |
| Product sold out | Status → soldout, removed from merchandising, alert sent |
| Product restocked | Status → active, re-included in merchandising, alert sent |

---

## 5. EXCEPTION HANDLING & TROUBLESHOOTING

### Image Generation Failed
- Check `/pipeline <id>` → Visual stage
- Common cause: Gemini API rate limit or timeout
- Fix: Wait 60s, then `#gorsel <id>` again

### Content Generation Failed
- Check: `/content <id>` for error details
- Common cause: Gemini output too long or malformed
- Fix: `/content <id> retry` (retries preserve existing partial packs)

### Audit Shows "needs_revision"
- Check `/audit <id>` for specific dimension failures
- Common causes: no linked blog, meta description too long, missing highlights
- Fix: Address the underlying issue in admin panel, then `/audit <id> run`

### Activation Fails (Not Publish-Ready)
- `/activate <id>` will tell you exactly which dimensions are missing
- Fix each blocker in order, then retry `/activate <id>`
- Most common: missing content (run `/content <id> trigger`) or missing audit (run `/audit <id> run`)

### Instagram/Facebook Dispatch Failed
- Check admin panel → product → Source Meta → Dispatch Notes
- Common causes:
  - **Token expired:** Instagram token expires 2026-05-21. Must refresh before then.
  - **Image URL 404:** Transient — retry with forceRedispatch
  - **Rate limit:** Wait 60 minutes, retry
- Fix: Set `sourceMeta.forceRedispatch = true` in admin panel and save

### Shopier Sync Failed
- Check `/shopier status <id>` for error
- Common causes: Invalid product data, Shopier API down
- Fix: `/shopier republish <id>` to retry

### Stock Alert — Low Stock (⚠️)
- Not urgent but needs attention within 24h
- Check `/stok <id>` for variant breakdown
- Restock via admin panel or `STOCK SKU:` command

### Stock Alert — Sold Out (🔴)
- Product automatically removed from merchandising
- Product page stays live with "Tükendi" badge
- Restock: update variant stock → system auto-recovers to active

---

## 6. CRITICAL WARNINGS — NEVER SKIP THESE

### ⛔ NEVER skip visual approval
The entire pipeline gates on `visualStatus=approved`. Confirmation, content generation, and audit all require approved visuals. There is no bypass.

### ⛔ NEVER activate without checking /pipeline
Activation is irreversible in practice — the product goes live on Instagram, Facebook, and the website immediately. Always verify all 6 dimensions are green before activating.

### ⛔ NEVER manually edit dispatch fields in the database
`sourceMeta.dispatchedChannels`, `sourceMeta.dispatchNotes`, `sourceMeta.lastDispatchedAt` — these are written by the system. Manual edits will desync state.

### ⛔ NEVER change product status directly to "active" via admin panel
Always use `/activate <id>` via Telegram. Direct status changes skip the dispatch hook and merchandising setup. The product will be "active" but without Instagram/Facebook posts and without proper merchandising dates.

### ⛔ NEVER delete media files from Vercel Blob
Product images are referenced by ID in the database. Deleting them causes 404s on Instagram/Facebook posts and the storefront.

### ⛔ Instagram token expires 2026-05-21
The long-lived Instagram access token will stop working on this date. Before then, re-authenticate via `/api/auth/instagram/initiate` or the admin panel OAuth flow. Set a calendar reminder for 2026-05-14 (one week before).

### ⛔ Facebook Page must stay ACTIVATED
If the Facebook Page "UygunAyakkabı" is deactivated in Meta Business Suite, ALL Instagram and Facebook dispatch will fail silently. If dispatch stops working, check page status first.

### ⛔ Database schema changes require manual DDL
`push:true` does NOT work in production (Neon/Vercel). Any new collection, field, or index must be applied manually via SQL. See `MIGRATION_NOTES.md` for procedure.

---

## 7. BOT RESPONSIBILITIES

### UygunOps Bot (Telegram)
The single bot handles everything:
- Product intake (photo → draft product)
- Image generation orchestration
- Confirmation wizard
- Content and audit management
- Activation and dispatch monitoring
- Stock alerts and merchandising
- System diagnostics

### Automated Systems (No Bot Interaction)
- **Channel Dispatch:** Fires automatically on product activation (afterChange hook)
- **Stock Reactions:** Fire automatically on variant/order changes
- **Content Generation:** Fires automatically after confirmation
- **Audit:** Fires automatically after content is ready
- **Homepage Merchandising:** Resolved server-side on every page load

---

## 8. DAILY CHECKLIST

```
□ Run /diagnostics — system healthy
□ Check Telegram for overnight stock alerts
□ Review new intake products (/pipeline for each)
□ Approve/reject image previews for pending products
□ Run /confirm wizard for approved products
□ Verify content generated (auto ~30s after confirm)
□ Verify audit passed (auto ~15s after content)
□ /activate products that are publish-ready
□ Spot-check homepage (new products visible?)
□ Spot-check Instagram/Facebook (posts published?)
□ Handle any stock alerts (restock if needed)
```

---

## 9. KEY NUMBERS & THRESHOLDS

| Parameter | Value | Notes |
|-----------|-------|-------|
| Low stock threshold | ≤ 3 units | Triggers ⚠️ alert |
| Soldout threshold | 0 units | Triggers 🔴 alert, removes from merchandising |
| "Yeni" window | 7 days | Products appear in "Yeni" section for 7 days after activation |
| Instagram token expiry | 2026-05-21 | Must refresh before this date |
| Content gen timeout | ~30-60s | Gemini Flash generates both packs |
| Audit timeout | ~15-30s | Runs after content is ready |
| Dispatch timeout | ~20s per channel | Instagram (container + publish), Facebook (token exchange + post) |
| Telegram message limit | 4096 chars | Long messages are truncated |

---

## 10. QUICK REFERENCE — PRODUCT STATUS MEANINGS

| Status | Visible? | Sellable? | Action Needed? |
|--------|----------|-----------|----------------|
| `draft` | No | No | Continue pipeline (visual → confirm → content → audit → activate) |
| `active` | Yes | Yes | Monitor stock, check dispatch results |
| `soldout` | Yes (with badge) | No | Restock to recover |
| `archived` | No | No | None (removed from circulation) |

---

_This runbook reflects the production system as of Phase 20A validation. Instagram and Facebook direct dispatch are confirmed working. The visual-first pipeline is the standard operating model._
