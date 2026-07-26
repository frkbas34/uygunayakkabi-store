# Update Protocol for AI Agents

Current as of 2026-07-26.

## Before acting

1. Read `AGENTS.md` and the relevant source-pack/runbook files.
2. Inspect git status and preserve user changes.
3. Read the actual code and focused tests for the requested surface.
4. Distinguish local evidence from production evidence.

## While acting

- Payload/Next remains the product and commerce source of truth.
- Hermes/Mentix is the current operator-control layer.
- Keep Website, Instagram, Facebook, X, and Shopier active; do not revive Dolap or Threads.
- Keep SupplierScout dormant unless the operator reverses that decision.
- Treat n8n as optional glue and OpenClaw as historical/optional.
- Do not bypass shared product, brand, Image QC, public-media, Shopier, stock, or confirmation gates.
- Never execute an action based on confidence; require the appropriate explicit approval.
- Content approval is only approval of copy.

## After a change

1. Run focused tests, then typecheck/lint/validate/build in proportion to risk.
2. Update current documentation without copying milestone ledgers.
3. Report what passed, what was not run, and what requires operator evidence.
4. Do not commit, push, deploy, call providers, or run live smokes unless explicitly requested.
