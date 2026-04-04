# Friendly Mail Epic Ticket Breakdown

## Document Control

- Product: Friendly Mail
- Document type: Implementation Ticket Breakdown
- Version: v0.1
- Status: Draft
- Date: 2026-03-31
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
