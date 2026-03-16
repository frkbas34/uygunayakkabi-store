# Memory Policy

_Version: 1.0 — 2026-03-16_

---

## Purpose
Define what gets stored in mentix-memory, how long, and when to archive.

## What To Store

| Category | Store If | Do Not Store |
|----------|----------|-------------|
| incidents/ | Issue confirmed, resolved or not | Noise, duplicates, unverified symptoms |
| traces/ | Any diagnostic session with meaningful steps | Simple queries with no diagnostic value |
| patterns/ | Issue/success seen 2+ times | Single-occurrence events |
| decisions/ | Risk ≥ MEDIUM or human involved | Trivial low-confidence checks |
| evaluations/ | Diagnosis made and outcome known | Pending outcomes |
| rewards/ | Evaluation complete | Speculative scores |
| summaries/ | Weekly/monthly digest | Raw event lists |

## What Never To Store
- Credentials, tokens, API keys
- Customer PII (names, emails, phone numbers, addresses)
- Order payment details
- User passwords or session tokens
- Speculative information presented as fact

## Retention
| Category | Retain | Archive After |
|----------|--------|---------------|
| incidents/ | Active | 90 days if no recurrence |
| traces/ | Active | 30 days |
| patterns/ | Permanent | Never (keep active) |
| decisions/ | Permanent | Archive old ones after 6 months |
| evaluations/ | Active | 60 days |
| rewards/ | Permanent | Max 1000 entries, then archive |
| summaries/ | Permanent | — |

## Size Limits
| Category | Soft Limit | Action at Limit |
|----------|-----------|-----------------|
| incidents/ | 500 | Archive resolved, keep open |
| traces/ | 200 | Archive oldest |
| rewards/ | 1000 | Archive + keep running total |
| patterns/ | 200 | Review and merge similar patterns |
