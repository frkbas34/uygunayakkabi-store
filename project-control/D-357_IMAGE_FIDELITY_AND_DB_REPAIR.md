# D-357 — Image Fidelity Upgrades + Image QC DB Repair

Last updated: 2026-06-30.

## Summary

One session covering: full Claid/Luma removal, Gemini image-generation fidelity
improvements (multi-reference understanding, detail-preservation lock, studio-angle
QC fix), the D-355 Image QC production DB repair, and a 2x output upscale. Also an
operational incident: file-sync corruption of the working tree and git, plus recovery.

## Commits

- `bef456d` — Remove Claid/Luma; image preservation + studio-angle QC fix. DEPLOYED.
- `5138e02` — Multi-reference framing (multiple angles = same shoe). DEPLOYED.
- `3916fb8` — 2x Lanczos upscale before media save. (push pending)

## Code changes

1. **Claid + Luma fully removed.** Deleted `claidProvider.ts`, `lumaApi.ts`,
   `lumaPrompts.ts`; removed all `#claid`/`#luma` router triggers, callback guards,
   hashtag tokens, and the `CLAID_API_KEY` env check; removed the Luma schema fields
   (`requestType`, `lumaGenerationIds`, `lumaModel`) from `ImageGenerationJobs`.
   Generation is Gemini-only.
2. **Detail-preservation lock** (`VISUAL_FACT_LOCK_BLOCK`). Added a clause: preserve —
   do not erase, smooth, flatten, or omit — any subtle embossed wordmark/monogram/
   stitched detail that IS visible in the reference. Complements the no-invent-metal lock.
3. **Studio-angle QC fix.** `SHOT_CRITERIA` for `worn_lifestyle` and `tabletop_editorial`
   were stale (demanded a worn-on-foot shot and a marble overhead shot) and contradicted
   the updated studio scene prompts, so the QC rejected correct studio shots and pushed
   retries toward foot/marble. Updated both to match the real studio scenes: slot 4 =
   studio material/craft close-up, slot 5 = rear three-quarter studio.
4. **MULTI_REFERENCE_FRAMING_BLOCK (new).** Injected into the Gemini per-slot prompt ONLY
   when the operator sends 2+ reference photos. It tells the model the inputs are ONE
   physical shoe from different angles: reproduce only what is visible across them, keep
   every detail (hardware, logos, emblems) at true size and place, never invent/enlarge/
   restyle. The reference-pack plumbing (collect up to 3 photos and pass through to
   `generateByGeminiPro` / `callGeminiImageGenerate`) already existed; this adds the
   missing model-facing explanation.
5. **2x upscale** (`imageGenTask.ts`). Each generated image is upscaled ~2x (cap long side
   2048px) with sharp Lanczos + sharpen before media save, for a crisp product-page
   "Büyüt" zoom. `sharp` is already a dependency; Node/Vercel, no GPU; falls back to the
   original buffer on any error so it can never break generation.

## Operating guidance (Telegram)

- Send **2-3 angles of the same shoe**, including one **close-up of any logo/emblem/
  hardware**, then `#gorsel`. Multiple angles are the key fidelity mechanism. A single
  photo still works but allows the model to drift (e.g. enlarging a small emblem).
- If the model misreads a detail, use the operator visual-fact override to correct it; it
  overrides the model's visual guess.

## Database (production)

- **D-355 Image QC schema drift RESOLVED.** Ran `npm run db:imageqc:apply -- --apply
  --confirm-apply-d355-image-qc-schema`. Added `products.image_quality_*` columns
  (status/notes/checked_at/checked_by/source), the `products_image_quality_defect_flags`
  table, enums, FK, and indexes. Post-apply smoke checks PASS (`smoke:imageqc:schema`,
  `smoke:shopier:read`). This cleared the product-creation crash ("Failed query ...
  products.image_quality_status").

## Architecture confirmation

- The bot runs on Vercel serverless (Node, no Python, no GPU). The fully-generative Gemini
  path is correct for this constraint. Segment-and-composite (Python/GPU) was evaluated and
  rejected for production. Open-source repos (SAM2, rembg, IP-Adapter, ControlNet, IOPaint,
  LaMa, Real-ESRGAN, ComfyUI) are not usable in-bot; only a CPU upscaler was relevant, now
  done with sharp.

## Operational incident — file-sync corruption

- The working tree and git internals were repeatedly corrupted (truncation + NUL padding):
  `package.json`, `telegram/route.ts`, `imageProviders.ts`, the shopier route,
  `shopierStockLifecycle.ts`, `.git/packed-refs`, and `.git/index`.
- Root cause: the repo lives in a OneDrive-synced Desktop folder AND two AI agents (this
  session + Codex) edited it concurrently. Concurrent writes + cloud sync truncate large
  files mid-write.
- Recovery: clean tracked files restored from HEAD; one catastrophic auto-staged
  "delete 382 files" commit was caught by a guard and reverted; commits were completed using
  a temporary git index outside the synced folder (`GIT_INDEX_FILE=/tmp/...`).
- Recommendation: move the repo off OneDrive (e.g. `C:\dev\`), re-clone fresh, and never
  run two AI agents on the same folder at once.
