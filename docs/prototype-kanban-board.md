# Prototype Kanban Board

## Scope

This board is for the first user-meaningful Friendly Mail prototype.

Prototype target:

- backend delivery works through Epic 6 mailbox-action verification
- Outlook add-in moves from a minimal shell to the first live workflow surface inside Outlook

## Accuracy Notes

The board below uses:

- **Actual completed engineering work** for `E1` through `E6`
- **Planned Epic 7 and Epic 8 surface tickets** derived from the current roadmap, frontend strategy, and implementation baseline

So:

- `Done` items in the current implementation are factual
- new add-in and dashboard tickets below are planning tickets created from the current roadmap and frontend strategy
- when an implementation ticket changes status, this document and `apps/dashboard/src/features/dashboard/dashboard.data.ts` should be updated in the same session when practical
- the dashboard preview also shows a one-line stakeholder summary for each ticket so non-engineering viewers can scan the board quickly
- tracked engineering ticket status in the preview should be derived from `.planning/epic-status.json`
- the dashboard preview shell now switches between `Master Board`, `Tom`, `Dick`, and `Harry`

## Prototype Milestone

- **Prototype checkpoint**: backend through `E6-T8` plus the first live Outlook add-in workflow slice

## Swimlane: Design

### Done

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E7-T1` | Define the Outlook add-in surface contract and interaction flow | Clarifies the first real Outlook add-in experience, including supported clients, pinned task-pane behavior, and trust-first fallback rules for the workflow surface. | `Tom` | `E7` | `3` | `S` | `design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `E11-T1` | Define the Microsoft tenant setup contract and operator guide | Turns the Microsoft-side setup into a clear operator checklist so tenant registration stops depending on ad hoc engineering memory. | `Tom` | `E11` | `3` | `S` | `design`, `epic:E11`, `surface:ops`, `type:design`, `priority:P1`, `size:S`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E8-T1` | Define the mobile-first dashboard triage information architecture | Locks the mailbox-level dashboard structure so high-volume users can understand the day without opening every message. | `Tom` | `E8` | `5` | `M` | `design`, `epic:E8`, `surface:dashboard`, `type:design`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `risk:workflow-safety` |

## Swimlane: Frontend

### Done

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E7-T2` | Extend the add-in shell, manifest, and host integration baseline | Turns the current shell into a compliant Outlook add-in baseline with manifest, command-surface, pinned-host behavior, and a live preview lane ready for the first slice. | `Dick` | `E7` | `5` | `M` | `E7-T1` | `frontend`, `epic:E7`, `surface:addin`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E7-T3` | Implement mailbox connect and sync-status entry view | Gives users a trustworthy first screen inside Outlook that shows connection state, sync health, and connect or retry paths clearly. | `Dick` | `E7` | `5` | `M` | `E7-T1`, `E7-T2` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E7-T4` | Implement the message workflow summary and explanation panel | Creates the core in-context Outlook panel for classification, urgency, explanation, blockers, and filing-state context. | `Dick` | `E7` | `8` | `L` | `E7-T1`, `E7-T2`, `E7-T3` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `E7-T5` | Implement the task action panel and lifecycle mutations | Lets users complete, snooze, delegate, dismiss, and reopen work from inside Outlook without losing workflow integrity. | `Dick` | `E7` | `8` | `L` | `E7-T4`, `E5-T7` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `E7-T6` | Implement filing decision, folder suggestion, and approval UX | Exposes delayed-filing decisions and mailbox-action approval in a suggestion-first Outlook workflow. | `Dick` | `E7` | `8` | `L` | `E7-T4`, `E6-T8` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E7-T7` | Implement compose and draft numbering experience | Brings the outgoing numbering workflow into Outlook compose and draft flows for supported MVP cases. | `Dick` | `E7` | `5` | `M` | `E7-T2`, `E6-T7` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E8-T3` | Implement the mobile-first Today queue and priority buckets | Creates the mailbox-wide dashboard home for Needs Attention work, urgent tasks, and due-soon review. | `Dick` | `E8` | `8` | `L` | `E8-T1`, `E8-T2` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P1`, `size:L`, `status:backlog`, `milestone:prototype-v1` |
| `E8-T4` | Implement FYI and CC batch-review surfaces | Gives users a calmer place to review low-noise mail without mixing it into the main action queue. | `Dick` | `E8` | `5` | `M` | `E8-T1`, `E8-T2`, `E8-T3` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |
| `E8-T5` | Implement junk-candidate review and safe handling controls | Separates low-value mail from real work while keeping junk treatment reversible and trust-first. | `Dick` | `E8` | `5` | `M` | `E8-T1`, `E8-T2`, `E8-T3` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E8-T6` | Implement the ready-to-file queue and post-action filing overview | Shows which messages are now safe to move without forcing users back into Outlook message-by-message. | `Dick` | `E8` | `5` | `M` | `E8-T2`, `E8-T3`, `E6-T8` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E8-T7` | Implement dashboard filters, search, and mobile drill-down flows | Makes the dashboard usable at real mailbox volume on mobile-sized screens and larger layouts. | `Dick` | `E8` | `5` | `M` | `E8-T3`, `E8-T4`, `E8-T6` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Backend

### Done

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E2-T1` | Define Microsoft Entra and Graph Connectivity Contract | Locked how Friendly Mail connects to Outlook safely so later mailbox work builds on a stable access model. | `Harry` | `E2` | `2` | `XS` | `backend`, `epic:E2`, `surface:graph`, `type:spec`, `priority:P0`, `size:XS`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T2` | Extend Persistence for Mailbox Connectivity and Sync State | Stores mailbox connection and sync progress so Friendly Mail can track real setup and syncing over time. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T3` | Implement the Core Microsoft Graph Connector | Built the shared Outlook data connector that all mailbox reading and syncing now depends on. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T4` | Build Delegated Mailbox Onboarding | Lets a user connect their Outlook mailbox so Friendly Mail can start working with real email. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:security` |
| `E2-T5` | Implement Folder Discovery and Initial Folder Sync | Gives Friendly Mail a reliable picture of a mailbox folder structure before deeper email processing begins. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E2-T6` | Implement Message Metadata Sync with Delta Links | Keeps mailbox message records up to date efficiently so Friendly Mail can react to changes without rereading everything. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:api`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:workflow-safety` |
| `E2-T7` | Implement Graph Subscription and Webhook Lifecycle | Allows Friendly Mail to hear about mailbox changes quickly instead of waiting for slow periodic refreshes. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:graph`, `type:integration`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:security` |
| `E2-T8` | Implement Reconciliation Between Webhooks and Delta Sync | Makes mailbox updates durable so Friendly Mail stays accurate even when real-time notifications are missed. | `Harry` | `E2` | `8` | `L` | `backend`, `epic:E2`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `integration:webhooks`, `risk:workflow-safety` |
| `E2-T9` | Add Shared-Mailbox Readiness and Operational Verification | Shows whether mailbox connectivity is healthy and makes shared-mailbox limitations explicit before rollout. | `Harry` | `E2` | `5` | `M` | `backend`, `epic:E2`, `surface:graph`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E3-T1` | Define Message Ingestion and Extraction Contract | Defined what email and attachment content Friendly Mail will capture before it starts classifying or automating work. | `Harry` | `E3` | `3` | `S` | `backend`, `epic:E3`, `surface:workflow`, `type:spec`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1` |
| `E3-T2` | Extend Persistence for Message Bodies, Attachments, and Extraction State | Stores email body and attachment information so later features can understand what work the message contains. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E3-T3` | Implement the message ingestion service | Turns synced mailbox records into normalized email content that the rest of Friendly Mail can reason about. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E3-T4` | Implement attachment metadata retrieval and durable linking | Gives Friendly Mail a dependable inventory of attachments so important supporting documents are not overlooked. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:api`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E3-T5` | Implement PDF-first attachment text extraction | Lets Friendly Mail read the contents of PDF attachments, where many notices, invoices, and contracts actually live. | `Harry` | `E3` | `8` | `L` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1` |
| `E3-T6` | Add OCR fallback and extraction confidence handling | Improves coverage for scanned documents while still showing when Friendly Mail is less certain about what it read. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:workflow`, `type:feature`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E3-T7` | Orchestrate idempotent ingestion and attachment processing | Prevents duplicate processing so repeated mailbox updates do not create noisy or inconsistent downstream results. | `Harry` | `E3` | `8` | `L` | `backend`, `epic:E3`, `surface:workflow`, `type:integration`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1` |
| `E3-T8` | Add operational verification for ingestion and extraction | Shows whether content ingestion and document reading are healthy so the team can spot reliability gaps early. | `Harry` | `E3` | `5` | `M` | `backend`, `epic:E3`, `surface:workflow`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E4-T1` | Define the classification and workflow intelligence contract | Locks the classification output shape so later task and filing work can build on explainable workflow signals instead of ad hoc inference. | `Harry` | `E4` | `3` | `S` | `backend`, `epic:E4`, `surface:workflow`, `type:spec`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1` |
| `E4-T2` | Extend persistence for classification results and workflow signals | Stores classification output, confidence, and extracted workflow cues so later features can trust a durable intelligence layer. | `Harry` | `E4` | `5` | `M` | `E4-T1` | `backend`, `epic:E4`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E4-T3` | Implement the classification orchestration service | Creates the repeat-safe pipeline that packages message and attachment content into one classification path. | `Harry` | `E4` | `5` | `M` | `E4-T1`, `E4-T2` | `backend`, `epic:E4`, `surface:workflow`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E4-T4` | Implement actionability and message-type classification | Lets Friendly Mail tell whether an email needs action and what kind of work it represents before task state exists. | `Harry` | `E4` | `8` | `L` | `E4-T3` | `backend`, `epic:E4`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1` |
| `E4-T5` | Implement due date, entity, and task-candidate extraction | Pulls out the dates, parties, and suggested actions that later become real workflow records. | `Harry` | `E4` | `8` | `L` | `E4-T3`, `E4-T4` | `backend`, `epic:E4`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1` |
| `E4-T6` | Implement urgency and criticality signal scoring | Adds a trust-first way to surface important notices and near-due work before automations act on them. | `Harry` | `E4` | `5` | `M` | `E4-T4`, `E4-T5` | `backend`, `epic:E4`, `surface:workflow`, `type:feature`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E4-T7` | Add confidence and explanation read models for downstream surfaces | Makes the intelligence layer explainable enough for the add-in and dashboard to show why Friendly Mail reached a conclusion. | `Harry` | `E4` | `5` | `M` | `E4-T4`, `E4-T5`, `E4-T6` | `backend`, `epic:E4`, `surface:workflow`, `type:integration`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E4-T8` | Add operational verification for classification quality and readiness | Shows whether classification coverage and confidence are strong enough to safely feed later workflow features. | `Harry` | `E4` | `5` | `M` | `E4-T4`, `E4-T5`, `E4-T6`, `E4-T7` | `backend`, `epic:E4`, `surface:workflow`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:operational-readiness` |
| `E5-T1` | Define the task and workflow state contract | Locks the task and workflow-state shape so delayed filing and user surfaces build on one stable state engine. | `Harry` | `E5` | `3` | `S` | `E4-T8` | `backend`, `epic:E5`, `surface:workflow`, `type:spec`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1` |
| `E5-T2` | Extend persistence for tasks, source links, and message workflow state | Stores first-class tasks and message workflow state so Friendly Mail can track work independently from folder location. | `Harry` | `E5` | `5` | `M` | `E5-T1` | `backend`, `epic:E5`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E5-T3` | Implement task materialization from classification output | Turns Epic 4 task candidates into durable tasks so actionable email becomes real tracked work. | `Harry` | `E5` | `5` | `M` | `E5-T1`, `E5-T2` | `backend`, `epic:E5`, `surface:workflow`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E5-T4` | Implement task lifecycle transitions and resolution semantics | Defines how work moves through snooze, delegation, completion, and dismissal without losing accountability. | `Harry` | `E5` | `8` | `L` | `E5-T3` | `backend`, `epic:E5`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E5-T5` | Implement message workflow state projection and filing blockers | Keeps email visibility tied to work state and read state instead of folder moves or hidden assumptions. | `Harry` | `E5` | `8` | `L` | `E5-T3`, `E5-T4` | `backend`, `epic:E5`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E5-T6` | Implement task ownership, delegation, and criticality persistence | Makes responsibility and urgency durable so critical work stays attributable across personal and shared-mailbox flows. | `Harry` | `E5` | `5` | `M` | `E5-T4`, `E5-T5` | `backend`, `epic:E5`, `surface:workflow`, `type:feature`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E5-T7` | Add workflow read models and internal APIs for downstream surfaces | Gives the add-in, dashboard, and later filing flows one stable backend shape for task and workflow state. | `Harry` | `E5` | `5` | `M` | `E5-T5`, `E5-T6` | `backend`, `epic:E5`, `surface:api`, `type:integration`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E5-T8` | Add operational verification for task and workflow readiness | Shows whether task creation, lifecycle integrity, and workflow blockers are reliable before delayed filing depends on them. | `Harry` | `E5` | `5` | `M` | `E5-T3`, `E5-T4`, `E5-T5`, `E5-T6`, `E5-T7` | `backend`, `epic:E5`, `surface:workflow`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:operational-readiness` |
| `E6-T1` | Define the delayed filing and mailbox action contract | Locks how Friendly Mail turns workflow eligibility into safe mailbox actions without blurring mailbox state and workflow state. | `Harry` | `E6` | `3` | `S` | `E5-T8` | `backend`, `epic:E6`, `surface:workflow`, `type:spec`, `priority:P0`, `size:S`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E6-T2` | Extend persistence for filing decisions, target folders, and mailbox action audit | Stores delayed-filing decisions and mailbox-action history so every future move or route remains auditable. | `Harry` | `E6` | `5` | `M` | `E6-T1` | `backend`, `epic:E6`, `surface:api`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E6-T3` | Implement filing decision orchestration from workflow state | Turns explicit filing blockers into one repeat-safe decision the mailbox-action layer can trust. | `Harry` | `E6` | `5` | `M` | `E6-T1`, `E6-T2` | `backend`, `epic:E6`, `surface:workflow`, `type:integration`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E6-T4` | Implement informational filing execution for read or reviewed messages | Applies delayed filing to low-risk informational mail only after the message is safe to move. | `Harry` | `E6` | `5` | `M` | `E6-T3` | `backend`, `epic:E6`, `surface:workflow`, `type:feature`, `priority:P0`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E6-T5` | Implement actionable filing execution for resolved workflow state | Moves actionable mail only after real work is resolved, keeping delayed filing trustworthy. | `Harry` | `E6` | `8` | `L` | `E6-T3` | `backend`, `epic:E6`, `surface:workflow`, `type:feature`, `priority:P0`, `size:L`, `status:done`, `milestone:prototype-v1`, `risk:workflow-safety` |
| `E6-T6` | Implement folder suggestion and category application flow | Gives users understandable filing destinations and low-risk mailbox actions before full automation. | `Harry` | `E6` | `5` | `M` | `E6-T3` | `backend`, `epic:E6`, `surface:api`, `type:integration`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1` |
| `E6-T7` | Implement invoice routing and outgoing numbering mailbox actions | Covers the MVP's highest-value specialized mailbox actions for finance and outbound workflows. | `Harry` | `E6` | `8` | `L` | `E6-T6` | `backend`, `epic:E6`, `surface:api`, `type:feature`, `priority:P1`, `size:L`, `status:done`, `milestone:prototype-v1`, `integration:microsoft-graph` |
| `E6-T8` | Add operational verification for delayed filing and mailbox action readiness | Shows whether filing decisions and mailbox actions are safe enough to trust before they touch live mail. | `Harry` | `E6` | `5` | `M` | `E6-T3`, `E6-T4`, `E6-T5`, `E6-T6`, `E6-T7` | `backend`, `epic:E6`, `surface:workflow`, `type:verification`, `priority:P1`, `size:M`, `status:done`, `milestone:prototype-v1`, `risk:operational-readiness` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E7-T8` | Add Outlook add-in verification and rollout readiness | Proves the add-in is safe enough for pilot-facing use by covering host states, workflow actions, and failure handling. | `Harry` | `E7` | `5` | `M` | `E7-T3`, `E7-T4`, `E7-T5`, `E7-T6`, `E7-T7` | `backend`, `epic:E7`, `surface:addin`, `type:verification`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:operational-readiness` |
| `E8-T2` | Add mailbox-wide dashboard aggregation APIs and bucket read models | Gives the dashboard one stable backend contract for Today queue counts, bucket summaries, and mailbox-wide workflow signals. | `Harry` | `E8` | `5` | `M` | `E5-T7`, `E6-T8`, `E8-T1` | `backend`, `epic:E8`, `surface:dashboard`, `type:integration`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1` |
| `E8-T8` | Add dashboard verification and rollout readiness | Proves the mobile-first dashboard is trustworthy for mailbox-level triage before pilot-facing use expands. | `Harry` | `E8` | `5` | `M` | `E8-T2`, `E8-T3`, `E8-T4`, `E8-T5`, `E8-T6`, `E8-T7` | `backend`, `epic:E8`, `surface:dashboard`, `type:verification`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `risk:operational-readiness` |
| `E11-T2` | Register the Microsoft Entra app and baseline redirect URIs | Captures the real tenant, app, and callback values so local and pilot onboarding stop depending on placeholders. | `Harry` | `E11` | `3` | `S` | `E11-T1` | `backend`, `epic:E11`, `surface:ops`, `type:integration`, `priority:P1`, `size:S`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E11-T3` | Configure delegated Graph permissions and consent strategy | Makes the required Graph scopes and consent path explicit before real-tenant testing broadens. | `Harry` | `E11` | `3` | `S` | `E11-T1`, `E11-T2` | `backend`, `epic:E11`, `surface:ops`, `type:spec`, `priority:P1`, `size:S`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E11-T4` | Provision secrets and environment configuration for local and staging | Turns the Microsoft registration values into working local and staging environment configuration. | `Harry` | `E11` | `5` | `M` | `E11-T2`, `E11-T3` | `backend`, `epic:E11`, `surface:ops`, `type:feature`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E11-T5` | Expose a public webhook endpoint and validate Graph callback reachability | Solves the public HTTPS callback requirement so subscriptions and webhooks can be verified end to end. | `Harry` | `E11` | `5` | `M` | `E11-T4` | `backend`, `epic:E11`, `surface:ops`, `type:integration`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |
| `E11-T6` | Run end-to-end tenant setup verification and operator handoff | Produces the final setup proof and handoff so the tenant path no longer depends on informal knowledge. | `Harry` | `E11` | `5` | `M` | `E11-T4`, `E11-T5` | `backend`, `epic:E11`, `surface:ops`, `type:verification`, `priority:P1`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:microsoft-graph`, `risk:operational-readiness` |

## Suggested Sprint Framing

### Sprint A

Focus:

- `E7-T1`
- `E7-T2`
- `E7-T3`

### Sprint B

Focus:

- `E7-T6`

### Sprint C

Focus:

- `E7-T7`
- `E7-T8`

## Recommended Labels To Use First

If you want a lean label set to start with, use these first:

- `design`
- `frontend`
- `backend`
- `epic:E2`
- `epic:E7`
- `epic:E8`
- `epic:E11`
- `surface:addin`
- `surface:dashboard`
- `surface:api`
- `surface:graph`
- `surface:ops`
- `type:feature`
- `type:design`
- `type:integration`
- `priority:P0`
- `priority:P1`
- `priority:P2`
- `size:S`
- `size:M`
- `size:L`
- `size:XL`
- `status:backlog`
- `status:ready`
- `status:in-progress`
- `status:blocked`
- `status:done`
- `milestone:prototype-v1`

## Why These Labels and Summaries

- `design`, `frontend`, and `backend` keep ownership obvious
- `epic:*` keeps roadmap traceability
- `surface:*` tells the team where the change lands
- `type:*` separates feature work from design and integration work
- `priority:*` helps PM ordering
- `size:*` keeps work comparable
- `status:*` mirrors the board state
- `milestone:*` makes prototype filtering easy
- stakeholder summaries make the same board easier for product and leadership to scan
