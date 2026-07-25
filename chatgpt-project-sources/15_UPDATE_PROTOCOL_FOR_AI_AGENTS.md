# Update Protocol For Codex And Claude

Last updated: 2026-07-24

## Rule

When a material project decision changes, update this source pack in the same branch or work session.

## Material Changes

Update this folder when changing:

- active channels
- retired/dormant systems
- roadmap phases
- bot ownership
- Hermes/Mentix skills and optional OpenClaw reactivation notes
- n8n role
- product workflow
- publishing architecture
- validation/deploy process
- major open questions

## Files To Update First

- `01_CURRENT_TRUTH.md`
- `02_MASTER_ROADMAP.md`
- `04_BOTS_AND_AUTOMATIONS.md`
- `17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`

## Style Rules

- Keep files concise.
- Prefer current truth over history.
- Do not add secrets.
- Do not paste raw transcripts.
- Do not exceed 20 documents in this folder without removing or merging old files. The pack is currently at that limit, so update an existing file unless one is deliberately retired.
- If a historical fact matters, summarize it briefly and link to the repo file outside this source pack.

## Agent Behavior

Codex and Claude should:

1. Read this folder before planning major changes.
2. Treat it as the ChatGPT Project source set.
3. Update it after architecture or roadmap changes.
4. Avoid reintroducing Dolap, Threads, or SupplierScout activation unless the user explicitly reverses the decision.
5. When the change affects project control truth, update the matching root Obsidian note (`00_HOME.md` through `04_ACTIVE_DECISIONS.md`) in the same work session.

## Manual Refresh Process

After this folder changes:

1. User manually uploads/refreshes these files in ChatGPT Project.
2. ChatGPT Project should treat this folder as the current source of truth.
3. Old uploaded sources should be removed if they conflict with this pack.

## Mechanical Guard

`npm run test:source-pack` checks the source-pack document count, required files, active channel truth, retirement decisions, and selected active control artifacts. `npm run test:obsidian-control` checks the five root Obsidian control notes. `npm run validate` includes both guards.
