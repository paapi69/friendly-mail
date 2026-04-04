# Friendly Mail Message Ingestion and Extraction Contract

## Purpose

Epic `E3-T1` defines the message-ingestion and attachment-extraction contract for Friendly Mail before Epic 3 implementation begins.

This document locks the handoff from Epic 2 mailbox sync into Epic 3 ingestion, the normalized message envelope, the supported attachment and OCR boundaries for MVP, and the separation between raw extracted content and later workflow intelligence.

## Product and Architecture Invariants

- Microsoft Graph remains the mailbox source of truth.
- Friendly Mail's internal store remains the workflow source of truth.
- Epic 2 sync is the only supported upstream for Epic 3 ingestion.
- Epic 3 produces normalized content and extraction artifacts, not classification, task, filing, or routing decisions.
- Message identity must remain immutable-ID based from Graph fetch through downstream storage.
- Raw mailbox content should be minimized, explainable, and recoverable from Graph when practical.

## Contract Summary

Friendly Mail will treat Epic 3 as a durable normalization layer that starts from the stable message metadata already synchronized in Epic 2.

The first supported ingestion path is:

1. Epic 2 identifies a synced message that is new or materially changed.
2. Epic 3 fetches the current Graph message using immutable IDs and a text-body preference.
3. Epic 3 normalizes message content into a durable internal `MessageEnvelope`.
4. Epic 3 lists and records attachment metadata for the message.
5. Epic 3 retrieves file content only for supported extraction candidates.
6. Epic 3 produces extraction artifacts that later epics can classify and reason over.

This means:

- webhook payloads and delta metadata are triggers, not the content source of truth
- classification and workflow policy do not run inside ingestion
- unsupported attachment cases are recorded explicitly rather than guessed or silently dropped

## Epic 2 to Epic 3 Handoff Contract

Epic 3 depends on the Epic 2 mailbox baseline providing:

- internal mailbox identity
- immutable Graph message ID
- Graph change key
- parent folder identity
- basic message metadata already synchronized in Epic 2
- a durable signal that the message was created or updated

Epic 3 must not require Epic 2 to fetch or persist:

- full message bodies
- attachment binaries
- extraction text
- OCR output
- classification labels
- task state

The handoff boundary is therefore:

- Epic 2 answers: "which mailbox message changed?"
- Epic 3 answers: "what normalized content and attachment artifacts represent the current mailbox message state?"

## Graph Retrieval Contract

Epic 3 message retrieval must use:

- `Prefer: IdType="ImmutableId"` on all supported message and attachment requests
- `Prefer: outlook.body-content-type="text"` for message-body retrieval
- `GET /messages/{id}` for the current message resource
- `?$select=` to fetch only the fields needed for normalization where practical

Friendly Mail may use `GET /messages/{id}/$value` later for narrow diagnostic or forward-compatibility cases, but MIME retrieval is not part of the default MVP ingestion path.

Rationale:

- Graph `message` resources already expose `body`, `bodyPreview`, recipients, folder identity, and message headers
- `uniqueBody` is available only when explicitly selected, so it must be treated as optional enrichment
- MIME fetch is heavier and should not become the default storage shape for MVP

## Normalized Message Envelope Contract

Epic 3's primary output is a normalized internal `MessageEnvelope` that later tickets can persist and process.

The envelope must include:

- `mailboxId`
- `messageId`
  - Friendly Mail internal message record ID
- `graphMessageId`
  - immutable Graph message ID
- `graphChangeKey`
- `internetMessageId`
  - when Graph returns it
- `conversationId`
- `parentFolderId`
- `subject`
- `from`
- `sender`
- `replyTo`
- `toRecipients`
- `ccRecipients`
- `bccRecipients`
- `receivedDateTime`
- `sentDateTime`
- `lastModifiedDateTime`
- `isRead`
- `isDraft`
- `categories`
- `importance`
- `inferenceClassification`
- `bodyPreview`
- `bodyContentType`
  - normalized as `text`
- `bodyText`
  - normalized plain-text message body
- `uniqueBodyText`
  - optional, only when requested and returned
- `hasAttachments`
- `webLink`
- `ingestionVersionKey`
  - derived from mailbox, immutable message ID, and current change key

The envelope must not include:

- classification labels
- task candidates
- due dates
- filing recommendations
- automation decisions

Those belong to later epics.

## Body Normalization Contract

For MVP, Friendly Mail normalizes message bodies into plain text first.

Required rules:

- fetch body content with `Prefer: outlook.body-content-type="text"` where supported
- preserve `bodyPreview` separately because it is useful for lightweight UI and diagnostics
- treat `uniqueBody` as optional and do not make downstream processing depend on it
- normalize empty, whitespace-only, or boilerplate-only bodies as explicit low-content cases
- keep reply chains inside `bodyText` for MVP rather than attempting lossy thread segmentation

Storage boundary:

- Friendly Mail should persist normalized text needed for later extraction and classification
- Friendly Mail should not persist full MIME by default
- Friendly Mail should not make raw HTML the primary stored representation for MVP

## Attachment Inventory Contract

Epic 3 must record attachment metadata independently from text extraction.

For every listed attachment, Friendly Mail must capture:

- `attachmentId`
  - immutable Graph attachment ID where supported
- `messageId`
- `name`
- `contentType`
- `size`
- `isInline`
- `attachmentKind`
  - `file`, `item`, or `reference`
- `lastModifiedDateTime`
  - when Graph returns it
- `isExtractionCandidate`
- `extractionDecisionReason`

Friendly Mail must treat the three Graph attachment families distinctly:

- `fileAttachment`
  - supported for metadata capture in MVP and eligible for extraction when the file type is supported
- `itemAttachment`
  - metadata-only in MVP; recursive expansion is explicitly deferred
- `referenceAttachment`
  - metadata-only in MVP; external linked-file retrieval is explicitly deferred

## MVP Extraction Boundary

Epic 3 MVP supports text extraction from:

- `fileAttachment` attachments with a PDF content type

Epic 3 MVP does not yet support full text extraction from:

- Word documents
- Excel files
- PowerPoint files
- image-only attachments
- `itemAttachment` payloads
- `referenceAttachment` linked files
- archive or container formats such as ZIP

For unsupported cases, the system must:

- persist metadata
- record that extraction was skipped or unsupported
- avoid pretending the attachment was parsed successfully

## OCR Contract

OCR is a fallback path, not the default extraction mode.

For MVP:

- PDF text extraction runs first
- OCR is attempted only when PDF extraction returns no meaningful text or clearly insufficient text
- OCR is enabled only when an OCR provider is configured
- OCR output must be stored separately from primary extracted text
- OCR output must carry an explicit confidence or quality signal

OCR must not:

- silently overwrite non-empty extracted text
- be required for the baseline Epic 3 slice to succeed
- expand the supported-format list beyond PDF in E3-T1

## Idempotency and Reprocessing Contract

Epic 3 processing must be repeat-safe.

The baseline idempotency key is:

- `mailboxId + graphMessageId + graphChangeKey`

Implications:

- repeated webhook notifications for the same message version must not create duplicate message-ingestion artifacts
- attachment metadata refresh may run again safely for the same version
- extraction work can be skipped when the same supported attachment version was already completed
- a changed Graph `changeKey` is treated as a new message version that may require re-ingestion

Reprocessing is allowed when:

- the message change key changes
- attachment inventory changes materially
- extraction logic versioning later requires replay

## Extraction Artifact Contract

Epic 3 outputs extraction artifacts that later epics can consume without re-fetching mailbox content by default.

Artifacts may include:

- normalized message body text
- extracted attachment text
- OCR text
- extraction status
- extraction confidence or quality markers
- artifact provenance
  - which message version and attachment version produced the artifact

Artifacts must not include:

- final business classification
- task ownership
- filing eligibility
- urgency score

## Security and Minimization Contract

Epic 3 handles potentially sensitive mailbox content, so the contract is intentionally conservative.

Required boundaries:

- retrieve full attachment bytes only for supported extraction candidates
- avoid storing raw binary attachment content in the primary relational model
- prefer storing normalized text and small metadata over raw MIME payloads
- keep provenance so extracted text can be traced back to the mailbox message and attachment that produced it
- make unsupported or failed extraction explicit so operators can reason about gaps

## Failure and Degraded-Mode Contract

Epic 3 must distinguish between:

- `not_attempted`
- `pending`
- `completed`
- `completed_with_ocr`
- `unsupported`
- `failed`

Examples:

- a message with no attachments is not a failure
- a message with only `referenceAttachment` content is unsupported for extraction, not failed
- a PDF fetch timeout is failed and retryable
- an OCR provider not being configured leaves OCR unavailable without blocking base PDF extraction

## Explicitly Deferred Beyond E3-T1

The following are intentionally out of scope for this ticket:

- persistence schema details
- queue orchestration details
- recursive item-attachment expansion
- linked-file downloads for `referenceAttachment`
- extraction from Office formats beyond PDF
- image-only OCR as a first-class attachment mode
- classification, summarization, task creation, or filing logic
- user-facing policy decisions about what an email means

## Implementation Consequences for Later Tickets

- `E3-T2` should persist the normalized envelope, attachment inventory, extraction statuses, and artifact references defined here.
- `E3-T3` should implement message fetch and normalization using this envelope contract.
- `E3-T4` should implement metadata retrieval for all attachment kinds while limiting binary fetch to supported candidates.
- `E3-T5` should implement PDF-first extraction only.
- `E3-T6` should layer optional OCR onto the PDF path without widening the MVP format list.
- `E3-T7` should orchestrate this flow with idempotency based on immutable message identity and change key.
- `E3-T8` should report unsupported, failed, retried, and completed extraction states explicitly.

## References

The contract above is grounded in the following Microsoft documentation reviewed on 2026-04-04:

- Microsoft Graph `message` resource: <https://learn.microsoft.com/en-us/graph/api/resources/message?view=graph-rest-1.0>
- Microsoft Graph `get message`: <https://learn.microsoft.com/en-us/graph/api/message-get?view=graph-rest-1.0>
- Microsoft Graph `attachment` resource: <https://learn.microsoft.com/en-us/graph/api/resources/attachment?view=graph-rest-1.0>
- Microsoft Graph `fileAttachment` resource: <https://learn.microsoft.com/en-us/graph/api/resources/fileattachment?view=graph-rest-1.0>
- Microsoft Graph `get attachment`: <https://learn.microsoft.com/en-us/graph/api/attachment-get?view=graph-rest-1.0>
- Microsoft Graph immutable Outlook IDs: <https://learn.microsoft.com/en-us/graph/outlook-immutable-id>
