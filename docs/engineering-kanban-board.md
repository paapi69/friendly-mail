# Friendly Mail Engineering Kanban Board

## Purpose

This board translates the current Friendly Mail plan into a PM-and-engineering-friendly view with:

- Kanban status
- sprint buckets
- ownership
- story points
- t-shirt sizes
- observed throughput

## Data Integrity Rules

The board uses two kinds of data:

- **Actual data**:
  - ticket status from `.planning/epic-status.json`
  - scope from `friendly-mail-epic-tickets.md`
  - recent execution dates from git history and session state
- **Planning metadata**:
  - story points
  - t-shirt sizes
  - suggested sprint grouping
  - suggested owners

Important:

- Story points and t-shirt sizes were **not** tracked from the start of the project.
- They are added here as **planning estimates**, not historical facts.
- Because of that, a stable **point-based velocity does not yet exist**.
- The only reliable velocity today is **observed throughput**.

## Team Personas

These are planning personas for board ownership, not real employee records.

- `Jerry`: Backend engineer, API, database, Graph integration, queues
- `Tom`: Frontend engineer, Outlook add-in, dashboard, UX flows
- `Velma`: QA and release readiness, verification, rollout checks, pilot safety
- `Road Runner`: Platform and developer experience, CI, environments, tooling

## Estimation Scale

### Story Points

- `2`: very small
- `3`: small
- `5`: medium
- `8`: large
- `13`: extra large

### T-Shirt Sizes

- `XS`: 2 points
- `S`: 3 points
- `M`: 5 points
- `L`: 8 points
- `XL`: 13 points

## Current Product Milestone

- **Prototype mailbox-connectivity milestone**: end of `E2-T8`
- Meaning:
  - mailbox can connect
  - folders sync
  - message metadata syncs
  - webhook notifications are received
  - webhook events reconcile through delta sync

## Observed Delivery So Far

### Actual Ticket Status

- `E1`: done
- `E2`: in progress
- `E2-T1` through `E2-T6`: done
- `E2-T7` through `E2-T9`: pending

### Actual Recent Execution History

From local git history and session state:

- `2026-03-31`: project bootstrap and Epic 1 foundation commits
- `2026-04-01`: `E2-T1`, `E2-T2`, `E2-T3`, `E2-T4` completed
- `2026-04-02`: `E2-T5`, `E2-T6` completed in the workspace

### Actual Throughput

- **Epic 2 tickets completed**: `6`
- **Observed completion window for Epic 2 so far**: `2026-04-01` to `2026-04-02`
- **Observed Epic 2 throughput**: `6 tickets across 2 calendar dates`

### Velocity

- **Reliable point velocity**: not established yet
- Reason: story points were not assigned before execution started
- **Observed ticket throughput**: `~3 Epic 2 tickets per active day` in the current short sample
- Confidence in that throughput as a forecast: low

Recommended planning stance:

- Do **not** use the current short burst as a long-term commitment number
- Use the board below to plan the next 1 to 2 tickets at a time

## Sprint Structure

Friendly Mail has been operating more like a flow-based Kanban system than a formal sprint system so far.

To support PM-style tracking without inventing fake historical sprints, the sprint labels below are:

- `Observed` for work windows that actually happened
- `Planned` for upcoming buckets

## Sprint Buckets

### Sprint 0 (Observed)

- Window: `2026-03-31` to `2026-04-01`
- Outcome:
  - Epic 1 completed
  - Epic 2 foundation started through mailbox onboarding

Included delivered tickets:

- `E1-T1` to `E1-T9`
- `E2-T1`
- `E2-T2`
- `E2-T3`
- `E2-T4`

### Sprint 1 (Observed)

- Window: `2026-04-02`
- Outcome:
  - mailbox folder sync completed
  - message metadata delta sync completed

Included delivered tickets:

- `E2-T5`
- `E2-T6`

### Sprint 2 (Planned)

- Goal: complete the first externally testable mailbox prototype

Suggested tickets:

- `E2-T7`
- `E2-T8`

### Sprint 3 (Planned)

- Goal: mailbox-connectivity hardening and rollout safety

Suggested tickets:

- `E2-T9`
- optional first Epic 3 prep work after `E2` closes

## Kanban Board

## Done

| Ticket | Title | Owner | Type | Points | Size | Status |
|---|---|---:|---|---:|---|---|
| `E1-T1` | Choose and Scaffold the Repository Architecture | `Road Runner` | Platform | `5` | `M` | Done |
| `E1-T2` | Establish Environment and Secrets Management | `Road Runner` | Platform | `3` | `S` | Done |
| `E1-T3` | Set Up the Database and Migration Baseline | `Jerry` | Backend | `5` | `M` | Done |
| `E1-T4` | Set Up Queue and Background Job Infrastructure | `Jerry` | Backend | `5` | `M` | Done |
| `E1-T5` | Create Shared Domain Contracts and Package Boundaries | `Jerry` | Architecture | `5` | `M` | Done |
| `E1-T6` | Implement Logging, Error Handling, and Audit Foundations | `Road Runner` | Platform | `5` | `M` | Done |
| `E1-T7` | Establish Authentication and Session Baseline | `Jerry` | Backend | `8` | `L` | Done |
| `E1-T8` | Configure CI, Code Quality, and Verification Defaults | `Road Runner` | Platform | `3` | `S` | Done |
| `E1-T9` | Create Developer Onboarding and Local Runbook | `Road Runner` | DX | `3` | `S` | Done |
| `E2-T1` | Define Microsoft Entra and Graph Connectivity Contract | `Jerry` | Architecture | `2` | `XS` | Done |
| `E2-T2` | Extend Persistence for Mailbox Connectivity and Sync State | `Jerry` | Backend | `5` | `M` | Done |
| `E2-T3` | Implement the Core Microsoft Graph Connector | `Jerry` | Backend | `5` | `M` | Done |
| `E2-T4` | Build Delegated Mailbox Onboarding | `Jerry` | Backend | `8` | `L` | Done |
| `E2-T5` | Implement Folder Discovery and Initial Folder Sync | `Jerry` | Backend | `5` | `M` | Done |
| `E2-T6` | Implement Message Metadata Sync with Delta Links | `Jerry` | Backend | `8` | `L` | Done |

## Ready Next

| Ticket | Title | Owner | Type | Points | Size | Depends On | Target Sprint |
|---|---|---:|---|---:|---|---|---|
| `E2-T7` | Implement Graph Subscription and Webhook Lifecycle | `Jerry` | Backend | `8` | `L` | `E2-T6` | `Sprint 2` |

## Blocked / Not Ready Yet

| Ticket | Title | Owner | Type | Points | Size | Blocking Dependency | Target Sprint |
|---|---|---:|---|---:|---|---|---|
| `E2-T8` | Implement Reconciliation Between Webhooks and Delta Sync | `Jerry` | Backend | `8` | `L` | `E2-T7` | `Sprint 2` |
| `E2-T9` | Add Shared-Mailbox Readiness and Operational Verification | `Velma` + `Jerry` | QA / Backend | `5` | `M` | `E2-T7`, `E2-T8` | `Sprint 3` |

## Future Backlog

| Epic | Title | Suggested Owner | Notes |
|---|---|---|---|
| `E3` | Message Ingestion and Attachment Extraction | `Jerry` | Backend-heavy follow-on after mailbox sync |
| `E4` | Classification and Workflow Intelligence | `Jerry` + `Velma` | AI behavior, policy, evaluation |
| `E5` | Task and Workflow State Engine | `Jerry` | Core workflow domain |
| `E6` | Delayed Filing and Mailbox Actions | `Jerry` | Depends on workflow-state maturity |
| `E7` | Outlook Add-in Experience | `Tom` | Main end-user surface |
| `E8` | Companion Web Dashboard and Admin | `Tom` | Secondary surface and admin flows |
| `E9` | Digests, Alerts, and Reminder Operations | `Jerry` + `Tom` | Cross-surface operational work |
| `E10` | Quality, Evaluation, and Pilot Readiness | `Velma` | Hardening, evals, pilot gate |

## Estimate Notes

These estimates are intentionally conservative and scoped to the current ticket definitions:

- `E2-T7` is `8` because webhook lifecycle work usually includes subscription creation, renewal, validation handling, and queue handoff.
- `E2-T8` is `8` because reconciliation logic adds idempotency and failure-repair complexity on top of sync.
- `E2-T9` is `5` because it is narrower in build scope, but still meaningful in verification and rollout logic.

## Planning Guidance

If the goal is to reach the first customer-testable backend prototype as fast as possible:

1. Pull `E2-T7` next
2. Pull `E2-T8` immediately after
3. Treat the end of `E2-T8` as the prototype checkpoint
4. Use `E2-T9` as rollout safety rather than a blocker to internal prototype testing

## Accuracy Summary

Accurate today:

- current ticket status
- completed vs pending work
- recent execution order
- current next ticket
- prototype milestone at `E2-T8`

Estimated today:

- story points
- t-shirt sizes
- sprint buckets
- owner personas
- any future forecast beyond the current short sample
