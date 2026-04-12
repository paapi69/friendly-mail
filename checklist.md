# Friendly Mail MVP Checklist

Generated from `.planning/epic-status.json`.

Progress: 6/11 epics complete

## Epics

- [x] E1: Platform Foundation
- [x] E2: Microsoft Graph and Mailbox Connectivity
- [x] E3: Message Ingestion and Attachment Extraction
- [x] E4: Classification and Workflow Intelligence
- [x] E5: Task and Workflow State Engine
- [x] E6: Delayed Filing and Mailbox Actions
- [ ] E7: Outlook Add-in Experience
- [ ] E8: Mobile-First Companion Dashboard and Triage Queue
- [ ] E9: Digests, Alerts, and Reminder Operations
- [ ] E10: Quality, Evaluation, and Pilot Readiness
- [ ] E11: Microsoft Tenant Registration and Deployment Setup

## E1 Tickets

- [x] E1-T1: Choose and Scaffold the Repository Architecture
- [x] E1-T2: Establish Environment and Secrets Management
- [x] E1-T3: Set Up the Database and Migration Baseline
- [x] E1-T4: Set Up Queue and Background Job Infrastructure
- [x] E1-T5: Create Shared Domain Contracts and Package Boundaries
- [x] E1-T6: Implement Logging, Error Handling, and Audit Foundations
- [x] E1-T7: Establish Authentication and Session Baseline
- [x] E1-T8: Configure CI, Code Quality, and Verification Defaults
- [x] E1-T9: Create Developer Onboarding and Local Runbook

## E2 Tickets

- [x] E2-T1: Define Microsoft Entra and Graph Connectivity Contract
- [x] E2-T2: Extend Persistence for Mailbox Connectivity and Sync State
- [x] E2-T3: Implement the Core Microsoft Graph Connector
- [x] E2-T4: Build Delegated Mailbox Onboarding
- [x] E2-T5: Implement Folder Discovery and Initial Folder Sync
- [x] E2-T6: Implement Message Metadata Sync with Delta Links
- [x] E2-T7: Implement Graph Subscription and Webhook Lifecycle
- [x] E2-T8: Implement Reconciliation Between Webhooks and Delta Sync
- [x] E2-T9: Add Shared-Mailbox Readiness and Operational Verification

## E3 Tickets

- [x] E3-T1: Define Message Ingestion and Extraction Contract
- [x] E3-T2: Extend Persistence for Message Bodies, Attachments, and Extraction State
- [x] E3-T3: Implement the Message Ingestion Service
- [x] E3-T4: Implement Attachment Metadata Retrieval and Durable Linking
- [x] E3-T5: Implement PDF-First Attachment Text Extraction
- [x] E3-T6: Add OCR Fallback and Extraction Confidence Handling
- [x] E3-T7: Orchestrate Idempotent Ingestion and Attachment Processing
- [x] E3-T8: Add Operational Verification for Ingestion and Extraction

## E4 Tickets

- [x] E4-T1: Define the Classification and Workflow Intelligence Contract
- [x] E4-T2: Extend Persistence for Classification Results and Workflow Signals
- [x] E4-T3: Implement the Classification Orchestration Service
- [x] E4-T4: Implement Actionability and Message-Type Classification
- [x] E4-T5: Implement Due Date, Entity, and Task-Candidate Extraction
- [x] E4-T6: Implement Urgency and Criticality Signal Scoring
- [x] E4-T7: Add Confidence and Explanation Read Models for Downstream Surfaces
- [x] E4-T8: Add Operational Verification for Classification Quality and Readiness

## E5 Tickets

- [x] E5-T1: Define the Task and Workflow State Contract
- [x] E5-T2: Extend Persistence for Tasks, Source Links, and Message Workflow State
- [x] E5-T3: Implement Task Materialization from Classification Output
- [x] E5-T4: Implement Task Lifecycle Transitions and Resolution Semantics
- [x] E5-T5: Implement Message Workflow State Projection and Filing Blockers
- [x] E5-T6: Implement Task Ownership, Delegation, and Criticality Persistence
- [x] E5-T7: Add Workflow Read Models and Internal APIs for Downstream Surfaces
- [x] E5-T8: Add Operational Verification for Task and Workflow Readiness

## E6 Tickets

- [x] E6-T1: Define the Delayed Filing and Mailbox Action Contract
- [x] E6-T2: Extend Persistence for Filing Decisions, Target Folders, and Mailbox Action Audit
- [x] E6-T3: Implement Filing Decision Orchestration from Workflow State
- [x] E6-T4: Implement Informational Filing Execution for Read or Reviewed Messages
- [x] E6-T5: Implement Actionable Filing Execution for Resolved Workflow State
- [x] E6-T6: Implement Folder Suggestion and Category Application Flow
- [x] E6-T7: Implement Invoice Routing and Outgoing Numbering Mailbox Actions
- [x] E6-T8: Add Operational Verification for Delayed Filing and Mailbox Action Readiness

## E7 Tickets

- [x] E7-T1: Define the Outlook Add-in Surface Contract and Interaction Flow
- [x] E7-T2: Extend the Add-in Shell, Manifest, and Host Integration Baseline
- [x] E7-T3: Implement Mailbox Connect and Sync-Status Entry View
- [x] E7-T4: Implement the Message Workflow Summary and Explanation Panel
- [x] E7-T5: Implement the Task Action Panel and Lifecycle Mutations
- [x] E7-T6: Implement Filing Decision, Folder Suggestion, and Approval UX
- [ ] E7-T7: Implement Compose and Draft Numbering Experience
- [ ] E7-T8: Add Outlook Add-in Verification and Rollout Readiness

## E8 Tickets

- [ ] E8-T1: Define the Mobile-First Dashboard Triage Information Architecture
- [ ] E8-T2: Add Mailbox-Wide Dashboard Aggregation APIs and Bucket Read Models
- [ ] E8-T3: Implement the Mobile-First Today Queue and Priority Buckets
- [ ] E8-T4: Implement FYI and CC Batch-Review Surfaces
- [ ] E8-T5: Implement Junk-Candidate Review and Safe Handling Controls
- [ ] E8-T6: Implement the Ready-to-File Queue and Post-Action Filing Overview
- [ ] E8-T7: Implement Dashboard Filters, Search, and Mobile Drill-Down Flows
- [ ] E8-T8: Add Dashboard Verification and Rollout Readiness

## E11 Tickets

- [x] E11-T1: Define the Microsoft Tenant Setup Contract and Operator Guide
- [ ] E11-T2: Register the Microsoft Entra App and Baseline Redirect URIs
- [ ] E11-T3: Configure Delegated Graph Permissions and Consent Strategy
- [ ] E11-T4: Provision Secrets and Environment Configuration for Local and Staging
- [ ] E11-T5: Expose a Public Webhook Endpoint and Validate Graph Callback Reachability
- [ ] E11-T6: Run End-to-End Tenant Setup Verification and Operator Handoff

## Notes

- Update high-level epics with `node scripts/set-epic-status.mjs <E#> <pending|done>`.
- Update detailed tickets with `node scripts/set-ticket-status.mjs <ticket-id> <pending|done>`.
- Rebuild this file with `node scripts/sync-checklist.mjs`.
- Last status update: 2026-04-11
