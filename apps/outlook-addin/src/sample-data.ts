import {
  ClassificationReasonCode,
  FilingDecisionStatus,
  FilingState,
  MailboxActionMode,
  MailboxActionType,
  MessageActionability,
  MessagePriority,
  MessageType,
  MessageWorkflowStatus,
  TaskSourceKind,
  TaskStatus,
  TaskStatusReason,
  WorkflowCriticalityLevel,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  type TaskTransitionRequest,
  type FilingDecisionReadModel,
  type MessageClassificationReadModel,
  type MessageWorkflowReadModel
} from "@friendly-mail/contracts";

import type { AddinApiErrorKind } from "./api";
import type { AddinContext } from "./host";

export interface PreviewWorkflowState {
  classification: MessageClassificationReadModel | null;
  workflow: MessageWorkflowReadModel | null;
  classificationError: AddinApiErrorKind | null;
  workflowError: AddinApiErrorKind | null;
  isLoading: boolean;
}

function buildPreviewTargetFolder(messageType?: MessageType) {
  switch (messageType) {
    case MessageType.Invoice:
      return {
        id: "folder_invoices",
        graphFolderId: "graph_folder_invoices",
        name: "Invoices",
        source: "mailbox_folder" as const
      };
    case MessageType.Notice:
      return {
        id: "folder_board_notices",
        graphFolderId: "graph_folder_board_notices",
        name: "Board Notices",
        source: "mailbox_folder" as const
      };
    default:
      return {
        id: "folder_archive",
        graphFolderId: "graph_folder_archive",
        name: "Archive",
        source: "mailbox_folder" as const
      };
  }
}

function buildPreviewSuggestedCategories(
  classification?:
    | Pick<MessageClassificationReadModel, "actionability" | "messageType">
    | Pick<NonNullable<MessageWorkflowReadModel["classification"]>, "actionability" | "messageType">
    | null
) {
  if (!classification) {
    return [];
  }

  return [
    `FriendlyMail/${classification.actionability === MessageActionability.Actionable ? "Actionable" : "Informational"}`,
    `FriendlyMail/${classification.messageType.charAt(0).toUpperCase()}${classification.messageType.slice(1)}`
  ];
}

function createReadyClassification(): MessageClassificationReadModel {
  return {
    mailboxId: "preview_mailbox_ready",
    messageId: "message_preview_ready",
    ingestionVersionKey: "preview_mailbox_ready:graph_message_ready:change_key_456",
    classifiedAt: "2026-04-06T09:30:00.000Z",
    classifierVersion: "rules-classifier:v1",
    actionability: MessageActionability.Actionable,
    messageType: MessageType.Notice,
    confidence: {
      overall: {
        score: 0.91,
        band: "high",
        lowConfidence: false
      },
      signals: {
        dueDates: {
          count: 1,
          maxScore: 0.92
        },
        entities: {
          count: 2,
          maxScore: 0.88
        },
        taskCandidates: {
          count: 1,
          maxScore: 0.84
        },
        urgency: {
          score: 0.86,
          band: "high",
          level: MessagePriority.High
        },
        criticality: {
          score: 0.82,
          band: "high",
          level: WorkflowCriticalityLevel.Critical
        }
      }
    },
    explanation: {
      summary: "Friendly Mail found a deadline-sensitive notice with one unresolved review task.",
      lowConfidence: false,
      reasons: [
        {
          code: ClassificationReasonCode.NoticeCueDetected,
          summary: "Notice language appears in the subject and body.",
          provenance: {
            sourceKinds: [WorkflowSignalSourceKind.MessageMetadata, WorkflowSignalSourceKind.BodyText],
            attachmentIds: [],
            artifactIds: [],
            fields: ["subject", "bodyText"]
          }
        },
        {
          code: ClassificationReasonCode.DueDateDetected,
          summary: "A due date is referenced directly in the body text.",
          provenance: {
            sourceKinds: [WorkflowSignalSourceKind.BodyText],
            attachmentIds: [],
            artifactIds: [],
            fields: ["bodyText"]
          }
        }
      ],
      urgency: {
        level: MessagePriority.High,
        rationale: "The detected response deadline is close enough to prioritize this message.",
        reasons: [
          {
            code: ClassificationReasonCode.DueDateDetected,
            summary: "A near-term due date raises urgency.",
            provenance: {
              sourceKinds: [WorkflowSignalSourceKind.BodyText],
              attachmentIds: [],
              artifactIds: [],
              fields: ["bodyText"]
            }
          }
        ]
      },
      criticality: {
        level: WorkflowCriticalityLevel.Critical,
        rationale: "Formal notices are critical because missing the next step can create legal or governance consequences.",
        reasons: [
          {
            code: ClassificationReasonCode.NoticeCueDetected,
            summary: "Formal notice language increases criticality.",
            provenance: {
              sourceKinds: [WorkflowSignalSourceKind.MessageMetadata],
              attachmentIds: [],
              artifactIds: [],
              fields: ["subject"]
            }
          }
        ]
      }
    },
    signals: {
      summary: {
        dueDateCount: 1,
        entityCount: 2,
        taskCandidateCount: 1,
        nextDueDate: {
          id: "due_date_preview_123",
          label: "Response deadline",
          value: "2026-04-10T00:00:00.000Z",
          confidenceScore: 0.92
        },
        topEntities: [
          {
            id: "entity_committee_123",
            kind: WorkflowEntityKind.Committee,
            value: "Board Review Committee",
            normalizedValue: "board review committee",
            confidenceScore: 0.88
          },
          {
            id: "entity_document_123",
            kind: WorkflowEntityKind.Document,
            value: "Notice packet",
            normalizedValue: "notice packet",
            confidenceScore: 0.82
          }
        ],
        topTaskCandidates: [
          {
            id: "task_candidate_preview_123",
            title: "Review the notice and confirm response",
            dueAt: "2026-04-10T00:00:00.000Z",
            confidenceScore: 0.84
          }
        ]
      },
      dueDates: [
        {
          id: "due_date_preview_123",
          label: "Response deadline",
          value: "2026-04-10T00:00:00.000Z",
          confidenceScore: 0.92,
          rationale: "The body states a response is due by April 10.",
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText",
              excerpt: "Please respond by April 10."
            }
          ]
        }
      ],
      entities: [
        {
          id: "entity_committee_123",
          kind: WorkflowEntityKind.Committee,
          value: "Board Review Committee",
          normalizedValue: "board review committee",
          confidenceScore: 0.88,
          rationale: "The committee name appears in the notice header.",
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.MessageMetadata,
              field: "subject"
            }
          ]
        },
        {
          id: "entity_document_123",
          kind: WorkflowEntityKind.Document,
          value: "Notice packet",
          normalizedValue: "notice packet",
          confidenceScore: 0.82,
          rationale: "The body references the notice packet as the primary document.",
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText"
            }
          ]
        }
      ],
      taskCandidates: [
        {
          id: "task_candidate_preview_123",
          title: "Review the notice and confirm response",
          summary: "Friendly Mail suggests a review task before filing remains blocked.",
          dueAt: "2026-04-10T00:00:00.000Z",
          confidenceScore: 0.84,
          rationale: "The message asks the recipient to review the notice and respond.",
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText"
            }
          ]
        }
      ]
    }
  };
}

function createReadyWorkflow(): MessageWorkflowReadModel {
  return {
    mailboxId: "preview_mailbox_ready",
    messageId: "message_preview_ready",
    workflowState: {
      id: "workflow_state_preview_123",
      mailboxId: "preview_mailbox_ready",
      messageId: "message_preview_ready",
      actionability: MessageActionability.Actionable,
      status: MessageWorkflowStatus.FilingBlocked,
      filingState: FilingState.FilingBlocked,
      priority: MessagePriority.High,
      criticality: WorkflowCriticalityLevel.Critical,
      isEligibleToFile: false,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: ["open_task"],
      blockingTaskIds: ["task_preview_123"],
      unresolvedTaskCount: 1,
      openTaskCount: 1,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      informationalReadRequired: false,
      messageIsRead: false,
      lastEvaluatedAt: "2026-04-06T09:35:00.000Z"
    },
    filingEligibility: {
      mailboxId: "preview_mailbox_ready",
      messageId: "message_preview_ready",
      workflowStateId: "workflow_state_preview_123",
      state: FilingState.FilingBlocked,
      isEligible: false,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: ["open_task"],
      summary: "Filing stays blocked until the review task is resolved.",
      evaluatedAt: "2026-04-06T09:35:00.000Z"
    },
    classification: {
      ingestionVersionKey: "preview_mailbox_ready:graph_message_ready:change_key_456",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Notice,
      confidenceScore: 0.91,
      explanationSummary: "Friendly Mail found a deadline-sensitive notice with one unresolved review task."
    },
    tasks: [
      {
        task: {
          id: "task_preview_123",
          mailboxId: "preview_mailbox_ready",
          sourceMessageId: "message_preview_ready",
          sourceTaskCandidateId: "task_candidate_preview_123",
          title: "Review the notice and confirm response",
          status: TaskStatus.Open,
          priority: MessagePriority.High,
          criticality: WorkflowCriticalityLevel.Critical,
          ownerUserId: "user_123",
          assignedUserId: "user_123",
          dueAt: "2026-04-10T00:00:00.000Z",
          description: "Suggested from the response deadline and review request.",
          createdAt: "2026-04-06T09:35:00.000Z"
        },
        sourceLinks: [
          {
            id: "source_link_preview_123",
            mailboxId: "preview_mailbox_ready",
            taskId: "task_preview_123",
            messageId: "message_preview_ready",
            sourceKind: TaskSourceKind.ClassificationTaskCandidate,
            classificationIngestionVersionKey:
              "preview_mailbox_ready:graph_message_ready:change_key_456",
            classifierVersion: "rules-classifier:v1",
            taskCandidateId: "task_candidate_preview_123",
            dueDateSignalIds: ["due_date_preview_123"],
            entitySignalIds: ["entity_committee_123", "entity_document_123"],
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "bodyText",
                excerpt: "Please review the notice and confirm response."
              }
            ],
            createdAt: "2026-04-06T09:35:00.000Z"
          }
        ],
        latestLifecycleEvent: {
          id: "task_event_preview_123",
          mailboxId: "preview_mailbox_ready",
          taskId: "task_preview_123",
          toStatus: TaskStatus.Open,
          reason: TaskStatusReason.Snoozed,
          actorUserId: "user_123",
          occurredAt: "2026-04-06T09:35:00.000Z"
        },
        sourceMessage: {
          mailboxId: "preview_mailbox_ready",
          messageId: "message_preview_ready",
          subject: "Board notice needs review before filing",
          actionability: MessageActionability.Actionable,
          messageType: MessageType.Notice,
          filingState: FilingState.FilingBlocked
        }
      }
    ]
  };
}

function createLowConfidenceClassification(): MessageClassificationReadModel {
  const ready = createReadyClassification();

  return {
    ...ready,
    messageId: "message_preview_low_confidence",
    actionability: MessageActionability.Informational,
    messageType: MessageType.Policy,
    confidence: {
      ...ready.confidence,
      overall: {
        score: 0.44,
        band: "low",
        lowConfidence: true
      },
      signals: {
        ...ready.confidence.signals,
        dueDates: {
          count: 0
        },
        taskCandidates: {
          count: 0
        },
        urgency: {
          score: 0.41,
          band: "low",
          level: MessagePriority.Normal
        },
        criticality: {
          score: 0.38,
          band: "low",
          level: WorkflowCriticalityLevel.Normal
        }
      }
    },
    explanation: {
      summary: "Friendly Mail found policy-style language, but the evidence is thin enough that this message still needs review.",
      lowConfidence: true,
      reasons: [
        {
          code: ClassificationReasonCode.AmbiguousContent,
          summary: "The subject hints at a policy update, but the body is brief.",
          provenance: {
            sourceKinds: [WorkflowSignalSourceKind.MessageMetadata],
            attachmentIds: [],
            artifactIds: [],
            fields: ["subject"]
          }
        }
      ],
      urgency: {
        level: MessagePriority.Normal,
        rationale: "No strong due date or action request was found.",
        reasons: []
      },
      criticality: {
        level: WorkflowCriticalityLevel.Normal,
        rationale: "The message may only be informational, so Friendly Mail is staying cautious.",
        reasons: []
      }
    },
    signals: {
      summary: {
        dueDateCount: 0,
        entityCount: 1,
        taskCandidateCount: 0,
        topEntities: [
          {
            id: "entity_policy_123",
            kind: WorkflowEntityKind.Policy,
            value: "Travel policy",
            normalizedValue: "travel policy",
            confidenceScore: 0.61
          }
        ],
        topTaskCandidates: []
      },
      dueDates: [],
      entities: [
        {
          id: "entity_policy_123",
          kind: WorkflowEntityKind.Policy,
          value: "Travel policy",
          normalizedValue: "travel policy",
          confidenceScore: 0.61,
          rationale: "The subject references a policy update.",
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.MessageMetadata,
              field: "subject"
            }
          ]
        }
      ],
      taskCandidates: []
    }
  };
}

function createLowConfidenceWorkflow(): MessageWorkflowReadModel {
  return {
    ...createReadyWorkflow(),
    messageId: "message_preview_low_confidence",
    workflowState: {
      ...createReadyWorkflow().workflowState,
      messageId: "message_preview_low_confidence",
      actionability: MessageActionability.Informational,
      status: MessageWorkflowStatus.ActiveInformationalUnread,
      filingState: FilingState.ActiveInformationalUnread,
      priority: MessagePriority.Normal,
      criticality: WorkflowCriticalityLevel.Normal,
      isEligibleToFile: false,
      requirements: ["message_read"],
      blockedBy: ["message_unread"],
      blockingTaskIds: [],
      unresolvedTaskCount: 0,
      openTaskCount: 0,
      messageIsRead: false
    },
    filingEligibility: {
      mailboxId: "preview_mailbox_ready",
      messageId: "message_preview_low_confidence",
      workflowStateId: "workflow_state_preview_123",
      state: FilingState.ActiveInformationalUnread,
      isEligible: false,
      requirements: ["message_read"],
      blockedBy: ["message_unread"],
      summary: "Friendly Mail is waiting for the message to be reviewed before it can file informational mail.",
      evaluatedAt: "2026-04-06T09:35:00.000Z"
    },
    classification: {
      ingestionVersionKey: "preview_mailbox_ready:graph_message_ready:change_key_456",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Informational,
      messageType: MessageType.Policy,
      confidenceScore: 0.44,
      explanationSummary:
        "Friendly Mail found policy-style language, but the evidence is thin enough that this message still needs review."
    },
    tasks: []
  };
}

export function buildWorkflowPreviewState(context: AddinContext): PreviewWorkflowState {
  switch (context.previewScenario) {
    case "ready":
      return {
        classification: createReadyClassification(),
        workflow: createReadyWorkflow(),
        classificationError: null,
        workflowError: null,
        isLoading: false
      };
    case "low-confidence":
      return {
        classification: createLowConfidenceClassification(),
        workflow: createLowConfidenceWorkflow(),
        classificationError: null,
        workflowError: null,
        isLoading: false
      };
    case "workflow-failed":
      return {
        classification: null,
        workflow: null,
        classificationError: "network",
        workflowError: "network",
        isLoading: false
      };
    default:
      return {
        classification: null,
        workflow: null,
        classificationError: null,
        workflowError: null,
        isLoading: false
      };
  }
}

export function buildPreviewFilingDecisionReadModel(input: {
  classification: MessageClassificationReadModel | null;
  workflow: MessageWorkflowReadModel | null;
}) {
  if (!input.workflow) {
    return null;
  }

  const workflow = input.workflow;
  const classification = input.classification ?? workflow.classification;
  const targetFolder = buildPreviewTargetFolder(classification?.messageType);
  const suggestedCategories = buildPreviewSuggestedCategories(classification ?? null);
  const isFiled = workflow.workflowState.filingState === FilingState.Filed;
  const status = isFiled
    ? FilingDecisionStatus.Executed
    : workflow.filingEligibility.isEligible
      ? FilingDecisionStatus.Eligible
      : FilingDecisionStatus.Blocked;
  const summary = isFiled
    ? "The message is filed and no delayed-filing blockers remain."
    : workflow.filingEligibility.isEligible
      ? `The message is eligible to file to ${targetFolder.name} and can apply ${suggestedCategories.length} mailbox categor${suggestedCategories.length === 1 ? "y" : "ies"}.`
      : workflow.filingEligibility.summary;
  const recommendedActions = status === FilingDecisionStatus.Blocked
    ? []
    : [
        ...suggestedCategories.map((category) => ({
          actionType: MailboxActionType.ApplyCategory,
          mode: MailboxActionMode.SuggestionOnly,
          summary: `Apply ${category} before filing the message.`
        })),
        {
          actionType: MailboxActionType.MoveMessage,
          mode: MailboxActionMode.SuggestionOnly,
          summary: `Move the message to ${targetFolder.name} when delayed-filing rules allow it.`
        }
      ];

  return {
    mailboxId: workflow.mailboxId,
    messageId: workflow.messageId,
    decision: {
      id: `preview_filing_decision_${workflow.messageId}`,
      mailboxId: workflow.mailboxId,
      messageId: workflow.messageId,
      workflowStateId: workflow.workflowState.id,
      actionability: workflow.workflowState.actionability,
      status,
      mode:
        status === FilingDecisionStatus.Executed
          ? MailboxActionMode.ApprovedApply
          : MailboxActionMode.SuggestionOnly,
      requirements: workflow.filingEligibility.requirements,
      blockedBy: workflow.filingEligibility.blockedBy,
      targetFolderId: targetFolder.id,
      targetFolderGraphId: targetFolder.graphFolderId,
      targetFolderName: targetFolder.name,
      suggestedCategories,
      summary,
      rationale: `Target folder: ${targetFolder.name} (${targetFolder.source}).`,
      sourceMessageIsRead: workflow.workflowState.messageIsRead,
      decidedAt: workflow.workflowState.lastEvaluatedAt,
      executedAt: isFiled ? workflow.workflowState.lastEvaluatedAt : undefined
    },
    workflowState: workflow.workflowState,
    filingEligibility: workflow.filingEligibility,
    classification: workflow.classification,
    targetFolder,
    recommendedActions
  } satisfies FilingDecisionReadModel;
}

export function applyPreviewTaskTransition(input: {
  workflow: MessageWorkflowReadModel;
  taskId: string;
  transition: TaskTransitionRequest;
  at?: string;
}) {
  const taskIndex = input.workflow.tasks.findIndex((task) => task.task.id === input.taskId);

  if (taskIndex < 0) {
    throw new Error("Preview task not found.");
  }

  const currentTask = input.workflow.tasks[taskIndex]!;
  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.Open]: [TaskStatus.Snoozed, TaskStatus.Delegated, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Snoozed]: [TaskStatus.Open, TaskStatus.Delegated, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Delegated]: [TaskStatus.Open, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Done]: [TaskStatus.Open],
    [TaskStatus.Dismissed]: [TaskStatus.Open]
  };

  if (!allowedTransitions[currentTask.task.status].includes(input.transition.status)) {
    throw new Error("Preview task transition is not allowed.");
  }

  if (input.transition.status === TaskStatus.Snoozed && !input.transition.snoozedUntil) {
    throw new Error("Preview snooze requires a timestamp.");
  }

  if (input.transition.status === TaskStatus.Delegated && !input.transition.assignedUserId) {
    throw new Error("Preview delegation requires an assignee.");
  }

  const timestamp = input.at ?? "2026-04-06T10:15:00.000Z";
  const reason = resolvePreviewTaskTransitionReason(input.transition);
  const updatedTask = {
    ...currentTask,
    task: {
      ...currentTask.task,
      status: input.transition.status,
      assignedUserId:
        input.transition.status === TaskStatus.Open
          ? currentTask.task.ownerUserId ?? currentTask.task.assignedUserId
          : input.transition.status === TaskStatus.Delegated
            ? input.transition.assignedUserId ?? currentTask.task.assignedUserId
            : currentTask.task.assignedUserId,
      delegatedByUserId:
        input.transition.status === TaskStatus.Delegated
          ? currentTask.task.ownerUserId ?? "user_123"
          : input.transition.status === TaskStatus.Open
            ? undefined
            : currentTask.task.delegatedByUserId,
      snoozedUntil:
        input.transition.status === TaskStatus.Snoozed
          ? input.transition.snoozedUntil
          : undefined,
      resolvedAt:
        input.transition.status === TaskStatus.Done || input.transition.status === TaskStatus.Dismissed
          ? timestamp
          : undefined,
      resolutionReason:
        input.transition.status === TaskStatus.Done || input.transition.status === TaskStatus.Dismissed
          ? reason
          : undefined,
      resolutionNote:
        input.transition.status === TaskStatus.Done || input.transition.status === TaskStatus.Dismissed
          ? input.transition.note
          : undefined,
      updatedAt: timestamp
    },
    latestLifecycleEvent: {
      id: `preview_task_event_${Date.parse(timestamp)}`,
      mailboxId: input.workflow.mailboxId,
      taskId: input.taskId,
      fromStatus: currentTask.task.status,
      toStatus: input.transition.status,
      reason,
      actorUserId: currentTask.task.ownerUserId,
      delegatedToUserId:
        input.transition.status === TaskStatus.Delegated
          ? input.transition.assignedUserId
          : undefined,
      note: input.transition.note,
      occurredAt: timestamp
    }
  };

  const tasks = input.workflow.tasks.map((task, index) => (index === taskIndex ? updatedTask : task));
  const unresolvedTasks = tasks.filter((task) =>
    [TaskStatus.Open, TaskStatus.Snoozed, TaskStatus.Delegated].includes(task.task.status)
  );
  const openTasks = unresolvedTasks.filter((task) => task.task.status === TaskStatus.Open);
  const snoozedTasks = unresolvedTasks.filter((task) => task.task.status === TaskStatus.Snoozed);
  const delegatedTasks = unresolvedTasks.filter((task) => task.task.status === TaskStatus.Delegated);
  const blockedBy =
    openTasks.length > 0
      ? ["open_task" as const]
      : snoozedTasks.length > 0
        ? ["snoozed_task" as const]
        : delegatedTasks.length > 0
          ? ["delegated_task" as const]
          : [];
  const isEligible = blockedBy.length === 0;
  const filingState = isEligible ? FilingState.EligibleToFile : FilingState.FilingBlocked;
  const workflowStatus = isEligible
    ? MessageWorkflowStatus.EligibleToFile
    : MessageWorkflowStatus.FilingBlocked;

  return {
    ...input.workflow,
    workflowState: {
      ...input.workflow.workflowState,
      status: workflowStatus,
      filingState,
      isEligibleToFile: isEligible,
      blockedBy,
      blockingTaskIds: unresolvedTasks.map((task) => task.task.id),
      unresolvedTaskCount: unresolvedTasks.length,
      openTaskCount: openTasks.length,
      snoozedTaskCount: snoozedTasks.length,
      delegatedTaskCount: delegatedTasks.length,
      lastEvaluatedAt: timestamp
    },
    filingEligibility: {
      ...input.workflow.filingEligibility,
      state: filingState,
      isEligible,
      blockedBy,
      summary: isEligible
        ? "The message is eligible to file because all required task work is resolved."
        : blockedBy[0] === "delegated_task"
          ? "Filing stays blocked until the delegated task is resolved or reopened."
          : blockedBy[0] === "snoozed_task"
            ? "Filing stays blocked while a snoozed task is still active."
            : "Filing stays blocked until the open task is resolved.",
      evaluatedAt: timestamp
    },
    tasks
  } satisfies MessageWorkflowReadModel;
}

export function executePreviewFilingDecision(input: {
  workflow: MessageWorkflowReadModel;
  at?: string;
}) {
  if (!input.workflow.filingEligibility.isEligible) {
    throw new Error("Preview filing is still blocked.");
  }

  const timestamp = input.at ?? "2026-04-06T10:30:00.000Z";

  return {
    ...input.workflow,
    workflowState: {
      ...input.workflow.workflowState,
      filingState: FilingState.Filed,
      isEligibleToFile: true,
      blockedBy: [],
      blockingTaskIds: [],
      unresolvedTaskCount: 0,
      openTaskCount: 0,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      messageIsRead: true,
      lastEvaluatedAt: timestamp
    },
    filingEligibility: {
      ...input.workflow.filingEligibility,
      state: FilingState.Filed,
      isEligible: true,
      blockedBy: [],
      summary: "The message is filed and no delayed-filing blockers remain.",
      evaluatedAt: timestamp
    }
  } satisfies MessageWorkflowReadModel;
}

function resolvePreviewTaskTransitionReason(transition: TaskTransitionRequest) {
  if (transition.reason) {
    return transition.reason;
  }

  switch (transition.status) {
    case TaskStatus.Snoozed:
      return TaskStatusReason.Snoozed;
    case TaskStatus.Delegated:
      return TaskStatusReason.Delegated;
    case TaskStatus.Done:
      return TaskStatusReason.UserCompleted;
    case TaskStatus.Dismissed:
      return TaskStatusReason.UserDismissed;
    default:
      return TaskStatusReason.ResolvedByWorkflow;
  }
}
