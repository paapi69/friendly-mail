# Mailbox Analytics Reference

## Purpose

This document captures low-implementation-bandwidth analytics that Friendly Mail can derive from the current database without adding a separate analytics stack or new product event instrumentation.

These metrics are intended as an internal product and engineering reference. They focus on simple counts, grouped statuses, and timestamp-based trends that can be queried directly from existing tables.

Friendly Mail product framing still applies:

- Outlook and Microsoft Graph remain the mailbox source of truth
- Friendly Mail's internal workflow store remains the workflow source of truth
- operational health and extraction reliability matter more than vanity metrics

## Recommended Rollout Order

1. Connection and subscription health
2. Folder sync health
3. Message ingestion volume
4. Attachment extraction funnel
5. Extraction failure reasons
6. Task open, overdue, and resolved counts

## Mailbox Connectivity Health

### Mailboxes Connected vs Unhealthy

What it measures:

- how many connected mailboxes are currently usable
- how many mailboxes are degraded, failed, disconnected, or waiting for consent

Why it is useful:

- gives a fast operational snapshot of whether mailbox onboarding and continuity are healthy
- highlights product readiness better than raw mailbox count alone

Data source:

- `MailboxConnection.status`
- table: `MailboxConnection`

Why it is low bandwidth:

- requires only grouped counts by an existing status enum
- does not need joins beyond simple mailbox-level reporting

## Sync and Subscription Health

### Folder Sync Health

What it measures:

- how many tracked folders are `PENDING`, `ACTIVE`, `IDLE`, or `FAILED`
- how many folders are stale based on `lastSyncedAt`

Why it is useful:

- shows whether mailbox sync is healthy across tracked folders
- helps distinguish "mailbox connected" from "mailbox actually staying current"

Data source:

- `FolderSyncState.syncStatus`
- `FolderSyncState.lastSyncedAt`
- table: `FolderSyncState`

Why it is low bandwidth:

- grouped counts by status are straightforward
- stale-sync checks only need a timestamp cutoff

### Subscription Health

What it measures:

- how many Graph subscriptions are `PENDING`, `ACTIVE`, `EXPIRED`, `REMOVED`, `REAUTH_REQUIRED`, or `FAILED`
- how many subscriptions are expiring soon, such as in the next 24 or 72 hours

Why it is useful:

- surfaces webhook continuity risk before sync silently degrades
- gives early warning for subscription renewal issues

Data source:

- `GraphSubscription.status`
- `GraphSubscription.expiresAt`
- table: `GraphSubscription`

Why it is low bandwidth:

- needs only grouped counts and simple date-window filters

## Message Ingestion Volume

### Message Creation Volume

What it measures:

- tracked messages created per day

Why it is useful:

- shows mailbox activity reaching Friendly Mail's persistent store
- provides a baseline denominator for downstream ingestion and extraction funnel metrics

Data source:

- `Message.createdAt`
- table: `Message`

Why it is low bandwidth:

- simple daily buckets from an existing timestamp

### Message Ingestion Volume

What it measures:

- messages ingested per day
- messages present in storage but not yet ingested

Why it is useful:

- makes it easy to spot a gap between message sync and full content ingestion
- helps identify backlog in the Epic 3 ingestion pipeline

Data source:

- `Message.ingestedAt`
- `Message.ingestionVersionKey`
- table: `Message`

Why it is low bandwidth:

- only requires counts on nullable ingestion fields and daily grouping by timestamp

## Attachment and Extraction Funnel

### Attachment Discovery Funnel

What it measures:

- how many messages have attachments
- total attachments discovered
- how many attachments are extraction candidates
- how many attachments end in each extraction outcome

Why it is useful:

- gives a direct view into how much useful document work exists in mail
- shows whether attachment processing is converting discovered files into usable text

Data source:

- `Message.hasAttachments`
- table: `Message`
- `MessageAttachment.isExtractionCandidate`
- `MessageAttachment.extractionStatus`
- table: `MessageAttachment`

Why it is low bandwidth:

- can be built from counts and grouped statuses on existing records
- does not require document reprocessing or new tracking tables

Suggested funnel cuts:

- messages with attachments
- total attachments discovered
- extraction candidates
- `COMPLETED`
- `COMPLETED_WITH_OCR`
- `FAILED`
- `UNSUPPORTED`

## Extraction Quality and Failure Reasons

### Extraction Failure Reasons

What it measures:

- top extraction failure codes and their frequency

Why it is useful:

- makes PDF and OCR pipeline issues visible quickly
- helps prioritize fixes by actual failure volume instead of anecdotes

Data source:

- `MessageAttachment.lastExtractionErrorCode`
- table: `MessageAttachment`

Why it is low bandwidth:

- grouped counts on a single nullable field

### Extracted Text Yield

What it measures:

- average extracted text length
- median extracted text length
- count of very low-yield artifacts

Why it is useful:

- acts as a rough quality signal for extraction usefulness
- helps identify when the pipeline technically succeeded but produced little usable content

Data source:

- `ExtractionArtifact.textLength`
- `ExtractionArtifact.artifactKind`
- table: `ExtractionArtifact`

Why it is low bandwidth:

- uses a numeric field already persisted for artifacts
- can start with simple averages and thresholds before adding richer quality scoring

Suggested low-yield framing:

- count artifacts with `textLength` below a small threshold such as 50 or 100 characters

## Task Backlog and Throughput

### Open Work Volume

What it measures:

- tasks grouped by `OPEN`, `SNOOZED`, `DELEGATED`, `DONE`, and `DISMISSED`
- overdue unresolved tasks based on `dueAt`

Why it is useful:

- turns workflow state into a concrete backlog view
- gives a stronger signal of operational load than message count alone

Data source:

- `Task.status`
- `Task.dueAt`
- table: `Task`

Why it is low bandwidth:

- uses existing task lifecycle fields
- overdue logic is just a date comparison plus unresolved statuses

Suggested unresolved set:

- treat `OPEN`, `SNOOZED`, and `DELEGATED` as unresolved for overdue counts

### Task Throughput

What it measures:

- tasks created per day
- tasks resolved per day

Why it is useful:

- shows whether Friendly Mail is only generating work or also helping move work to closure
- creates a simple throughput trend before more advanced workflow analytics exist

Data source:

- `Task.createdAt`
- `Task.resolvedAt`
- table: `Task`

Why it is low bandwidth:

- daily buckets off existing timestamps

## Lightweight Attention Signals

### Read vs Unread Tracked Messages

What it measures:

- count of tracked messages that are read vs unread

Why it is useful:

- provides a simple proxy for attention backlog
- useful before full classification and filing analytics are mature

Data source:

- `Message.isRead`
- table: `Message`

Why it is low bandwidth:

- direct count split on a boolean field

## Not Yet Worth Tracking

### Filing Analytics from `Message.filingState`

Why not yet:

- filing logic is not mature enough yet to trust the metric as a stable product signal
- this risks producing noise before delayed filing behavior is fully implemented

### Actionability or Urgency Analytics

Why not yet:

- these become useful only after classification and priority logic are in place and stable
- reporting on immature model outputs too early can create false confidence

### User-Behavior Analytics Without Explicit Event Instrumentation

Why not yet:

- the current database is centered on mailbox, workflow, and processing state
- it does not yet provide a strong product-analytics event stream for interaction behavior

## Lightweight Future Metrics Endpoint

If Friendly Mail exposes a simple backend metrics endpoint later, it should start narrow and read from the existing operational tables rather than introducing a larger analytics architecture.

Recommended payload shape at a high level:

- snapshot counts
- 7-day daily buckets
- top extraction failure reasons

Suggested first contents:

- mailbox connection status counts
- folder sync status counts plus stale folder count
- subscription status counts plus expiring-soon count
- daily message creation and ingestion counts for the last 7 days
- attachment extraction funnel counts
- top `lastExtractionErrorCode` values
- task counts by status plus overdue count

## Notes

- This document is an internal planning and reference artifact, not a user-facing analytics specification.
- The metrics above intentionally avoid inventing new schema fields or requiring a separate analytics warehouse.
- The goal is to start with reliable operational and workflow signals that match Friendly Mail's current system shape.
