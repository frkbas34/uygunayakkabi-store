# PRODUCTION TRUTH MATRIX — Uygunayakkabi

_Honest classification of every subsystem's production status_
_Last updated: 2026-04-21 (Phase 1 one-product full-pipeline validation CLOSED on product 294 — D-212; X channel flipped SCAFFOLDED → PROD-VALIDATED after D-195c OAuth 1.0a + D-211 `media_category=tweet_image`; previous: 2026-04-04 D-115 hardcoded secret fixed, env truth pass complete)_

---

## Classification Key

| Status | Meaning |
|--------|---------|
| **PROD-VALIDATED** | Code deployed, tested in production, confirmed working by operator |
| **IMPLEMENTED** | Code complete, tested locally or in dev, not yet confirmed in production |
| **PARTIAL** | Core logic exists but missing pieces prevent full operation |
| **BLOCKED** | Cannot function due to external limitation or missing dependency |
| **SCAFFOLDED** | Structure exists but no real implementation behind it |

---

## Core Platform

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Next.js storefront | **PROD-VALIDATED** | Live at uygunayakkabi.com |
| Payload CMS admin | **PROD-VALIDATED** | All 14 collections, Turkish i18n |
| Neon PostgreSQL | **PROD-VALIDATED** | Production database operational |
| Vercel Blob media | **PROD-VALIDATED** | Image upload/serve working |
| Vercel deployment | **PROD-VALIDATED** | Auto-deploy from main branch |

---

## Product Pipeline

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Telegram photo intake | **PROD-VALIDATED** | Direct webhook, photo → Media + Product |
| Caption parsing | **PROD-VALIDATED** | Turkish/English, title/price/size extraction |
| Duplicate guard | **PROD-VALIDATED** | chatId + messageId idempotency |
| Product CRUD (admin) | **PROD-VALIDATED** | Full edit/create/delete with hooks |
| Auto-slug / Auto-SKU | **PROD-VALIDATED** | beforeValidate hook |
| FK-safe deletion | **PROD-VALIDATED** | Nullifies variant + media refs before delete |

---

## AI Image Generation

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Gemini image gen (#gorsel) | **IMPLEMENTED — NOT PROD-VALIDATED** | v18 code deployed, ZERO confirmed successful prod runs. Blocker 2 in TASK_QUEUE. |
| OpenAI image editing | **IMPLEMENTED — DISABLED** | Code exists, disabled from operator flow in v19 (D-109) |
| Luma AI pipeline | **IMPLEMENTED — DISABLED** | Full code, route deactivated in v18. Can restore from commit a27b78a |
| Claid.ai enhancement | **IMPLEMENTED — NOT TESTED** | #claid command, 3 modes, CLAID_API_KEY set. No live test performed |
| Generative gallery | **IMPLEMENTED** | Dual-track: product.images vs generativeGallery separation working |

---

## Confirmation Wizard

| Subsystem | Status | Notes |
|-----------|--------|-------|
| /confirm command | **IMPLEMENTED — NOT PROD-VALIDATED** | Phase 5. Full wizard: category → price → sizes → stock → targets |
| Inline keyboards | **IMPLEMENTED** | Category/target selection via Telegram buttons |
| confirmationStatus field | **IMPLEMENTED** | pending → confirmed → blocked lifecycle |
| BotEvent emission | **IMPLEMENTED** | product.confirmed event |

---

## Content Generation (Geobot)

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Gemini 2.5 Flash generation | **IMPLEMENTED — NOT PROD-VALIDATED** | Real API calls, requires GEMINI_API_KEY |
| Commerce pack (5 channel copies) | **IMPLEMENTED** | websiteDescription, instagramCaption, xPost, facebookCopy, shopierCopy |
| Discovery pack (SEO article) | **IMPLEMENTED** | articleTitle, articleBody, metaTitle, metaDescription, faq, keywords |
| BlogPost auto-creation | **IMPLEMENTED** | Draft blog post created from discovery pack |
| Content readiness check | **IMPLEMENTED** | checkContentReadiness() evaluates both packs |
| Auto-trigger after confirmation | **IMPLEMENTED** | Non-blocking, fires if shouldAutoTriggerContent() |
| /content command | **IMPLEMENTED** | Status display + manual trigger |
| Partial success handling | **IMPLEMENTED** | One pack can fail while other succeeds |

---

## Mentix Audit

| Subsystem | Status | Notes |
|-----------|--------|-------|
| 4-dimension audit | **IMPLEMENTED — NOT PROD-VALIDATED** | Visual, commerce, discovery, overall |
| approvedForPublish gate | **IMPLEMENTED** | true only when all dimensions pass |
| Auto-trigger after content.ready | **IMPLEMENTED** | Non-blocking in contentPack.ts |
| /audit command | **IMPLEMENTED** | Status display + manual run |
| BotEvent emission | **IMPLEMENTED** | audit.approved/failed/needs_revision events |

---

## Publish Readiness (Phase 12)

| Subsystem | Status | Notes |
|-----------|--------|-------|
| 6-dimension evaluation | **IMPLEMENTED — NOT DEPLOYED** | confirmation + visuals + content + audit + sellable + targets |
| workflowStatus='publish_ready' gate | **IMPLEMENTED — NOT DEPLOYED** | Only set when ALL 6 dimensions pass |
| product.publish_ready BotEvent | **IMPLEMENTED — NOT DEPLOYED** | Emitted on full readiness |
| /pipeline command | **IMPLEMENTED — NOT DEPLOYED** | 10-stage lifecycle + readiness + coherence |
| State coherence validation | **IMPLEMENTED — NOT DEPLOYED** | 7 contradiction rules |

---

## Homepage Merchandising

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Merchandising engine (5 sections) | **IMPLEMENTED — NOT DEPLOYED** | resolveHomepageSections() with Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli |
| isHomepageEligible() server filter | **IMPLEMENTED — NOT DEPLOYED** | Filters soldout/non-sellable before client |
| UygunApp section rendering | **IMPLEMENTED — NOT DEPLOYED** | 5 real sections with client fallbacks |
| HomepageMerchandisingSettings | **IMPLEMENTED — NOT DEPLOYED** | Section toggles, limits, scoring params |
| /merch commands | **IMPLEMENTED — NOT DEPLOYED** | preview, status, popular, deal, bestseller |
| Merchandising sync cron | **PARTIAL** | Fields exist (bestSellerScore, etc.) but NO cron job implemented |

---

## Stock / Soldout Automation

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Central reactToStockChange() | **IMPLEMENTED — NOT DEPLOYED** | Phase 9. Single entry point for all stock sources |
| Stock state machine | **IMPLEMENTED** | in_stock → low_stock → sold_out → restocked |
| Soldout transition | **IMPLEMENTED** | status=soldout, sellable=false, BotEvent |
| Restock transition | **IMPLEMENTED** | status=active, sellable=true, BotEvent |
| Telegram stock alerts | **IMPLEMENTED** | sendStockAlertToTelegram() on transitions |
| /stok command | **IMPLEMENTED** | Per-product stock status with variant breakdown |
| Variants afterChange hook | **IMPLEMENTED — NOT DEPLOYED** | Admin stock edits → reactToStockChange |
| Orders afterChange hook | **IMPLEMENTED — NOT DEPLOYED** | Non-Shopier order stock decrement |
| Shopier refund restoration | **IMPLEMENTED — NOT DEPLOYED** | Stock increment on order cancellation |

---

## Commerce / Orders

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Shopier order webhooks | **PROD-VALIDATED** | order.created, fulfilled, refund events |
| Shopier product sync | **PROD-VALIDATED** | Jobs queue, 5-min cron |
| Shopier stock decrement | **PROD-VALIDATED** | On order.created |
| Website checkout/cart | **NOT IMPLEMENTED** | PayTR integration planned but not started |
| Order admin management | **PROD-VALIDATED** | Full CRUD in Payload |

---

## Channel Publishing

| Subsystem | Status | Notes |
|-----------|--------|-------|
| Instagram direct publish | **PROD-VALIDATED** | Graph API v21.0, verified live |
| Facebook page publish | **PROD-VALIDATED** | Page Access Token exchange, verified live |
| Shopier sync | **PROD-VALIDATED** | Non-blocking jobs queue |
| Dolap | **SCAFFOLDED** | n8n webhook stub only, no real API |
| X (Twitter) | **PROD-VALIDATED** | OAuth 1.0a user-context (D-195c) + v2 `/2/media/upload` with `media_category=tweet_image` (D-211). Prod-validated on product 294 2026-04-21: `mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422` |
| Threads | **SCAFFOLDED** | n8n webhook stub only |
| Channel dispatch orchestration | **PROD-VALIDATED** | afterChange hook on Products |

---

## Story Pipeline

| Subsystem | Status | Notes |
|-----------|--------|-------|
| StoryJobs collection | **IMPLEMENTED** | 12 fields, full lifecycle schema |
| Story dispatch logic | **IMPLEMENTED** | dispatchStory(), target resolution, asset selection |
| Telegram story targets | **BLOCKED** | Bot API does NOT support stories |
| WhatsApp story/status | **BLOCKED** | Meta API has no story/status endpoint |
| Instagram stories | **NOT IMPLEMENTED** | Not in story targets, uses separate channel dispatch |
| Story approval flow | **IMPLEMENTED** | Inline keyboards, approval callbacks |
| Auto-trigger on publish | **IMPLEMENTED** | afterChange hook in Products.ts |

---

## Operator Tools (Telegram)

| Command | Status | Notes |
|---------|--------|-------|
| Photo intake | **PROD-VALIDATED** | Direct photo → product |
| STOCK SKU: command | **IMPLEMENTED** | Bulk variant stock update |
| /stok | **IMPLEMENTED** | Stock status display |
| /confirm | **IMPLEMENTED** | Confirmation wizard |
| /content | **IMPLEMENTED** | Content status + trigger |
| /audit | **IMPLEMENTED** | Audit status + manual run |
| /pipeline | **IMPLEMENTED — NOT DEPLOYED** | Full lifecycle view (Phase 12) |
| /merch | **IMPLEMENTED — NOT DEPLOYED** | Merchandising control (Phase 11) |
| /story | **IMPLEMENTED** | Story job creation |
| /shopier | **IMPLEMENTED** | Shopier sync management |
| #gorsel | **IMPLEMENTED — NOT PROVEN** | Gemini image generation |
| #claid | **IMPLEMENTED — NOT TESTED** | Claid photo enhancement |

---

## Infrastructure

| Subsystem | Status | Notes |
|-----------|--------|-------|
| VPS (Netcup) | **PROD-VALIDATED** | Ubuntu 22.04, Docker, Caddy |
| n8n workflows | **PROD-VALIDATED** | flow.uygunayakkabi.com |
| OpenClaw agent | **PROD-VALIDATED** | agent.uygunayakkabi.com |
| GitHub Actions cron | **PROD-VALIDATED** | 5-min jobs runner |
| Vercel hosting | **PROD-VALIDATED** | Auto-deploy, serverless functions |
| Cloudflare DNS | **PROD-VALIDATED** | A records for VPS subdomains |

---

## Summary Counts

| Status | Count |
|--------|-------|
| PROD-VALIDATED | 23 subsystems |
| IMPLEMENTED (not prod-validated) | 28 subsystems |
| PARTIAL | 1 subsystem (merchandising sync cron) |
| BLOCKED | 2 subsystems (Telegram stories, WhatsApp stories) |
| SCAFFOLDED | 2 subsystems (Dolap, Threads) |
| NOT IMPLEMENTED | 1 subsystem (website checkout) |

**Overall:** Core platform and original channels are production-proven. Phase 1 one-product full-pipeline validation CLOSED on 2026-04-21 (product 294 — D-212): Website + Instagram carousel + Facebook multi-photo + X-with-image all green end-to-end. X channel flipped PROD-VALIDATED via D-195c (OAuth 1.0a) + D-211 (`media_category=tweet_image` for X API v2 media upload). Phases 1-12 autonomous pipeline features remain the operating baseline. Two story targets are officially blocked by platform API limitations. Remaining channel scaffolds: Dolap, Threads.
