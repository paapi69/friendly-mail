# Friendly Mail Delayed Filing and Mailbox Action Contract

## Purpose

This document records the implemented Epic 6 baseline for delayed filing and mailbox actions after `E6-T1` through `E6-T8`.

It locks the filing-decision vocabulary, mailbox-action audit model, delayed-filing execution semantics, specialized mailbox actions, and readiness verification so later Outlook and dashboard surfaces can build on one stable mailbox-action layer.

## Product and Architecture Invariants

- Microsoft Graph remains the mailbox source of truth.
- Friendly Mail workflow state remains the workflow source of truth.
- Epic 5 workflow state decides whether mailbox actions are allowed.
- Epic 6 executes mailbox actions without redefining task state, ownership, or filing blockers.
- High-impact mailbox actions remain suggestion-first by default.
- Informational mail must not be filed before read or review requirements are satisfied.
- Actionable mail must not be filed before explicit workflow-state eligibility is reached.

## Epic 5 to Epic 6 Handoff

Epic 6 depends on Epic 5 providing:

- message workflow state
- blocker-aware filing eligibility
- actionability
- message priority and criticality
- current message read state
- current classification summary for message type and explanation

Epic 6 does not ask Epic 5 to:

- move messages
- apply categories in Microsoft Graph
- forward invoice mail
- number outgoing drafts
- infer mailbox mutation success from task state

The handoff boundary is therefore:

- Epic 5 answers: "Is mailbox action allowed yet, and why?"
- Epic 6 answers: "What mailbox action should happen now, what was attempted, and what actually succeeded?"

## Core State Objects

Epic 6 adds three first-class records:

- `FilingDecisionRecord`
- `MailboxActionAttemptRecord`
- `OutgoingSequenceRecord`

Together they make delayed filing explainable, auditable, and repeat-safe.

## Filing Decision Contract

`FilingDecisionRecord` preserves:

- mailbox identity
- message identity
- linked Epic 5 workflow-state identity
- message actionability
- delayed-filing status
- execution mode
- filing requirements and blockers
- suggested folder target
- suggested mailbox categories
- summary and rationale
- source read state
- optional approver
- decision timestamp
- optional execution timestamp
- optional last error code and message

The MVP delayed-filing statuses are:

- `blocked`
- `eligible`
- `executed`
- `failed`

## Mailbox Action Attempt Contract

Every mailbox mutation or suggestion is written as a `MailboxActionAttemptRecord`.

Supported action types are:

- `move_message`
- `apply_category`
- `forward_message`
- `stamp_outgoing_reference`

Supported modes are:

- `suggestion_only`
- `auto_apply`
- `approved_apply`

Supported outcomes are:

- `suggested`
- `pending_approval`
- `succeeded`
- `failed`
- `skipped`

Each attempt keeps the mailbox, message, optional filing decision, actor, target folder, category, forwarding target, reference number, Graph message identity, failure context, and attempted or completed timestamps.

## Delayed Filing Semantics

Informational delayed filing now follows this baseline:

- informational messages remain blocked until Epic 5 says read or review requirements are satisfied
- eligible informational messages can receive suggestion records or approved mailbox moves
- blocked informational mail stays untouched in the mailbox

Actionable delayed filing now follows this baseline:

- actionable messages remain blocked while open, snoozed, delegated, or critical work remains
- eligible actionable messages can receive suggestion records or approved mailbox moves
- resolved actionable mail can be filed without collapsing workflow state back into folder state

## Folder Suggestion and Category Contract

Epic 6 now derives filing targets from message type and available mailbox folders, with a safe fallback to the well-known Archive destination.

The current category baseline includes:

- actionability category
- message-type category
- criticality category for critical mail
- ready-to-file category when eligibility is satisfied

Category application is tracked as separate mailbox-action attempts so folder moves and low-risk labeling remain independently auditable.

## Specialized Mailbox Actions

Epic 6 also includes two MVP-specialized mailbox actions:

- invoice routing through a forward action to a provided processor address
- outgoing numbering through per-mailbox sequence allocation and draft subject stamping

Invoice routing requires the message to be classified as an invoice.

Outgoing numbering requires the source message to still be a draft in Microsoft Graph.

## Verification Contract

`MailboxActionVerificationReport` now reports:

- tracked-message coverage versus filing decisions
- eligible and executed decision coverage
- mailbox-action success and failure counts
- filed messages missing succeeded move audit
- failed invoice-routing attempts
- failed outgoing-numbering attempts

This gives downstream surfaces and operators a mailbox-wide readiness signal before they depend on live mailbox mutation behavior.

## Implemented Baseline

The current Epic 6 implementation now provides:

- shared delayed-filing and mailbox-action contracts in `packages/contracts`
- durable filing-decision, mailbox-action-attempt, and outgoing-sequence persistence in `packages/database`
- Graph update, move, and forward primitives in `packages/graph`
- a mailbox-action service that evaluates filing decisions, executes delayed filing, routes invoices, stamps outgoing references, and reports readiness
- internal API routes for filing decisions, filing execution, invoice routing, outgoing numbering, and mailbox-action verification

This is the baseline later add-in and dashboard work should treat as the mailbox-action source of truth.
