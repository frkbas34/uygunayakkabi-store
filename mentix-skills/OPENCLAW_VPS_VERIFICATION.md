# OpenClaw VPS Verification Checklist

Last updated: 2026-07-11

Purpose: verify what is actually installed and loaded on VPS OpenClaw before copying skills, restarting containers, or testing live Telegram prompts if OpenClaw is explicitly reactivated. Hermes is the current agent-control layer; OpenClaw is historical/optional unless explicitly reactivated.

This checklist is read-only. It is not a deploy plan and not approval to sync.

After this checklist has been completed and an operator has separately
reactivated OpenClaw, the legacy sync script still requires both
`--reactivate-openclaw` and `--confirm-vps-sync`. It must not be run as a
normal Hermes/Mentix operation.

## Guardrails

- Do not run `scp`, `rsync`, `docker compose restart`, write commands, provider calls, Shopier calls, external posting, queue commands, or ad actions during verification.
- Do not print secret values. Record only `present` or `missing` for expected environment keys.
- Do not activate SupplierScout.
- Do not revive Dolap or Threads.
- Do not make n8n the product brain.
- Treat Payload/Next as the source of truth.
- Treat Hermes as the current agent-control layer.
- Treat OpenClaw as historical/optional unless explicitly reactivated.

## Expected Repo Skill Folders

- `agent-memory`
- `browser-automation`
- `eachlabs-image-edit`
- `github-workflow`
- `learning-engine`
- `mentix-intake`
- `product-flow-debugger`
- `research-cog`
- `senior-backend`
- `skill-vetter`
- `sql-toolkit`
- `upload-post`
- `uptime-kuma`

## Read-Only VPS Commands

Run with the operator present:

```bash
ls -la /home/furkan/.openclaw/skills/
find /home/furkan/.openclaw/skills -maxdepth 2 -name SKILL.md -print | sort
cd /opt/openclaw && docker compose ps
docker logs openclaw-openclaw-gateway-1 --tail 100
```

Optional secret-safe env presence check:

```bash
sh -lc 'for k in DATABASE_URI GITHUB_TOKEN; do if [ -n "$(printenv "$k")" ]; then echo "$k=present"; else echo "$k=missing"; fi; done'
```

## Evidence To Record

- Verification date and operator.
- VPS skill folders observed.
- Missing repo skills.
- Extra VPS skills not in repo.
- Whether OpenClaw logs show skill loading.
- Whether any stale Dolap, Threads, SupplierScout-active, or n8n-default wording appears.
- Whether required env keys are present or missing, without values.
- Whether read-only Telegram prompts pass after any approved sync.

## Read-Only Telegram Prompt Checks

Only after the operator confirms live prompt testing is acceptable:

- `@Mentix canli smoke planini goster`
- `@Mentix bu urun neden gorunmuyor`
- `@Mentix shopier hazir mi`
- `@Mentix dolap icin hazirla`
- `@Mentix supplierscout calistir`

Expected behavior:

- Mentix points live-smoke sequencing to `/smokeplan` first.
- Mentix asks for or uses `/productflow` evidence before diagnosing product state.
- Mentix stops before publish, queue, provider, Shopier, dispatch, or ad actions.
- Mentix refuses Dolap/Threads and SupplierScout activation.

## Done Means

VPS/OpenClaw deployment reality is verified only when directory evidence, log evidence, and read-only Telegram prompt evidence are recorded. Until then, repo-side skill docs are expected state, not deployed state.
