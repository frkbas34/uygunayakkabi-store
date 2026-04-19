# SOURCE AUTHORITY — Uygunayakkabi

_Created: 2026-04-19_
_Purpose: Defines the canonical source-of-truth hierarchy, folder responsibilities, and contradiction resolution rules for the entire project knowledge architecture._

---

## Source Authority Hierarchy

When sources conflict, higher rank wins. The lower-ranked source must be updated or marked stale.

| Rank | Source | Role |
|------|--------|------|
| 0 | **Actual running code / runtime behavior** | Implementation reality always wins over any documentation. If the code does X and a doc says Y, the code is truth. |
| 1 | **Safety policies** | Publish policy, write policy, skill gating policy, memory policy, decision policy (mentix-memory/policies/). These govern what the system is ALLOWED to do. |
| 2 | **project-control/DECISIONS.md** | Chronological decision log with commit hashes. The authoritative record of why things are the way they are. |
| 3 | **project-control/PROJECT_STATE.md** | Current project status, protected workflow rules, phase completion records. What IS true right now. |
| 4 | **project-control/PRODUCTION_TRUTH_MATRIX.md** | Subsystem-level validation status with evidence. What has been PROVEN to work. |
| 5 | **project-control/ARCHITECTURE.md** | System architecture, stack decisions, data flows, directory structure. How the system is BUILT. |
| 6 | **project-control/TASK_QUEUE.md** | Active work tracking, blockers, sprint priorities. What we are DOING next. |
| 7 | **mentix-skills/** | Executable skill behavior specs, activation levels, permission matrices. What the Mentix agent CAN do. |
| 8 | **mentix-memory/** | Operational runtime memory — incidents, traces, evaluations, rewards, runbooks. What the Mentix agent REMEMBERS. |
| 9 | **ai-knowledge/ structured references** | Supplementary reference knowledge. Useful context, but must be validated against ranks 0–6 before acting on it. |
| 10 | **Raw chats / old transcripts** | HISTORICAL REFERENCE ONLY. Never a direct source of truth. May contain useful intent or reasoning but must be validated before promotion. |

---

## Folder Responsibility Map

### project-control/ — Canonical Project Governance

**Purpose:** Single authoritative location for all project state, decisions, architecture, deployment, and operational documentation. Every new AI session should start here.

**What belongs here:**
- Project state and phase tracking (PROJECT_STATE.md)
- Architecture and system design (ARCHITECTURE.md)
- Decision log with rationale and commits (DECISIONS.md)
- Active task queue and blockers (TASK_QUEUE.md)
- Deployment procedures and checklists (DEPLOY_CHECKLIST.md)
- Schema migration guides (MIGRATION_NOTES.md)
- Production validation matrix (PRODUCTION_TRUTH_MATRIX.md)
- Immutable truths and locks (MEMORY_LOCK.md)
- Operator runbooks (OPERATOR_RUNBOOK.md)
- Smoke test scenarios (SMOKE_TESTS.md)
- Open questions (OPEN_QUESTIONS.md)
- AI governance prompts (SYSTEM_PROMPT.md, MENTIX_SYSTEM_PROMPT.md)
- This source authority document (SOURCE_AUTHORITY.md)
- Archived historical records (archives/ subfolder)

**What must NOT be stored here:**
- Runtime code or configuration files
- Mentix agent memory (incidents, traces, rewards)
- Skill implementation specs
- Raw chat transcripts
- Transient debug logs or temporary notes

---

### ai-knowledge/ — Secondary Reference Knowledge

**Purpose:** Supplementary reference material that provides context or historical background. NOT a primary source of truth. All content here should be validated against project-control/ before being treated as current.

**What belongs here:**
- Setup and configuration references (when not duplicating project-control)
- Historical troubleshooting guides marked as resolved
- Archived reference documents

**What must NOT be stored here:**
- Current project state or decisions (belongs in project-control/)
- Anything that contradicts or duplicates project-control/ without being marked stale
- Raw chat dumps presented as structured knowledge

**Special rule for raw-chats/:** All files in ai-knowledge/raw-chats/ are HISTORICAL REFERENCE ONLY. They are conversation exports, not extracted knowledge. They must never be treated as a source of truth. They may be deleted or archived at operator discretion.

---

### mentix-memory/ — Mentix Operational Runtime Memory

**Purpose:** The Mentix agent's working memory for operational tasks — diagnostic traces, incident records, decision logs, evaluation scores, reward signals, and runtime policies. This is an agent's memory, not project planning documentation.

**What belongs here:**
- Runtime policies (decision, write, publish, skill gating, memory)
- Diagnostic runbooks for common issues
- Agent identity definition
- Incident records, traces, evaluations, rewards
- Golden test cases for evaluation calibration
- Pattern records (when detected)
- Periodic summaries (when generated)

**What must NOT be stored here:**
- Project planning or architecture decisions (belongs in project-control/)
- Deployment checklists or migration guides
- Human-facing operator documentation
- Source code or configuration

---

### mentix-skills/ — Executable Skill Definitions

**Purpose:** Implementation specifications for each Mentix skill — behavior, permissions, activation levels, integration points, and constraints. These define what the agent CAN do and under what conditions.

**What belongs here:**
- Skill SKILL.md files (one per skill directory)
- Activation configuration (ACTIVATION_CONFIG.md)
- Deployment matrix (INSTALLATION_MATRIX.md)
- Operational protocol documents (GROUP_OPERATION_LANGUAGE.md)
- Skill dashboard visualizations

**What must NOT be stored here:**
- Project history or decision rationale (belongs in project-control/)
- Runtime memory data (belongs in mentix-memory/)
- Raw chats or conversation transcripts

---

## Contradiction Resolution Rules

1. **When project-control/ files contradict each other:** DECISIONS.md wins (it has commit hashes and dates). Then PROJECT_STATE.md (current snapshot). Then ARCHITECTURE.md (structural reference). Then others.

2. **When documentation contradicts code:** Code wins. Update the documentation. Do not change code to match outdated docs.

3. **When ai-knowledge/ contradicts project-control/:** project-control/ wins. Mark the ai-knowledge file as stale or archive it.

4. **When mentix-memory/ contradicts project-control/:** project-control/ wins for project-level facts. mentix-memory/ is authoritative only for agent-operational data (incidents, traces, rewards).

5. **When old chats or transcripts contradict anything:** The old chat loses. It is historical reference only. Promote information from old chats into current truth only after validating against code and project-control/.

6. **When two files have different dates:** The more recently updated file is more likely correct, but verify against code before assuming.

7. **When in doubt:** Check the code first. Then DECISIONS.md. Then PROJECT_STATE.md. Then ask the operator.

---

## Information Type Routing

| Information Type | Canonical Location | NOT here |
|-----------------|-------------------|----------|
| "What decision was made and why?" | project-control/DECISIONS.md | ai-knowledge, mentix-memory |
| "What is the current project state?" | project-control/PROJECT_STATE.md | ai-knowledge, old chats |
| "How is the system built?" | project-control/ARCHITECTURE.md | ai-knowledge (may have stale copies) |
| "What should we do next?" | project-control/TASK_QUEUE.md | mentix-memory, old chats |
| "Is this subsystem working?" | project-control/PRODUCTION_TRUTH_MATRIX.md | assumptions |
| "How do I deploy?" | project-control/DEPLOY_CHECKLIST.md | ai-knowledge |
| "What did Mentix diagnose?" | mentix-memory/traces/, incidents/ | project-control |
| "What can Mentix do?" | mentix-skills/*/SKILL.md | project-control |
| "What happened in an old conversation?" | ai-knowledge/raw-chats/ (historical only) | project-control |

---

## Update Protocol

When reality changes meaningfully:
1. Update the relevant project-control/ file first
2. If mentix-memory/ policies are affected, update those too
3. If mentix-skills/ behavior changes, update the skill spec
4. Mark any ai-knowledge/ files that are now contradicted as stale
5. Do NOT update raw chats — they are frozen historical records
