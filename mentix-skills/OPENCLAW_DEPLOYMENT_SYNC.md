# Optional OpenClaw Skill Deployment Sync Checklist

Last updated: 2026-07-24

Purpose: keep optional Mentix/OpenClaw deployment aligned with the current UygunAyakkabi build plan before any explicitly approved VPS copy, restart, or skill activation. Hermes is the current agent-control layer; OpenClaw is historical/optional unless explicitly reactivated.

## Current Truth

- Payload/Next remains the source of truth and execution layer for products, media, stock, publishing, jobs, orders, leads, and bot events.
- Hermes is the current agent-control layer for reasoning, diagnostics, drafting, memory, and operator support.
- OpenClaw is historical/optional unless explicitly reactivated.
- n8n is optional glue only. Do not make it the default product brain.
- Active product channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired. Do not deploy prompts, workflows, parser targets, or post drafts for them.
- SupplierScout remains dormant. Do not deploy supplier-sourcing skills or wake SupplierScout unless the user explicitly reverses the strategy.
- Business strategy is own-products-only.
- `/smokeplan` is the operator checklist before live Telegram/runtime smoke. It is read-only guidance and must stop before queueing, publishing, redispatch, provider calls, Shopier API calls, or ads.

## D-401 Verification-First Rule

The repo skill files are not proof that VPS OpenClaw is synced, loaded, or live.

Before any optional copy, restart, or Telegram/OpenClaw live prompt, follow `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and record what is actually observed. Do not claim that a skill is deployed on the VPS unless OpenClaw is explicitly reactivated and the VPS directory, logs, and a read-only Telegram prompt prove it.

The legacy `scripts/vps-deploy.sh` is not a normal deployment command. It exits
before any VPS write, skill copy, or restart unless both
`--reactivate-openclaw` and `--confirm-vps-sync` are supplied after this
verification evidence is recorded. Those flags do not replace the required
operator decision or the read-only evidence.

## D-463 Runtime-Truth Rule

The repo skill files are optional templates, not a second execution layer. Hermes/Mentix is current; Payload/Next executes commerce workflows. `product-flow-debugger` is read-only, `upload-post` and `research-cog` produce operator-reviewed drafts, `senior-backend` is advisory only, and `agent-memory` records only durable PII-light project decisions in `project-control/` plus the relevant source-pack document. Do not copy a skill merely because the repo template changed.

## Required Local Checks

Run these before any operator-approved optional OpenClaw VPS sync:

1. `npm run validate`
2. `npm run test:mentix-skills`
3. Standalone `npm run test:openclaw-vps-verification`
4. `npm run test:operator-smoke-plan`
5. Confirm `chatgpt-project-sources/` is updated for any roadmap, bot-role, channel, or deployment decision change.
6. Confirm `mentix-skills/INSTALLATION_MATRIX.md` marks VPS state as `VERIFY ON VPS` unless it has current evidence.
7. Confirm the skill output modes:
   - `product-flow-debugger`: evidence-first diagnostics, no auto-fix without approval.
   - `upload-post`: draft-only, no auto-publish.
   - `senior-backend`: advisory only.
   - `research-cog`: informational only, no supplier sourcing.
   - `agent-memory`: concise memory writes; source-pack updates for durable decisions.

## Read-Only VPS Verification

Do this before copying anything:

```bash
ls -la /home/furkan/.openclaw/skills/
find /home/furkan/.openclaw/skills -maxdepth 2 -name SKILL.md -print
cd /opt/openclaw && docker compose ps
docker logs openclaw-openclaw-gateway-1 --tail 100
```

Rules:

- Do not print secret values. Only record whether expected env keys are present or missing.
- Do not run `scp`, `rsync`, `docker compose restart`, or any write command during verification.
- Do not activate SupplierScout, Dolap, Threads, n8n product intake, external posting, Shopier calls, provider calls, or ads.
- If the VPS skill set differs from the repo, record the difference before deciding whether to copy.

## VPS Sync Procedure

Only after explicit operator approval and OpenClaw reactivation:

1. Copy only reviewed skill folders:

```bash
scp -r mentix-skills/<skill-name> furkan@VPS_IP:/home/furkan/.openclaw/skills/
```

2. Restart OpenClaw only after the copied set is known:

```bash
cd /opt/openclaw
docker compose restart
```

3. Verify logs:

```bash
docker logs openclaw-openclaw-gateway-1 --tail 100
```

4. Test in Telegram with read-only prompts first:

- `@Mentix bu urun neden gorunmuyor`
- `@Mentix publish readiness check yap`
- `@Mentix canli smoke planini goster` -> should point to `/smokeplan` first
- `@Mentix repo durumu`

## Rollback

1. Rename the bad skill on VPS to `SKILL.md.disabled` or restore the previous folder.
2. Restart OpenClaw only with operator approval.
3. Log the rollback in `mentix-memory/` or `project-control/`.
4. Update `chatgpt-project-sources/` if the deployment decision changed.
