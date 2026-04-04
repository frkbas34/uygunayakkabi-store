# SMOKE TESTS — Uygunayakkabi

_Practical smoke test plan for the live autonomous pipeline_
_Last updated: 2026-04-04 (D-114)_

---

## How to Use This Document

Each test case has:
- **Trigger**: What action to perform
- **Expected DB/State Result**: What should change in the database
- **Expected Operator Output**: What the operator should see in Telegram
- **Fail Behavior**: What happens if something is wrong

Tests are ordered by pipeline stage. Run in sequence for full lifecycle validation.

---

## 1. Product Photo Intake

**Trigger:** Send a photo with caption to the Telegram group (e.g., "Nike Air Max\nFiyat: 1299\nBeden: 40,41,42")

**Expected DB Result:**
- New product created in `products` table with status=draft
- Media record created with image uploaded to Vercel Blob
- Product.images linked to the media record
- Product.source = 'telegram'
- automationMeta.telegramChatId, telegramMessageId populated
- automationMeta.rawCaption contains original text
- Variants created for sizes 40, 41, 42

**Expected Operator Output:**
- Bot replies with product summary: title, price, sizes, product ID
- "Ürün oluşturuldu ✅ — #<id>" message

**Fail Behavior:**
- If duplicate (same chatId + messageId): returns "Bu mesaj zaten işlendi" silently
- If no photo: ignored (text-only messages not processed as intake)
- If Payload write fails: error logged, Telegram error message sent

---

## 2. Image Generation (#gorsel)

**Trigger:** Send `#gorsel <productId>` in Telegram group

**Expected DB Result:**
- Image generation job created in `image_generation_jobs`
- Product.workflow.visualStatus = 'generating'
- On success: AI images added to product.generativeGallery
- Product.workflow.visualStatus = 'preview'

**Expected Operator Output:**
- "🎨 Görsel oluşturma başladı — #<id>" confirmation
- Progress updates during generation
- On success: generated images sent as photo album + keyboard for approval

**Fail Behavior:**
- If GEMINI_API_KEY missing: "GEMINI_API_KEY ayarlanmamış" error
- If product not found: "Ürün bulunamadı" error
- If API error: error logged, Telegram error message, visualStatus stays 'generating' or reverts

---

## 3. Confirmation Wizard (/confirm)

**Trigger:** Send `/confirm <productId>` in Telegram

**Expected DB Result:**
- workflow.confirmationStatus = 'confirmed' (after completing all steps)
- workflow.productConfirmedAt = timestamp
- workflow.lastHandledByBot = 'uygunops'
- BotEvent(product.confirmed) created

**Expected Operator Output:**
- Step-by-step wizard: category → price → sizes → stock → targets
- Inline keyboards for category and target selection
- Summary before final confirmation
- "✅ Ürün onaylandı!" on completion

**Fail Behavior:**
- If product not found: error message
- `/confirm_cancel` aborts wizard
- If price is 0 or negative: validation error, re-prompts

---

## 4. Geobot Content Generation (/content)

**Trigger:** Send `/content <productId> trigger` in Telegram

**Prerequisites:** Product must be confirmed (confirmationStatus=confirmed)

**Expected DB Result:**
- workflow.contentStatus transitions: pending → (generating) → ready (if both packs succeed)
- content.commercePack populated: websiteDescription, instagramCaption, shopierCopy, etc.
- content.discoveryPack populated: articleTitle, articleBody, metaTitle, metaDescription, faq, keywords
- content.contentGenerationSource = 'geobot'
- content.lastContentGenerationAt = timestamp
- workflow.workflowStatus = 'content_ready'
- BotEvents: content.requested → content.commerce_generated → content.discovery_generated → content.ready
- BlogPost auto-created from discovery pack, linked via content.linkedBlogPost
- **Auto-triggers audit** (non-blocking) if contentStatus=ready

**Expected Operator Output:**
- "📝 İçerik üretimi başladı — #<id>" confirmation
- On success: content status summary with pack details

**Fail Behavior:**
- If GEMINI_API_KEY missing: defers with status message
- If product not confirmed: "Ürün onaylanmamış" error
- If API error: contentStatus='failed', BotEvent(content.failed) emitted
- Partial success: if only one pack succeeds, contentStatus shows partial state

---

## 5. Mentix Audit (/audit)

**Trigger:** Send `/audit <productId> run` in Telegram (or auto-triggered after content.ready)

**Prerequisites:** Content should be generated (contentStatus=ready for best results)

**Expected DB Result:**
- workflow.auditStatus transitions: pending → approved/approved_with_warning/needs_revision/failed
- auditResult.visualAudit, commerceAudit, discoveryAudit dimension results set
- auditResult.overallResult set
- auditResult.approvedForPublish = true (if approved/approved_with_warning)
- auditResult.auditedAt = timestamp
- auditResult.auditedByBot = 'mentix'
- workflow.workflowStatus = 'publish_ready' (ONLY if full readiness passes — Phase 12)
- BotEvents: audit.requested → audit.started → audit.approved/failed/etc.
- BotEvent(product.publish_ready) if all 6 readiness dimensions pass

**Expected Operator Output:**
- "🔍 Audit başladı — #<id>" confirmation
- Audit result: dimension-by-dimension status with warnings

**Fail Behavior:**
- If no content: audit runs but commerce/discovery dimensions will fail
- If no images: visual dimension fails
- audit.failed status if any dimension critically fails

---

## 6. Pipeline Status (/pipeline)

**Trigger:** Send `/pipeline <productId>` in Telegram

**Expected DB Result:** None (read-only command)

**Expected Operator Output:**
- 10-stage lifecycle view: Intake → Visuals → Confirmation → Content → Audit → Readiness → Publish → Stock → Merchandising → Story
- Each stage shows icon + current status + detail
- Publish readiness: 6 dimensions with pass/fail
- State coherence: any detected contradictions shown

**Fail Behavior:**
- If product not found: error message
- If product has no workflow fields (legacy): defaults shown (pending/not_required)

---

## 7. Audit Status (/audit)

**Trigger:** Send `/audit <productId>` in Telegram (without 'run')

**Expected DB Result:** None (read-only)

**Expected Operator Output:**
- Current audit state: visual, commerce, discovery, overall results
- approvedForPublish status
- Warnings and revision notes if any

**Fail Behavior:**
- If not yet audited: "not_reviewed" shown for all dimensions

---

## 8. Content Status (/content)

**Trigger:** Send `/content <productId>` in Telegram (without 'trigger')

**Expected DB Result:** None (read-only)

**Expected Operator Output:**
- Content status: pending/commerce_generated/discovery_generated/ready/failed
- Commerce pack summary: which fields populated
- Discovery pack summary: article title, meta, FAQ count
- Blog linkage status

**Fail Behavior:**
- If no content generated: shows "pending" status

---

## 9. Merchandising Commands (/merch)

### 9A. Preview

**Trigger:** Send `/merch preview` in Telegram

**Expected DB Result:** None (read-only)

**Expected Operator Output:**
- All 5 sections with product counts and names: Yeni, Popular, Bestseller, Deals, Discounted

### 9B. Status

**Trigger:** Send `/merch status <productId>` in Telegram

**Expected Operator Output:**
- Full merchandising state: flags (popular, deal, pinned, excluded, hidden)
- Section membership (which sections this product appears in)
- Eligibility status

### 9C. Toggle

**Trigger:** Send `/merch popular add <productId>` in Telegram

**Expected DB Result:**
- Product.merchandising.manualPopular = true

**Expected Operator Output:**
- Confirmation message

**Fail Behavior:**
- If product not found: error message

---

## 10. Stock Update via Telegram

**Trigger:** Send `STOCK SKU: <sku> | size:40:+5 size:41:-2` in Telegram

**Expected DB Result:**
- Variant stock for size 40: incremented by 5
- Variant stock for size 41: decremented by 2
- InventoryLog entries created for each change
- `reactToStockChange()` called — may trigger state transitions
- workflow.stockState updated (in_stock/low_stock/sold_out)

**Expected Operator Output:**
- Stock update confirmation with per-size changes
- Soldout/restock feedback if state transitions

**Fail Behavior:**
- If SKU not found: error message
- If size not found: skipped with warning

---

## 11. Shopier Order Stock Decrement

**Trigger:** Shopier sends order.created webhook

**Expected DB Result:**
- Order created in `orders` table
- Product.stockQuantity decremented
- Variant stock decremented (if size specified)
- InventoryLog entry created
- `reactToStockChange()` called
- If stock hits 0: product.status = 'soldout', workflow.stockState = 'sold_out'

**Expected Operator Output:**
- Order notification in Telegram (if SHOPIER_NOTIFY_CHAT_ID set)
- Soldout alert if product runs out

**Fail Behavior:**
- If HMAC verification fails: 401 response
- If product not found: order created but stock not decremented
- Non-blocking: stock errors don't block order creation

---

## 12. Refund / Restock Path

**Trigger:** Shopier sends refund.requested webhook

**Expected DB Result:**
- Order status updated to 'cancelled'
- Product.stockQuantity incremented (restored)
- Variant stock incremented (if size on order)
- InventoryLog entry with positive change
- `reactToStockChange()` called — may trigger product.restocked
- If previously soldout: product.status = 'active', workflow.stockState = 'in_stock' or 'low_stock'

**Expected Operator Output:**
- Refund notification in Telegram
- Restock alert if product was soldout

**Fail Behavior:**
- If order not found: logged but not blocked
- If product not found: stock not restored, logged

---

## 13. Soldout Exclusion from Homepage

**Trigger:** Product runs out of stock (via any source)

**Expected DB Result:**
- product.status = 'soldout'
- workflow.stockState = 'sold_out'
- workflow.sellable = false

**Verification:**
- Visit homepage — product should NOT appear in any merchandising section
- `isHomepageEligible()` returns false for soldout products
- Product detail page still accessible (visible but not sellable)

**Fail Behavior:**
- If isHomepageEligible is not applied: soldout products appear on homepage (bug)

---

## 14. Homepage Section Rendering

**Trigger:** Visit uygunayakkabi.com homepage

**Expected Result:**
- page.tsx fetches products and applies `isHomepageEligible()` filter
- `resolveHomepageSections()` computes 5 sections
- UygunApp renders sections: Yeni Ürünler, Popüler, Çok Satanlar, Fırsatlar, İndirimli
- Sections only render when they have products (empty sections hidden)
- Client-side fallbacks work when server sections are empty

**Verification:**
- View page source or network response: `sections` prop passed to App
- Each section shows correct products matching merchandising rules
- No soldout products visible

**Fail Behavior:**
- If merchandising engine fails: client-side fallbacks activate (first 8 products, etc.)
- If no products at all: empty state rendered

---

## 15. Story Queue Creation

**Trigger:** Product status transitions from draft → active (with storySettings.enabled=true)

**Expected DB Result:**
- StoryJob created with status = 'queued' or 'awaiting_approval'
- Product.sourceMeta.storyStatus updated
- Product.sourceMeta.storyQueuedAt = timestamp

**Expected Operator Output:**
- Story approval keyboard (if requiresApproval=true on targets)
- On approval: status → 'approved' + warning message about API limitation

**IMPORTANT — Truthfulness:**
- Telegram Bot API does NOT support stories
- WhatsApp status API does NOT exist
- Story jobs are queued/approved but NEVER actually published
- This is documented and truthful — no fake success states

**Fail Behavior:**
- If all targets blocked: storyStatus = 'blocked_officially'
- If no asset: storyStatus = 'awaiting_asset'

---

## Full Pipeline End-to-End Test

For a complete lifecycle test, execute in order:

1. **Intake**: Send photo with caption → verify product created
2. **Image gen**: `#gorsel <id>` → verify images generated
3. **Confirm**: `/confirm <id>` → complete wizard → verify confirmed
4. **Content**: `/content <id> trigger` → verify both packs generated
5. **Audit**: Verify auto-triggered → check audit results
6. **Pipeline**: `/pipeline <id>` → verify all stages shown
7. **Merch**: `/merch popular add <id>` → verify flag set
8. **Activate**: Set status=active in admin → verify channel dispatch + story queue
9. **Homepage**: Visit site → verify product in correct sections
10. **Stock**: Update stock via Telegram → verify state machine
11. **Soldout**: Decrement to 0 → verify soldout exclusion
12. **Restock**: Add stock back → verify restock transition

Expected total pipeline time: ~2-5 minutes (depends on AI generation speed)
