# Friendly Mail MVP Checklist

Generated from `.planning/epic-status.json`.

Progress: 1/10 epics complete

## Epics

- [x] E1: Platform Foundation
- [ ] E2: Microsoft Graph and Mailbox Connectivity
- [ ] E3: Message Ingestion and Attachment Extraction
- [ ] E4: Classification and Workflow Intelligence
- [ ] E5: Task and Workflow State Engine
- [ ] E6: Delayed Filing and Mailbox Actions
- [ ] E7: Outlook Add-in Experience
- [ ] E8: Companion Web Dashboard and Admin
- [ ] E9: Digests, Alerts, and Reminder Operations
- [ ] E10: Quality, Evaluation, and Pilot Readiness

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
- [ ] E2-T6: Implement Message Metadata Sync with Delta Links
- [ ] E2-T7: Implement Graph Subscription and Webhook Lifecycle
- [ ] E2-T8: Implement Reconciliation Between Webhooks and Delta Sync
- [ ] E2-T9: Add Shared-Mailbox Readiness and Operational Verification

## Notes

- Update high-level epics with `node scripts/set-epic-status.mjs <E#> <pending|done>`.
- Update detailed tickets with `node scripts/set-ticket-status.mjs <ticket-id> <pending|done>`.
- Rebuild this file with `node scripts/sync-checklist.mjs`.
- Last status update: 2026-04-01
