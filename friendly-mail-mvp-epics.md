# Friendly Mail MVP Epic Breakdown

## Document Control

- Product: Friendly Mail
- Document type: MVP Epic Breakdown
- Version: v0.2
- Status: Draft
- Date: 2026-04-05
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
- The next implementation move is to start the Epic 7 Outlook add-in experience against the now-stable workflow and mailbox-action contracts.

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

- add-in shell and authentication integration
- message detail view for classification and criticality
- task panel for extracted actions and due dates
- filing status and folder suggestion view
- user actions such as mark done, delegate, snooze, dismiss, and approve filing
- support for compose and draft workflows where required for numbering

**Key Outputs**

- functioning Outlook add-in MVP
- message-level workflow controls
- in-context filing and task interaction

**Definition of Done**

- a pilot user can review and act on messages from inside Outlook
- the add-in shows classification, task, urgency, and filing state clearly
- the add-in supports the core task and filing actions required for MVP

**Dependencies**

- Epic 5
- Epic 6

## Epic 8: Companion Web Dashboard and Admin

**Goal**
Deliver the secondary product surface for monitoring, administration, and operational management.

**Includes**

- task dashboard
- critical items view
- due-soon and overdue views
- audit history
- mailbox and routing configuration
- admin controls for pilot setups

**Key Outputs**

- web dashboard MVP
- admin and routing interface
- operational visibility layer

**Definition of Done**

- users can review outstanding work outside Outlook
- admins can configure core routing and mailbox settings
- audit and workflow state can be inspected from the dashboard

**Dependencies**

- Epic 5
- Epic 6

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

## Recommended Epic Sequence

1. Platform Foundation
2. Microsoft Graph and Mailbox Connectivity
3. Message Ingestion and Attachment Extraction
4. Classification and Workflow Intelligence
5. Task and Workflow State Engine
6. Delayed Filing and Mailbox Actions
7. Outlook Add-in Experience
8. Companion Web Dashboard and Admin
9. Digests, Alerts, and Reminder Operations
10. Quality, Evaluation, and Pilot Readiness

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
