# n8n Role And Decision

Last updated: 2026-06-30

## Current Position

n8n is optional glue, not the main project brain.

Current validation guard:

```powershell
npm run test:n8n-optional
```

This keeps n8n optional, checks the allowed active-channel workflow inventory, verifies scaffold mode does not block the Payload product flow when webhook env vars are missing, and prevents package scripts from activating n8n workflows by default.

## Good Uses For n8n

- Multi-step workflow glue when app code would be awkward.
- Temporary integration experiments.
- Legacy product intake bridge if still useful.
- Non-critical notifications or workflow fan-out.

## Bad Uses For n8n

- Rebuilding core commerce state outside Payload.
- Becoming the source of truth.
- Adding retired channel workflows.
- Duplicating direct app publishing paths without a reason.

## Current Decision Needed

Choose one:

### Option A: Keep Intake Bridge

OpenClaw/Mentix -> n8n -> Payload.

Pros:

- Existing setup may already work.
- Easy visual workflow debugging.

Cons:

- More moving parts.
- Can become stale or hidden.

### Option B: Simplify Intake

OpenClaw/Mentix -> Payload directly.

Pros:

- Fewer moving parts.
- Easier to test in code.
- Clearer source of truth.

Cons:

- Requires some implementation cleanup.
- Less visual workflow UI.

## Recommended Direction

Keep n8n only if the current intake workflow is actively useful. Otherwise simplify to direct Payload calls.

Do not invest in new n8n channel workflows until product intake and publishing reliability are stable.

Allowed workflow files for optional fallback testing:

- `n8n-workflows/stubs/channel-instagram.json`
- `n8n-workflows/stubs/channel-shopier.json`
- `n8n-workflows/stubs/channel-facebook.json`
- `n8n-workflows/stubs/channel-x.json`
- `n8n-workflows/channel-instagram-real.json`

Do not add Dolap, Threads, SupplierScout, or inactive-channel workflows.
