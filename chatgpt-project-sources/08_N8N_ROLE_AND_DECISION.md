# n8n Role And Decision

Last updated: 2026-07-24

## Current Position

n8n is optional glue, not the main project brain.

Current default: direct Payload/Next product flow. Active-channel dispatch is also direct-first when provider requirements are configured: Instagram, Facebook, and X use app-side provider adapters, while Shopier is queued through the Payload jobs layer. n8n is an explicit compatibility fallback only when a named webhook is configured and verified; it is frozen for new work until a specific operator need proves that a small bridge is useful.

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

## Current Decision

The default is now Option B. Do not create or repair an n8n intake flow merely because it exists historically.

### Option A: Optional Intake Bridge (only with a verified current need)

Hermes/Mentix or optional OpenClaw -> n8n -> Payload.

Pros:

- Existing setup may already work.
- Easy visual workflow debugging.

Cons:

- More moving parts.
- Can become stale or hidden.

### Option B: Direct Payload/Next Intake (current default)

Hermes/Mentix or optional OpenClaw -> Payload directly.

Pros:

- Fewer moving parts.
- Easier to test in code.
- Clearer source of truth.

Cons:

- Requires some implementation cleanup.
- Less visual workflow UI.

## Operating Rule

Keep n8n only if a current operator workflow cannot be handled cleanly in Payload/Next and the bridge has a named owner, input/output contract, failure path, and manual fallback. Otherwise keep the intake direct to Payload/Next.

Do not invest in new n8n channel workflows until product intake and publishing reliability are stable.

Allowed workflow files for optional fallback testing:

- `n8n-workflows/stubs/channel-instagram.json`
- `n8n-workflows/stubs/channel-shopier.json`
- `n8n-workflows/stubs/channel-facebook.json`
- `n8n-workflows/stubs/channel-x.json`
- `n8n-workflows/channel-instagram-real.json`

Do not add Dolap, Threads, SupplierScout, or inactive-channel workflows.
