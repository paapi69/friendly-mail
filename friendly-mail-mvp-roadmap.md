# Friendly Mail MVP Roadmap

## Document Control

- Product: Friendly Mail
- Document type: MVP Roadmap
- Version: v0.1
- Status: Draft
- Date: 2026-03-30
- Related documents:
  - `friendly-mail-prd.md`
  - `friendly-mail-technical-design.md`
  - `friendly-mail-frontend-strategy.md`

## Overview

Friendly Mail's MVP will be built as an Outlook-native workflow layer that helps users classify email, extract work, surface urgency, and delay filing until a message is safe to archive for retrieval.

The roadmap prioritizes trust, correctness, and workflow safety over broad automation. The first release is not trying to solve every Outlook workflow. It is trying to prove that Friendly Mail can reliably keep important email-driven work visible, actionable, and organized without asking users to leave Outlook.

## MVP Outcome

By the end of the MVP, a pilot user should be able to:

- connect a supported Outlook mailbox
- see whether incoming mail is actionable or informational
- get extracted tasks, due dates, and urgency signals from emails and supported attachments
- keep critical items visible until resolved
- move informational emails only after they are read
- move actionable emails only after the related work is complete
- receive morning and urgent summaries
- route invoice emails and prepare outgoing numbered drafts

## MVP Principles

- Trust first, automation second
- Filing is a workflow outcome, not an arrival-time rule
- Task state is separate from folder state
- Outlook is the system of engagement
- Microsoft Graph is the mailbox source of truth
- Internal workflow state is the Friendly Mail source of truth

## MVP Scope Boundary

Included in MVP:

- Outlook add-in as the primary user surface
- companion web app for dashboard and administration
- Microsoft Graph mailbox integration
- message and attachment ingestion
- classification into actionable vs informational
- task extraction
- due date extraction
- criticality detection
- delayed filing logic
- morning digest and urgent reminders
- invoice routing
- outgoing reference numbering

Excluded from MVP:

- autonomous irreversible filing with no review controls
- on-prem Exchange support
- full collaboration suite
- broad workflow orchestration beyond email-driven work
- mobile-first standalone app
- replacement email client

## Milestones

### Milestone 1: Foundation and Mailbox Connectivity

**Goal**
Stand up the technical foundation for mailbox ingestion, persistence, and safe mailbox actions.

**Deliverables**

- project application skeleton and environments
- Microsoft Entra app registration and auth flow
- mailbox onboarding flow for supported mailboxes
- Graph connector with immutable ID support
- folder sync and message sync baseline
- webhook subscription handling
- queue and persistence foundation
- audit logging foundation

**Exit Criteria**

- a mailbox can be connected successfully
- folder tree can be synchronized
- message changes can be detected via webhook and reconciled via sync
- message identity remains stable through the internal data model

### Milestone 2: Message Intelligence

**Goal**
Turn raw mailbox data into structured workflow intelligence.

**Deliverables**

- message normalization pipeline
- attachment extraction pipeline for PDF-first support
- actionable vs informational classifier
- message-type classifier for notice, invoice, contract, policy, committee, event, internal, and FYI
- due date extraction
- entity extraction for counterparty, event, and committee
- urgency and criticality scoring
- confidence and explanation output

**Exit Criteria**

- the system classifies new mail into the core message types
- tasks and due dates can be extracted from representative email and PDF samples
- critical messages can be surfaced with a human-readable explanation

### Milestone 3: Workflow State and Delayed Filing

**Goal**
Implement the core Friendly Mail behavior that separates work state from folder state.

**Deliverables**

- task and workflow service
- filing state machine
- read state tracking for informational emails
- resolution state tracking for actionable emails
- filing eligibility engine
- category application flow
- folder suggestion flow
- controlled message move flow after eligibility

**Exit Criteria**

- informational messages do not move before read or review
- actionable messages do not move before task resolution
- filed messages remain traceable to related task records
- task state drives visibility and reminders even after categories or moves

### Milestone 4: User Surfaces

**Goal**
Make the product usable inside Outlook and manageable outside it.

**Deliverables**

- Outlook add-in MVP
- companion web dashboard MVP
- add-in views for classification, tasks, criticality, and filing status
- dashboard views for unresolved work, due items, and audit history
- admin screens for routing rules and mailbox configuration

**Exit Criteria**

- a pilot user can work through email from the Outlook add-in
- a pilot user or admin can review outstanding work from the web dashboard
- criticality, tasks, and filing state are visible in the UI

### Milestone 5: Reminder and Workflow Automation

**Goal**
Deliver the first operational automations that make Friendly Mail feel indispensable.

**Deliverables**

- morning digest
- urgent-item alerting
- end-of-day rollover summary
- invoice routing workflow
- outgoing draft numbering workflow
- configurable low-risk automation thresholds

**Exit Criteria**

- users receive a daily pending-work summary
- newly detected critical items can trigger an alert
- invoice emails can be routed according to configured rules
- outgoing numbered drafts can be created and tracked

### Milestone 6: Pilot Readiness

**Goal**
Prepare the product for a controlled pilot with measurable outcomes.

**Deliverables**

- pilot tenant onboarding checklist
- seeded evaluation dataset and benchmark cases
- verification and QA checklist
- observability and error reporting
- correction logging for user feedback loops
- documentation for operators and pilot users

**Exit Criteria**

- the system is stable enough for limited pilot usage
- key flows are testable and observable
- product metrics and failure modes are visible
- pilot users can be onboarded without manual engineering intervention for every step

## Recommended Build Order

1. Foundation and mailbox connectivity
2. Message intelligence
3. Workflow state and delayed filing
4. Outlook add-in and companion dashboard
5. Reminder and workflow automation
6. Pilot readiness and evaluation

This order is intentional. Friendly Mail's core value comes from workflow correctness, not UI polish alone. The filing state machine and task model must be correct before aggressive user-facing automation is introduced.

## MVP Workstreams

### Workstream A: Platform and Graph Integration

- auth and tenant setup
- Graph connector
- webhook and delta sync
- mailbox persistence

### Workstream B: Intelligence and Extraction

- classification
- attachment parsing
- due date and entity extraction
- criticality scoring

### Workstream C: Workflow Engine

- task lifecycle
- filing eligibility
- routing rules
- auditability

### Workstream D: Front End

- Outlook add-in
- web dashboard
- admin controls
- digest presentation

### Workstream E: Quality and Evaluation

- seeded test cases
- verification loops
- eval harness for classification quality
- pilot metrics and logging

## MVP Acceptance Criteria

The MVP is ready for pilot when all of the following are true:

- mailbox onboarding works for supported Microsoft 365 mailboxes
- new email can be ingested and classified end to end
- task extraction works for representative email and PDF cases
- delayed filing behavior works reliably for both actionable and informational mail
- the Outlook add-in exposes the core user actions and states
- the companion web app exposes task, admin, and audit views
- morning digests and urgent reminders operate on workflow state
- invoice routing and outgoing numbering work for supported scenarios
- the team can observe, debug, and audit mailbox-affecting behavior

## Key Risks to Watch During MVP

- attachment extraction quality may be lower than expected for scanned or poorly formatted PDFs
- over-aggressive classification could erode trust early
- mailbox write actions can create user anxiety if explanations and reversibility are weak
- shared mailbox permissions may vary by tenant and slow onboarding
- the Outlook add-in experience may expose UX constraints that require workflow simplification

## Suggested First Pilot Slice

The first pilot slice should focus on one high-risk workflow rather than broad rollout:

- one or two legal or operations users
- one personal mailbox or one shared mailbox
- notice and invoice handling as the primary use case
- suggestion-first mode for filing actions
- controlled routing and reminder workflows

This gives Friendly Mail the best chance to prove the core value proposition quickly: important operational emails are no longer missed, and filing no longer hides unresolved work.
