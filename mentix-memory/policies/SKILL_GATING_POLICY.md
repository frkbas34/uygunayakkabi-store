# Skill Gating Policy

_Version: 1.0 — 2026-03-16_

---

## Activation Level Gate

### Level A — Active (no gate)
Skills: skill-vetter, browser-automation, sql-toolkit, agent-memory, github-workflow, uptime-kuma, product-flow-debugger
- Activate on relevant trigger
- No human confirmation needed to run
- Write operations within these skills still require write policy check

### Level B — Controlled (per-operation gate)
Skills: eachlabs-image-edit, upload-post, research-cog, senior-backend
- Can be invoked freely for analysis/draft mode
- Any action with external or write consequences needs confirmation
- Skill remains installed, not disabled — just gated at the action level

### Level C — Observe Only (proposal gate)
Skills: learning-engine
- Runs passively in background
- Can observe, score, detect, summarize, propose
- All proposals require explicit human approval before implementation

## Skill Vetting Gate
Before any NEW skill is added to the stack:
1. skill-vetter must evaluate it
2. Vetting report must show: purpose, permissions requested, risk level, provenance
3. Level assignment determined by vetting result
4. Human must approve Level A or B assignments
5. Unvetted skills default to Level C (observe-only) if added without review

## Emergency Disable
Any skill can be disabled immediately by:
1. Rename `SKILL.md` → `SKILL.md.disabled` on VPS
2. Restart OpenClaw gateway
3. Log disable event in mentix-memory/incidents/

## Upgrade Path (per skill)
Skills can be upgraded between levels only after:
- Minimum 7 days stable operation at current level
- No unresolved safety incidents
- Operator explicit approval
- Updated in this policy file
