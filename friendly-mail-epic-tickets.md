# Friendly Mail Epic Ticket Breakdown

## Document Control

- Product: Friendly Mail
- Document type: Implementation Ticket Breakdown
- Version: v0.2
- Status: Draft
- Date: 2026-04-05
- Related documents:
  - `friendly-mail-mvp-epics.md`
  - `friendly-mail-mvp-roadmap.md`
  - `friendly-mail-technical-design.md`

## Overview

This document contains the detailed implementation-ticket breakdown for Friendly Mail epics.

It is the single ticket-planning file for the product and should be appended as future epics are expanded.

## Epic 1: Platform Foundation

### Epic Goal

Create the application foundation, environments, and core services needed to build the MVP safely.

This epic is complete when the project has a working engineering skeleton, shared infrastructure conventions, persistence and queue baselines, and a reliable local-to-non-local developer workflow.

### Proposed Ticket List

#### E1-T1: Choose and Scaffold the Repository Architecture

**Goal**
Create the initial project structure for the Friendly Mail codebase.

**Scope**

- decide the repository layout for backend services, web dashboard, Outlook add-in, and shared packages
- scaffold the top-level application structure
- create package management and workspace configuration
- define baseline scripts for dev, build, lint, and test

**Expected Output**

- working repository structure
- initial application shells for primary surfaces and backend
- root-level developer commands

**Definition of Done**

- the repo has a consistent, documented structure
- backend, add-in, and dashboard can all be developed from the same workspace
- baseline scripts run successfully even if app functionality is still stubbed

#### E1-T2: Establish Environment and Secrets Management

**Goal**
Set up configuration management for local development and deployed environments.

**Scope**

- define required environment variables
- create environment loading strategy for local and deployed environments
- separate shared config from secret config
- create `.env.example` or equivalent non-secret reference file

**Expected Output**

- environment variable contract
- local developer setup instructions
- safe secrets handling baseline

**Definition of Done**

- required runtime configuration is documented
- local developers can boot the project with a known env contract
- secrets are not hardcoded anywhere in the repo

#### E1-T3: Set Up the Database and Migration Baseline

**Goal**
Create the first persistence layer for Friendly Mail workflow state.

**Scope**

- choose the MVP database stack
- create initial database connection setup
- establish migration strategy
- create initial schema placeholders for tenants, mailboxes, messages, tasks, and audit events

**Expected Output**

- database package or service foundation
- migration tooling
- initial schema baseline

**Definition of Done**

- the app can connect to the chosen database in development
- an initial migration can be created and applied
- schema ownership and migration workflow are documented

#### E1-T4: Set Up Queue and Background Job Infrastructure

**Goal**
Create the async processing foundation required for mailbox events and downstream workflows.

**Scope**

- choose the MVP queue and worker model
- scaffold queue producer and consumer patterns
- define job envelope conventions
- create local development strategy for async workers

**Expected Output**

- background job processing foundation
- job naming conventions
- local worker startup flow

**Definition of Done**

- the project can enqueue and process a test job successfully
- worker startup and failure handling are defined
- job payload conventions are documented for future epics

**Implementation Baseline**

- Redis is the MVP queue backend
- BullMQ is the queue and worker library
- local development uses Docker Compose for Redis
- queue health verification is available as a root-level command

#### E1-T5: Create Shared Domain Contracts and Package Boundaries

**Goal**
Establish the shared type system and package boundaries for Friendly Mail.

**Scope**

- define shared types for mailbox identity, workflow status, filing state, task status, and audit events
- create shared package or module boundaries
- document import direction rules between surfaces and backend services

**Expected Output**

- shared type package or equivalent module
- initial domain contracts for future epics
- dependency boundary rules

**Definition of Done**

- core workflow terms are represented in shared contracts
- backend and front-end surfaces can depend on shared types cleanly
- package boundaries are clear enough to avoid circular architecture drift

#### E1-T6: Implement Logging, Error Handling, and Audit Foundations

**Goal**
Create the common observability and traceability foundation used across all services.

**Scope**

- define structured logging format
- add shared error handling utilities
- create audit event recording baseline
- define correlation or trace ID behavior where appropriate

**Expected Output**

- shared logging utilities
- consistent error response or error reporting model
- audit event write path

**Definition of Done**

- services can emit structured logs
- errors are handled consistently across the app skeleton
- audit events can be written for future mailbox-affecting actions

**Implementation Baseline**

- `@friendly-mail/observability` provides structured JSON logging and shared app-error helpers
- the API and queue worker use the shared logger baseline
- audit events are written through a shared `recordAuditEvent` helper in the database package

#### E1-T7: Establish Authentication and Session Baseline

**Goal**
Set up the product's internal authentication baseline before Graph integration begins.

**Scope**

- choose the application auth approach for dashboard and add-in-connected surfaces
- set up session handling for internal application users
- define the distinction between product auth and Microsoft Graph auth

**Expected Output**

- app auth baseline
- session management approach
- documented separation of internal identity and mailbox identity

**Definition of Done**

- the application has a clear auth model for user access
- future Graph onboarding can build on a stable internal auth foundation
- auth responsibilities are documented

#### E1-T8: Configure CI, Code Quality, and Verification Defaults

**Goal**
Make the project safe to build on by establishing baseline quality gates.

**Scope**

- configure linting
- configure formatting expectations
- configure type-checking
- configure unit test runner baseline
- define CI workflow for validation

**Expected Output**

- working CI pipeline
- baseline verification commands
- test and lint standards for the repo

**Definition of Done**

- pull requests or pushes can run baseline verification
- the repository has a consistent quality gate for future work
- the first implementation slices can adopt TDD and verification cleanly

#### E1-T9: Create Developer Onboarding and Local Runbook

**Goal**
Reduce setup friction so the team can build quickly once Epic 2 starts.

**Scope**

- document local setup
- document project scripts
- document environment setup
- document database and worker boot process
- document expected development workflow

**Expected Output**

- developer setup guide
- local run instructions
- troubleshooting notes for common setup failures

**Definition of Done**

- a new developer can set up the project from the docs
- the local run path is clear for backend, dashboard, and add-in work
- core setup decisions are documented in one place

### Suggested Execution Order

1. E1-T1 Repository architecture
2. E1-T2 Environment and secrets management
3. E1-T3 Database and migration baseline
4. E1-T4 Queue and background job infrastructure
5. E1-T5 Shared domain contracts and package boundaries
6. E1-T6 Logging, error handling, and audit foundations
7. E1-T7 Authentication and session baseline
8. E1-T8 CI, code quality, and verification defaults
9. E1-T9 Developer onboarding and local runbook

### Suggested First Implementation Slice

The first practical build slice for Epic 1 should combine:

- E1-T1 Repository architecture
- E1-T2 Environment and secrets management
- E1-T8 CI, code quality, and verification defaults

That gives the team a usable workspace immediately, while database, queue, auth, and audit foundations can follow as the next slice.

### Epic 1 Exit Check

Epic 1 can be marked complete when:

- the repository structure is stable
- configuration and secrets handling are documented and working
- persistence and queue foundations exist
- shared contracts exist for future workflow work
- logging, error, and audit foundations are in place
- baseline auth is defined
- CI and verification are active
- the team can onboard into the repo without ad hoc setup knowledge

## Epic 2: Microsoft Graph and Mailbox Connectivity

### Epic Goal

Connect Friendly Mail to Microsoft 365 mailboxes and establish a reliable mailbox ingestion pipeline.

This epic is complete when a delegated user mailbox can be connected, folder and message state can be synchronized, webhook and delta flows reconcile reliably, and shared-mailbox readiness has an explicit capability and fallback path.

### Proposed Ticket List

#### E2-T1: Define Microsoft Entra and Graph Connectivity Contract

**Goal**
Lock the Microsoft Entra, delegated Graph auth, and mailbox-connectivity contract that Epic 2 will build on.

**Scope**

- define the delegated-first mailbox onboarding approach for MVP
- define required Microsoft Entra and Graph configuration values
- document delegated mailbox prerequisites and consent expectations
- define the boundary between Friendly Mail product auth and Graph mailbox auth
- define the initial shared-mailbox readiness assumptions and fallback behavior

**Expected Output**

- connectivity contract for Epic 2
- documented onboarding prerequisites
- clear auth and mailbox-identity boundary for implementation

**Definition of Done**

- the project has one documented delegated-first mailbox connectivity approach
- Microsoft config expectations are explicit
- shared-mailbox support is scoped as readiness and capability work, not an implicit first-slice requirement
- implementers can start Epic 2 without re-deciding the auth model

#### E2-T2: Extend Persistence for Mailbox Connectivity and Sync State

**Goal**
Add the internal persistence needed to track mailbox onboarding, Graph linkage, subscriptions, and per-folder sync state.

**Scope**

- extend the schema for mailbox Graph metadata and onboarding state
- add subscription persistence for Graph webhook lifecycle tracking
- add per-folder delta state storage
- add any missing immutable-ID-related fields needed for stable message tracking
- keep the persistence scope limited to connectivity and sync, not Epic 3 extraction data

**Expected Output**

- schema and typed persistence contract for Graph connectivity
- stored subscription state
- stored folder sync cursors

**Definition of Done**

- the system can persist mailbox onboarding state and Graph linkage data
- folder-level delta links can be stored and updated
- subscription lifecycle state can be persisted cleanly
- the persistence layer is ready for connector and sync work

#### E2-T3: Implement the Core Microsoft Graph Connector

**Goal**
Create the shared Graph connector layer used by all Epic 2 mailbox flows.

**Scope**

- wrap Graph auth usage, retries, throttling, pagination, and request headers
- normalize Graph responses into internal DTOs
- enforce `Prefer: IdType="ImmutableId"` consistently on supported message operations
- centralize folder, message, and subscription calls in one connector

**Expected Output**

- reusable Graph connector module
- immutable-ID-safe request path
- normalized Graph DTO layer

**Definition of Done**

- Epic 2 code does not scatter raw Graph request logic across services
- supported message and sync calls opt into immutable IDs by default
- connector behavior for retries and pagination is centralized
- later Epic 2 tickets can depend on the connector without re-solving HTTP behavior

#### E2-T4: Build Delegated Mailbox Onboarding

**Goal**
Implement the first real mailbox onboarding path for a signed-in user connecting their own mailbox.

**Scope**

- validate onboarding prerequisites for a delegated mailbox
- create the internal mailbox registration flow
- store the mailbox and tenant linkage required for sync
- expose or document the onboarding entry path used by the system
- keep the first supported path focused on a normal signed-in user mailbox

**Expected Output**

- delegated mailbox onboarding flow
- persisted mailbox registration state
- first runnable mailbox-connect path

**Definition of Done**

- a supported delegated mailbox can be connected successfully
- mailbox registration state is persisted internally
- onboarding failures are explicit and diagnosable
- the flow does not assume shared-mailbox grants are already present

#### E2-T5: Implement Folder Discovery and Initial Folder Sync

**Goal**
Synchronize the mailbox folder tree as the first durable Graph data structure inside Friendly Mail.

**Scope**

- discover folders from the mailbox root
- persist the tracked folder tree
- handle parent-child relationships and tracked identifiers
- define the baseline tracked-folder strategy for later delta sync

**Expected Output**

- synced folder tree
- persisted folder records
- initial folder topology baseline

**Definition of Done**

- a connected mailbox can populate its folder tree internally
- tracked folders and parent relationships are persisted
- the system has the inputs needed for folder-level delta sync
- the folder sync path is repeatable and idempotent enough for continued Epic 2 work

#### E2-T6: Implement Message Metadata Sync with Delta Links

**Goal**
Synchronize lightweight message records and per-folder delta state without pulling Epic 3 intelligence work forward.

**Scope**

- run per-folder message delta sync
- persist internal message metadata required for later processing
- store and advance folder-level delta links
- keep the scope to mailbox connectivity and stable message identity

**Expected Output**

- synced message metadata baseline
- persisted delta cursors
- stable message identity path for later epics

**Definition of Done**

- message metadata can be synchronized for tracked folders
- per-folder delta links are stored and updated
- message identity stays stable through internal processing assumptions
- the sync baseline avoids pulling in attachment extraction or classification work

#### E2-T7: Implement Graph Subscription and Webhook Lifecycle

**Goal**
Create the mailbox event ingestion path based on Graph subscriptions and secure webhook handling.

**Scope**

- create and renew Graph subscriptions
- store subscription lifecycle state
- validate incoming webhook requests and lifecycle callbacks
- push accepted notification work into the internal queue

**Expected Output**

- webhook subscription service
- secure webhook ingress path
- queued mailbox event baseline

**Definition of Done**

- subscriptions can be created and renewed for supported mailboxes
- webhook handshake and validation flows work
- accepted events are pushed into the queue for downstream reconciliation
- subscription failures and expiry risk are observable

#### E2-T8: Implement Reconciliation Between Webhooks and Delta Sync

**Goal**
Make webhook-triggered mailbox changes reliable by reconciling them through folder-level delta sync instead of trusting transient payloads alone.

**Scope**

- connect queued webhook events to the right reconciliation logic
- fetch current state or run delta reconciliation after webhook receipt
- repair missed or delayed notification cases through periodic or triggered delta sync
- define the baseline idempotency rules for repeated mailbox-change processing

**Expected Output**

- webhook-to-delta reconciliation flow
- reliable message change processing baseline
- stale or missed event repair path

**Definition of Done**

- mailbox changes can be detected via webhook and reconciled via sync
- stale webhook payloads do not become the system of record
- missed or delayed notifications can be repaired through delta sync
- the internal event flow is durable enough for later ingestion and classification work

#### E2-T9: Add Shared-Mailbox Readiness and Operational Verification

**Goal**
Finish Epic 2 with explicit shared-mailbox capability checks and the operational visibility needed for safe rollout.

**Scope**

- add shared-mailbox capability and permission validation checks
- define fallback or unsupported behavior when shared-mailbox grants are insufficient
- add verification coverage for subscription health, delta lag, and immutable-ID usage
- document the operational checks required before moving into Epic 3

**Expected Output**

- shared-mailbox readiness path
- capability-check flow for team mailboxes
- operational verification checklist for Epic 2

**Definition of Done**

- shared-mailbox support has an explicit readiness and fallback path
- unsupported tenant or permission states fail clearly
- Epic 2 observability covers webhook health, delta lag, and message identity stability
- the team can enter Epic 3 without mailbox-connectivity ambiguity

### Suggested Execution Order

1. E2-T1 Connectivity contract
2. E2-T2 Persistence and sync state
3. E2-T3 Core Graph connector
4. E2-T4 Delegated mailbox onboarding
5. E2-T5 Folder discovery and initial sync
6. E2-T6 Message metadata sync with delta links
7. E2-T7 Subscription and webhook lifecycle
8. E2-T8 Webhook and delta reconciliation
9. E2-T9 Shared-mailbox readiness and operational verification

### Suggested First Implementation Slice

The first practical build slice for Epic 2 should combine:

- E2-T1 Connectivity contract
- E2-T2 Persistence and sync state
- E2-T3 Core Graph connector
- E2-T4 Delegated mailbox onboarding
- E2-T5 Folder discovery and initial sync
- E2-T6 Message metadata sync with delta links

That slice proves the first real mailbox connection path before webhook and shared-mailbox readiness work deepen the connectivity layer.

### Epic 2 Exit Check

Epic 2 can be marked complete when:

- a supported delegated mailbox can be connected successfully
- the folder tree can be synchronized and persisted
- message metadata can be synchronized with folder-level delta links
- webhook subscriptions can be created, renewed, and validated
- webhook and delta flows work together reliably
- immutable message identity is enforced consistently through the connector
- shared-mailbox readiness has an explicit capability and fallback path

## Epic 3: Message Ingestion and Attachment Extraction

**Goal**

Transform synced mailbox records into normalized message content and attachment artifacts that later epics can classify, reason over, and turn into workflow state safely.

**Includes**

- message ingestion contract and processing boundaries
- normalized body extraction and storage
- attachment metadata retrieval and durable linkage
- PDF-first text extraction
- OCR fallback where enabled
- ingestion idempotency and repeated-update handling
- observability and retry paths for failed extraction work

**Dependencies**

- Epic 2

**Definition of Done**

- representative emails and PDF attachments can be processed end to end
- extracted body and attachment artifacts are stored in a form later epics can use
- repeated sync or webhook events do not create duplicate extraction artifacts
- extraction failures are observable, retryable, and recoverable

### Proposed Ticket List

#### E3-T1: Define Message Ingestion and Extraction Contract

**Goal**
Lock the ingestion, attachment, and extraction boundaries so Epic 3 can be implemented without pulling classification or workflow policy forward.

**Scope**

- define the normalized message envelope used after Epic 2 sync
- define supported body and attachment ingestion boundaries for MVP
- define the handoff contract from Epic 2 sync into Epic 3 ingestion
- define the first supported attachment formats and OCR assumptions
- define the boundary between extraction artifacts and later classification output

**Expected Output**

- Epic 3 ingestion contract
- supported attachment and OCR assumptions
- explicit boundary between extraction and classification work

**Definition of Done**

- implementers have one documented ingestion contract
- supported file formats and OCR assumptions are explicit
- later epics can depend on extraction outputs without redefining payload shape
- Epic 3 scope stays separate from classification and filing policy

#### E3-T2: Extend Persistence for Message Bodies, Attachments, and Extraction State

**Goal**
Add the persistence needed to track normalized message content, attachment records, extraction artifacts, and processing status.

**Scope**

- extend the schema for stored normalized message body content
- add attachment records and mailbox linkage fields
- add extraction-status and retry-tracking fields
- add storage references for extracted attachment text and OCR artifacts
- keep the persistence scope focused on ingestion and extraction, not Epic 4 decisions

**Expected Output**

- schema and typed persistence contract for extraction state
- stored attachment metadata and artifact linkage
- durable extraction progress tracking

**Definition of Done**

- message body and attachment extraction state can be persisted
- attachment artifacts can be linked back to source messages
- failure and retry state can be tracked durably
- the persistence layer is ready for ingestion and attachment services

#### E3-T3: Implement the Message Ingestion Service

**Goal**
Create the service that turns synced Graph message metadata into a normalized internal message envelope with stable body content handling.

**Scope**

- retrieve full message payloads needed for body ingestion
- normalize HTML and text body representations into an internal envelope
- preserve mailbox, message, and attachment linkage needed for later work
- keep immutable-ID-safe message retrieval centralized through the connector
- avoid introducing task extraction or classification logic

**Expected Output**

- message ingestion service
- normalized body envelope
- stable handoff point for attachment extraction

**Definition of Done**

- synced messages can be ingested into a normalized internal body representation
- body normalization is repeatable and safe for later processing
- message fetch and normalization logic stays separate from workflow decisions
- later Epic 3 tickets can depend on the normalized envelope

#### E3-T4: Implement Attachment Metadata Retrieval and Durable Linking

**Goal**
Retrieve attachment metadata and file-access information for ingested messages without yet solving full text extraction for every format.

**Scope**

- fetch attachment metadata for ingested messages
- persist attachment records and source-message linkage
- capture attachment type, size, and Graph identifiers
- define the attachment-selection rules for MVP extraction
- keep unsupported attachment formats explicit

**Expected Output**

- attachment metadata service
- persisted attachment records
- MVP attachment-selection baseline

**Definition of Done**

- ingested messages can enumerate and persist supported attachment metadata
- source-message and attachment linkage is durable
- unsupported formats fail clearly instead of silently disappearing
- later extraction tickets can depend on stable attachment records

#### E3-T5: Implement PDF-First Attachment Text Extraction

**Goal**
Extract usable text from PDF attachments as the first supported end-to-end attachment pipeline.

**Scope**

- retrieve supported PDF file content
- extract text from machine-readable PDFs
- store extracted text in a durable artifact path
- preserve attachment-to-artifact linkage and extraction timestamps
- surface extraction failure state clearly

**Expected Output**

- PDF extraction pipeline
- stored extracted attachment text
- baseline extraction success and failure path

**Definition of Done**

- representative machine-readable PDFs can be processed end to end
- extracted text is persisted for later classification work
- attachment extraction failures are recorded and diagnosable
- the system has one supported attachment path beyond message body content

#### E3-T6: Add OCR Fallback and Extraction Confidence Handling

**Goal**
Handle scanned or low-quality PDFs with an explicit OCR path and confidence-aware outputs.

**Scope**

- define when OCR fallback is attempted
- run OCR where enabled for scanned PDF cases
- store OCR-derived text separately or with provenance markers
- attach confidence and low-quality indicators to extraction output
- keep OCR optional and operationally visible

**Expected Output**

- OCR fallback path
- confidence-aware extraction output
- low-quality extraction signal for later review logic

**Definition of Done**

- scanned PDF cases can follow an explicit OCR path where enabled
- extraction output indicates provenance and confidence
- low-confidence cases are observable for later UX and workflow handling
- OCR assumptions remain configurable rather than implicit

#### E3-T7: Orchestrate Idempotent Ingestion and Attachment Processing

**Goal**
Make Epic 3 durable under repeated sync updates, webhook repairs, and message change-key churn by orchestrating extraction work idempotently.

**Scope**

- define idempotency keys for message ingestion and attachment extraction
- queue and orchestrate the ingestion-to-extraction workflow
- skip or merge duplicate work safely on repeated events
- allow reprocessing when message state changes materially
- keep partial-processing state explicit

**Expected Output**

- idempotent ingestion orchestration
- extraction queue workflow
- repeat-safe processing baseline

**Definition of Done**

- repeated mailbox events do not create duplicate extraction artifacts
- the system can distinguish skipped duplicate work from true reprocessing
- attachment and body extraction can be retried safely
- Epic 3 processing is durable enough for later classification integration

#### E3-T8: Add Operational Verification for Ingestion and Extraction

**Goal**
Finish Epic 3 with the observability, retry visibility, and rollout checks needed before classification work begins.

**Scope**

- report ingestion and extraction status across messages and attachments
- add verification coverage for extraction success, retry backlog, and attachment failure rates
- document the operational checks required before moving into Epic 4
- define explicit unsupported or degraded behavior for non-PDF attachment cases

**Expected Output**

- ingestion and extraction operational verification path
- extraction failure and retry visibility
- Epic 3 rollout checklist

**Definition of Done**

- Epic 3 observability covers ingestion health, extraction failures, and retry state
- unsupported attachment cases fail clearly
- the team can enter Epic 4 without ambiguity about ingestion readiness
- operational checks for representative email and PDF samples are documented

### Suggested Execution Order

1. E3-T1 Ingestion contract
2. E3-T2 Persistence and extraction state
3. E3-T3 Message ingestion service
4. E3-T4 Attachment metadata retrieval
5. E3-T5 PDF-first extraction
6. E3-T6 OCR fallback and confidence handling
7. E3-T7 Idempotent ingestion orchestration
8. E3-T8 Operational verification

### Suggested First Implementation Slice

The first practical build slice for Epic 3 should combine:

- E3-T1 Ingestion contract
- E3-T2 Persistence and extraction state
- E3-T3 Message ingestion service
- E3-T4 Attachment metadata retrieval

That slice proves the normalized-content path before PDF extraction, OCR, and end-to-end operational verification deepen the ingestion layer.

### Epic 3 Exit Check

Epic 3 can be marked complete when:

- synced messages can be ingested into a normalized body representation
- attachment metadata and source-message linkage are persisted
- representative PDF attachments can be extracted successfully
- OCR fallback behavior is explicit where enabled
- repeated mailbox events do not create duplicate extraction artifacts
- ingestion and extraction failures are observable and recoverable

## Epic 4: Classification and Workflow Intelligence

**Goal**

Turn normalized message and attachment content into structured workflow signals that later epics can persist as task state, filing decisions, and user-visible explanations without collapsing mailbox state into workflow state.

**Includes**

- classification contract and workflow-signal boundaries
- persistence for classification output and extracted workflow signals
- classification orchestration over message and attachment content
- actionable vs informational classification
- message-type classification
- due date, entity, and task-candidate extraction
- urgency and criticality scoring with explainable reasoning
- confidence scoring and operational verification for representative samples

**Dependencies**

- Epic 3

**Definition of Done**

- the system can classify core MVP email types from representative email and PDF samples
- actionable and informational messages are distinguished reliably enough for downstream workflow use
- due dates, entities, and task candidates are extracted in a structured form
- criticality decisions and confidence signals are explicit and explainable
- Epic 5 can consume classification outputs without redefining their shape or provenance

### Proposed Ticket List

#### E4-T1: Define the Classification and Workflow Intelligence Contract

**Goal**
Lock the structured output shape for classification, extracted workflow signals, explanations, and confidence so Epic 4 stays separate from Epic 5 task-state ownership.

**Scope**

- define the classification result model for actionable vs informational and message-type outputs
- define the extracted workflow-signal model for due dates, entities, and task candidates
- define explanation and confidence fields for downstream user surfaces
- define the handoff boundary between Epic 4 classification output and Epic 5 task creation
- keep mailbox state, classification output, and workflow state explicitly separate

**Expected Output**

- Epic 4 classification contract
- explicit handoff boundary to Epic 5
- documented explanation and confidence output shape

**Definition of Done**

- implementers have one documented classification contract to build against
- Epic 4 output shape is stable enough for downstream services and UI consumers
- the boundary between workflow signals and first-class tasks is explicit
- delayed-filing and mailbox-action policy are not pulled into Epic 4 by accident

#### E4-T2: Extend Persistence for Classification Results and Workflow Signals

**Goal**
Add the persistence needed to store classification output, extracted workflow signals, explanations, and confidence without yet creating task records.

**Scope**

- extend the schema for message-level classification output
- add storage for extracted due dates, entities, and task-candidate payloads
- add provenance, versioning, and confidence fields for classification runs
- preserve linkage back to source messages and extraction artifacts
- keep Epic 4 persistence separate from Epic 5 task and workflow state tables

**Expected Output**

- schema and typed persistence contract for classification output
- durable storage for workflow signals and explanations
- repeat-safe linkage between classification runs and source content versions

**Definition of Done**

- classification output can be stored durably and read back consistently
- workflow signals can be linked to the message and attachment content they came from
- confidence and explanation data survive retries and reprocessing
- the persistence layer is ready for classification orchestration work

#### E4-T3: Implement the Classification Orchestration Service

**Goal**
Create the service that packages normalized message and attachment content into a repeat-safe classification job and stores the resulting output.

**Scope**

- gather normalized body content and extracted attachment text for a message version
- prepare the classification input payload and provenance markers
- call the classification path through one orchestration service
- persist the result against the current ingestion and extraction version state
- keep idempotency and reprocessing rules explicit for changed messages

**Expected Output**

- classification orchestration service
- repeat-safe classification job flow
- durable classification-run baseline

**Definition of Done**

- a normalized message with extracted attachments can enter one classification path
- the orchestration service can skip duplicate work for unchanged message versions
- changed message content can trigger explicit reclassification
- later Epic 4 tickets can add intelligence without scattering orchestration logic

#### E4-T4: Implement Actionability and Message-Type Classification

**Goal**
Classify each message into actionable vs informational state and the core Friendly Mail message taxonomy needed for later workflow decisions.

**Scope**

- classify actionable vs informational state
- classify message type for the MVP taxonomy such as contract, notice, letter, policy, committee, event, invoice, internal, and FYI
- keep classification rationale explicit for later explanation output
- support representative body-only and body-plus-attachment cases
- keep task creation and filing decisions out of this ticket

**Expected Output**

- actionability classification path
- message-type classification path
- rationale-bearing classification baseline

**Definition of Done**

- representative MVP message types can be classified end to end
- actionable and informational states are explicit in stored output
- message-type labels are stable enough for later task and filing logic
- unsupported or ambiguous cases remain visible instead of silently defaulting

#### E4-T5: Implement Due Date, Entity, and Task-Candidate Extraction

**Goal**
Extract the structured workflow signals that later become real task state, without yet creating or resolving tasks.

**Scope**

- extract due dates and date ranges where present
- extract key entities such as counterparties, committees, event names, and invoice cues
- extract task candidates with title and source rationale
- support both body-derived and attachment-derived signals with provenance
- keep extracted task candidates as suggestions, not first-class task records yet

**Expected Output**

- due-date extraction path
- entity extraction path
- task-candidate extraction output

**Definition of Done**

- representative messages can yield structured due dates and entities
- extracted task candidates are explicit and traceable to source content
- body and attachment provenance is preserved in the output
- Epic 5 can consume task-candidate output without re-solving extraction logic

#### E4-T6: Implement Urgency and Criticality Signal Scoring

**Goal**
Compute urgency and criticality signals from extracted content and deterministic rules so important work can be surfaced safely later.

**Scope**

- score urgency and criticality using extracted cues and deterministic rules
- merge rule-based signals with classification output in an explainable way
- keep criticality reasons explicit for downstream review
- support high-risk MVP cases such as notices and near-due invoices
- avoid auto-action policy or reminder scheduling in this ticket

**Expected Output**

- criticality scoring path
- merged rules and intelligence baseline
- explicit criticality rationale

**Definition of Done**

- representative urgent message types can receive a structured criticality signal
- scoring output includes the reasons that drove urgency decisions
- rule and intelligence outputs do not conflict silently
- later epics can persist and surface criticality without redefining scoring semantics

#### E4-T7: Add Confidence and Explanation Read Models for Downstream Surfaces

**Goal**
Make Epic 4 output explainable and consumable by later user surfaces and workflow services.

**Scope**

- define the downstream read model for explanations, confidence, and structured signal summaries
- expose the stored classification result in a stable internal shape for later APIs
- preserve source provenance so users can understand why a message was classified a certain way
- keep the read model separate from final add-in and dashboard UI concerns
- support explanation-first trust building for pilot scenarios

**Expected Output**

- explanation and confidence read model
- stable internal consumer shape for later APIs
- provenance-aware summary baseline

**Definition of Done**

- downstream services can read classification output without decoding raw stored artifacts
- explanation and confidence information is preserved in one stable read shape
- provenance remains visible for body and attachment-derived signals
- later Epic 7 and Epic 8 work can consume the read model without redefining it

#### E4-T8: Add Operational Verification for Classification Quality and Readiness

**Goal**
Finish Epic 4 with operational visibility and representative-sample checks before task-state and filing work begin.

**Scope**

- report classification coverage and missing-signal cases across representative messages
- add verification coverage for actionability, message type, due date, and criticality output presence
- define degraded or unsupported behavior for low-confidence and ambiguous cases
- document the rollout checks required before moving into Epic 5
- keep the first verification baseline focused on readiness, not full pilot evaluation

**Expected Output**

- classification operational verification path
- low-confidence and unsupported-case visibility
- Epic 4 rollout checklist

**Definition of Done**

- Epic 4 observability covers classification coverage, low-confidence output, and missing critical workflow signals
- unsupported or ambiguous classification cases fail clearly
- representative sample checks exist for the MVP message taxonomy
- the team can enter Epic 5 without ambiguity about classification readiness

### Suggested Execution Order

1. E4-T1 Classification contract
2. E4-T2 Persistence for classification output
3. E4-T3 Classification orchestration service
4. E4-T4 Actionability and message-type classification
5. E4-T5 Due date, entity, and task-candidate extraction
6. E4-T6 Urgency and criticality signal scoring
7. E4-T7 Confidence and explanation read models
8. E4-T8 Operational verification

### Suggested First Implementation Slice

The first practical build slice for Epic 4 should combine:

- E4-T1 Classification contract
- E4-T2 Persistence for classification output
- E4-T3 Classification orchestration service
- E4-T4 Actionability and message-type classification

That slice proves the first end-to-end classification path before deeper extraction, scoring, explanation, and operational verification work widen the intelligence layer.

### Epic 4 Exit Check

Epic 4 can be marked complete when:

- representative messages can be classified into actionable vs informational state and core MVP message types
- due dates, entities, and task candidates can be extracted in a structured form
- urgency and criticality signals are explicit and explainable
- confidence and provenance are visible to downstream consumers
- classification failures, ambiguity, and low-confidence cases are observable and recoverable

## Epic 5: Task and Workflow State Engine

**Goal**

Turn Epic 4 workflow signals into first-class task and message workflow state without collapsing workflow ownership into mailbox location or pulling actual filing execution into Epic 6 too early.

**Includes**

- task and workflow-state contract boundaries
- persistence for tasks, task-message linkage, and message workflow state
- task materialization from Epic 4 task candidates
- task lifecycle transitions and resolution semantics
- message workflow-state projection and filing blockers
- task ownership and delegation model for MVP
- criticality persistence and workflow auditability
- operational verification before delayed filing depends on the state engine

**Dependencies**

- Epic 4

**Definition of Done**

- Epic 4 task candidates can become durable first-class tasks repeatably
- task lifecycle state is explicit and auditable
- message workflow state remains separate from folder state and survives mailbox changes
- critical unresolved work remains visible through task and message workflow projections
- Epic 6 can depend on filing blockers and workflow state without redefining their semantics

### Proposed Ticket List

#### E5-T1: Define the Task and Workflow State Contract

**Goal**
Lock the task model, message workflow-state vocabulary, lifecycle semantics, and Epic 5 to Epic 6 boundary before persistence and orchestration work begins.

**Scope**

- define the first-class task model built from Epic 4 task candidates
- define task-source linkage and message workflow-state vocabulary
- define lifecycle states such as open, snoozed, delegated, done, and dismissed
- define filing-blocker and eligibility-prerequisite semantics without performing mailbox actions
- define the handoff boundary between Epic 5 workflow state and Epic 6 delayed-filing execution

**Expected Output**

- Epic 5 task and workflow-state contract
- documented lifecycle and filing-blocker vocabulary
- explicit boundary between workflow state and mailbox actions

**Definition of Done**

- implementers have one documented contract for task and message workflow state
- lifecycle states and transition intent are explicit
- filing blockers are defined without pulling move execution into Epic 5
- later add-in, dashboard, and mailbox-action work can depend on the model without redefining it

#### E5-T2: Extend Persistence for Tasks, Source Links, and Message Workflow State

**Goal**
Add the persistence needed to store first-class tasks, task-message links, workflow-state projections, and audit-friendly metadata.

**Scope**

- extend the schema for tasks and task-source links
- add persistence for message workflow state and filing blockers
- persist criticality and priority fields at the workflow-state layer
- store lifecycle timestamps, actor references, and supporting metadata
- keep actual folder-move execution and mailbox actions out of scope

**Expected Output**

- schema and typed persistence contract for tasks and workflow state
- durable task-source linking model
- persisted workflow-state and filing-blocker baseline

**Definition of Done**

- the system can store tasks, source links, and message workflow state durably
- workflow-state records can survive reprocessing and message movement
- criticality and lifecycle metadata are persisted in one coherent model
- the persistence layer is ready for task materialization and lifecycle work

#### E5-T3: Implement Task Materialization from Classification Output

**Goal**
Create repeat-safe task creation that turns Epic 4 task candidates into durable tasks linked back to the message and source signals they came from.

**Scope**

- read Epic 4 classification output and task candidates for a message version
- create zero or more first-class tasks from supported task candidates
- preserve source rationale, provenance, and linkage back to message and attachment signals
- make repeated task creation idempotent for unchanged classification versions
- keep manual resolution and delayed filing behavior out of this ticket

**Expected Output**

- task materialization service
- repeat-safe task creation baseline
- durable linkage between task records and source workflow signals

**Definition of Done**

- representative actionable messages can create first-class tasks end to end
- repeated processing does not create duplicate tasks for unchanged input
- task records remain traceable to their message and source rationale
- later lifecycle work can operate on a stable created-task baseline

#### E5-T4: Implement Task Lifecycle Transitions and Resolution Semantics

**Goal**
Define and enforce the state transitions that keep work visible until it is truly resolved, deferred, delegated, or dismissed.

**Scope**

- implement allowed task transitions for open, snoozed, delegated, done, and dismissed
- capture actor, timestamp, notes, and resolution metadata for lifecycle changes
- enforce invalid-transition protection and explicit transition reasons where needed
- preserve auditability for workflow-state changes
- keep reminder scheduling and mailbox moves out of scope

**Expected Output**

- task lifecycle service
- explicit resolution semantics
- auditable transition baseline

**Definition of Done**

- tasks can move through the MVP lifecycle states safely
- invalid or conflicting transitions fail clearly
- lifecycle changes preserve actor and timing context
- later filing and reminder work can trust task resolution state

#### E5-T5: Implement Message Workflow State Projection and Filing Blockers

**Goal**
Project message-level workflow state from task, read, and classification context so Friendly Mail knows whether a message is still active or is becoming filing-eligible.

**Scope**

- derive message workflow state independently from folder location
- represent actionable, informational-unread, blocked, and eligible states explicitly
- compute filing blockers from open task state, unresolved criticality, and read-state prerequisites
- persist or refresh workflow-state projections as task state changes
- avoid actually moving, categorizing, or forwarding mail in this ticket

**Expected Output**

- message workflow-state projection service
- explicit filing-blocker model
- stable filing-readiness baseline for later Epic 6 work

**Definition of Done**

- message workflow state can be recomputed from current task and mailbox-read context
- filing blockers are explicit and explainable
- mailbox folder location is not treated as workflow truth
- Epic 6 can consume workflow-state projections without redefining them

#### E5-T6: Implement Task Ownership, Delegation, and Criticality Persistence

**Goal**
Add the MVP ownership model so tasks can remain attributable, delegable, and visibly critical across personal and shared-mailbox scenarios.

**Scope**

- define and persist task owner and assignee semantics for MVP users
- support delegated task state with clear ownership and responsibility fields
- persist criticality at the task and message workflow layers where appropriate
- define shared-mailbox-friendly ownership assumptions without overreaching into team collaboration features
- keep broad team workload balancing out of scope

**Expected Output**

- task ownership and delegation baseline
- persisted criticality across workflow state
- MVP-ready responsibility model for later surfaces

**Definition of Done**

- tasks have explicit owner or assignee semantics
- delegated work remains visible and attributable
- critical tasks and messages stay marked as such through lifecycle updates
- later surfaces can show responsibility and urgency without inventing new state

#### E5-T7: Add Workflow Read Models and Internal APIs for Downstream Surfaces

**Goal**
Expose Epic 5 state in a downstream-friendly shape for the Outlook add-in, dashboard, and later mailbox-action workflows.

**Scope**

- define read models for tasks, linked messages, workflow state, and filing blockers
- expose internal API shapes for reading and mutating task state
- provide stable summaries for criticality, ownership, and resolution status
- keep the API layer separate from final surface-specific presentation concerns
- support trust-building explanations for why a message is still active or filing-blocked

**Expected Output**

- workflow read models
- internal task and workflow APIs
- stable downstream consumer shape for add-in and dashboard work

**Definition of Done**

- downstream services can read task and message workflow state without decoding raw persistence records
- filing blockers and ownership are available in stable API shapes
- later Epic 6, Epic 7, and Epic 8 work can build on the read models without re-solving the data contract
- user-facing surfaces have one canonical backend shape to depend on

#### E5-T8: Add Operational Verification for Task and Workflow Readiness

**Goal**
Finish Epic 5 with visibility into task-creation coverage, workflow-state integrity, and filing-blocker correctness before delayed-filing behavior depends on it.

**Scope**

- report task-creation coverage from classified actionable messages
- verify linkage integrity between tasks, source messages, and workflow-state projections
- surface invalid lifecycle state, orphaned tasks, and missing filing-blocker cases
- document rollout checks required before moving into Epic 6
- keep this baseline focused on readiness, not full pilot analytics

**Expected Output**

- task and workflow operational verification path
- linkage and lifecycle integrity checks
- Epic 5 rollout checklist

**Definition of Done**

- Epic 5 observability covers task creation, lifecycle integrity, and workflow-state coverage
- orphaned or inconsistent workflow records fail clearly
- representative actionable messages can be checked from classification output through task-state projection
- the team can enter Epic 6 without ambiguity about workflow-state readiness

### Suggested Execution Order

1. E5-T1 Task and workflow-state contract
2. E5-T2 Persistence for tasks and workflow state
3. E5-T3 Task materialization from classification output
4. E5-T4 Task lifecycle transitions and resolution semantics
5. E5-T5 Message workflow-state projection and filing blockers
6. E5-T6 Task ownership, delegation, and criticality persistence
7. E5-T7 Workflow read models and internal APIs
8. E5-T8 Operational verification

### Suggested First Implementation Slice

The first practical build slice for Epic 5 should combine:

- E5-T1 Task and workflow-state contract
- E5-T2 Persistence for tasks and workflow state
- E5-T3 Task materialization from classification output

That slice proves the first end-to-end transition from Epic 4 workflow signals into durable task state before lifecycle, workflow projection, ownership, and operational verification deepen the state engine.

### Epic 5 Exit Check

Epic 5 can be marked complete when:

- Epic 4 task candidates can become first-class tasks repeatably and traceably
- task lifecycle transitions are explicit, safe, and auditable
- message workflow state is derived independently from folder location
- filing blockers and eligibility prerequisites are visible for later delayed-filing work
- ownership, delegation, and criticality remain visible across workflow updates
- task and workflow-state integrity is observable before Epic 6 depends on it

## Epic 6: Delayed Filing and Mailbox Actions

**Goal**

Turn Epic 5 workflow eligibility into safe, explainable mailbox actions for delayed filing, category application, invoice routing, and outgoing numbering without collapsing workflow state back into mailbox state.

**Includes**

- delayed-filing and mailbox-action contract boundaries
- persistence for filing decisions, mailbox-action intent, and audit-friendly execution history
- filing-decision orchestration from Epic 5 workflow state
- read or reviewed informational-message filing execution
- resolved actionable-message filing execution
- folder suggestion and category application flow
- invoice routing and outgoing numbering mailbox actions
- operational verification before user-facing surfaces depend on live mailbox mutations

**Dependencies**

- Epic 5

**Definition of Done**

- filing decisions are derived from explicit Epic 5 workflow state instead of ad hoc mailbox flags
- informational and actionable messages can follow delayed-filing rules safely
- mailbox actions are auditable, explainable, and reversible at the workflow layer
- representative invoice-routing and outgoing-numbering workflows are supported for the MVP
- later add-in and dashboard work can depend on stable mailbox-action contracts and readiness checks

### Proposed Ticket List

#### E6-T1: Define the Delayed Filing and Mailbox Action Contract

**Goal**
Lock the delayed-filing vocabulary, mailbox-action intent model, audit expectations, and Epic 6 boundaries before persistence and execution work begins.

**Scope**

- define filing-decision, action-intent, and mailbox-action result vocabulary
- define the boundary between Epic 5 filing eligibility and Epic 6 mailbox execution
- define informational read or review filing semantics and actionable resolution filing semantics
- define suggestion-first versus auto-apply expectations for high-impact mailbox actions
- define the shared contract for move, category, forward, and draft-numbering action paths

**Expected Output**

- Epic 6 delayed-filing and mailbox-action contract
- documented mailbox-action intent and result vocabulary
- explicit boundary between workflow-state truth and mailbox execution

**Definition of Done**

- implementers have one documented contract for filing decisions and mailbox-action execution
- delayed-filing semantics are explicit for informational and actionable messages
- mailbox actions remain auditable and separate from task-state ownership
- later persistence, API, and surface work can build on the model without redefining it

#### E6-T2: Extend Persistence for Filing Decisions, Target Folders, and Mailbox Action Audit

**Goal**
Add the persistence needed to store filing decisions, suggested targets, mailbox-action attempts, and execution history safely.

**Scope**

- extend the schema for filing decisions, target folders, and mailbox-action attempt records
- persist suggested and applied categories, folder targets, and action-mode metadata
- store actor, approval, outcome, and error context for mailbox actions
- keep mailbox execution separate from task and workflow-state records while linking back to them
- avoid implementing live mailbox mutations in this ticket

**Expected Output**

- schema and typed persistence contract for delayed-filing and mailbox-action state
- durable filing-decision and mailbox-action audit model
- persisted target-folder and category baseline for later execution work

**Definition of Done**

- the system can store filing decisions and mailbox-action attempts durably
- action outcomes and failures are auditable without decoding raw logs
- delayed-filing history remains linked to workflow state without replacing it
- the persistence layer is ready for mailbox-action orchestration and execution

#### E6-T3: Implement Filing Decision Orchestration from Workflow State

**Goal**
Create the repeat-safe filing-decision path that turns Epic 5 workflow-state and filing eligibility into one mailbox-action-ready decision.

**Scope**

- read message workflow state, filing eligibility, and source message context
- derive filing readiness, target action mode, and blocked or eligible decision output
- preserve explanation and blocker context for downstream review
- make repeated evaluation idempotent for unchanged workflow state
- keep actual move, category, forward, and draft actions out of scope

**Expected Output**

- filing-decision orchestration service
- repeat-safe delayed-filing decision baseline
- stable decision record for later mailbox-action execution

**Definition of Done**

- representative messages can yield a stable filing decision from current workflow state
- repeated evaluation does not create duplicate or conflicting decision state
- blockers and readiness rationale remain visible in the decision output
- later execution tickets can depend on one canonical filing-decision path

#### E6-T4: Implement Informational Filing Execution for Read or Reviewed Messages

**Goal**
Apply delayed filing to informational mail only when the read or review condition is satisfied and the mailbox action is allowed by policy.

**Scope**

- execute informational-message filing when read or reviewed prerequisites are met
- support suggestion-first and controlled auto-apply behavior where configured
- preserve source folder, target folder, and action-result audit context
- keep blocked or unread informational mail safely untouched
- avoid actionable-message resolution logic in this ticket

**Expected Output**

- informational delayed-filing execution path
- read or reviewed gating baseline
- auditable move-result handling for informational mail

**Definition of Done**

- informational messages are not moved before read or review conditions are satisfied
- eligible informational messages can be moved or suggested safely
- mailbox-action results and failures are explicit and auditable
- the system does not silently file blocked informational mail

#### E6-T5: Implement Actionable Filing Execution for Resolved Workflow State

**Goal**
Apply delayed filing to actionable mail only after required work is resolved, dismissed, or otherwise cleared by explicit workflow policy.

**Scope**

- execute actionable-message filing when workflow state is eligible
- preserve explicit blocker handling for open, snoozed, delegated, and critical-work cases
- support suggestion-first and controlled auto-apply behavior for actionable filing
- capture audit context for source folder, target folder, actor, and decision rationale
- avoid invoice-routing and outgoing-numbering special cases in this ticket

**Expected Output**

- actionable delayed-filing execution path
- resolution-gated filing baseline
- auditable move-result handling for actionable mail

**Definition of Done**

- actionable messages are not moved before workflow-state prerequisites are satisfied
- resolved or dismissed work can become filing-executable safely
- blocked actionable mail remains visible and unmoved
- later user surfaces can trust the actionable filing semantics

#### E6-T6: Implement Folder Suggestion and Category Application Flow

**Goal**
Provide understandable mailbox-action suggestions and low-risk category actions that help users see where a message should go before or alongside delayed filing.

**Scope**

- derive folder suggestions from message type, entities, counterparties, and filing context
- support visible category application for supported mailbox actions
- preserve rationale for why a folder or category suggestion was chosen
- keep suggestion logic and category application auditable
- avoid collapsing folder suggestion into an automatic move requirement

**Expected Output**

- folder suggestion engine
- category application baseline
- mailbox-action rationale model for later surfaces

**Definition of Done**

- representative messages can receive explainable folder suggestions
- supported categories can be suggested or applied through the mailbox-action layer
- suggestion rationale is visible to later add-in and dashboard surfaces
- delayed filing can reuse the same target-folder logic without re-solving it

#### E6-T7: Implement Invoice Routing and Outgoing Numbering Mailbox Actions

**Goal**
Support the MVP's highest-value specialized mailbox actions for finance and outbound workflows without weakening delayed-filing safety.

**Scope**

- implement invoice-routing mailbox actions or suggestion flows for configured processors
- implement outgoing reference-number allocation and draft update support
- preserve audit history for forwarding, routing, and draft-numbering actions
- keep mailbox capability checks explicit for send, send-shared, and draft scenarios
- avoid broad admin configuration or workflow orchestration beyond the MVP paths

**Expected Output**

- invoice-routing mailbox-action path
- outgoing-numbering mailbox-action path
- auditable specialized mailbox-action baseline

**Definition of Done**

- representative invoice messages can be routed or suggested to the configured processor
- supported outgoing messages can receive a company-specific reference number before send
- mailbox capability limitations fail clearly and safely
- specialized mailbox actions remain visible and auditable in the same state model

#### E6-T8: Add Operational Verification for Delayed Filing and Mailbox Action Readiness

**Goal**
Finish Epic 6 with visibility into filing-decision integrity, mailbox-action safety, and execution readiness before live Outlook-facing surfaces depend on automated or suggested mailbox mutations.

**Scope**

- report filing-decision coverage and blocked-versus-eligible correctness across representative messages
- verify mailbox-action audit integrity, target-folder resolution, and action-result coverage
- surface failed moves, failed routes, failed draft actions, and capability-gated scenarios clearly
- document rollout checks required before moving into add-in and dashboard execution surfaces
- keep this baseline focused on readiness, not pilot-scale analytics

**Expected Output**

- delayed-filing and mailbox-action verification path
- mailbox-action integrity and failure visibility
- Epic 6 rollout checklist

**Definition of Done**

- Epic 6 observability covers filing decisions, mailbox-action attempts, and execution safety
- failed or unsupported mailbox actions are explicit and recoverable
- representative messages can be checked from workflow state through mailbox-action readiness
- the team can enter Epic 7 and Epic 8 without ambiguity about delayed-filing and mailbox-action readiness

### Suggested Execution Order

1. E6-T1 Delayed filing and mailbox-action contract
2. E6-T2 Persistence for filing decisions and mailbox-action audit
3. E6-T3 Filing decision orchestration from workflow state
4. E6-T4 Informational filing execution
5. E6-T5 Actionable filing execution
6. E6-T6 Folder suggestion and category application flow
7. E6-T7 Invoice routing and outgoing numbering mailbox actions
8. E6-T8 Operational verification

### Suggested First Implementation Slice

The first practical build slice for Epic 6 should combine:

- E6-T1 Delayed filing and mailbox-action contract
- E6-T2 Persistence for filing decisions and mailbox-action audit
- E6-T3 Filing decision orchestration from workflow state

That slice proves the first end-to-end transition from explicit workflow-state eligibility into mailbox-action-ready filing decisions before live move execution, folder suggestions, category application, and specialized mailbox actions widen the action layer.

### Epic 6 Exit Check

Epic 6 can be marked complete when:

- filing decisions are derived from explicit Epic 5 workflow state repeatably and traceably
- informational and actionable delayed-filing rules are enforced safely
- folder suggestions, categories, and mailbox actions are explainable and auditable
- invoice routing and outgoing numbering work for supported MVP scenarios
- mailbox-action failures and unsupported capability cases are observable before user surfaces depend on them
