# CLEANUP REPORT — 2026-04-19

**Type:** Phase 1 — Documentation governance cleanup only  
**Branch:** chore/project-memory-cleanup  
**Runtime code modified:** NO  
**Database/schema modified:** NO  
**Files permanently deleted:** NO

---

## Files Created

| File | Purpose |
|------|---------|
| project-control/SOURCE_AUTHORITY.md | New canonical document defining source authority hierarchy, folder responsibilities, contradiction resolution rules, and information routing |
| project-control/archives/ | New directory for historical documentation records |
| project-control/archives/MEMORY_CONSOLIDATION_REPORT.md | Moved from project-control/ root (was already missing from working tree, restored from git for archival) |
| project-control/archives/patch-blob-reduce-advanced-ops.diff | Copied from project-control/ root (untracked file, original left in place) |
| project-control/archives/phase14-migration.sql | Copied from project-control/ root (untracked file, original left in place) |
| project-control/archives/step-24-neon-sql.sql | Copied from project-control/ root (untracked file, original left in place) |
| project-control/CLEANUP_REPORT_2026-04-19.md | This file |

---

## Files Changed

| File | Changes Made |
|------|-------------|
| **project-control/MEMORY_LOCK.md** | MAJOR UPDATE: Fixed decision ID registry (D-094 → D-169), updated decision count (92 → 168), updated phase table (Phase 2B IN PROGRESS → Phase 15 COMPLETE), added 7 protected workflow rules (D-096, D-162, D-163, D-165, D-167, D-168, image v50 lock), clarified OpenClaw/n8n are NOT primary intake, added de-scoped/blocked channels section (Dolap, LinkedIn, Telegram Stories, WhatsApp Status), updated bot names, updated stack decisions (Gemini primary, n8n/OpenClaw as support), added reference to SOURCE_AUTHORITY.md |
| **project-control/ARCHITECTURE.md** | SIGNIFICANT UPDATE: Added "Primary Product Intake" section (direct Telegram webhook), renamed VPS section to "Operations/Support Layer", marked old intake flow as SUPERSEDED (kept for historical reference), updated telegram/route.ts comment (from "scaffold" to "PRIMARY handler"), updated Integration Domain (OpenClaw/n8n roles clarified), added "Platform Limits / Blocked Channels" section, updated Phase 2B status (X/Twitter live, Dolap/LinkedIn de-scoped), updated Mentix skills from "pending deployment" to "deployed", updated Architectural Boundaries (OpenClaw/n8n role descriptions) |
| **project-control/PROJECT_STATE.md** | MINOR UPDATE: Added protected workflow rule #5 (D-168 — active wizard sessions bypass group filters), updated date header to 2026-04-19, updated rules date to 2026-04-19 |
| **project-control/TASK_QUEUE.md** | MODERATE UPDATE: Updated sprint description to "CLEANUP + ONE-PRODUCT PIPELINE VALIDATION" with explicit "no new feature expansion" note, marked X/Twitter as LIVE in Phase 2B channels, marked Dolap/LinkedIn as DE-SCOPED, added Telegram Stories and WhatsApp Status as BLOCKED_OFFICIALLY in blocked section |
| **project-control/OPEN_QUESTIONS.md** | SIGNIFICANT UPDATE: Closed/resolved Q4 (Dolap → de-scoped), Q7 (n8n role → partially resolved), Q10 (Mentix skills → deferred), Q11 (content gen → partially resolved). Added 4 new questions from audit: Q12 (n8n dispatch path), Q13 (OpenAI fallback status), Q14 (Luma/Claid code quarantine), Q15 (dead code cleanup strategy). Kept Q1, Q2, Q5, Q6, Q8, Q9 as still open. |

---

## Files Moved to Archives

| Original Location | Archive Location | Reason |
|-------------------|-----------------|--------|
| project-control/MEMORY_CONSOLIDATION_REPORT.md | project-control/archives/ | Historical record from 2026-03-23 consolidation; contains stale ID claim (D-094); purpose served |
| project-control/patch-blob-reduce-advanced-ops.diff | project-control/archives/ (copy) | Historical commit reference; value is in git history. Original left in place. |
| project-control/phase14-migration.sql | project-control/archives/ (copy) | Executed migration record; documented in MIGRATION_NOTES.md. Original left in place. |
| project-control/step-24-neon-sql.sql | project-control/archives/ (copy) | Executed migration record; documented in MIGRATION_NOTES.md. Original left in place. |

---

## Files Intentionally NOT Touched

### Documentation — Keep As-Is
- project-control/DECISIONS.md — Actively maintained, D-056–D-060 duplicate IDs noted but renumbering deferred (low operational risk, later definitions take precedence)
- project-control/PRODUCTION_TRUTH_MATRIX.md — Current (2026-04-08), no updates needed
- project-control/DEPLOY_CHECKLIST.md — Current (2026-04-08), no updates needed
- project-control/MIGRATION_NOTES.md — Current (2026-04-04), no updates needed
- project-control/OPERATOR_RUNBOOK.md — Current (2026-04-06), no updates needed
- project-control/SMOKE_TESTS.md — Current (2026-04-04), no updates needed
- project-control/SYSTEM_PROMPT.md — Timeless governance, no updates needed
- project-control/MENTIX_SYSTEM_PROMPT.md — Minor "to be deployed" wording noted; deferred as non-critical
- project-control/SAVED_PROMPTS.md — Reference utility, no updates needed
- project-control/architecture-onion.html — Visualization, no updates needed
- project-control/mimari-sogankatmani-tr.html — Turkish visualization, no updates needed
- project-control/mentix-intake-SKILL.md — Duplicate of mentix-skills version; noted as archive candidate but not moved (operator decision needed)

### ai-knowledge/ — Entire folder not touched
- 9 structured docs overlap 30–70% with project-control — archive candidates for future phase
- 14 raw-chat files (~364 KB) — delete candidates for future phase
- Per instructions: "Do not delete raw chats yet. Do not delete ai-knowledge yet."

### mentix-memory/ — Entire folder not touched
- 33 files, all properly operational runtime memory
- Clean — no action needed

### mentix-skills/ — Entire folder not touched
- 17 files, all well-structured skill specs
- Clean — no action needed

### Runtime Code — NOT touched (per instructions)
- src/ — no modifications
- payload.config.ts — no modifications
- n8n-workflows/ — no modifications

### Dead Code Candidates — NOT touched (per instructions)
- src/lib/imageLockReminder.ts — 0 external references (dead code)
- src/lib/imagePromptBuilder.ts — 0 external references (dead code)
- src/jobs/lumaGenTask.ts — explicitly disabled since v19
- src/jobs/claidTask.ts — explicitly disabled since v19
- src/lib/lumaApi.ts — only imported by disabled lumaGenTask
- src/lib/lumaPrompts.ts — only imported by disabled lumaGenTask
- src/lib/claidProvider.ts — only imported by disabled claidTask

---

## Remaining Contradictions

| Issue | Files | Status | Severity |
|-------|-------|--------|----------|
| D-056–D-060 duplicate IDs in DECISIONS.md | DECISIONS.md | Deferred — later definitions take precedence by file position | LOW |
| MENTIX_SYSTEM_PROMPT.md says skills "to be deployed" | MENTIX_SYSTEM_PROMPT.md | Deferred — minor wording, non-critical | LOW |
| project-control/mentix-intake-SKILL.md duplicates mentix-skills/ version | project-control/, mentix-skills/ | Noted — archive candidate for Phase 2 | LOW |
| ai-knowledge/ structured docs overlap 30–70% with project-control/ | ai-knowledge/, project-control/ | Noted — archive candidates for Phase 2 | LOW |

All CRITICAL and MEDIUM contradictions from the audit have been resolved in this cleanup.

---

## Dead Code Candidates NOT Touched

| File | Reason Dead | Evidence | Recommended Action |
|------|-------------|----------|--------------------|
| src/lib/imageLockReminder.ts | Exported constant never imported | 0 grep hits outside file | Archive after operator confirmation |
| src/lib/imagePromptBuilder.ts | Exported functions never called | 0 grep hits outside file | Archive after operator confirmation |
| src/jobs/lumaGenTask.ts | Disabled since v19 Gemini-only | Comments + callbacks return "devre dışı" | Archive after operator confirmation |
| src/jobs/claidTask.ts | Disabled since v19 Gemini-only | Comments + #claid detection = false | Archive after operator confirmation |
| src/lib/lumaApi.ts | Only imported by disabled task | Single import chain | Archive with lumaGenTask |
| src/lib/lumaPrompts.ts | Only imported by disabled task | Single import chain | Archive with lumaGenTask |
| src/lib/claidProvider.ts | Only imported by disabled task | Single import chain | Archive with claidTask |

---

## Operator Decisions Needed Before Phase 2

1. **Q12: n8n dispatch path** — Does any current live channel dispatch actually route through n8n, or is it all direct Graph API? Determines whether n8n workflow files are active or archive candidates.

2. **Q13: OpenAI image gen fallback** — Keep `generateByEditing()` as intentional fallback, or fully deactivate like Luma/Claid?

3. **Q14: Luma/Claid code quarantine** — Move disabled files to `_archived/` directory, or leave in place? Affects payload.config.ts job registration.

4. **Q15: Dead code cleanup approach** — Archive directory, separate branch, or annotate-only for the 7 identified dead/disabled files?

5. **ai-knowledge/ cleanup** — Archive 9 stale structured docs to ai-knowledge/archives/? Delete 13 raw-chat dump files (~350 KB of noise)?

6. **project-control/mentix-intake-SKILL.md** — Archive to project-control/archives/ since mentix-skills/ has the canonical version?

---

## Recommended Next Phase

### Phase 2: ai-knowledge Cleanup (documentation only, no code)
- Archive 9 structured docs that duplicate project-control/ at 30–70%
- Delete or archive 13 raw-chat dump files
- Keep 1 structured handoff file (openclaw_n8n_vps_handoff_2026-03-14.txt) in archives

### Phase 3: Dead Code Quarantine (requires operator confirmation)
- Create src/lib/_archived/ and src/jobs/_archived/
- Move 7 identified dead/disabled files
- Update payload.config.ts to remove disabled job registrations
- Test that build still passes

### Phase 4: DECISIONS.md ID Cleanup
- Renumber D-056–D-060 duplicates
- Update MEMORY_LOCK.md ID registry if ranges change

### Phase 5: Final Memory Lock Refresh
- Rebuild MEMORY_LOCK.md from scratch if significant drift accumulates
- Update PRODUCTION_TRUTH_MATRIX.md with new validation results
- Final consistency pass across all project-control/ files
