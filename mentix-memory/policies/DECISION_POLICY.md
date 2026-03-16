# Decision Policy

_Version: 1.0 — 2026-03-16_

---

## Decision Schema

Every meaningful decision record must capture the following fields:

```json
{
  "decision_id": "DEC-2026-03-16-001",
  "timestamp": "2026-03-16T12:00:00Z",
  "task_type": "product_visibility_debug | channel_dispatch | stock_fix | intake_debug | ...",
  "triggered_by": "user | schedule | auto-detect",
  "risk_level": "LOW | MEDIUM | HIGH",
  "requires_write": false,
  "requires_external_publish": false,
  "confidence_score": 0.82,
  "evidence_strength": "STRONG | MODERATE | WEAK | NONE",
  "human_approval_required": false,
  "reversible": true,
  "blast_radius": "LOW | MEDIUM | HIGH",
  "selected_skills": ["product-flow-debugger", "sql-toolkit"],
  "selected_tools": ["db_select", "inspect_record"],
  "proposed_action": "Check products.status field and storefront query",
  "final_action": "Confirmed status was draft — recommended admin activation",
  "outcome": "PENDING | SUCCESS | FAILURE | PARTIAL",
  "notes": ""
}
```

---

## Confidence Thresholds

| Confidence | Action |
|------------|--------|
| < 0.55 | Report findings only — no action taken |
| 0.55 – 0.79 | Propose action + require human confirmation |
| ≥ 0.80 + LOW risk | Proceed autonomously if within allowed permissions |
| ≥ 0.80 + MEDIUM risk | Propose + require explicit confirmation |
| Any + HIGH risk | Always require explicit human confirmation |

---

## Risk Classification

### LOW Risk
- Read-only operations
- Non-destructive inspection
- Informational queries
- Health checks

### MEDIUM Risk
- Single-record write operations
- Triggering forceRedispatch
- Configuration reads that may expose state
- Operations with limited blast radius

### HIGH Risk
- Bulk write or delete operations
- External publish actions
- Schema changes
- Anything irreversible without backup
- Any action affecting live production data for multiple records

---

## Blast Radius Classification

| Blast Radius | Description |
|-------------|-------------|
| LOW | Affects 0–1 records; fully reversible |
| MEDIUM | Affects 2–10 records; partially reversible |
| HIGH | Affects 10+ records; or irreversible; or external |

---

## Decision Storage
All decisions stored in `mentix-memory/decisions/` as JSON files.
Format: `YYYY-MM-DD-decision-NNN.json`
