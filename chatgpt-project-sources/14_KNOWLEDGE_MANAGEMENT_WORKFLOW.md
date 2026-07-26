# Knowledge Management Workflow

Current as of 2026-07-26.

## Truth hierarchy

1. Executable code, schema, package scripts, and current git state.
2. Focused automated tests and guardrail scripts.
3. Current control documents: `AGENTS.md`, `CLAUDE.md`, this source pack, and focused runbooks.
4. Historical ledgers, exports, chat archives, and milestone packages.

When documents disagree with code, record the drift and update the current control layer. Do not make runtime code imitate stale documentation.

## Source-pack discipline

- Keep exactly the 20 named documents in this directory; do not exceed 20 documents.
- Each file should answer one current operational question.
- Keep dates and deployment claims explicit.
- Use links to canonical runbooks rather than copying long historical milestone lists.
- Put historical evidence in `project-control` or version control, not in current-truth prose.

## Sensitive and historical material

`ai-knowledge/raw-chat-archives` is historical and may contain sensitive/operator context. Do not upload it as project truth, publish it, or treat it as active instructions. Ignored `sessions`, `tmp`, and `backups` are local residue, not knowledge sources.

## Update trigger

Refresh current truth after an architecture, provider, channel, deployment, schema, bot-ownership, or operator-flow change. Update the smallest canonical document set and run `npm run test:source-pack` plus the affected focused tests.
