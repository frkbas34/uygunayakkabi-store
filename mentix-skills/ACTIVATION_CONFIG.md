# Mentix Activation Configuration

_Created: 2026-03-16_
_Purpose: Controlled rollout policy for the Mentix skill stack_

---

## Activation Policy Per Skill

### LEVEL A — ACTIVE (Day One)

#### skill-vetter
```yaml
mode: active
auto_trigger: true
permissions:
  evaluate_skills: true
  block_unsafe_skills: true
  auto_execute: false  # Reports only, never blocks without human
human_gate: false  # Can run autonomously for evaluation
output: vetting_report
```

#### browser-automation
```yaml
mode: read_only
auto_trigger: false  # Only on request
permissions:
  read_pages: true
  take_screenshots: true
  check_endpoints: true
  fill_forms: false
  click_buttons: false
  bulk_operations: false
human_gate: false  # Safe in read-only mode
output: inspection_report
upgrade_path: "Operator can enable write mode after 7 days of stable operation"
```

#### sql-toolkit
```yaml
mode: safe_diagnostics
auto_trigger: false  # Only on request
permissions:
  select_queries: true
  schema_inspection: true
  aggregation: true
  insert_update_delete: requires_confirmation
  ddl_operations: never
human_gate: true  # For write operations only
output: diagnostic_report
```

#### agent-memory
```yaml
mode: active
auto_trigger: true  # Other skills write to memory automatically
permissions:
  store: true
  retrieve: true
  search: true
  archive: true
  delete: false  # No auto-deletion
human_gate: false  # Memory operations are safe
output: memory_entries
pruning: "Auto-archive entries > 90 days with no references"
```

#### github-workflow
```yaml
mode: active
auto_trigger: false  # Only on request
permissions:
  read_repo_state: true
  list_issues: true
  summarize_prs: true
  create_commits: requires_confirmation
  push: requires_confirmation
  delete_branches: never
human_gate: true  # For write operations only
output: repo_report
```

#### uptime-kuma
```yaml
mode: active
auto_trigger: true  # Can check health when relevant
permissions:
  http_get: true
  dns_check: true
  ssl_check: true
  write_requests: never
human_gate: false  # Read-only monitoring is safe
output: health_report
rate_limit: "1 full check per 5 minutes"
```

---

### LEVEL B — CONTROLLED

#### eachlabs-image-edit
```yaml
mode: controlled
auto_trigger: false
permissions:
  analyze_image: true
  enhance_single: requires_confirmation
  upscale: requires_confirmation
  background_edit: requires_confirmation
  batch_process: never
  overwrite_original: never
human_gate: true  # Every operation needs approval
output: draft_with_preview
upgrade_path: "Enable batch after 10 successful single operations"
```

#### upload-post
```yaml
mode: draft_only
auto_trigger: false
permissions:
  generate_draft: true
  preview_content: true
  publish: requires_confirmation
  auto_publish: never
  delete_posts: never
human_gate: true  # Publishing always needs approval
output: content_drafts
upgrade_path: "Enable one-click publish after 20 approved drafts"
```

#### research-cog
```yaml
mode: informational
auto_trigger: false
permissions:
  web_search: true
  analyze_content: true
  generate_reports: true
  auto_execute_recommendations: never
human_gate: false  # Research output is informational
output: research_report
```

#### senior-backend
```yaml
mode: advisory
auto_trigger: false
permissions:
  analyze_architecture: true
  suggest_changes: true
  review_code: true
  auto_implement: never
  modify_infrastructure: never
human_gate: false  # Advisory output only
output: technical_advisory
```

---

### LEVEL C — OBSERVE ONLY

#### learning-engine
```yaml
mode: observe
auto_trigger: true  # Passively observes other skill outputs
permissions:
  observe_events: true
  score_outcomes: true
  detect_patterns: true
  summarize_findings: true
  propose_improvements: true
  auto_modify_skills: never
  auto_modify_workflows: never
  auto_modify_config: never
  self_modify: never
human_gate: true  # All proposals need explicit approval
output: learning_reports_and_proposals
upgrade_path: "Move to 'suggest' mode after 30 days of stable observation"
```

---

## Upgrade Paths

### Phase 1 → Phase 2 (after 7-14 days stable operation)
- browser-automation: read_only → read_write (with confirmation per action)
- sql-toolkit: Enable simple UPDATE with confirmation
- upload-post: Enable one-click publish for pre-approved templates

### Phase 2 → Phase 3 (after 30+ days stable operation)
- eachlabs-image-edit: Enable batch processing (3 images max per batch)
- learning-engine: Move to "suggest with auto-apply for LOW risk" mode
- upload-post: Enable scheduled publishing for approved content

### Emergency Rollback
Any skill can be immediately disabled by:
1. Renaming its SKILL.md to SKILL.md.disabled on the VPS
2. Restarting OpenClaw gateway
3. Logging the disable event in agent-memory

---

## Chat Scope Policy v3
_Updated: 2026-03-17 — replaces v2 controlled-group model_

### Final policy

```yaml
chat_scope:
  private_dm:
    trigger: every_message
    capability: full
    confirmation_gates: active
    memory_writes: full

  approved_ops_group:
    trigger: mention_only  # @Mentix mention required; reply-only is NOT sufficient
    capability: full          # same as DM — no restrictions
    confirmation_gates: active
    memory_writes: full
    note: |
      Ops group is a first-class operational environment.
      Product intake, debugging, decisions, write operations
      all happen here. Restricting group capability is wrong —
      this is NOT a limited "public" group.

  other_groups:
    trigger: none
    capability: none
    memory_writes: none
    response: silent_drop
```

### Trigger asymmetry (the ONLY difference between DM and ops group)

```
DM             → every direct message triggers Mentix
Ops Group      → ONLY explicit @Mentix mention triggers Mentix
               → reply-only (without @mention) does NOT trigger
Other groups   → always silent
```

### What "full capability" means in ops group

- All 13 skills available
- product-flow-debugger: full
- sql-toolkit: SELECT + WRITE (WRITE requires confirmation)
- github-workflow: read + write (write requires confirmation)
- browser-automation: read + write (write requires confirmation)
- upload-post: draft + publish (publish requires confirmation)
- learning-engine: full observation + recording
- agent-memory: full read + write
- decision engine: full (PROCEED / PROPOSE_CONFIRM / REPORT_ONLY / ESCALATE)
- memory writes: trace + incident + decision + evaluation + reward

### Job ID protocol

Every activation generates a job_id: `JOB-YYYYMMDD-NNN`
All trace, incident, decision, evaluation, reward records are linked to job_id.
Pending jobs survive restarts. source block records chat_type, group_id,
triggered_by_user_id, approved_by_user_id, role.

### Role model

```yaml
roles:
  viewer:     can_ask: true,  can_start_intake: false, can_approve: false
  operator:   can_ask: true,  can_start_intake: true,  can_approve: false
  approver:   can_ask: true,  can_start_intake: true,  can_approve: true
  admin:      can_ask: true,  can_start_intake: true,  can_approve: true, can_destructive: true
default_role_for_allowlist_users: approver
```
