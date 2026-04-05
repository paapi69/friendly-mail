# Prototype Kanban Board

## Scope

This board is for the first user-meaningful Friendly Mail prototype.

Prototype target:

- backend workflow-state delivery works through Epic 5 operational verification
- Outlook add-in has a minimal workflow surface to show what Friendly Mail knows about a message

## Accuracy Notes

The board below uses:

- **Actual completed engineering work** for `E1` through `E4`
- **Planned prototype tickets** for design and frontend work that have not yet been tracked in `.planning/epic-status.json`

So:

- `Done` items in the current backend implementation are factual
- new role-split prototype tickets below are planning tickets created from the current roadmap and frontend strategy
- when an implementation ticket changes status, this document and `apps/dashboard/src/features/dashboard/dashboard.data.ts` should be updated in the same session when practical
- the dashboard preview also shows a one-line stakeholder summary for each ticket so non-engineering viewers can scan the board quickly
- tracked engineering ticket status in the preview should be derived from `.planning/epic-status.json`
- the dashboard preview shell now switches between `Master Board`, `Tom`, `Dick`, and `Harry`

## Prototype Milestone

- **Prototype checkpoint**: backend through `E5-T8` plus a thin add-in UI slice

## Swimlane: Design

### Ready

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E7-T1` | Define Outlook add-in prototype flow for mailbox connect, sync state, and message work panel | Clarifies the first Outlook add-in experience so the prototype tells a coherent product story. | `Tom` | `E7` | `3` | `S` | `design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:S`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin` |
| `E7-T2` | Create low-fidelity wireframes for message summary, task area, and filing-state explanation | Shows how users will understand what Friendly Mail knows about an email and why it suggests action. | `Tom` | `E7` | `5` | `M` | `design`, `epic:E7`, `surface:addin`, `type:design`, `priority:P0`, `size:M`, `status:ready`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Labels |
|---|---|---|---|---|---:|---|---|
| `E8-T1` | Define dashboard prototype information architecture for critical items and unresolved work | Organizes the dashboard so leaders can quickly see critical work, status, and unresolved items. | `Tom` | `E8` | `5` | `M` | `design`, `epic:E8`, `surface:dashboard`, `type:design`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

## Swimlane: Frontend

### Backlog

| Ticket | Title | Stakeholder Summary | Owner | Epic | Points | Size | Depends On | Labels |
|---|---|---|---|---|---:|---|---|---|
| `E7-T3` | Add Outlook add-in mailbox connect and sync-status entry view | Gives users a simple entry point to connect Outlook and see whether Friendly Mail is actively syncing. | `Dick` | `E7` | `5` | `M` | `E7-T1` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E7-T4` | Build add-in message work panel showing classification placeholder, tasks placeholder, and filing-state placeholder | Creates the core in-context email panel where Friendly Mail will explain work, urgency, and filing state. | `Dick` | `E7` | `8` | `L` | `E7-T2` | `frontend`, `epic:E7`, `surface:addin`, `type:feature`, `priority:P0`, `size:L`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `risk:workflow-safety` |
| `E7-T5` | Bind add-in prototype views to live mailbox-connect and sync APIs | Turns the add-in from a static demo into a live experience backed by real mailbox status and sync data. | `Dick` | `E7` | `5` | `M` | `E7-T3`, `E7-T4`, `E2-T8` | `frontend`, `epic:E7`, `surface:addin`, `type:integration`, `priority:P0`, `size:M`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin`, `integration:microsoft-graph` |
| `E8-T2` | Add companion dashboard prototype page for mailbox status and critical-work summary | Gives leaders and users a simple web view of mailbox health and the most important unresolved work. | `Dick` | `E8` | `5` | `M` | `E8-T1` | `frontend`, `epic:E8`, `surface:dashboard`, `type:feature`, `priority:P2`, `size:M`, `status:backlog`, `milestone:prototype-v1` |

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
| `E7-T6` | Expose a prototype mailbox status endpoint for the add-in UI | Gives the add-in a simple backend signal for showing mailbox health and sync readiness inside Outlook. | `Harry` | `E7` | `3` | `S` | `E2-T8` | `backend`, `epic:E7`, `surface:api`, `type:feature`, `priority:P1`, `size:S`, `status:backlog`, `milestone:prototype-v1`, `integration:outlook-addin` |

## Suggested Sprint Framing

### Sprint A

Focus:

- `E3-T1`
- `E7-T1`
- `E7-T2`

### Sprint B

Focus:

- `E3-T2`
- `E3-T3`
- `E7-T3`

### Sprint C

Focus:

- `E3-T5`
- `E3-T7`
- optional `E8-T2`

## Recommended Labels To Use First

If you want a lean label set to start with, use these first:

- `design`
- `frontend`
- `backend`
- `epic:E2`
- `epic:E7`
- `epic:E8`
- `surface:addin`
- `surface:dashboard`
- `surface:api`
- `surface:graph`
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
