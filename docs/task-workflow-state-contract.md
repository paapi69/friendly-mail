# Friendly Mail Task and Workflow State Contract

## Purpose

This document now records the implemented Epic 5 task and workflow-state baseline for Friendly Mail after `E5-T1` through `E5-T8`.

It locks the first-class task model, task-source linkage, message workflow-state vocabulary, lifecycle semantics, operational verification, and the Epic 5 to Epic 6 boundary so downstream implementation can build on one state engine instead of ad hoc message-level flags.

## Product and Architecture Invariants

- Microsoft Graph remains the mailbox source of truth.
- Friendly Mail's internal store remains the workflow source of truth.
- Epic 4 remains the only supported upstream for Epic 5 workflow-signal input.
- Epic 5 creates workflow state and filing blockers, not mailbox moves or mailbox mutations.
- Mailbox folder location must never become the source of truth for whether work is still active.
- Critical work must remain visible until it is truly resolved, dismissed, or otherwise cleared by explicit workflow policy.

## Contract Summary

Friendly Mail will treat Epic 5 as the first state-ownership layer that sits on top of the structured workflow signals produced in Epic 4.

The first supported Epic 5 path is:

1. Epic 4 provides actionability, message type, due dates, entities, task candidates, urgency, criticality, confidence, and provenance for a specific ingestion version.
2. Epic 5 decides which first-class tasks should exist because of those signals.
3. Epic 5 persists durable task records, source links, lifecycle events, and message workflow-state projections.
4. Epic 5 computes filing blockers and eligibility prerequisites without yet performing mailbox actions.
5. Later epics consume that state to drive delayed filing, user-facing task views, reminders, and digest workflows.

This means:

- Epic 4 answers: "What workflow signals does this message likely contain, and why?"
- Epic 5 answers: "What first-class workflow records should exist because of those signals, and what keeps the message active?"
- Epic 6 answers: "What mailbox action is allowed now that workflow state is explicit?"

## Epic 4 to Epic 5 Handoff Contract

Epic 5 depends on Epic 4 providing:

- internal mailbox identity
- internal message identity
- ingestion version key
- actionability
- message type
- due-date signals
- entity signals
- task-candidate signals
- urgency and criticality signals
- confidence, explanation, and provenance

Epic 5 must not require Epic 4 to decide:

- actual task IDs
- task deduplication policy
- ownership or assignment
- lifecycle transitions
- filing eligibility decisions beyond signal-level hints
- mailbox mutations such as move, category, forward, or send

The handoff boundary is therefore:

- Epic 4 answers: "What work does this message appear to imply?"
- Epic 5 answers: "What durable task and workflow state should now exist?"

## Core State Objects

Epic 5 introduces four first-class shared records:

- `TaskRecord`
- `TaskSourceLinkRecord`
- `TaskLifecycleEventRecord`
- `MessageWorkflowStateRecord`

It also upgrades `FilingEligibility` from a thin flag into a blocker-aware readiness contract.

## Task Record Contract

`TaskRecord` is the primary durable workflow record for work that Friendly Mail wants to keep visible independently from mailbox location.

The MVP task contract includes:

- mailbox identity
- optional source message identity
- optional source task-candidate identity from Epic 4
- title and optional description
- lifecycle status
- priority
- criticality
- optional owner and assignee references
- optional due date and snooze-until date
- created, updated, and optional resolved timestamps
- optional resolution reason and note

Epic 5 tasks are first-class workflow records, not lightweight labels attached to a message.

## Task Source-Link Contract

Epic 5 must keep task provenance explicit so downstream users and operators can answer:

- which message created this task?
- which Epic 4 task candidate drove it?
- which due dates or entities informed it?
- did the suggestion come from the message body or an attachment?

`TaskSourceLinkRecord` therefore keeps:

- task identity
- message identity
- source kind
- classification ingestion version key
- classifier version
- task-candidate identity
- linked due-date and entity signal IDs
- preserved provenance entries

This contract makes task creation traceable without requiring later surfaces to decode raw classification artifacts.

## Lifecycle Contract

Epic 5 task lifecycle uses the shared `TaskStatus` vocabulary:

- `open`
- `snoozed`
- `delegated`
- `done`
- `dismissed`

Resolution and transition intent uses `TaskStatusReason`:

- `user_completed`
- `user_dismissed`
- `resolved_by_workflow`
- `delegated`
- `snoozed`

`TaskLifecycleEventRecord` is the auditable event shape for changes between those states.

Each lifecycle event must preserve:

- task identity
- mailbox identity
- optional prior status
- new status
- transition reason
- optional actor
- optional delegated-to user
- optional note
- occurred-at timestamp

## Allowed Transition Semantics

Epic 5 should treat the following as the intended MVP transition model:

- `open` -> `snoozed`
- `open` -> `delegated`
- `open` -> `done`
- `open` -> `dismissed`
- `snoozed` -> `open`
- `snoozed` -> `done`
- `snoozed` -> `dismissed`
- `delegated` -> `open`
- `delegated` -> `done`
- `delegated` -> `dismissed`

Transitions that skip accountability or imply mailbox mutation are out of scope for this contract.

## Message Workflow-State Contract

Epic 5 introduces a message workflow-state projection that remains separate from folder location.

`MessageWorkflowStateRecord` uses the shared `MessageWorkflowStatus` vocabulary:

- `pending_task_materialization`
- `active_actionable`
- `active_informational_unread`
- `active_informational_reviewed`
- `filing_blocked`
- `eligible_to_file`

This state is derived from:

- message actionability
- read state
- current task state
- criticality persistence
- filing blockers and readiness requirements

It is not derived from:

- current Outlook folder
- whether the message was already categorized
- whether a move was attempted

## Filing-Blocker and Eligibility Contract

Epic 5 owns blocker semantics before Epic 6 performs mailbox actions.

Shared filing-blocker reasons are:

- `classification_pending`
- `task_materialization_pending`
- `message_unread`
- `open_task`
- `snoozed_task`
- `delegated_task`
- `critical_work_remaining`
- `awaiting_review`
- `policy_hold`

Shared eligibility requirements are:

- `message_read`
- `all_required_tasks_resolved`
- `critical_work_cleared`
- `manual_review_completed`
- `policy_clearance`

`FilingEligibility` must therefore preserve:

- message identity
- optional workflow-state identity
- current filing state
- whether the message is currently eligible
- required prerequisites
- current blockers
- optional target folder
- one plain-language summary
- evaluation timestamp

Epic 5 owns the answer to:

- "What is preventing filing right now?"

Epic 6 will own the answer to:

- "What mailbox action should happen because filing is now allowed?"

## Ownership and Delegation Contract

Epic 5 must support explicit ownership without pretending the product already has full team-collaboration semantics.

The MVP ownership contract requires:

- a task may have an owner
- a task may have an assignee
- delegated work remains visible instead of disappearing
- delegation is represented through durable state and lifecycle events

This is enough for personal-mailbox and shared-mailbox MVP flows without forcing broad team workload orchestration into Epic 5.

## Separation from Epic 6

Epic 5 may define workflow state and filing blockers, but it does not own:

- moving messages
- applying categories
- forwarding invoices
- creating drafts
- sending mail
- delayed-filing approval thresholds
- mailbox mutation audit policy beyond workflow-state history

Those remain Epic 6 concerns.

## Failure and Degraded-Mode Contract

Epic 5 must distinguish between:

- no task needed
- task creation pending
- task creation failed
- task state inconsistent
- workflow state stale or blocked

Examples:

- an informational message with no task candidate is not a task-creation failure
- an actionable message with unmaterialized task candidates should remain in a pending or blocked workflow state
- a delegated task is still visible workflow state, not silent resolution
- a message may be ineligible to file even when it has no open task if unread or policy blockers remain

## Implemented Epic 5 Baseline

Epic 5 is now implemented with the following baseline:

- task materialization is repeat-safe for a mailbox message and Epic 4 task-candidate lineage
- task-source links preserve classifier version, ingestion version, signal IDs, and provenance
- lifecycle transitions persist auditable history for snooze, delegate, done, dismiss, and reopen flows
- message workflow-state projections preserve filing blockers, unresolved task counts, and read-state prerequisites
- downstream read models expose classification context, task state, source linkage, and filing eligibility in one contract
- mailbox-wide operational verification checks task materialization coverage, workflow-state coverage, and lifecycle or linkage integrity before Epic 6 depends on the state engine

Implemented internal API surfaces for this baseline are:

- `POST /mailboxes/:mailboxId/messages/:messageId/tasks/materialize`
- `GET /mailboxes/:mailboxId/messages/:messageId/workflow`
- `PATCH /mailboxes/:mailboxId/tasks/:taskId`
- `GET /mailboxes/:mailboxId/task-workflow-verification`

## Explicitly Deferred Beyond Epic 5

The following remain intentionally out of scope for Epic 5:

- reminder scheduling
- delayed filing execution
- add-in or dashboard UI behavior
- mailbox mutation execution such as move, category, forward, or send

## Next Boundary for Epic 6

Epic 6 should now build on this explicit state engine rather than reinterpreting mailbox metadata. The next layer should:

- define delayed-filing ticket breakdown and acceptance scope before implementation starts
- consume `FilingEligibility` and `MessageWorkflowStateRecord` as the source of truth for move readiness
- keep mailbox actions, folder moves, category changes, forwarding, and numbering logic separate from task-state ownership
- preserve auditability and reversibility for any mailbox mutation

## References

This contract is grounded in the following Friendly Mail source-of-truth documents reviewed on 2026-04-05:

- `friendly-mail-prd.md`
- `friendly-mail-technical-design.md`
- `friendly-mail-frontend-strategy.md`
- `friendly-mail-mvp-epics.md`
- `docs/classification-workflow-intelligence-contract.md`
