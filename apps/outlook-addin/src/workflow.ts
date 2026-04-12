import {
  TaskStatus,
  WorkflowCriticalityLevel,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  type FilingEligibility,
  type MessageActionability,
  type MessageClassificationReadModel,
  type MessagePriority,
  type MessageType,
  type MessageWorkflowReadModel,
  type TaskWorkflowReadModel,
  type WorkflowSignalProvenance
} from "@friendly-mail/contracts";

import type { AddinApiErrorKind } from "./api";
import type { AddinContext } from "./host";
import type { MailboxReadinessStatus } from "./readiness";

export type WorkflowPanelStatus =
  | "waiting-readiness"
  | "loading"
  | "ready"
  | "low-confidence"
  | "incomplete-data"
  | "failed-read"
  | "unsupported-context";

export type TaskActionKind = "done" | "snooze" | "delegate" | "dismiss" | "reopen";

export interface WorkflowTaskRow {
  id: string;
  title: string;
  meta: string;
  status: TaskStatus;
  assignee: string;
  effectSummary: string;
  latestUpdate: string;
  availableActions: Array<{ kind: TaskActionKind; label: string }>;
}

export interface WorkflowPanelViewModel {
  status: WorkflowPanelStatus;
  headline: string;
  summary: string;
  statusBadge: string;
  messageDetails: Array<{ label: string; value: string }>;
  summaryCards: Array<{ label: string; value: string; tone: "neutral" | "warm" | "critical" | "ok" }>;
  dueDateRows: Array<{ id: string; label: string; value: string; meta: string }>;
  entityRows: Array<{ id: string; label: string; value: string; meta: string }>;
  blockerRows: Array<{ label: string; value: string }>;
  taskRows: WorkflowTaskRow[];
  explanationSummary: string;
  confidenceLabel: string;
  reasonRows: Array<{ summary: string; source: string }>;
  promptChips: string[];
  note?: string;
}

export interface WorkflowPanelInput {
  context: AddinContext;
  readinessStatus: MailboxReadinessStatus;
  classification: MessageClassificationReadModel | null;
  workflow: MessageWorkflowReadModel | null;
  classificationError: AddinApiErrorKind | null;
  workflowError: AddinApiErrorKind | null;
  isLoading: boolean;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDateOnly(value?: string | null): string {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionability(value?: MessageActionability): string {
  return value ? titleCase(value) : "Unavailable";
}

function formatMessageType(value?: MessageType): string {
  return value ? titleCase(value) : "Unavailable";
}

function formatPriority(value?: MessagePriority): string {
  return value ? titleCase(value) : "Unavailable";
}

function formatCriticality(value?: WorkflowCriticalityLevel): string {
  return value ? titleCase(value) : "Unavailable";
}

function formatTaskStatus(value: TaskStatus): string {
  return titleCase(value);
}

function formatEntityKind(value: WorkflowEntityKind): string {
  return titleCase(value);
}

function formatTaskActionLabel(action: TaskActionKind) {
  switch (action) {
    case "done":
      return "Mark done";
    case "snooze":
      return "Snooze";
    case "delegate":
      return "Delegate";
    case "dismiss":
      return "Dismiss";
    case "reopen":
      return "Reopen";
    default:
      return titleCase(action);
  }
}

function formatSourceKinds(provenance: WorkflowSignalProvenance[] | undefined): string {
  if (!provenance || provenance.length === 0) {
    return "Source not available";
  }

  const kinds = Array.from(new Set(provenance.map((item) => item.sourceKind)));

  return kinds
    .map((kind) => {
      switch (kind) {
        case WorkflowSignalSourceKind.MessageMetadata:
          return "message metadata";
        case WorkflowSignalSourceKind.BodyText:
          return "body text";
        case WorkflowSignalSourceKind.UniqueBodyText:
          return "unique body";
        case WorkflowSignalSourceKind.AttachmentText:
          return "attachment text";
        case WorkflowSignalSourceKind.AttachmentOcr:
          return "attachment OCR";
        default:
          return titleCase(kind);
      }
    })
    .join(", ");
}

function buildTaskEffectSummary(
  task: TaskWorkflowReadModel,
  filingEligibility: FilingEligibility | undefined
) {
  if (filingEligibility?.blockedBy.includes("open_task") && task.task.status === TaskStatus.Open) {
    return "This open task is still blocking filing for the message.";
  }

  if (
    filingEligibility?.blockedBy.includes("snoozed_task") &&
    task.task.status === TaskStatus.Snoozed
  ) {
    return "Filing stays blocked while this task is snoozed.";
  }

  if (
    filingEligibility?.blockedBy.includes("delegated_task") &&
    task.task.status === TaskStatus.Delegated
  ) {
    return "Filing stays blocked until the delegated task is resolved or reopened.";
  }

  if (
    task.task.status === TaskStatus.Done ||
    task.task.status === TaskStatus.Dismissed
  ) {
    return "This task no longer blocks filing unless it is reopened.";
  }

  return filingEligibility?.summary ?? "Task actions keep workflow and filing state aligned.";
}

function buildTaskLatestUpdate(task: TaskWorkflowReadModel) {
  if (task.latestLifecycleEvent) {
    return `${titleCase(task.latestLifecycleEvent.reason)} on ${formatDateTime(task.latestLifecycleEvent.occurredAt)}`;
  }

  return `Created ${formatDateTime(task.task.createdAt)}`;
}

function buildTaskAssignee(task: TaskWorkflowReadModel) {
  if (task.task.assignedUserId) {
    return task.task.assignedUserId;
  }

  if (task.task.ownerUserId) {
    return task.task.ownerUserId;
  }

  return "Unassigned";
}

function getAvailableTaskActions(status: TaskStatus): Array<{ kind: TaskActionKind; label: string }> {
  switch (status) {
    case TaskStatus.Open:
      return (["done", "snooze", "delegate", "dismiss"] as TaskActionKind[]).map((kind) => ({
        kind,
        label: formatTaskActionLabel(kind)
      }));
    case TaskStatus.Snoozed:
      return (["reopen", "delegate", "done", "dismiss"] as TaskActionKind[]).map((kind) => ({
        kind,
        label: formatTaskActionLabel(kind)
      }));
    case TaskStatus.Delegated:
      return (["reopen", "done", "dismiss"] as TaskActionKind[]).map((kind) => ({
        kind,
        label: formatTaskActionLabel(kind)
      }));
    case TaskStatus.Done:
    case TaskStatus.Dismissed:
      return [
        {
          kind: "reopen",
          label: formatTaskActionLabel("reopen")
        }
      ];
    default:
      return [];
  }
}

function buildUnsupportedViewModel(context: AddinContext): WorkflowPanelViewModel {
  if (context.mode === "message-compose") {
    return {
      status: "unsupported-context",
      headline: "Workflow summary stays in message review",
      summary:
        "Compose support arrives later. This first slice is focused on read-mode message workflow inside Outlook.",
      statusBadge: "compose placeholder",
      messageDetails: [
        { label: "Current mode", value: "Compose" },
        { label: "Supported slice", value: "Read mode workflow" }
      ],
      summaryCards: [],
      dueDateRows: [],
      entityRows: [],
      blockerRows: [],
      taskRows: [],
      explanationSummary: "Friendly Mail reserves this area for read-mode workflow explanation.",
      confidenceLabel: "Not applicable",
      reasonRows: [],
      promptChips: ["What happens in compose later?"],
      note: "Compose numbering and draft tools come in a later add-in slice."
    };
  }

  return {
    status: "unsupported-context",
    headline: "Select a supported message to view workflow",
    summary:
      "Friendly Mail needs a selected read-mode message before it can explain urgency, blockers, and filing state.",
    statusBadge: "unsupported context",
    messageDetails: [
      {
        label: "Message context",
        value: context.message.status === "missing" ? "No message selected" : "Unsupported item"
      },
      { label: "Pinned task pane", value: context.isPinnedCapable ? "Supported" : "Unavailable" }
    ],
    summaryCards: [],
    dueDateRows: [],
    entityRows: [],
    blockerRows: [],
    taskRows: [],
    explanationSummary:
      "Friendly Mail waits for a valid message context before it binds workflow details.",
    confidenceLabel: "Not applicable",
    reasonRows: [],
    promptChips: ["What message types are supported?"]
  };
}

export function deriveWorkflowPanelViewModel(
  input: WorkflowPanelInput
): WorkflowPanelViewModel {
  const {
    context,
    readinessStatus,
    classification,
    workflow,
    classificationError,
    workflowError,
    isLoading
  } = input;

  if (
    context.mode === "message-compose" ||
    context.stage === "missing-item" ||
    context.stage === "unsupported-client" ||
    context.stage === "host-unavailable" ||
    context.message.status !== "selected"
  ) {
    return buildUnsupportedViewModel(context);
  }

  if (readinessStatus !== "ready") {
    return {
      status: "waiting-readiness",
      headline: "Workflow summary unlocks after mailbox readiness",
      summary:
        "Friendly Mail keeps message understanding separate from mailbox connection and sync health, so the workflow panel waits until readiness is current.",
      statusBadge: titleCase(readinessStatus),
      messageDetails: [
        { label: "Message", value: context.message.subject ?? "Selected message" },
        { label: "Sender", value: context.message.fromAddress ?? "Not available" }
      ],
      summaryCards: [],
      dueDateRows: [],
      entityRows: [],
      blockerRows: [],
      taskRows: [],
      explanationSummary:
        "Once mailbox readiness is healthy, this panel will explain actionability, urgency, blockers, and filing state.",
      confidenceLabel: "Pending readiness",
      reasonRows: [],
      promptChips: ["Why is workflow waiting?", "What needs to be ready first?"]
    };
  }

  if (isLoading) {
    return {
      status: "loading",
      headline: "Loading message workflow",
      summary:
        "Friendly Mail is fetching the latest message classification and workflow state for the selected Outlook item.",
      statusBadge: "loading",
      messageDetails: [
        { label: "Message", value: context.message.subject ?? "Selected message" },
        { label: "Sender", value: context.message.fromAddress ?? "Not available" }
      ],
      summaryCards: [],
      dueDateRows: [],
      entityRows: [],
      blockerRows: [],
      taskRows: [],
      explanationSummary: "The panel is waiting for current workflow detail.",
      confidenceLabel: "Loading",
      reasonRows: [],
      promptChips: ["Why is this taking a moment?"]
    };
  }

  const hasClassification = Boolean(classification);
  const hasWorkflow = Boolean(workflow);

  if (!hasClassification && !hasWorkflow) {
    return {
      status: "failed-read",
      headline: "Friendly Mail could not load workflow detail",
      summary:
        "The add-in is ready, but the selected message workflow could not be loaded from the backend right now.",
      statusBadge: "retry needed",
      messageDetails: [
        { label: "Message", value: context.message.subject ?? "Selected message" },
        { label: "Sender", value: context.message.fromAddress ?? "Not available" }
      ],
      summaryCards: [],
      dueDateRows: [],
      entityRows: [],
      blockerRows: [],
      taskRows: [],
      explanationSummary:
        "Friendly Mail will show explanation and blockers here once the workflow read models respond.",
      confidenceLabel: "Unavailable",
      reasonRows: [],
      promptChips: ["What failed to load?", "Can I retry workflow detail?"],
      note: buildFailureNote(classificationError, workflowError)
    };
  }

  const fallbackClassification = workflow?.classification;
  const actionability = classification?.actionability ?? fallbackClassification?.actionability;
  const messageType = classification?.messageType ?? fallbackClassification?.messageType;
  const priority = classification?.explanation.urgency.level ?? workflow?.workflowState.priority;
  const criticality =
    classification?.explanation.criticality.level ?? workflow?.workflowState.criticality;
  const dueDateRows =
    classification?.signals.dueDates.slice(0, 2).map((signal) => ({
      id: signal.id,
      label: signal.label,
      value: formatDateOnly(signal.value),
      meta: signal.rationale ?? `${Math.round(signal.confidenceScore * 100)}% confidence`
    })) ?? [];
  const entityRows =
    classification?.signals.entities.slice(0, 3).map((entity) => ({
      id: entity.id,
      label: formatEntityKind(entity.kind),
      value: entity.value,
      meta: entity.rationale ?? `${Math.round(entity.confidenceScore * 100)}% confidence`
    })) ?? [];
  const blockerRows = workflow
    ? [
        {
          label: "Workflow state",
          value: titleCase(workflow.workflowState.status)
        },
        {
          label: "Filing state",
          value: titleCase(workflow.workflowState.filingState)
        },
        {
          label: "Blockers",
          value:
            workflow.filingEligibility.blockedBy.length > 0
              ? workflow.filingEligibility.blockedBy.map(titleCase).join(", ")
              : "No blockers"
        },
        {
          label: "Requirements",
          value:
            workflow.filingEligibility.requirements.length > 0
              ? workflow.filingEligibility.requirements.map(titleCase).join(", ")
              : "Ready to file"
        }
      ]
    : [];
  const taskRows = workflow
    ? workflow.tasks.slice(0, 3).map((task) => ({
      id: task.task.id,
      title: task.task.title,
      meta: `${formatTaskStatus(task.task.status)} - Due ${formatDateOnly(task.task.dueAt)}`,
      status: task.task.status,
      assignee: buildTaskAssignee(task),
      effectSummary: buildTaskEffectSummary(task, workflow.filingEligibility),
      latestUpdate: buildTaskLatestUpdate(task),
      availableActions: getAvailableTaskActions(task.task.status)
    }))
    : [];
  const explanationSummary =
    classification?.explanation.summary ??
    workflow?.classification?.explanationSummary ??
    "Friendly Mail is waiting for the fuller explanation model.";
  const reasonRows =
    classification?.explanation.reasons.slice(0, 3).map((reason) => ({
      summary: reason.summary,
      source: formatSourceKinds([
        ...reason.provenance.sourceKinds.map((kind) => ({ sourceKind: kind }))
      ])
    })) ?? [];
  const messageDetails = [
    { label: "Message", value: context.message.subject ?? "Selected message" },
    { label: "Sender", value: context.message.fromAddress ?? "Not available" },
    { label: "Received", value: formatDateTime(context.message.receivedAt) },
    {
      label: "Pinned task pane",
      value: context.isPinnedCapable ? "Ready for message switching" : "Not available"
    }
  ];
  const summaryCards: WorkflowPanelViewModel["summaryCards"] = [
    {
      label: "Actionability and type",
      value: `${formatActionability(actionability)} - ${formatMessageType(messageType)}`,
      tone: actionability === "actionable" ? "critical" : "neutral"
    },
    {
      label: "Urgency",
      value: formatPriority(priority),
      tone:
        priority === "critical" || priority === "high"
          ? "critical"
          : priority === "normal"
            ? "warm"
            : "neutral"
    },
    {
      label: "Criticality",
      value: formatCriticality(criticality),
      tone: criticality === WorkflowCriticalityLevel.Critical ? "critical" : "warm"
    },
    {
      label: "Filing",
      value: workflow?.filingEligibility.summary ?? "Workflow filing detail unavailable",
      tone: workflow?.filingEligibility.isEligible ? "ok" : "warm"
    }
  ];

  if (classification?.signals.summary.nextDueDate && dueDateRows.length === 0) {
    dueDateRows.push({
      id: classification.signals.summary.nextDueDate.id,
      label: classification.signals.summary.nextDueDate.label,
      value: formatDateOnly(classification.signals.summary.nextDueDate.value),
      meta: `${Math.round(classification.signals.summary.nextDueDate.confidenceScore * 100)}% confidence`
    });
  }

  const noteParts: string[] = [];
  let status: WorkflowPanelStatus = "ready";
  let statusBadge = "current";
  let confidenceLabel = "High confidence";

  if (classification) {
    confidenceLabel = `${titleCase(classification.confidence.overall.band)} confidence - ${Math.round(classification.confidence.overall.score * 100)}%`;
  } else if (workflow?.classification) {
    confidenceLabel = `${Math.round(workflow.classification.confidenceScore * 100)}% confidence`;
  }

  if (!hasClassification || !hasWorkflow) {
    status = "incomplete-data";
    statusBadge = "partial";
    noteParts.push(
      "Friendly Mail only loaded part of the message workflow, so some sections are still placeholders."
    );

    if (classificationError) {
      noteParts.push(`Classification: ${classificationError}.`);
    }

    if (workflowError) {
      noteParts.push(`Workflow state: ${workflowError}.`);
    }
  } else if (
    classification?.explanation.lowConfidence ||
    classification?.confidence.overall.band === "low"
  ) {
    status = "low-confidence";
    statusBadge = "review suggested";
    noteParts.push(
      "Friendly Mail found signals worth surfacing, but the confidence is low enough that this message still needs human review."
    );
  }

  return {
    status,
    headline:
      status === "low-confidence"
        ? "Friendly Mail has a cautious read on this message"
        : "Friendly Mail message workflow summary",
    summary:
      status === "incomplete-data"
        ? "The panel has part of the workflow picture, but one backend read model is still missing."
        : explanationSummary,
    statusBadge,
    messageDetails,
    summaryCards,
    dueDateRows,
    entityRows,
    blockerRows,
    taskRows,
    explanationSummary,
    confidenceLabel,
    reasonRows,
    promptChips: [
      "Why is this urgent?",
      "What is blocking filing?",
      "What should I do next?",
      "Where did this due date come from?"
    ],
    note: noteParts.join(" ")
  };
}

function buildFailureNote(
  classificationError: AddinApiErrorKind | null,
  workflowError: AddinApiErrorKind | null
) {
  const parts: string[] = [];

  if (classificationError) {
    parts.push(`Classification returned ${classificationError}.`);
  }

  if (workflowError) {
    parts.push(`Workflow state returned ${workflowError}.`);
  }

  return parts.length > 0 ? parts.join(" ") : undefined;
}
