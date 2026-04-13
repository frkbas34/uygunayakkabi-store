# DEPLOY CHECKLIST — Uygunayakkabi

_Production deployment readiness checklist_
_Last updated: 2026-04-04 (D-115 — hardcoded secret fixed, env truth pass)_

---

## Pre-Deploy: Database Migration

- [ ] Run local dev with `push: true` to capture exact DDL output
- [ ] Compare local schema against current Neon production schema
- [ ] Apply missing tables: `bot_events`, `story_jobs`, `homepage_merchandising_settings`
- [ ] Apply missing columns on `products` table (see MIGRATION_NOTES.md §3)
- [ ] Add `payload_locked_documents_rels` columns for new collections
- [ ] Verify all select/enum values match code definitions
- [ ] Verify `payload_migrations` table is clean (no stuck migrations)
- [ ] Test: Payload admin loads without errors after schema changes

---

## Environment Variables

### Critical (App won't start)

- [ ] `DATABASE_URI` — Neon PostgreSQL connection string
- [ ] `PAYLOAD_SECRET` — 32+ char encryption key
- [ ] `NEXT_PUBLIC_SERVER_URL` — https://uygunayakkabi.com

### Telegram Bot (Core operator flow)

- [ ] `TELEGRAM_BOT_TOKEN` — @mentix_aibot token from BotFather
- [ ] `TELEGRAM_CHAT_ID` — Operator notification group chat ID
- [ ] `TELEGRAM_WEBHOOK_SECRET` — Webhook signature validation (set in BotFather)

### AI Generation (Geobot + Image pipeline)

- [ ] `GEMINI_API_KEY` — Google Gemini (content generation + image gen)
- [ ] `OPENAI_API_KEY` — OpenAI (image editing, currently disabled in operator flow)
- [ ] `LUMA_API_KEY` — Luma Dream Machine (currently disabled in operator flow)
- [ ] `CLAID_API_KEY` — Claid.ai product photo enhancement

### Commerce Integration

- [ ] `SHOPIER_PAT` — Shopier Personal Access Token (expires 2031-03-23)
- [ ] `SHOPIER_WEBHOOK_TOKEN` — HMAC verification for Shopier webhooks

### Social Publishing

- [ ] `INSTAGRAM_APP_ID` — Meta app ID for OAuth
- [ ] `INSTAGRAM_APP_SECRET` — Meta app secret
- [ ] Instagram access tokens stored in AutomationSettings global (60-day expiry)

### Media Storage

- [ ] `BLOB_READ_WRITE_TOKEN` — Vercel Blob (production image uploads)

### Jobs Queue

- [ ] `CRON_SECRET` — Bearer token for `/api/payload-jobs/run`
- [ ] Vercel Cron or GitHub Actions configured for 5-min job execution

### Optional / Feature-Specific

- [ ] `ANTHROPIC_API_KEY` — Claude API for Telegram NLP
- [ ] `AUTOMATION_SECRET` — `/api/automation/products` auth
- [ ] `GENERATE_API_KEY_SECRET` — one-time API key generation endpoint auth
- [ ] `N8N_CHANNEL_*_WEBHOOK` — n8n channel webhooks (7 channels)
- [ ] `SHOPIER_NOTIFY_CHAT_ID` — Shopier order Telegram alerts

---

## Feature Status Matrix

### Code-Complete AND Production-Validated

- [x] Storefront rendering (Next.js + Payload)
- [x] Product catalog (CRUD, search, filter)
- [x] Payload admin panel (Turkish, all collections)
- [x] Instagram direct publish (Graph API v21.0)
- [x] Facebook page publish (Graph API)
- [x] Shopier order webhooks (HMAC verified, 4 event types)
- [x] Shopier product sync (jobs queue)
- [x] Telegram product intake (photo → Media + Product)

### Code-Complete, NOT Production-Validated

- [ ] Geobot content generation (Gemini 2.5 Flash) — code works, no confirmed prod run
- [ ] Mentix audit layer (4-dimension) — code works, no confirmed prod run
- [ ] Publish readiness evaluation (6-dimension) — Phase 12, not yet deployed
- [ ] /pipeline command — Phase 12, not yet deployed
- [ ] /confirm wizard — code works, no confirmed prod run
- [ ] /merch commands — Phase 11, not yet deployed
- [ ] Homepage merchandising sections (server-side) — Phase 10-11, not yet deployed
- [ ] Stock reaction central logic — Phase 9, not yet deployed
- [ ] Variants afterChange hook — Phase 10, not yet deployed
- [ ] Orders afterChange hook — Phase 10, not yet deployed
- [ ] Refund stock restoration — Phase 10, not yet deployed
- [ ] Low-stock Telegram alerts — Phase 10, not yet deployed
- [ ] BotEvents collection — schema exists, events being created, no dashboard
- [ ] BlogPost auto-creation from discovery pack — code works, not validated
- [ ] State coherence validation — Phase 12, not yet deployed

### Partial / Scaffolded

- [ ] Dolap channel — n8n webhook stub only, no real API
- [ ] X/Twitter channel — OAuth scaffold, no posting implementation
- [ ] Threads channel — n8n webhook stub only
- [ ] Merchandising sync cron — bestSellerScore fields exist, no cron job
- [ ] Auto-publish flow — publish_ready state exists, no auto-activation

### Blocked / Unsupported

- [x] Telegram stories — Bot API does NOT support stories (blocked_officially)
- [x] WhatsApp stories/status — Meta API has no story/status endpoint (blocked_officially)
- [x] AI image gen (Gemini) — No confirmed successful prod run (Blocker 2 in TASK_QUEUE)

---

## Deploy Sequence

### Phase A: Database (Before Code Deploy)

1. Connect to Neon production database
2. Run migration SQL (from MIGRATION_NOTES.md or extracted from local dev)
3. Verify: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`
4. Verify: All 14 collection tables + 3 global tables + payload internal tables exist
5. Verify: products table has all Phase 1-12 columns

### Phase B: Code Deploy (Vercel)

1. Ensure all env vars are set in Vercel dashboard
2. Push to main branch (or trigger deploy)
3. Wait for build success
4. Verify: Site loads at uygunayakkabi.com
5. Verify: Payload admin loads at uygunayakkabi.com/admin

### Phase C: Post-Deploy Validation

1. **Telegram webhook**: Send test message to bot — verify response
2. **Product admin**: Create/edit a product in Payload admin — verify save works
3. **Homepage**: Visit uygunayakkabi.com — verify products render
4. **Shopier webhook**: Trigger test event — verify order processing
5. **Jobs queue**: Hit `/api/payload-jobs/run` with CRON_SECRET — verify response
6. Run smoke tests (see SMOKE_TESTS.md)

---

## Post-Deploy Monitoring

- [ ] Check Vercel function logs for errors in first 24h
- [ ] Monitor Telegram group for unexpected bot errors
- [ ] Verify Shopier order sync continues working
- [ ] Check Neon dashboard for query performance
- [ ] Validate Instagram token expiry (AutomationSettings global)

---

## Security Checklist

- [x] Hardcoded secret in `generate-api-key/route.ts` replaced with GENERATE_API_KEY_SECRET env var (D-115)
- [ ] GENERATE_API_KEY_SECRET set in Vercel (random hex, 32+ chars)
- [ ] PAYLOAD_SECRET is 32+ char random hex (not a dictionary word)
- [ ] AUTOMATION_SECRET is random hex (if endpoint is exposed)
- [ ] CRON_SECRET is random hex
- [ ] No API keys exposed in Telegram error messages
- [ ] Telegram webhook secret validation is active
- [ ] Shopier HMAC verification is active
- [ ] Instagram access tokens stored in DB, not env vars (auto-refreshed)

---

## Known Risks

1. **push:true guard**: Schema changes WILL NOT auto-apply in production
2. **Instagram token expiry**: 60-day tokens — must re-authenticate periodically
3. **Shopier PAT expiry**: Current token expires 2031-03-23
4. **No AI image gen proven**: Step 25 deployed but zero confirmed successful runs
5. **Story pipeline**: Queued/approved but never actually published (API limitation)
6. **Workspace sync**: Local repo may be behind remote — verify before deploy
