# OPEN QUESTIONS — Uygunayakkabi

_Last updated: 2026-03-23 (Step 20 consolidated)_

---

## 🔴 Urgent / Blocking

### Q1: Instagram Token Expiry Management
- Long-lived token expires ~2026-05-20
- No automatic refresh mechanism exists
- Manual refresh: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`
- **Should we**: implement n8n scheduled token refresh? Switch to System User token (no expiry)?

### Q2: push:true Reliability on Neon Serverless
- `push:true` does NOT run in production (`NODE_ENV=production` guard)
- New collections/globals require manual DB table verification after deploy
- **When do we switch to Payload migrations?** Before next schema change or defer to Phase 3?

---

## 🟡 Medium Priority

### ~~Q3: Shopier API Availability~~ — RESOLVED ✅ (2026-03-23, Step 20)
- Shopier REST API v1 confirmed working via Bearer JWT
- Product sync live: `src/lib/shopierApi.ts` + `src/lib/shopierSync.ts`
- 4 webhooks registered: order.created, order.fulfilled, refund.requested, refund.updated
- Shopier PAT expires 2031-03-23 (no rotation needed for 5+ years)

### Q4: Dolap API Availability
- No public Dolap API documentation found yet
- Stub workflow JSON exists (`n8n-workflows/stubs/channel-dolap.json`)
- **Is Dolap integration possible via API?** Research needed before committing to implementation

### Q5: Instagram Carousel Posts
- Currently single-image posts only
- Multi-image products should use carousel format
- Graph API supports it (`media_type=CAROUSEL` + children array)
- **When to implement?** Before or after Shopier/Dolap research?

### Q6: Blog Frontend Routes
- BlogPosts collection exists (scaffold)
- No `/blog` or `/blog/[slug]` routes implemented yet
- **Priority?** After multi-channel or during Phase 2C?

### Q7: n8n Role Going Forward
- Instagram, Facebook, and Shopier now publish/sync directly from Payload (D-088, D-089, Step 20)
- n8n still handles product intake (Mentix → n8n webhook → Payload API)
- Pattern is clear: simple sync = direct from Payload; complex multi-step = n8n
- **Should Dolap also be direct-from-Payload when implemented?**
- **Should n8n intake pipeline be simplified/removed in favor of direct OpenClaw → Payload?**

---

## 🟢 Low Priority / Future

### Q8: Visual Expansion Engine Provider
- Phase 3 feature — AI-generated additional product angles
- **Which AI provider?** EachLabs? Stability AI? Custom pipeline?
- Need to evaluate quality + cost + API availability

### Q9: Try-On Provider
- Photo-based AI try-on (not AR)
- **Which provider?** External VTO service vs custom pipeline?
- Privacy: auto-delete user photos after processing

### Q10: Mentix Skills — Real Ops Testing
- 13 skills deployed but only mentix-intake is battle-tested
- product-flow-debugger, sql-toolkit, browser-automation need real ops testing
- **Needs**: DATABASE_URI and GITHUB_TOKEN in OpenClaw Docker env

### Q11: Content Generation Quality
- AI SEO blog posts planned but not yet generated
- **What model/prompt quality is needed?** OpenAI gpt-5-mini or something larger?
- Blog content must be Turkish — language quality matters

---

## Resolved Questions (Archive)

- ~~Admin → storefront visibility~~ → RESOLVED (2026-03-13)
- ~~Git branch divergence~~ → RESOLVED (2026-03-13)
- ~~Instagram OAuth for NPE pages~~ → RESOLVED (2026-03-22, INSTAGRAM_USER_ID bypass)
- ~~Facebook Page ID for NPE~~ → RESOLVED (2026-03-22, legacy page ID from ad center URL)
- ~~n8n Instagram publish error 100/33~~ → RESOLVED (2026-03-22, direct publish from Payload)
- ~~Shopier API availability~~ → RESOLVED (2026-03-23, REST API v1 live, Step 20 complete)
