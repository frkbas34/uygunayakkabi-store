# Write Policy

_Version: 1.0 — 2026-03-16_

---

## Rule
No write operation (database, filesystem, API) executes without passing this policy check.

## Write Classification

| Write Type | Risk | Gate |
|-----------|------|------|
| Memory store (agent-memory) | LOW | Auto-allowed |
| Trace write (mentix-memory) | LOW | Auto-allowed |
| DB SELECT (read, no write) | NONE | Auto-allowed |
| DB UPDATE single record | MEDIUM | Confirm-required |
| DB UPDATE multi-record | HIGH | Explicit approval + blast radius |
| DB DELETE | HIGH | Denied by default |
| Product status change | MEDIUM | Confirm-required |
| forceRedispatch trigger | MEDIUM | Confirm-required |
| File write (skill files) | HIGH | Human review only |
| Config write (openclaw.json) | HIGH | Human review only |

## Confirmation Protocol
Before any confirm-required write:
1. State: what will be written
2. State: which record(s) affected
3. State: reversibility (can this be undone?)
4. State: blast radius estimate
5. Wait for explicit user "yes" / "confirm" / "proceed"

Never proceed on ambiguous confirmation.
