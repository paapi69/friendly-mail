# Friendly Mail MVP Epic Breakdown

## Document Control

- Product: Friendly Mail
- Document type: MVP Epic Breakdown
- Version: v0.2
- Status: Draft
- Date: 2026-04-06
- Related documents:
  - `friendly-mail-prd.md`
  - `friendly-mail-technical-design.md`
  - `friendly-mail-frontend-strategy.md`
  - `friendly-mail-mvp-roadmap.md`

## Overview

This document breaks the Friendly Mail MVP into engineering epics that can be translated into implementation tickets and milestone plans.

The epics are sequenced to support the core product promise:

- email-driven work is identified reliably
- unresolved work remains visible
- filing happens only when a message is safe to move
- Outlook remains the primary system of engagement

## Current Status

- Epics 1 through 6 are complete in the implementation baseline.
- Epic 6 now provides the delayed-filing and mailbox-action backend baseline, including filing decisions, mailbox-action execution, specialized invoice and numbering paths, and mailbox-action verification.
- Epic 7 now has a defined ticket breakdown and locked design baseline for the Outlook add-in experience.
- `E7-T1` is now complete through `docs/outlook-addin-design-brief.md`, which locks the first-slice interaction flow, supported clients, fallback states, and pinned task-pane behavior.
- `E7-T2` is now complete through the Outlook add-in host adapter, manifest and command-surface baseline, pinned item-change handling, and live browser-preview lane at `https://localhost:4173`.
- `E7-T3` is now complete through the real mailbox connect and sync-status entry view, with live operational-verification wiring and explicit entry states.
- `E7-T4` is now complete through the real message workflow summary and explanation panel, including confidence, explanation, blocker visibility, and immutable Graph message binding for selected Outlook items.
- `E7-T5` is now complete through the Outlook task-action panel, inline lifecycle controls, and preview/live mutation handling for done, snooze, delegate, dismiss, and reopen flows.
- `E7-T6` is now complete through the Outlook filing-decision panel, delayed-filing guidance, suggested target folders and categories, and explicit approval UX.
- The Outlook add-in IA is now additionally locked around `Today`, `This Email`, and `Review` so the add-in can become the primary desktop or web daily workflow surface instead of acting only as a selected-message detail pane.
- The companion dashboard remains locked as mobile-first and as the deeper mailbox-level triage surface, especially for mobile detail, long review lists, and heavier batch handling that do not fit the Outlook task pane well.
- The next implementation move is `E7-T7`, which should add compose and draft numbering inside the add-in.
- Epic 8 is now locked as a mobile-first companion dashboard and mailbox-triage queue, not as a generic admin-only prototype surface.
- The dashboard is now explicitly the mailbox-level and mobile discovery layer for high-volume users, with Needs Attention, FYI or CC, Junk Candidates, and Ready To File as the first queue buckets.
- Epic 11 is now defined as the final operator-side setup epic for Microsoft tenant registration, environment provisioning, webhook reachability, and handoff.
- `E11-T1` is now complete through `docs/microsoft-tenant-setup-guide.md`, which explains what must come from the tenant or admin side and what engineering can generate locally.

## Epic 1: Platform Foundation

**Goal**
Create the application foundation, environments, and core services needed to build the MVP safely.

**Includes**

- monorepo or service structure setup
- shared configuration and environment management
- authentication and secret management foundations
- database and queue infrastructure setup
- logging, error handling, and audit event foundation
- baseline CI and verification setup

**Key Outputs**

- working project skeleton
- environment configuration strategy
- persistence and queue baseline
- deployable service foundation

**Definition of Done**

- the project can run in local and non-local environments
- core services can connect to shared infrastructure
- logging and error reporting work consistently
- audit events can be persisted

**Dependencies**

- none

## Epic 2: Microsoft Graph and Mailbox Connectivity

**Goal**
Connect Friendly Mail to Microsoft 365 mailboxes and establish a reliable mailbox ingestion pipeline.

**Includes**

- Microsoft Entra app setup
- delegated and shared mailbox auth support for MVP scenarios
- Graph connector implementation
- immutable ID handling
- folder discovery and sync
- message sync
- webhook subscription and renewal handling
- delta reconciliation flow

**Key Outputs**

- mailbox onboarding flow
- synced folder tree
- synced message records
- mailbox event ingestion path

**Definition of Done**

- a supported mailbox can be connected
- folder and message state can be synchronized
- webhook and delta flows work together reliably
- message identity remains stable through internal processing

**Dependencies**

- Epic 1

## Epic 3: Message Ingestion and Attachment Extraction

**Goal**
Transform raw mailbox content into normalized, searchable internal message records.

**Includes**

- message normalization pipeline
- body extraction and normalization
- attachment metadata retrieval
- PDF-first text extraction
- OCR fallback support where enabled
- storage for extracted attachment text
- idempotent processing for repeated message updates

**Key Outputs**

- normalized message envelope
- extracted body and attachment text
- attachment processing pipeline

**Definition of Done**

- representative emails and PDF attachments can be processed end to end
- extraction failures are observable and recoverable
- repeated sync events do not create duplicate processing artifacts

**Dependencies**

- Epic 2

## Epic 4: Classification and Workflow Intelligence

**Goal**
Classify incoming email into actionable workflow states and extract the information needed to drive the product.

**Includes**

- actionable vs informational classification
- message-type classification
- due date extraction
- entity extraction
- urgency and criticality scoring
- structured explanation output
- confidence scoring

**Key Outputs**

- classification result model
- extracted task candidates
- due dates and entity signals
- criticality explanation

**Definition of Done**

- the system can classify core MVP email types
- the system can distinguish actionable and informational messages
- due dates and key entities can be extracted from representative samples
- criticality decisions can be explained to the user

**Dependencies**

- Epic 3

## Epic 5: Task and Workflow State Engine

**Goal**
Create the workflow system that separates email storage from work state.

**Includes**

- task creation and persistence
- task lifecycle states
- linkage between tasks and source messages
- message workflow state model
- criticality persistence
- task ownership model for MVP
- workflow auditability

**Key Outputs**

- task store
- task-source linking model
- workflow state transitions
- critical item persistence rules

**Definition of Done**

- tasks can be created, updated, resolved, snoozed, delegated, and dismissed
- one email can support one or more task records
- message workflow state survives folder and category changes
- unresolved critical work remains visible

**Dependencies**

- Epic 4

## Epic 6: Delayed Filing and Mailbox Actions

**Goal**
Implement the core Friendly Mail behavior that gates filing until the message reaches a safe state.

**Includes**

- filing state machine
- read-state-based filing for informational messages
- resolution-based filing for actionable messages
- folder suggestion engine
- category application flow
- controlled move flow
- invoice routing mailbox actions
- outgoing reference numbering support

**Key Outputs**

- filing eligibility engine
- message move gating logic
- category and folder action layer
- invoice routing workflow
- outgoing numbering workflow

**Definition of Done**

- informational messages are not moved before read or review
- actionable messages are not moved before resolution
- filing actions are auditable and reversible at the workflow layer
- routing and numbering workflows work for supported MVP scenarios

**Dependencies**

- Epic 5

## Epic 7: Outlook Add-in Experience

**Goal**
Deliver the primary user-facing workflow inside Outlook.

**Includes**

- add-in shell, manifest, and host integration for supported Outlook clients
- mailbox readiness and sync-status entry view
- message workflow summary for classification, confidence, urgency, and explanation
- task panel for extracted actions and due dates
- filing status and folder suggestion view
- user actions such as mark done, delegate, snooze, dismiss, and approve filing
- support for compose and draft workflows where required for numbering

**Key Outputs**

- functioning Outlook add-in MVP
- message-level workflow controls
- in-context filing and task interaction

**Definition of Done**

- a pilot user can review and act on messages from inside Outlook on the supported MVP clients
- the add-in shows mailbox readiness, classification, task, urgency, explanation, and filing state clearly
- the add-in supports the core task and filing actions required for MVP

**Dependencies**

- Epic 5
- Epic 6

## Epic 8: Mobile-First Companion Dashboard and Triage Queue

**Goal**
Deliver the mailbox-level and mobile product surface that helps high-volume users understand the day without opening every message one by one while complementing the compact Outlook add-in queue.

**Includes**

- mobile-first dashboard information architecture
- mailbox-wide Today queue and priority buckets
- Needs Attention, FYI or CC, Junk Candidate, and Ready To File views
- batch review flows for low-noise mail
- mobile message and task detail that mirrors the Outlook add-in drill-down concepts when the user is not in the task pane
- mailbox-wide filters, search, and drill-down into message or task detail
- mailbox health and queue summary visibility
- lightweight admin and mailbox configuration after the triage baseline is in place

**Key Outputs**

- mobile-first dashboard MVP
- mailbox-wide triage queue
- daily work visibility outside the Outlook task pane
- ready-to-file and low-noise review surfaces
- mobile-friendly detail and deep-review flows that complement the Outlook add-in's narrow task pane

**Definition of Done**

- users can understand what needs attention today without opening every message in Outlook
- the dashboard surfaces tasks created from email at the mailbox level
- lower-noise FYI or CC work and junk candidates can be reviewed separately from the main action queue
- ready-to-file work can be inspected outside the add-in before or after mailbox actions
- the dashboard works well on mobile-sized screens without depending on a native mobile app
- the dashboard complements, rather than duplicates, the Outlook add-in `Today`, `This Email`, and `Review` model

**Dependencies**

- Epic 4
- Epic 5
- Epic 6
- Epic 7

## Epic 9: Digests, Alerts, and Reminder Operations

**Goal**
Turn workflow state into proactive user-facing reminders and daily operating rhythm.

**Includes**

- morning digest generation
- urgent item alerting
- due-soon reminder logic
- end-of-day rollover summary
- digest delivery integration

**Key Outputs**

- daily digest service
- urgent alert service
- reminder scheduling logic

**Definition of Done**

- users receive morning summaries of unresolved critical and near-due work
- new urgent items can trigger alerts
- unresolved items can be rolled into the next day

**Dependencies**

- Epic 5
- Epic 6
- Epic 7 or Epic 8 for user-visible consumption

## Epic 10: Quality, Evaluation, and Pilot Readiness

**Goal**
Prepare Friendly Mail for a controlled MVP pilot with measurable quality and operational confidence.

**Includes**

- seeded evaluation dataset
- benchmark classification cases
- verification and QA checklist
- telemetry and observability
- correction logging for learning loops
- pilot onboarding documentation
- pilot support and failure-handling playbooks

**Key Outputs**

- evaluation harness for core intelligence flows
- pilot readiness checklist
- operator documentation
- production-quality visibility into failures

**Definition of Done**

- the team can measure classification and extraction quality against a known benchmark
- the system is observable enough for limited real-world pilot use
- pilot onboarding can happen without ad hoc engineering work for every step

**Dependencies**

- all prior epics at least functionally complete for the pilot slice

## Epic 11: Microsoft Tenant Registration and Deployment Setup

**Goal**
Turn the Microsoft-side prerequisites into a repeatable setup workflow so Friendly Mail can be connected to a real tenant without ad hoc engineering help.

**Includes**

- Microsoft Entra app registration
- redirect URI and supported-account-type setup
- delegated Graph permission and consent decisions
- local and staging secret provisioning
- public webhook URL setup
- operator verification and handoff

**Key Outputs**

- operator setup guide
- validated environment and secret inventory
- real-tenant setup checklist

**Definition of Done**

- the Microsoft-side values needed by the repo are known and mapped
- local or staging setup can be completed without ambiguity
- webhook reachability is solved for the chosen validation environment
- operator handoff no longer depends on ad hoc engineering memory

**Dependencies**

- Epic 2
- Epic 6
- Epic 7
- Epic 10

## Recommended Epic Sequence

1. Platform Foundation
2. Microsoft Graph and Mailbox Connectivity
3. Message Ingestion and Attachment Extraction
4. Classification and Workflow Intelligence
5. Task and Workflow State Engine
6. Delayed Filing and Mailbox Actions
7. Outlook Add-in Experience
8. Mobile-First Companion Dashboard and Triage Queue
9. Digests, Alerts, and Reminder Operations
10. Quality, Evaluation, and Pilot Readiness
11. Microsoft Tenant Registration and Deployment Setup

## Suggested First Build Slice

The smallest meaningful end-to-end slice should include:

- mailbox connectivity
- message ingestion
- actionable vs informational classification
- task creation for actionable email
- filing state logic for read vs resolved
- minimal Outlook add-in view for task and filing status

This slice proves the core product truth before broader automation and richer admin workflows are added.

## Epic-to-Milestone Mapping

| Roadmap Milestone | Supporting Epics |
|-------------------|------------------|
| Foundation and Mailbox Connectivity | Epic 1, Epic 2 |
| Message Intelligence | Epic 3, Epic 4 |
| Workflow State and Delayed Filing | Epic 5, Epic 6 |
| User Surfaces | Epic 7, Epic 8 |
| Reminder and Workflow Automation | Epic 6, Epic 9 |
| Pilot Readiness | Epic 10 |
| Tenant and Operator Setup | Epic 11 |
