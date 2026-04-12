# Friendly Mail Classification and Workflow Intelligence Contract

## Purpose

Epic `E4-T1` defines the classification and workflow-intelligence contract for Friendly Mail before Epic 4 implementation begins.

This document locks the structured output shape for classification, extracted workflow signals, explanation, confidence, and provenance so later epics can build task state, filing logic, and user-facing explanation without redefining what Epic 4 produces.

## Product and Architecture Invariants

- Microsoft Graph remains the mailbox source of truth.
- Friendly Mail's internal store remains the workflow source of truth.
- Epic 3 remains the only supported upstream for Epic 4 classification inputs.
- Epic 4 produces workflow intelligence signals, not first-class task state, filing eligibility, or mailbox actions.
- Mailbox state, classification output, and workflow state must stay explicitly separate.
- Explanation and confidence are required product behavior, not optional embellishments.

## Contract Summary

Friendly Mail will treat Epic 4 as the first reasoning layer that sits on top of the normalized message and extraction artifacts produced in Epic 3.

The first supported classification path is:

1. Epic 3 provides a normalized message body plus any available extracted attachment text for a specific message version.
2. Epic 4 packages that content into one repeat-safe classification input.
3. Epic 4 classifies the message as actionable or informational and assigns a message type.
4. Epic 4 extracts workflow signals such as due dates, entities, task candidates, urgency, and criticality.
5. Epic 4 stores explanation, confidence, and provenance alongside those outputs.
6. Later epics consume the stored output to create tasks, determine filing eligibility, and power user-facing views.

This means:

- Epic 4 answers: "What workflow signals does this message likely contain, and why?"
- Epic 5 answers: "Which first-class task or workflow records should exist because of those signals?"
- Epic 6 answers: "When is the message safe to file or mutate in the mailbox?"

## Epic 3 to Epic 4 Handoff Contract

Epic 4 depends on the Epic 3 ingestion baseline providing:

- internal mailbox identity
- internal message identity
- immutable Graph message identity
- ingestion version key
- normalized body text
- optional unique-body text
- attachment inventory
- extracted attachment text and OCR artifacts where available
- explicit unsupported, failed, and degraded extraction states

Epic 4 must not require Epic 3 to decide:

- whether a task should actually be created
- who owns work
- whether filing is allowed
- whether mailbox actions should be auto-applied

The handoff boundary is therefore:

- Epic 3 answers: "What durable content represents this mailbox message version?"
- Epic 4 answers: "What structured workflow intelligence does that content suggest?"

## Core Output Contract

Epic 4's primary output is a durable `MessageClassificationResult`.

It must include:

- `mailboxId`
- `messageId`
- `ingestionVersionKey`
- `classifiedAt`
- `classifierVersion`
- `actionability`
- `messageType`
- `confidenceScore`
- `explanation`
- `signals`

It must not include:

- task IDs
- task ownership
- filing-state transitions
- folder targets
- mailbox mutation decisions

Those belong to later epics.

## Actionability and Message-Type Contract

Epic 4 must explicitly classify:

- `actionable`
- `informational`

Epic 4 must also assign one core Friendly Mail message type for MVP:

- `contract`
- `notice`
- `letter`
- `policy`
- `committee`
- `event`
- `invoice`
- `internal`
- `fyi`

The contract requires:

- one explicit actionability value
- one explicit message-type value
- a visible explanation for why those values were chosen
- a confidence score for the overall classification result

Ambiguous cases must still be explicit. The system must not silently downgrade a weak result into fake certainty.

## Workflow-Signal Contract

Epic 4 produces workflow signals that later epics can consume without re-solving extraction.

The output signal groups are:

- `dueDates`
- `entities`
- `taskCandidates`
- `urgency`
- `criticality`

### Due Date Signals

Each due-date signal must include:

- stable signal ID
- label
- normalized timestamp value
- confidence score
- rationale
- provenance

### Entity Signals

Entity signals may include:

- counterparties
- committees
- events
- invoices
- people
- organizations
- policies
- document references

Each entity signal must include:

- stable signal ID
- entity kind
- extracted value
- optional normalized value
- confidence score
- rationale
- provenance

### Task Candidate Signals

Task candidates are suggestions, not real tasks yet.

Each task candidate must include:

- stable signal ID
- proposed title
- optional summary
- optional due date
- confidence score
- rationale
- provenance

Epic 4 must not create or resolve first-class task records.

## Urgency and Criticality Contract

Epic 4 must keep urgency and criticality explicit but separate.

Urgency answers:

- how quickly should the message be surfaced for attention?

Criticality answers:

- how dangerous is it if this message-driven work is missed or mishandled?

Urgency uses the shared priority vocabulary:

- `low`
- `normal`
- `high`
- `critical`

Criticality uses a narrower workflow-specific vocabulary:

- `normal`
- `elevated`
- `critical`

Both signals must include:

- a level
- a confidence score
- a rationale
- a list of reasons

## Explanation Contract

Epic 4 explanation output is a first-class requirement.

The explanation must include:

- one plain-language summary
- a `lowConfidence` flag
- one or more structured reasons

Each reason must include:

- a reason code
- a human-readable summary
- optional provenance references

This contract exists so later surfaces can answer questions such as:

- "Why is this urgent?"
- "Why did Friendly Mail mark this as actionable?"
- "Did this conclusion come from the body or the attachment?"

## Confidence Contract

Epic 4 confidence must be explicit at multiple levels.

Required confidence fields:

- overall classification confidence
- due-date confidence
- entity confidence
- task-candidate confidence
- urgency confidence
- criticality confidence

Low confidence must not be hidden.

Low-confidence or ambiguous outputs should still be persisted as explicit results so later verification and UI layers can surface them safely.

## Epic 4 Rollout Readiness Baseline

Before Epic 5 task-state work depends on Epic 4 output, Friendly Mail should be able to confirm:

- current ingested mailbox messages have current-version classification coverage
- actionability and message type are present for each stored classification
- high-risk notice and invoice messages visibly keep due-date coverage where the current rules expect it
- criticality is present for each stored classification result
- low-confidence and ambiguous cases remain explicitly visible for review instead of being hidden

The first operational baseline for this lives in the mailbox classification verification report exposed by the API.

## Provenance Contract

Every important signal should preserve where it came from.

Supported provenance sources in MVP:

- message metadata
- normalized body text
- normalized unique-body text
- extracted attachment text
- OCR attachment text

Each provenance entry may include:

- source kind
- attachment ID
- artifact ID
- field name
- short excerpt where safe and useful

Provenance exists so later epics can explain decisions and debug failures without guessing which content source drove the result.

## Separation from Epic 5

Epic 4 may produce task candidates, but it does not own:

- task creation
- task deduplication
- task lifecycle transitions
- ownership or assignment
- workflow-resolution semantics

That boundary is mandatory.

Epic 5 should be able to consume Epic 4 output as input, but it must not need Epic 4 to create task records itself.

## Separation from Epic 6

Epic 4 may produce urgency, criticality, and message-type signals that influence future filing logic, but it does not own:

- filing eligibility
- delayed-filing state transitions
- move approval thresholds
- category or folder application
- invoice forwarding or outgoing numbering

Those remain delayed-filing and mailbox-action concerns for later epics.

## Failure and Degraded-Mode Contract

Epic 4 must distinguish between:

- successfully classified results
- low-confidence results
- ambiguous results
- unsupported inputs
- failed classification runs

Examples:

- missing attachment text because extraction was unsupported is not the same as classification failure
- a message with weak evidence may still produce a low-confidence result
- a classifier timeout is failed and retryable
- conflicting evidence must remain explicit instead of being flattened into false certainty

## Explicitly Deferred Beyond E4-T1

The following are intentionally out of scope for this ticket:

- persistence schema details
- model-provider selection
- prompt design and orchestration details
- task creation and state transitions
- filing logic and mailbox actions
- reminder scheduling
- pilot-quality evaluation datasets

## Implementation Consequences for Later Tickets

- `E4-T2` should persist the classification result, explanation, and workflow signals defined here.
- `E4-T3` should orchestrate repeat-safe classification over a specific ingestion version.
- `E4-T4` should implement actionability and message-type classification against this contract.
- `E4-T5` should populate due dates, entities, and task candidates using this output shape.
- `E4-T6` should add urgency and criticality scoring without changing the ownership boundary to Epic 5 or Epic 6.
- `E4-T7` should expose a stable read model from these stored results for downstream API and UI consumers.
- `E4-T8` should report low-confidence, ambiguous, unsupported, and failed classification states explicitly.

## References

This contract is grounded in the following Friendly Mail source-of-truth documents reviewed on 2026-04-05:

- `friendly-mail-prd.md`
- `friendly-mail-technical-design.md`
- `friendly-mail-frontend-strategy.md`
- `friendly-mail-mvp-epics.md`
- `docs/message-ingestion-extraction-contract.md`
