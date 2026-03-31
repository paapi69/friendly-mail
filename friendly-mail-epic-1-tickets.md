# Friendly Mail Epic 1 Ticket Breakdown

## Document Control

- Product: Friendly Mail
- Epic: E1 - Platform Foundation
- Document type: Implementation Ticket Breakdown
- Version: v0.1
- Status: Draft
- Date: 2026-03-31
- Related documents:
  - `friendly-mail-mvp-epics.md`
  - `friendly-mail-mvp-roadmap.md`
  - `friendly-mail-technical-design.md`

## Epic Goal

Create the application foundation, environments, and core services needed to build the MVP safely.

This epic is complete when the project has a working engineering skeleton, shared infrastructure conventions, persistence and queue baselines, and a reliable local-to-non-local developer workflow.

## Proposed Ticket List

### E1-T1: Choose and Scaffold the Repository Architecture

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

### E1-T2: Establish Environment and Secrets Management

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

### E1-T3: Set Up the Database and Migration Baseline

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

### E1-T4: Set Up Queue and Background Job Infrastructure

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

### E1-T5: Create Shared Domain Contracts and Package Boundaries

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

### E1-T6: Implement Logging, Error Handling, and Audit Foundations

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

### E1-T7: Establish Authentication and Session Baseline

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

### E1-T8: Configure CI, Code Quality, and Verification Defaults

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

### E1-T9: Create Developer Onboarding and Local Runbook

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

## Suggested Execution Order

1. E1-T1 Repository architecture
2. E1-T2 Environment and secrets management
3. E1-T3 Database and migration baseline
4. E1-T4 Queue and background job infrastructure
5. E1-T5 Shared domain contracts and package boundaries
6. E1-T6 Logging, error handling, and audit foundations
7. E1-T7 Authentication and session baseline
8. E1-T8 CI, code quality, and verification defaults
9. E1-T9 Developer onboarding and local runbook

## Suggested First Implementation Slice

The first practical build slice for Epic 1 should combine:

- E1-T1 Repository architecture
- E1-T2 Environment and secrets management
- E1-T8 CI, code quality, and verification defaults

That gives the team a usable workspace immediately, while database, queue, auth, and audit foundations can follow as the next slice.

## Epic 1 Exit Check

Epic 1 can be marked complete when:

- the repository structure is stable
- configuration and secrets handling are documented and working
- persistence and queue foundations exist
- shared contracts exist for future workflow work
- logging, error, and audit foundations are in place
- baseline auth is defined
- CI and verification are active
- the team can onboard into the repo without ad hoc setup knowledge
