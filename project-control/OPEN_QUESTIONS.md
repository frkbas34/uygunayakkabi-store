# OPEN QUESTIONS — Uygunayakkabi

_Last updated: 2026-04-19 (Memory cleanup — resolved questions closed, new audit-derived questions added)_

---

## Urgent / Blocking

### Q1: Instagram Token Expiry Management — STILL OPEN
- Long-lived token expires ~2026-05-20 (~30 days away)
- No automatic refresh mechanism exists
- Manual refresh: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`
- **Options**: implement n8n scheduled token refresh, switch to System User token (no expiry), or set a calendar reminder for manual refresh

### Q2: push:true Cannot Run in Production — STILL OPEN
- `push:true` is guarded by `NODE_ENV=production` in `@payloadcms/db-postgres/dist/connect.js`
- All schema changes on Neon MUST be applied manually via SQL
- **When do we switch to Payload migrations?** Before the next schema change or defer further?

---

## Medium Priority

### Q12: Is n8n Still Required for Current Instagram Dispatch?
- Instagram and Facebook now publish directly from Payload (D-088, D-089, `publishInstagramDirectly()`, `publishFacebookDirectly()`)
- `channelDispatch.ts` has a fallback path: if tokens absent, POST to n8n webhook
- **Question**: Does any current live dispatch path actually go through n8n, or is it purely fallback/dead code? This affects whether n8n workflow files should be maintained or archived.

### Q13: Should OpenAI Image Generation Remain as Fallback?
- v19 decision (D-098/D-099) was "Gemini-only" — OpenAI and Luma disabled at route level
- However, `src/lib/imageProviders.ts` still has `generateByEditing()` (OpenAI gpt-image-1) as importable, active code
- **Question**: Is OpenAI kept as an intentional fallback provider, or should it be fully deactivated like Luma/Claid?

### Q14: Should Disabled Luma/Claid Code Be Quarantined?
- `lumaGenTask.ts`, `claidTask.ts`, `lumaApi.ts`, `lumaPrompts.ts`, `claidProvider.ts` are all explicitly disabled since v19
- They are registered in `payload.config.ts` but never queued
- **Question**: Should these be moved to an `_archived/` directory, or kept in place for potential future reactivation? (Code-only change, requires confirmation before executing)

### Q5: Instagram Carousel Posts — STILL OPEN
- Currently single-image posts only
- Multi-image products should use carousel format
- Graph API supports it (`media_type=CAROUSEL` + children array)
- **When to implement?** After proving full pipeline end-to-end.

### Q6: Blog Frontend Routes — STILL OPEN
- BlogPosts collection exists (scaffold), Geobot can generate draft blog posts
- No `/blog` or `/blog/[slug]` routes implemented yet
- **Priority?** Low — after pipeline validation and active product flow

---

## Low Priority / Future

### Q8: Visual Expansion Engine Provider — STILL OPEN
- Phase 3 feature — AI-generated additional product angles
- **Which AI provider?** EachLabs? Stability AI? Custom pipeline?
- Need to evaluate quality + cost + API availability

### Q9: Try-On Provider — STILL OPEN
- Photo-based AI try-on (not AR), UX layer only (D-093)
- **Which provider?** External VTO service vs custom pipeline?
- Privacy: auto-delete user photos after processing

### Q15: Dead Code Cleanup Strategy
- Audit identified 2 completely dead lib files (`imageLockReminder.ts`, `imagePromptBuilder.ts` — zero references)
- 5 explicitly disabled files from v19 (Luma/Claid tasks + providers)
- **Question**: What is the preferred cleanup approach? Archive directory, separate branch, or leave in place with comments?

---

## Resolved Questions (Archive)

- ~~Q3: Shopier API Availability~~ → RESOLVED (2026-03-23, Step 20 — REST API v1 live)
- ~~Q4: Dolap API Availability~~ → DE-SCOPED (2026-04-19 — no public API found, scaffold-only, reactivation requires operator decision)
- ~~Q7: n8n Role Going Forward~~ → PARTIALLY RESOLVED (2026-04-19 — n8n is support/fallback layer, not primary intake; exact dispatch role under review as Q12)
- ~~Q10: Mentix Skills Real Ops Testing~~ → DEFERRED (2026-04-19 — awaiting Level A battle testing, DATABASE_URI + GITHUB_TOKEN needed in OpenClaw Docker env)
- ~~Q11: Content Generation Quality~~ → PARTIALLY RESOLVED (2026-04-19 — Gemini 2.5 Flash is the Geobot runtime, Turkish content generation implemented, quality validation awaiting first production use)
- ~~Admin → storefront visibility~~ → RESOLVED (2026-03-13)
- ~~Git branch divergence~~ → RESOLVED (2026-03-13)
- ~~Instagram OAuth for NPE pages~~ → RESOLVED (2026-03-22)
- ~~Facebook Page ID for NPE~~ → RESOLVED (2026-03-22)
- ~~n8n Instagram publish error 100/33~~ → RESOLVED (2026-03-22)
