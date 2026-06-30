# Current Decisions And Retirements

Last updated: 2026-06-28

## Active Business Decision

Sell and upload our own products only.

## Retired Channels

Dolap and Threads are not part of the project anymore.

Implications:

- No UI toggles.
- No parser targets.
- No n8n stubs.
- No Claude/Codex roadmap items.
- No Mentix skill outputs.

## Dormant System

SupplierScout is sleeping.

Implications:

- Code can stay.
- Collections can stay.
- API no-ops unless `SUPPLIER_SCOUT_ENABLED=true`.
- Daily Vercel cron removed.
- Dormancy is checked by `npm run test:supplierscout-dormant`.
- Do not activate without explicit new strategy decision.

## n8n Decision

n8n is optional glue.

It is not the main brain and should not duplicate core app logic unless there is a clear workflow reason.

## OpenClaw Decision

OpenClaw remains useful as the Mentix agent/skill layer.

It should support reasoning, diagnostics, memory, and operator help. Payload/Next remains the execution and source-of-truth layer.

## Ad Automation Decision

No autonomous ad spending yet.

Manual campaign support comes first. Pixel/CAPI/Ads API come later after tracking and privacy decisions.

## Strategic Focus Decision (2026-06-27)

Primary focus is catalog scale-up / product loading factory, not ads.

- Advertising is deferred until the catalog is much larger and product-image quality is stable. The earliest ad phase is D-380+.
- The OLD classification "ads readiness" is replaced by the NEW classification "catalog scale-up / product loading factory."
- Product image quality control (D-355 family) remains central: the structured Image QC gate is implemented, no hallucinated defects are allowed, multi-angle references are preferred, the target is a 5-image studio pack, and the background standard is locked to soft warm ivory.
- Active roadmap for this phase is D-352–D-357 (see `02_MASTER_ROADMAP.md` Phase 10).
- Payload remains the source of truth. Active channels and retirements are unchanged: Dolap/Threads retired, SupplierScout dormant.

## D-351 Lead Capture Repair (completed 2026-06-27)

- The `/api/inquiries` 500 root cause was the missing `customer_inquiries.landing` column (production schema drift).
- DDL applied for `landing`; the route was hardened with a staged fail-safe (full -> core+product -> minimal name+phone).
- Live form success and admin readback confirmed (name, phone, size, source, product relation, UTM source/medium/campaign, landing). Revenue lead capture is restored; ads remain paused.
