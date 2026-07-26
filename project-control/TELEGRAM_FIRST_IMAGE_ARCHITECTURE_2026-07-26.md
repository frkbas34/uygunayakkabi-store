# Telegram-First, Image-First Strategic Architecture

Decision date: 2026-07-26. This is a proposal, not an implementation plan authorization. No runtime behavior, prompt, camera, slot, provider, or production state was changed.

## Updated strategic architecture

UygunAyakkabi is a Telegram-first commerce operating system backed by Payload. Telegram is the operator workspace; Payload/Next remains the authoritative data and execution layer; the website and external channels are delivery surfaces. Image generation is the first subsystem to mature under this architecture.

```text
Operator in Telegram
  intake | commands | approvals | diagnostics | task summaries
                         |
                         v
          Telegram application boundary
 registry | authorization | idempotency | task receipts
                         |
                         v
              Payload commerce core
 products | media | attempts | jobs | events | readiness
                 |                       |
                 v                       v
        Image-generation pipeline    Publishing jobs
 adapters | prompts | slots | QC    Website / social / Shopier
```

Strategic rules:

1. Telegram optimizes operator throughput and clarity; it does not replace Payload persistence.
2. Every long-running action becomes a durable task with a Telegram receipt and recoverable status.
3. Image generation is available to every product with a valid reference input. Protected-brand classification is never an eligibility gate.
4. Brand safety remains enforced for product and authenticity claims, human approval decisions, activation, publishing, advertising, and external dispatch.
5. Generation, evaluation, human approval, Image QC, activation approval, and publishing approval remain distinct states.
6. Provider choice is an internal capability decision, not part of the product's durable identity or operator workflow.

## Proposed image platform

### 1. Orchestrator

A provider-neutral orchestrator owns attempt state, slot plan, checkpoints, cancellation, retries, time budget, and final summary. It does not construct provider payloads or Telegram messages.

### 2. Provider registry and adapters

Each adapter declares capabilities such as edit/reference support, maximum references, output sizes, transparency, seed support, latency class, cost estimate, and supported evaluator operations. Adapters normalize errors, timings, request IDs, safety outcomes, and usage.

The current Gemini path becomes the first adapter. The retained OpenAI path becomes either a supported adapter with tests or explicitly unsupported compatibility code. No provider replacement is proposed now.

### 3. Versioned prompt modules

Prompt construction becomes a typed manifest of modules: task framing, identity facts, material facts, visual facts, slot composition, studio style, prohibitions, operator regeneration notes, and provider serialization. Each attempt stores module versions, resolved prompt hash, and provider payload metadata. This prepares future style packs without changing today's prompt.

### 4. Slot specification and durable results

The five current slots remain unchanged until separately approved. Every requested slot receives a durable record with canonical key, status, attempt number, provider result, Media ID, warnings, evaluator scores, transform metadata, and error. Results never compact when one slot fails.

### 5. Deterministic transform pipeline

Centering, background normalization, orientation, overlay, encoding, and scaling become named, versioned stages with before/after metadata. A future camera/profile system can supply measurable targets without being hidden inside free-form prompts.

### 6. Evaluation pipeline

Evaluators become independent, optional, budget-aware stages: reference identity, color/material, visible-mark fidelity, composition, centering/coverage, background, artifact/deformation, and text reversal. Evaluators return structured scores and reasons; they do not silently redefine generation eligibility. Human Image QC remains authoritative for publishability.

### 7. Attempts, lineage, and Media lifecycle

An immutable attempt links product, reference media, slot spec version, profile/style pack, provider, prompt manifest, usage, timing, results, Telegram receipt, and operator decisions. Approved/unapproved/rejected Media retention is explicit and recoverable. Regeneration creates a new attempt for selected slots rather than rewriting history.

### 8. Profiles and style packs

Future profiles choose provider policy, slot set, quality budget, evaluator budget, transform policy, and retry policy. Future style packs contain presentation modules only; they cannot change product identity facts or bypass approval/publishing gates.

### 9. Quality scoring and evaluation loops

The system records machine scores, retry cause, operator selections, Image QC decisions, and later publish performance. Offline evaluation can compare prompt/provider/profile versions against a curated product set. Automatic learning or production prompt mutation is out of scope until an operator-approved evaluation policy exists.

## Proposed Telegram platform

### Unified update gateway

Verify webhook secret, bot identity, operator/chat allowlist, update type, and replay/idempotency before routing. Apply the same authorization policy to messages and callbacks.

### Typed command registry

One registry is the source of command name, owning bot, aliases, parser, authorization, chat scope, mutation class, handler, help, and task behavior. Extract handlers by domain behind characterization tests.

### Durable task UX

Queueing returns a stable task receipt. Telegram shows accepted, running milestone, preview/complete, or failed states. `/task <id>` and product diagnostics recover state without rerunning work. Updates should be coalesced and editable to avoid chat noise.

### Approval state machine

Callbacks carry opaque action tokens, not trusted state. The server reloads the task/product, verifies operator authorization and current state, enforces idempotency, records the event, and then applies the transition. Image approval, product confirmation, activation, Shopier confirm, and publishing remain separate decisions.

### Operator summaries

All desks use one compact presentation contract: state, severity, primary next step, blockers, links, scope/read-only label, and pagination. Provider errors are translated into operator actions while raw diagnostic IDs remain in Payload logs.

## Technical debt list

### Critical

1. Fail-open Telegram webhook/allowlist policy.
2. Callback actions bypass the later message-path allowlist checks.
3. Partial image slot and Media-save results can be mislabeled by positional compaction.

### High

4. Generated Media has no complete retention and lineage lifecycle.
5. Image jobs have no durable attempt/slot model, checkpointing, or structured retry state.
6. Telegram route is a 7,820-line hotspot with scattered ownership and authorization logic.
7. Image provider abstraction is informal; errors, timeouts, usage, and capabilities are not normalized.
8. Long-running Telegram tasks lack bound receipts, progress, cancellation, and recovery UX.
9. Image approval/regeneration is positional, schema-coupled, and not cleanly idempotent.

### Medium

10. Prompt blocks overlap and lack explicit module precedence/version lineage.
11. Camera intent, slot comments, and model/deterministic pair behavior disagree.
12. Provider calls are serial and numerous; retry, evaluator, latency, and cost budgets are implicit.
13. Fixed-background centering and horizontal flipping can introduce quality errors.
14. Job/provider metadata is stored as JSON strings and is hard to query.
15. Current and legacy command/parser/provider paths coexist with stale labels and comments.
16. Message pagination and Telegram API error reporting are inconsistent.

### Rejected policy residue

17. The unused blocking `imageBrandGate` helper/test.
18. `brand_review_first` generation advice in Image Plan and Image QC remediation.
19. Source/governance wording that describes the missing brand gate as a defect.

The residue should be removed in a separately authorized implementation change. This documentation task changes current truth and assertions only.

## Recommended implementation order

### Phase 0 — characterization and safety

1. Add authorization characterization for every Telegram update type and callback mutation.
2. Make production webhook, DM, group, and callback authorization fail closed with an explicit development policy.
3. Add end-to-end characterization for every image entry point, job state, preview, approve, reject, and regenerate path.
4. Remove the rejected protected-brand generation restrictions and blocking assertions while retaining publishing/claims/approval/dispatch guards.

### Phase 1 — image correctness and lineage

5. Replace parallel/positional image arrays with one durable slot-result shape.
6. Introduce immutable attempts and structured per-slot persistence before changing prompts or providers.
7. Define recoverable Media retention for rejected, regenerated, failed-save, and partially approved results.
8. Make approval/rejection/regeneration idempotent and state-checked.

### Phase 2 — Telegram long-running task experience

9. Bind queue receipts to exact jobs and add task status/progress/failure summaries.
10. Unify image job deduplication across photo, hashtag, command, and callback entry points.
11. Standardize diagnostic/summary formatting, pagination, and Telegram API error handling.

### Phase 3 — behavior-preserving decomposition

12. Introduce the typed command/callback registry.
13. Extract access, image, intake, catalog, publishing, Shopier, and business handlers behind characterization coverage.
14. Remove raw relationship SQL and duplicate approval/wizard responsibilities through stable services.

### Phase 4 — provider-neutral image core

15. Introduce provider adapters, capability metadata, normalized errors/timeouts/usage, and budget policies.
16. Split prompt assembly into versioned modules without changing prompt content.
17. Version deterministic transforms and evaluator outputs.

### Phase 5 — controlled quality evolution

18. Establish a curated offline evaluation set and baseline quality/cost/latency metrics.
19. Design operator-friendly targeted regeneration using attempt and slot history.
20. Only then evaluate prompt changes, camera changes, slot changes, new providers, style packs, profiles, automated quality scoring, and evaluation loops as separate operator-approved experiments.

## Decisions deliberately left open

- Generated Media retention duration and recoverability policy.
- Provider/evaluator cost and latency budgets per profile.
- Whether progress uses message edits, milestone messages, or both.
- Which task states are cancelable and how cancellation compensates provider work.
- Whether current five slots remain the only default profile after baseline evaluation.
- Which quality metrics are advisory versus hard publishing gates.

## Non-goals for this proposal

No prompt redesign, camera redesign, slot redesign, provider replacement, runtime refactor, schema migration, production mutation, deployment, commit, push, or cleanup is authorized by this document.
