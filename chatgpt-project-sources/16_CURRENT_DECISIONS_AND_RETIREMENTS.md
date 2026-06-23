# Current Decisions And Retirements

Last updated: 2026-06-23

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
