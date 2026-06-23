# OpenClaw Skill Deployment Sync Checklist

Last updated: 2026-06-23

Purpose: keep Mentix/OpenClaw deployment aligned with the current UygunAyakkabi build plan before any VPS copy, restart, or skill activation.

## Current Truth

- Payload/Next remains the source of truth and execution layer for products, media, stock, publishing, jobs, orders, leads, and bot events.
- OpenClaw/Mentix is the agent and skill layer for reasoning, diagnostics, drafting, memory, and operator support.
- n8n is optional glue only. Do not make it the default product brain.
- Active product channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired. Do not deploy prompts, workflows, parser targets, or post drafts for them.
- SupplierScout remains dormant. Do not deploy supplier-sourcing skills or wake SupplierScout unless the user explicitly reverses the strategy.
- Business strategy is own-products-only.

## Required Pre-Deploy Checks

1. Run `npm run validate`.
2. Run `npm run test:mentix-skills`.
3. Confirm `chatgpt-project-sources/` is updated for any roadmap, bot-role, channel, or deployment decision change.
4. Confirm `mentix-skills/INSTALLATION_MATRIX.md` does not claim unverified VPS state as current fact.
5. Confirm the skill output modes:
   - `product-flow-debugger`: evidence-first diagnostics, no auto-fix without approval.
   - `upload-post`: draft-only, no auto-publish.
   - `senior-backend`: advisory only.
   - `research-cog`: informational only, no supplier sourcing.
   - `agent-memory`: concise memory writes; source-pack updates for durable decisions.

## VPS Sync Procedure

1. Inspect the VPS skill directory first:

```bash
ls -la /home/furkan/.openclaw/skills/
```

2. Copy only reviewed skill folders:

```bash
scp -r mentix-skills/<skill-name> furkan@VPS_IP:/home/furkan/.openclaw/skills/
```

3. Restart OpenClaw only after the copied set is known:

```bash
cd /opt/openclaw
docker compose restart
```

4. Verify logs:

```bash
docker logs openclaw-openclaw-gateway-1 --tail 100
```

5. Test in Telegram with read-only prompts first:

- `@Mentix bu urun neden gorunmuyor`
- `@Mentix publish readiness check yap`
- `@Mentix repo durumu`

## Rollback

1. Rename the bad skill on VPS to `SKILL.md.disabled` or restore the previous folder.
2. Restart OpenClaw.
3. Log the rollback in `mentix-memory/` and update `chatgpt-project-sources/` if the deployment decision changed.
