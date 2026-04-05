import {
  ClassificationReasonCode,
  FilingState,
  MessageActionability,
  MessagePriority,
  MessageType,
  MessageWorkflowStatus,
  OperationalHealthStatus,
  type FilingEligibility,
  type MailboxTaskWorkflowVerificationReport,
  type MessageClassificationResult,
  type MessageWorkflowReadModel,
  type MessageWorkflowStateRecord,
  type SessionView,
  type TaskMaterializationResult,
  type TaskTransitionRequest,
  type TaskTransitionResult,
  type TaskWorkflowReadModel,
  TaskSourceKind,
  TaskStatus,
  TaskStatusReason,
  VerificationCheckStatus,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  WorkflowCriticalityLevel
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  createTaskLifecycleEvent,
  upsertMessageWorkflowState,
  upsertMessageClassification,
  upsertTaskRecord,
  upsertTaskSourceLink
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { type MailboxClassificationService } from "./mailbox-classification-service";

type MaterializeTasksInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type TransitionTaskInput = {
  session: SessionView;
  mailboxId: string;
  taskId: string;
} & TaskTransitionRequest;

type GetMessageWorkflowReadModelInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type GetMailboxTaskWorkflowVerificationInput = {
  session: SessionView;
  mailboxId: string;
};

export type MailboxTaskWorkflowService = {
  materializeTasks(input: MaterializeTasksInput): Promise<TaskMaterializationResult>;
  transitionTask(input: TransitionTaskInput): Promise<TaskTransitionResult>;
  getMessageWorkflowReadModel(
    input: GetMessageWorkflowReadModelInput
  ): Promise<MessageWorkflowReadModel>;
  getMailboxTaskWorkflowVerification(
    input: GetMailboxTaskWorkflowVerificationInput
  ): Promise<MailboxTaskWorkflowVerificationReport>;
};

export type CreatePrismaMailboxTaskWorkflowServiceInput = {
  prisma: PrismaClient;
  logger: Logger;
  mailboxClassificationService: Pick<MailboxClassificationService, "classifyMessage">;
  now?: () => Date;
};

type MailboxOwnershipRecord = {
  id: string;
  tenantId: string;
  connection: {
    userId: string;
  } | null;
};

type MessageRecord = {
  id: string;
  mailboxId: string;
  graphMessageId?: string | null;
  subject: string;
  ingestionVersionKey?: string | null;
  isRead: boolean;
  actionability?: "ACTIONABLE" | "INFORMATIONAL" | null;
  filingState:
    | "PENDING_CLASSIFICATION"
    | "ACTIVE_ACTIONABLE"
    | "ACTIVE_INFORMATIONAL_UNREAD"
    | "ELIGIBLE_TO_FILE"
    | "FILED"
    | "FILING_BLOCKED";
};

type StoredClassificationRecord = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifierVersion: string;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  messageType:
    | "CONTRACT"
    | "NOTICE"
    | "LETTER"
    | "POLICY"
    | "COMMITTEE"
    | "EVENT"
    | "INVOICE"
    | "INTERNAL"
    | "FYI";
  confidenceScore: number;
  explanationJson: MessageClassificationResult["explanation"];
  dueDatesJson: MessageClassificationResult["signals"]["dueDates"];
  entitiesJson: MessageClassificationResult["signals"]["entities"];
  taskCandidatesJson: MessageClassificationResult["signals"]["taskCandidates"];
  urgencyLevel: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  urgencyConfidenceScore: number;
  urgencyRationale: string;
  urgencyReasonsJson: MessageClassificationResult["signals"]["urgency"]["reasons"];
  criticalityLevel: "NORMAL" | "ELEVATED" | "CRITICAL";
  criticalityConfidenceScore: number;
  criticalityRationale: string;
  criticalityReasonsJson: MessageClassificationResult["signals"]["criticality"]["reasons"];
  classifiedAt: Date;
};

type TaskRecordRow = {
  id: string;
  taskKey: string;
  mailboxId: string;
  messageId: string | null;
  sourceTaskCandidateId: string | null;
  title: string;
  description: string | null;
  status: "OPEN" | "SNOOZED" | "DELEGATED" | "DONE" | "DISMISSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  criticality: "NORMAL" | "ELEVATED" | "CRITICAL";
  ownerUserId: string | null;
  assignedUserId: string | null;
  delegatedByUserId: string | null;
  snoozedUntil: Date | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolutionReason:
    | "USER_COMPLETED"
    | "USER_DISMISSED"
    | "RESOLVED_BY_WORKFLOW"
    | "DELEGATED"
    | "SNOOZED"
    | null;
  resolutionNote: string | null;
};

type TaskSourceLinkRow = {
  id: string;
  mailboxId: string;
  taskId: string;
  messageId: string;
  sourceKind: "CLASSIFICATION_TASK_CANDIDATE" | "MANUAL" | "WORKFLOW_RULE";
  classificationIngestionVersionKey: string | null;
  classifierVersion: string | null;
  taskCandidateId: string;
  dueDateSignalIds: string[];
  entitySignalIds: string[];
  provenanceJson: MessageClassificationResult["signals"]["taskCandidates"][number]["provenance"];
  createdAt: Date;
};

type TaskLifecycleEventRow = {
  id: string;
  mailboxId: string;
  taskId: string;
  fromStatus: TaskRecordRow["status"] | null;
  toStatus: TaskRecordRow["status"];
  reason:
    | "USER_COMPLETED"
    | "USER_DISMISSED"
    | "RESOLVED_BY_WORKFLOW"
    | "DELEGATED"
    | "SNOOZED";
  actorUserId: string | null;
  delegatedToUserId: string | null;
  note: string | null;
  occurredAt: Date;
};

type MessageWorkflowStateRow = {
  id: string;
  mailboxId: string;
  messageId: string;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  status:
    | "PENDING_TASK_MATERIALIZATION"
    | "ACTIVE_ACTIONABLE"
    | "ACTIVE_INFORMATIONAL_UNREAD"
    | "ACTIVE_INFORMATIONAL_REVIEWED"
    | "FILING_BLOCKED"
    | "ELIGIBLE_TO_FILE";
  filingState:
    | "PENDING_CLASSIFICATION"
    | "ACTIVE_ACTIONABLE"
    | "ACTIVE_INFORMATIONAL_UNREAD"
    | "ELIGIBLE_TO_FILE"
    | "FILED"
    | "FILING_BLOCKED";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  criticality: "NORMAL" | "ELEVATED" | "CRITICAL";
  isEligibleToFile: boolean;
  requirements: Array<
    | "MESSAGE_READ"
    | "ALL_REQUIRED_TASKS_RESOLVED"
    | "CRITICAL_WORK_CLEARED"
    | "MANUAL_REVIEW_COMPLETED"
    | "POLICY_CLEARANCE"
  >;
  blockedBy: Array<
    | "CLASSIFICATION_PENDING"
    | "TASK_MATERIALIZATION_PENDING"
    | "MESSAGE_UNREAD"
    | "OPEN_TASK"
    | "SNOOZED_TASK"
    | "DELEGATED_TASK"
    | "CRITICAL_WORK_REMAINING"
    | "AWAITING_REVIEW"
    | "POLICY_HOLD"
  >;
  blockingTaskIds: string[];
  unresolvedTaskCount: number;
  openTaskCount: number;
  snoozedTaskCount: number;
  delegatedTaskCount: number;
  informationalReadRequired: boolean;
  messageIsRead: boolean;
  lastEvaluatedAt: Date;
};

export function createPrismaMailboxTaskWorkflowService(
  input: CreatePrismaMailboxTaskWorkflowServiceInput
): MailboxTaskWorkflowService {
  const now = input.now ?? (() => new Date());

  return {
    async materializeTasks(materializeInput) {
      await getOwnedMailbox(input.prisma, materializeInput);

      const classification = await input.mailboxClassificationService.classifyMessage({
        session: materializeInput.session,
        mailboxId: materializeInput.mailboxId,
        messageId: materializeInput.messageId
      });
      await persistClassificationSnapshot(input.prisma, classification.result);
      const message = await getMessageRecord(input.prisma, materializeInput);
      const timestamp = now();
      const existingTasks = await loadTasksForMessage(input.prisma, materializeInput);
      const currentLinks = (await input.prisma.taskSourceLink.findMany({
        where: {
          messageId: materializeInput.messageId,
          classificationIngestionVersionKey: classification.ingestionVersionKey,
          classifierVersion: classification.classifierVersion
        }
      })) as unknown as TaskSourceLinkRow[];

      let createdTaskCount = 0;
      let reusedTaskCount = 0;

      for (const taskCandidate of classification.result.signals.taskCandidates) {
        const taskKey = buildTaskKey(
          materializeInput.mailboxId,
          materializeInput.messageId,
          taskCandidate.id
        );
        const existingTask = existingTasks.find((task) => task.taskKey === taskKey);
        const taskRow = (await upsertTaskRecord(input.prisma, {
          taskKey,
          mailboxId: materializeInput.mailboxId,
          messageId: materializeInput.messageId,
          sourceTaskCandidateId: taskCandidate.id,
          title: taskCandidate.title,
          description: taskCandidate.summary ?? taskCandidate.rationale,
          status: existingTask?.status ?? "OPEN",
          priority: toDatabasePriority(classification.result.signals.urgency.level),
          criticality: toDatabaseCriticality(classification.result.signals.criticality.level),
          ownerUserId: existingTask?.ownerUserId ?? materializeInput.session.principal.userId,
          assignedUserId:
            existingTask?.assignedUserId ??
            (existingTask?.status === "DELEGATED"
              ? existingTask.assignedUserId
              : materializeInput.session.principal.userId),
          delegatedByUserId: existingTask?.delegatedByUserId ?? null,
          snoozedUntil: existingTask?.snoozedUntil ?? null,
          dueAt: taskCandidate.dueAt ? new Date(taskCandidate.dueAt) : null,
          createdAt: existingTask?.createdAt ?? timestamp,
          updatedAt: timestamp,
          resolvedAt: existingTask?.resolvedAt ?? null,
          resolutionReason: existingTask?.resolutionReason ?? null,
          resolutionNote: existingTask?.resolutionNote ?? null
        })) as TaskRecordRow;

        const alreadyCurrent = currentLinks.some(
          (link) => link.taskId === taskRow.id && link.taskCandidateId === taskCandidate.id
        );

        if (alreadyCurrent) {
          reusedTaskCount += 1;
        } else if (!existingTask) {
          createdTaskCount += 1;
        } else {
          reusedTaskCount += 1;
        }

        await upsertTaskSourceLink(input.prisma, {
          taskId: taskRow.id,
          mailboxId: materializeInput.mailboxId,
          messageId: materializeInput.messageId,
          sourceKind: "CLASSIFICATION_TASK_CANDIDATE",
          classificationIngestionVersionKey: classification.ingestionVersionKey,
          classifierVersion: classification.classifierVersion,
          taskCandidateId: taskCandidate.id,
          dueDateSignalIds: classification.result.signals.dueDates
            .filter((signal) => !taskCandidate.dueAt || signal.value === taskCandidate.dueAt)
            .map((signal) => signal.id),
          entitySignalIds: classification.result.signals.entities.map((signal) => signal.id),
          provenance: taskCandidate.provenance.map(toDatabaseProvenanceSnapshot),
          createdAt: timestamp
        });
      }

      const refreshedTasks = await loadTasksForMessage(input.prisma, materializeInput);
      const workflowState = await projectMessageWorkflowState({
        prisma: input.prisma,
        message,
        classification: classification.result,
        tasks: refreshedTasks,
        timestamp
      });
      const materializationStatus =
        createdTaskCount === 0 &&
        refreshedTasks.length === classification.result.signals.taskCandidates.length
          ? "already_current"
          : "materialized";

      return {
        mailboxId: materializeInput.mailboxId,
        messageId: materializeInput.messageId,
        ingestionVersionKey: classification.ingestionVersionKey,
        classifierVersion: classification.classifierVersion,
        actionability: classification.result.actionability,
        materializationStatus,
        createdTaskCount,
        reusedTaskCount,
        materializedAt: timestamp.toISOString(),
        workflowState,
        filingEligibility: buildFilingEligibility(workflowState),
        tasks: await buildTaskReadModels(
          input.prisma,
          refreshedTasks,
          [message],
          classification.result
        )
      };
    },

    async transitionTask(transitionInput) {
      await getOwnedMailbox(input.prisma, transitionInput);

      const task = (await input.prisma.task.findFirst({
        where: {
          id: transitionInput.taskId,
          mailboxId: transitionInput.mailboxId
        }
      })) as TaskRecordRow | null;

      if (!task) {
        throw new AppError("TASK_NOT_FOUND", "Workflow task not found.", {
          statusCode: 404
        });
      }

      validateTaskTransition(task, transitionInput);
      const timestamp = now();
      const updatedTask = (await input.prisma.task.update({
        where: {
          id: task.id
        },
        data: buildTaskTransitionUpdate(task, transitionInput, timestamp)
      })) as TaskRecordRow;

      await createTaskLifecycleEvent(input.prisma, {
        mailboxId: transitionInput.mailboxId,
        taskId: task.id,
        fromStatus: task.status,
        toStatus: toDatabaseTaskStatus(transitionInput.status),
        reason: toDatabaseTaskStatusReason(resolveTransitionReason(transitionInput)),
        actorUserId: transitionInput.session.principal.userId,
        delegatedToUserId:
          transitionInput.status === TaskStatus.Delegated
            ? transitionInput.assignedUserId ?? null
            : null,
        note: transitionInput.note ?? null,
        occurredAt: timestamp
      });

      return buildTaskTransitionResult(input.prisma, transitionInput, updatedTask, timestamp);
    },

    async getMessageWorkflowReadModel(readModelInput) {
      await getOwnedMailbox(input.prisma, readModelInput);

      const message = await getMessageRecord(input.prisma, readModelInput);
      const classification = await getStoredCurrentClassification(input.prisma, message);

      if (!classification) {
        throw new AppError(
          "MESSAGE_WORKFLOW_NOT_READY",
          "Workflow state is not available until the message has been classified.",
          {
            statusCode: 404
          }
        );
      }

      const tasks = await loadTasksForMessage(input.prisma, readModelInput);
      const workflowState = await ensureWorkflowState({
        prisma: input.prisma,
        message,
        classification,
        tasks,
        timestamp: now()
      });

      return buildMessageWorkflowReadModel(
        workflowState,
        buildFilingEligibility(workflowState),
        classification,
        await buildTaskReadModels(input.prisma, tasks, [message], classification)
      );
    },

    async getMailboxTaskWorkflowVerification(verificationInput) {
      await getOwnedMailbox(input.prisma, verificationInput);
      return buildMailboxTaskWorkflowVerification(input.prisma, verificationInput.mailboxId, now());
    }
  };
}

async function buildTaskTransitionResult(
  prisma: PrismaClient,
  transitionInput: TransitionTaskInput,
  updatedTask: TaskRecordRow,
  timestamp: Date
) {
  let workflowState: MessageWorkflowStateRecord | undefined;
  let filingEligibility: FilingEligibility | undefined;
  let message: MessageRecord | null = null;
  let classification: StoredClassificationRecord | null = null;

  if (updatedTask.messageId) {
    message = await getMessageRecord(prisma, {
      mailboxId: transitionInput.mailboxId,
      messageId: updatedTask.messageId
    });
    classification = await getStoredCurrentClassification(prisma, message);
    if (classification) {
      const messageTasks = await loadTasksForMessage(prisma, {
        mailboxId: transitionInput.mailboxId,
        messageId: updatedTask.messageId
      });
      workflowState = await projectMessageWorkflowState({
        prisma,
        message,
        classification,
        tasks: messageTasks,
        timestamp
      });
      filingEligibility = buildFilingEligibility(workflowState);
    }
  }

  const taskReadModel = (
    await buildTaskReadModels(
      prisma,
      [updatedTask],
      message ? [message] : [],
      classification
    )
  )[0];

  return {
    mailboxId: transitionInput.mailboxId,
    task: taskReadModel!,
    workflowState,
    filingEligibility
  } satisfies TaskTransitionResult;
}

async function buildMailboxTaskWorkflowVerification(
  prisma: PrismaClient,
  mailboxId: string,
  checkedAt: Date
) {
  const messages = (await prisma.message.findMany({
    where: {
      mailboxId
    }
  })) as MessageRecord[];
  const classifications = (await prisma.messageClassification.findMany({
    where: {
      mailboxId
    }
  })) as unknown as StoredClassificationRecord[];
  const tasks = (await prisma.task.findMany({
    where: {
      mailboxId
    }
  })) as TaskRecordRow[];
  const sourceLinks = (await prisma.taskSourceLink.findMany({
    where: {
      mailboxId
    }
  })) as unknown as TaskSourceLinkRow[];
  const workflowStates = (await prisma.messageWorkflowState.findMany({
    where: {
      mailboxId
    }
  })) as MessageWorkflowStateRow[];

  const lifecycleEvents: TaskLifecycleEventRow[] = [];
  for (const task of tasks) {
    const events = (await prisma.taskLifecycleEvent.findMany({
      where: {
        taskId: task.id
      }
    })) as TaskLifecycleEventRow[];
    lifecycleEvents.push(...events);
  }

  const currentClassifications = messages
    .map((message) =>
      classifications.find(
        (classification) =>
          classification.messageId === message.id &&
          classification.ingestionVersionKey === message.ingestionVersionKey
      )
    )
    .filter((classification): classification is StoredClassificationRecord => Boolean(classification));
  const actionableMessages = currentClassifications.filter(
    (classification) => classification.actionability === "ACTIONABLE"
  );
  const messagesWithTaskCandidates = actionableMessages.filter(
    (classification) => classification.taskCandidatesJson.length > 0
  );
  const pendingMaterializationMessages = messagesWithTaskCandidates.filter(
    (classification) => !tasks.some((task) => task.messageId === classification.messageId)
  );
  const orphanedTaskIds = tasks
    .filter((task) => task.messageId && !messages.some((message) => message.id === task.messageId))
    .map((task) => task.id)
    .sort();
  const taskIdsMissingSourceLinks = tasks
    .filter((task) => !sourceLinks.some((link) => link.taskId === task.id))
    .map((task) => task.id)
    .sort();
  const messageIdsMissingWorkflowState = messagesWithTaskCandidates
    .filter((classification) => !workflowStates.some((state) => state.messageId === classification.messageId))
    .map((classification) => classification.messageId)
    .sort();
  const messageIdsMarkedEligibleWithUnresolvedTasks = workflowStates
    .filter((state) => state.isEligibleToFile && state.unresolvedTaskCount > 0)
    .map((state) => state.messageId)
    .sort();
  const invalidLifecycleTaskIds = tasks
    .filter((task) => {
      const latest = lifecycleEvents
        .filter((event) => event.taskId === task.id)
        .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];
      return latest ? latest.toStatus !== task.status : false;
    })
    .map((task) => task.id)
    .sort();

  const checks = [
    {
      code: "pending_task_materialization",
      status:
        pendingMaterializationMessages.length > 0
          ? VerificationCheckStatus.Warn
          : VerificationCheckStatus.Pass,
      detail:
        pendingMaterializationMessages.length > 0
          ? "At least one actionable classified message still has task candidates but no materialized task."
          : "Every actionable classified message with task candidates has a materialized task."
    },
    {
      code: "task_link_integrity",
      status:
        orphanedTaskIds.length > 0 || taskIdsMissingSourceLinks.length > 0
          ? VerificationCheckStatus.Warn
          : VerificationCheckStatus.Pass,
      detail:
        orphanedTaskIds.length > 0 || taskIdsMissingSourceLinks.length > 0
          ? "Some workflow tasks are missing source linkage or point at missing messages."
          : "Every workflow task is linked back to a source message and task-source record."
    },
    {
      code: "workflow_state_coverage",
      status:
        messageIdsMissingWorkflowState.length > 0
          ? VerificationCheckStatus.Warn
          : VerificationCheckStatus.Pass,
      detail:
        messageIdsMissingWorkflowState.length > 0
          ? "Some actionable classified messages still lack a workflow-state projection."
          : "Every actionable classified message with task candidates has a workflow-state projection."
    },
    {
      code: "eligible_state_consistency",
      status:
        messageIdsMarkedEligibleWithUnresolvedTasks.length > 0 || invalidLifecycleTaskIds.length > 0
          ? VerificationCheckStatus.Fail
          : VerificationCheckStatus.Pass,
      detail:
        messageIdsMarkedEligibleWithUnresolvedTasks.length > 0 || invalidLifecycleTaskIds.length > 0
          ? "Some workflow records are internally inconsistent."
          : "Workflow eligibility and lifecycle transitions are internally consistent."
    }
  ];

  return {
    mailboxId,
    checkedAt: checkedAt.toISOString(),
    overallStatus:
      checks.some((check) => check.status === VerificationCheckStatus.Fail)
        ? OperationalHealthStatus.Critical
        : checks.some((check) => check.status === VerificationCheckStatus.Warn)
          ? OperationalHealthStatus.Warning
          : OperationalHealthStatus.Healthy,
    coverage: {
      classifiedActionableMessages: actionableMessages.length,
      messagesWithTaskCandidates: messagesWithTaskCandidates.length,
      messagesWithMaterializedTasks: messages.filter((message) =>
        tasks.some((task) => task.messageId === message.id)
      ).length,
      pendingMaterializationMessages: pendingMaterializationMessages.length,
      workflowStateMessages: workflowStates.length,
      totalTasks: tasks.length
    },
    integrity: {
      orphanedTaskIds,
      taskIdsMissingSourceLinks,
      messageIdsMissingWorkflowState,
      messageIdsMarkedEligibleWithUnresolvedTasks,
      invalidLifecycleTaskIds
    },
    checks
  } satisfies MailboxTaskWorkflowVerificationReport;
}

async function persistClassificationSnapshot(
  prisma: PrismaClient,
  classification: MessageClassificationResult
) {
  await upsertMessageClassification(prisma, {
    mailboxId: classification.mailboxId,
    messageId: classification.messageId,
    ingestionVersionKey: classification.ingestionVersionKey,
    classifierVersion: classification.classifierVersion,
    actionability: toDatabaseActionability(classification.actionability),
    messageType: toDatabaseMessageType(classification.messageType),
    confidenceScore: classification.confidenceScore,
    explanation: {
      summary: classification.explanation.summary,
      lowConfidence: classification.explanation.lowConfidence,
      reasons: classification.explanation.reasons.map(toDatabaseClassificationReasonSnapshot)
    },
    signals: {
      dueDates: classification.signals.dueDates.map(toDatabaseDueDateSnapshot),
      entities: classification.signals.entities.map((entity) => ({
        ...entity,
        kind: toDatabaseEntityKind(entity.kind),
        provenance: entity.provenance.map(toDatabaseProvenanceSnapshot)
      })),
      taskCandidates: classification.signals.taskCandidates.map(toDatabaseTaskCandidateSnapshot),
      urgency: {
        ...classification.signals.urgency,
        level: toDatabasePriority(classification.signals.urgency.level),
        reasons: classification.signals.urgency.reasons.map(toDatabaseClassificationReasonSnapshot)
      },
      criticality: {
        ...classification.signals.criticality,
        level: toDatabaseCriticality(classification.signals.criticality.level),
        reasons: classification.signals.criticality.reasons.map(
          toDatabaseClassificationReasonSnapshot
        )
      }
    },
    classifiedAt: new Date(classification.classifiedAt)
  });
}

async function getOwnedMailbox(
  prisma: PrismaClient,
  input: {
    session: SessionView;
    mailboxId: string;
  }
) {
  const mailbox = (await prisma.mailbox.findFirst({
    where: {
      id: input.mailboxId,
      tenantId: input.session.principal.tenantId
    },
    include: {
      connection: true
    }
  })) as MailboxOwnershipRecord | null;

  if (!mailbox) {
    throw new AppError("MAILBOX_NOT_FOUND", "Mailbox not found.", {
      statusCode: 404
    });
  }

  if (mailbox.connection && mailbox.connection.userId !== input.session.principal.userId) {
    throw new AppError("MAILBOX_FORBIDDEN", "Mailbox is not available for this user.", {
      statusCode: 403
    });
  }

  return mailbox;
}

async function getMessageRecord(
  prisma: PrismaClient,
  input: {
    mailboxId: string;
    messageId: string;
  }
) {
  const message = (await prisma.message.findFirst({
    where: {
      id: input.messageId,
      mailboxId: input.mailboxId
    }
  })) as MessageRecord | null;

  if (!message) {
    throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
      statusCode: 404
    });
  }

  return message;
}

async function loadTasksForMessage(
  prisma: PrismaClient,
  input: {
    mailboxId: string;
    messageId: string;
  }
) {
  return (await prisma.task.findMany({
    where: {
      mailboxId: input.mailboxId,
      messageId: input.messageId
    }
  })) as TaskRecordRow[];
}

async function getStoredCurrentClassification(prisma: PrismaClient, message: MessageRecord) {
  if (!message.ingestionVersionKey) {
    return null;
  }

  return (await prisma.messageClassification.findFirst({
    where: {
      messageId: message.id,
      ingestionVersionKey: message.ingestionVersionKey
    }
  })) as StoredClassificationRecord | null;
}

async function ensureWorkflowState(input: {
  prisma: PrismaClient;
  message: MessageRecord;
  classification: StoredClassificationRecord | MessageClassificationResult;
  tasks: TaskRecordRow[];
  timestamp: Date;
}) {
  const existing = (await input.prisma.messageWorkflowState.findFirst({
    where: {
      messageId: input.message.id
    }
  })) as MessageWorkflowStateRow | null;

  if (existing) {
    return mapWorkflowState(existing);
  }

  return projectMessageWorkflowState(input);
}

async function projectMessageWorkflowState(input: {
  prisma: PrismaClient;
  message: MessageRecord;
  classification: StoredClassificationRecord | MessageClassificationResult;
  tasks: TaskRecordRow[];
  timestamp: Date;
}) {
  const classification = toClassificationResult(input.classification);
  const openTaskCount = input.tasks.filter((task) => task.status === "OPEN").length;
  const snoozedTaskCount = input.tasks.filter((task) => task.status === "SNOOZED").length;
  const delegatedTaskCount = input.tasks.filter((task) => task.status === "DELEGATED").length;
  const unresolvedTaskCount = openTaskCount + snoozedTaskCount + delegatedTaskCount;

  let status: MessageWorkflowStatus;
  let filingState: FilingState;
  let isEligibleToFile = false;
  let requirements: MessageWorkflowStateRecord["requirements"] = [];
  let blockedBy: MessageWorkflowStateRecord["blockedBy"] = [];

  if (classification.actionability === MessageActionability.Informational) {
    if (input.message.isRead) {
      status = MessageWorkflowStatus.ActiveInformationalReviewed;
      filingState = FilingState.EligibleToFile;
      isEligibleToFile = true;
    } else {
      status = MessageWorkflowStatus.ActiveInformationalUnread;
      filingState = FilingState.ActiveInformationalUnread;
      requirements = ["message_read"];
      blockedBy = ["message_unread"];
    }
  } else if (classification.signals.taskCandidates.length > 0 && input.tasks.length === 0) {
    status = MessageWorkflowStatus.PendingTaskMaterialization;
    filingState = FilingState.FilingBlocked;
    requirements = ["all_required_tasks_resolved"];
    blockedBy = ["task_materialization_pending"];
  } else if (unresolvedTaskCount > 0) {
    status = MessageWorkflowStatus.ActiveActionable;
    filingState = FilingState.ActiveActionable;
    requirements = ["all_required_tasks_resolved"];
    blockedBy = [
      ...(openTaskCount > 0 ? ["open_task" as const] : []),
      ...(snoozedTaskCount > 0 ? ["snoozed_task" as const] : []),
      ...(delegatedTaskCount > 0 ? ["delegated_task" as const] : [])
    ];
  } else if (classification.signals.taskCandidates.length === 0) {
    status = MessageWorkflowStatus.FilingBlocked;
    filingState = FilingState.FilingBlocked;
    requirements = ["manual_review_completed"];
    blockedBy = ["awaiting_review"];
  } else {
    status = MessageWorkflowStatus.EligibleToFile;
    filingState = FilingState.EligibleToFile;
    isEligibleToFile = true;
  }

  const workflowState = (await upsertMessageWorkflowState(input.prisma, {
    mailboxId: input.message.mailboxId,
    messageId: input.message.id,
    actionability: toDatabaseActionability(classification.actionability),
    status: toDatabaseWorkflowStatus(status),
    filingState: toDatabaseFilingState(filingState),
    priority: toDatabasePriority(classification.signals.urgency.level),
    criticality: toDatabaseCriticality(classification.signals.criticality.level),
    isEligibleToFile,
    requirements: requirements.map(toDatabaseRequirement),
    blockedBy: blockedBy.map(toDatabaseBlockedBy),
    blockingTaskIds: input.tasks
      .filter((task) => task.status === "OPEN" || task.status === "SNOOZED" || task.status === "DELEGATED")
      .map((task) => task.id),
    unresolvedTaskCount,
    openTaskCount,
    snoozedTaskCount,
    delegatedTaskCount,
    informationalReadRequired: classification.actionability === MessageActionability.Informational,
    messageIsRead: input.message.isRead,
    lastEvaluatedAt: input.timestamp
  })) as MessageWorkflowStateRow;

  await input.prisma.message.update({
    where: {
      id: input.message.id
    },
    data: {
      actionability: toDatabaseActionability(classification.actionability),
      filingState: toDatabaseFilingState(filingState)
    }
  });

  return mapWorkflowState(workflowState);
}

async function buildTaskReadModels(
  prisma: PrismaClient,
  tasks: TaskRecordRow[],
  messages: MessageRecord[],
  classification: StoredClassificationRecord | MessageClassificationResult | null
) {
  const lifecycleEvents: TaskLifecycleEventRow[] = [];

  for (const task of tasks) {
    const events = (await prisma.taskLifecycleEvent.findMany({
      where: {
        taskId: task.id
      }
    })) as TaskLifecycleEventRow[];
    lifecycleEvents.push(...events);
  }

  const allSourceLinks = (await prisma.taskSourceLink.findMany({
    where: {}
  })) as unknown as TaskSourceLinkRow[];
  const normalizedClassification = classification ? toClassificationResult(classification) : null;

  return tasks.map((task) => {
    const message = messages.find((candidate) => candidate.id === task.messageId);
    const latestLifecycleEvent = lifecycleEvents
      .filter((event) => event.taskId === task.id)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];

    return {
      task: mapTask(task),
      sourceLinks: allSourceLinks
        .filter((link) => link.taskId === task.id)
        .map(mapTaskSourceLink),
      latestLifecycleEvent: latestLifecycleEvent ? mapTaskLifecycleEvent(latestLifecycleEvent) : undefined,
      sourceMessage: {
        mailboxId: task.mailboxId,
        messageId: task.messageId ?? "",
        subject: message?.subject ?? "Unknown message",
        actionability: normalizedClassification?.actionability,
        messageType: normalizedClassification?.messageType,
        filingState: message ? fromDatabaseFilingState(message.filingState) : undefined
      }
    } satisfies TaskWorkflowReadModel;
  });
}

function buildMessageWorkflowReadModel(
  workflowState: MessageWorkflowStateRecord,
  filingEligibility: FilingEligibility,
  classification: StoredClassificationRecord | MessageClassificationResult,
  tasks: TaskWorkflowReadModel[]
) {
  const normalizedClassification = toClassificationResult(classification);

  return {
    mailboxId: workflowState.mailboxId,
    messageId: workflowState.messageId,
    workflowState,
    filingEligibility,
    classification: {
      ingestionVersionKey: normalizedClassification.ingestionVersionKey,
      classifierVersion: normalizedClassification.classifierVersion,
      actionability: normalizedClassification.actionability,
      messageType: normalizedClassification.messageType,
      confidenceScore: normalizedClassification.confidenceScore,
      explanationSummary: normalizedClassification.explanation.summary
    },
    tasks
  } satisfies MessageWorkflowReadModel;
}

function buildFilingEligibility(workflowState: MessageWorkflowStateRecord): FilingEligibility {
  const summary = workflowState.isEligibleToFile
    ? workflowState.status === MessageWorkflowStatus.ActiveInformationalReviewed
      ? "The informational message has been reviewed and is now eligible to file."
      : "The message is eligible to file because all required workflow work is resolved."
    : workflowState.blockedBy.includes("task_materialization_pending")
      ? "The message stays active because task materialization has not completed yet."
      : workflowState.blockedBy.includes("message_unread")
        ? "The message stays visible until it has been reviewed."
        : workflowState.blockedBy.some((value) => value.endsWith("_task"))
          ? "The message stays active because at least one workflow task is still unresolved."
          : "The message is still blocked by workflow requirements.";

  return {
    mailboxId: workflowState.mailboxId,
    messageId: workflowState.messageId,
    workflowStateId: workflowState.id,
    state: workflowState.filingState,
    isEligible: workflowState.isEligibleToFile,
    requirements: workflowState.requirements,
    blockedBy: workflowState.blockedBy,
    summary,
    evaluatedAt: workflowState.lastEvaluatedAt
  };
}

function validateTaskTransition(task: TaskRecordRow, input: TransitionTaskInput) {
  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.Open]: [TaskStatus.Snoozed, TaskStatus.Delegated, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Snoozed]: [TaskStatus.Open, TaskStatus.Delegated, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Delegated]: [TaskStatus.Open, TaskStatus.Done, TaskStatus.Dismissed],
    [TaskStatus.Done]: [],
    [TaskStatus.Dismissed]: []
  };
  const currentStatus = fromDatabaseTaskStatus(task.status);

  if (!allowedTransitions[currentStatus].includes(input.status)) {
    throw new AppError("TASK_TRANSITION_INVALID", "The requested task transition is not allowed.", {
      statusCode: 400
    });
  }

  if (input.status === TaskStatus.Snoozed && !input.snoozedUntil) {
    throw new AppError("TASK_SNOOZE_UNTIL_REQUIRED", "Snoozed tasks require a snoozed-until timestamp.", {
      statusCode: 400
    });
  }

  if (input.status === TaskStatus.Delegated && !input.assignedUserId) {
    throw new AppError("TASK_ASSIGNEE_REQUIRED", "Delegated tasks require an assignee.", {
      statusCode: 400
    });
  }
}

function buildTaskTransitionUpdate(task: TaskRecordRow, input: TransitionTaskInput, timestamp: Date) {
  const reason = resolveTransitionReason(input);

  return {
    status: toDatabaseTaskStatus(input.status),
    updatedAt: timestamp,
    assignedUserId:
      input.status === TaskStatus.Open
        ? task.ownerUserId ?? task.assignedUserId
        : input.status === TaskStatus.Delegated
        ? input.assignedUserId ?? task.assignedUserId
        : task.assignedUserId,
    delegatedByUserId:
      input.status === TaskStatus.Delegated
        ? input.session.principal.userId
        : input.status === TaskStatus.Open
          ? null
          : task.delegatedByUserId,
    snoozedUntil:
      input.status === TaskStatus.Snoozed && input.snoozedUntil
        ? new Date(input.snoozedUntil)
        : null,
    resolvedAt:
      input.status === TaskStatus.Done || input.status === TaskStatus.Dismissed ? timestamp : null,
    resolutionReason:
      input.status === TaskStatus.Done || input.status === TaskStatus.Dismissed
        ? toDatabaseTaskStatusReason(reason)
        : null,
    resolutionNote:
      input.status === TaskStatus.Done || input.status === TaskStatus.Dismissed
        ? input.note ?? null
        : null
  };
}

function resolveTransitionReason(input: TransitionTaskInput) {
  if (input.reason) {
    return input.reason;
  }

  switch (input.status) {
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

function buildTaskKey(mailboxId: string, messageId: string, taskCandidateId: string) {
  return `task:${mailboxId}:${messageId}:${taskCandidateId}`;
}

function toClassificationResult(
  classification: StoredClassificationRecord | MessageClassificationResult
): MessageClassificationResult {
  if ("signals" in classification) {
    return classification;
  }

  return {
    mailboxId: classification.mailboxId,
    messageId: classification.messageId,
    ingestionVersionKey: classification.ingestionVersionKey,
    classifiedAt: classification.classifiedAt.toISOString(),
    classifierVersion: classification.classifierVersion,
    actionability: fromDatabaseActionability(classification.actionability),
    messageType: fromDatabaseMessageType(classification.messageType),
    confidenceScore: classification.confidenceScore,
    explanation: {
      summary: classification.explanationJson.summary,
      lowConfidence: classification.explanationJson.lowConfidence,
      reasons: classification.explanationJson.reasons.map(mapClassificationReasonFromDatabase)
    },
    signals: {
      dueDates: classification.dueDatesJson.map(mapDueDateSignalFromDatabase),
      entities: classification.entitiesJson.map(mapWorkflowEntitySignalFromDatabase),
      taskCandidates: classification.taskCandidatesJson.map(mapTaskCandidateSignalFromDatabase),
      urgency: {
        level: fromDatabasePriority(classification.urgencyLevel),
        confidenceScore: classification.urgencyConfidenceScore,
        rationale: classification.urgencyRationale,
        reasons: classification.urgencyReasonsJson.map(mapClassificationReasonFromDatabase)
      },
      criticality: {
        level: fromDatabaseCriticality(classification.criticalityLevel),
        confidenceScore: classification.criticalityConfidenceScore,
        rationale: classification.criticalityRationale,
        reasons: classification.criticalityReasonsJson.map(mapClassificationReasonFromDatabase)
      }
    }
  };
}

function mapTask(task: TaskRecordRow) {
  return {
    id: task.id,
    mailboxId: task.mailboxId,
    sourceMessageId: task.messageId ?? undefined,
    sourceTaskCandidateId: task.sourceTaskCandidateId ?? undefined,
    title: task.title,
    status: fromDatabaseTaskStatus(task.status),
    priority: fromDatabasePriority(task.priority),
    criticality: fromDatabaseCriticality(task.criticality),
    ownerUserId: task.ownerUserId ?? undefined,
    assignedUserId: task.assignedUserId ?? undefined,
    delegatedByUserId: task.delegatedByUserId ?? undefined,
    snoozedUntil: task.snoozedUntil?.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    dueAt: task.dueAt?.toISOString(),
    description: task.description ?? undefined,
    createdAt: task.createdAt.toISOString(),
    resolvedAt: task.resolvedAt?.toISOString(),
    resolutionReason: task.resolutionReason
      ? fromDatabaseTaskStatusReason(task.resolutionReason)
      : undefined,
    resolutionNote: task.resolutionNote ?? undefined
  };
}

function mapTaskSourceLink(link: TaskSourceLinkRow) {
  return {
    id: link.id,
    mailboxId: link.mailboxId,
    taskId: link.taskId,
    messageId: link.messageId,
    sourceKind: fromDatabaseTaskSourceKind(link.sourceKind),
    classificationIngestionVersionKey: link.classificationIngestionVersionKey ?? undefined,
    classifierVersion: link.classifierVersion ?? undefined,
    taskCandidateId: link.taskCandidateId,
    dueDateSignalIds: link.dueDateSignalIds,
    entitySignalIds: link.entitySignalIds,
    provenance: mapWorkflowSignalProvenanceArrayFromDatabase(link.provenanceJson),
    createdAt: link.createdAt.toISOString()
  };
}

function mapTaskLifecycleEvent(event: TaskLifecycleEventRow) {
  return {
    id: event.id,
    mailboxId: event.mailboxId,
    taskId: event.taskId,
    fromStatus: event.fromStatus ? fromDatabaseTaskStatus(event.fromStatus) : undefined,
    toStatus: fromDatabaseTaskStatus(event.toStatus),
    reason: fromDatabaseTaskStatusReason(event.reason),
    actorUserId: event.actorUserId ?? undefined,
    delegatedToUserId: event.delegatedToUserId ?? undefined,
    note: event.note ?? undefined,
    occurredAt: event.occurredAt.toISOString()
  };
}

function mapWorkflowState(state: MessageWorkflowStateRow): MessageWorkflowStateRecord {
  return {
    id: state.id,
    mailboxId: state.mailboxId,
    messageId: state.messageId,
    actionability: fromDatabaseActionability(state.actionability),
    status: fromDatabaseWorkflowStatus(state.status),
    filingState: fromDatabaseFilingState(state.filingState),
    priority: fromDatabasePriority(state.priority),
    criticality: fromDatabaseCriticality(state.criticality),
    isEligibleToFile: state.isEligibleToFile,
    requirements: state.requirements.map(fromDatabaseRequirement),
    blockedBy: state.blockedBy.map(fromDatabaseBlockedBy),
    blockingTaskIds: state.blockingTaskIds,
    unresolvedTaskCount: state.unresolvedTaskCount,
    openTaskCount: state.openTaskCount,
    snoozedTaskCount: state.snoozedTaskCount,
    delegatedTaskCount: state.delegatedTaskCount,
    informationalReadRequired: state.informationalReadRequired,
    messageIsRead: state.messageIsRead,
    lastEvaluatedAt: state.lastEvaluatedAt.toISOString()
  };
}

function mapClassificationReasonFromDatabase(
  reason: MessageClassificationResult["explanation"]["reasons"][number]
) {
  return {
    code: fromDatabaseClassificationReasonCode(String(reason.code)),
    summary: reason.summary,
    provenance: reason.provenance
      ? mapWorkflowSignalProvenanceArrayFromDatabase(reason.provenance)
      : undefined
  };
}

function mapDueDateSignalFromDatabase(
  dueDate: MessageClassificationResult["signals"]["dueDates"][number]
) {
  return {
    ...dueDate,
    provenance: mapWorkflowSignalProvenanceArrayFromDatabase(dueDate.provenance)
  };
}

function mapWorkflowEntitySignalFromDatabase(
  entity: MessageClassificationResult["signals"]["entities"][number]
) {
  return {
    ...entity,
    kind: fromDatabaseWorkflowEntityKind(String(entity.kind)),
    provenance: mapWorkflowSignalProvenanceArrayFromDatabase(entity.provenance)
  };
}

function mapTaskCandidateSignalFromDatabase(
  taskCandidate: MessageClassificationResult["signals"]["taskCandidates"][number]
) {
  return {
    ...taskCandidate,
    provenance: mapWorkflowSignalProvenanceArrayFromDatabase(taskCandidate.provenance)
  };
}

function mapWorkflowSignalProvenanceArrayFromDatabase(
  provenance: MessageClassificationResult["signals"]["taskCandidates"][number]["provenance"]
) {
  return provenance.map((entry) => ({
    ...entry,
    sourceKind: fromDatabaseWorkflowSignalSourceKind(String(entry.sourceKind))
  }));
}

function toDatabaseProvenanceSnapshot(
  provenance: MessageClassificationResult["signals"]["taskCandidates"][number]["provenance"][number]
) {
  return {
    sourceKind: toDatabaseWorkflowSignalSourceKind(provenance.sourceKind),
    attachmentId: provenance.attachmentId,
    artifactId: provenance.artifactId,
    field: provenance.field,
    excerpt: provenance.excerpt
  };
}

function toDatabaseClassificationReasonSnapshot(
  reason: MessageClassificationResult["explanation"]["reasons"][number]
) {
  return {
    code: toDatabaseClassificationReasonCode(reason.code),
    summary: reason.summary,
    provenance: reason.provenance?.map(toDatabaseProvenanceSnapshot)
  };
}

function toDatabaseDueDateSnapshot(
  dueDate: MessageClassificationResult["signals"]["dueDates"][number]
) {
  return {
    ...dueDate,
    provenance: dueDate.provenance.map(toDatabaseProvenanceSnapshot)
  };
}

function toDatabaseTaskCandidateSnapshot(
  taskCandidate: MessageClassificationResult["signals"]["taskCandidates"][number]
) {
  return {
    ...taskCandidate,
    provenance: taskCandidate.provenance.map(toDatabaseProvenanceSnapshot)
  };
}

function toDatabaseActionability(value: MessageActionability) {
  return value === MessageActionability.Actionable ? "ACTIONABLE" : "INFORMATIONAL";
}

function fromDatabaseActionability(value: "ACTIONABLE" | "INFORMATIONAL") {
  return value === "ACTIONABLE"
    ? MessageActionability.Actionable
    : MessageActionability.Informational;
}

function toDatabasePriority(value: MessagePriority) {
  switch (value) {
    case MessagePriority.Low:
      return "LOW" as const;
    case MessagePriority.High:
      return "HIGH" as const;
    case MessagePriority.Critical:
      return "CRITICAL" as const;
    default:
      return "NORMAL" as const;
  }
}

function fromDatabasePriority(value: "LOW" | "NORMAL" | "HIGH" | "CRITICAL") {
  switch (value) {
    case "LOW":
      return MessagePriority.Low;
    case "HIGH":
      return MessagePriority.High;
    case "CRITICAL":
      return MessagePriority.Critical;
    default:
      return MessagePriority.Normal;
  }
}

function toDatabaseCriticality(value: WorkflowCriticalityLevel) {
  switch (value) {
    case WorkflowCriticalityLevel.Elevated:
      return "ELEVATED" as const;
    case WorkflowCriticalityLevel.Critical:
      return "CRITICAL" as const;
    default:
      return "NORMAL" as const;
  }
}

function fromDatabaseCriticality(value: "NORMAL" | "ELEVATED" | "CRITICAL") {
  switch (value) {
    case "ELEVATED":
      return WorkflowCriticalityLevel.Elevated;
    case "CRITICAL":
      return WorkflowCriticalityLevel.Critical;
    default:
      return WorkflowCriticalityLevel.Normal;
  }
}

function fromDatabaseMessageType(value: StoredClassificationRecord["messageType"]) {
  switch (value) {
    case "CONTRACT":
      return MessageType.Contract;
    case "NOTICE":
      return MessageType.Notice;
    case "LETTER":
      return MessageType.Letter;
    case "POLICY":
      return MessageType.Policy;
    case "COMMITTEE":
      return MessageType.Committee;
    case "EVENT":
      return MessageType.Event;
    case "INVOICE":
      return MessageType.Invoice;
    case "INTERNAL":
      return MessageType.Internal;
    default:
      return MessageType.Fyi;
  }
}

function toDatabaseMessageType(value: MessageType) {
  switch (value) {
    case MessageType.Contract:
      return "CONTRACT" as const;
    case MessageType.Notice:
      return "NOTICE" as const;
    case MessageType.Letter:
      return "LETTER" as const;
    case MessageType.Policy:
      return "POLICY" as const;
    case MessageType.Committee:
      return "COMMITTEE" as const;
    case MessageType.Event:
      return "EVENT" as const;
    case MessageType.Invoice:
      return "INVOICE" as const;
    case MessageType.Internal:
      return "INTERNAL" as const;
    default:
      return "FYI" as const;
  }
}

function toDatabaseEntityKind(
  value: MessageClassificationResult["signals"]["entities"][number]["kind"]
) {
  switch (value) {
    case "counterparty":
      return "COUNTERPARTY" as const;
    case "committee":
      return "COMMITTEE" as const;
    case "event":
      return "EVENT" as const;
    case "invoice":
      return "INVOICE" as const;
    case "person":
      return "PERSON" as const;
    case "organization":
      return "ORGANIZATION" as const;
    case "policy":
      return "POLICY" as const;
    default:
      return "DOCUMENT" as const;
  }
}

function toDatabaseWorkflowSignalSourceKind(
  value: MessageClassificationResult["signals"]["taskCandidates"][number]["provenance"][number]["sourceKind"]
) {
  switch (value) {
    case "message_metadata":
      return "MESSAGE_METADATA" as const;
    case "body_text":
      return "BODY_TEXT" as const;
    case "unique_body_text":
      return "UNIQUE_BODY_TEXT" as const;
    case "attachment_text":
      return "ATTACHMENT_TEXT" as const;
    default:
      return "ATTACHMENT_OCR" as const;
  }
}

function fromDatabaseWorkflowSignalSourceKind(value: string) {
  switch (value) {
    case "MESSAGE_METADATA":
    case WorkflowSignalSourceKind.MessageMetadata:
      return WorkflowSignalSourceKind.MessageMetadata;
    case "BODY_TEXT":
    case WorkflowSignalSourceKind.BodyText:
      return WorkflowSignalSourceKind.BodyText;
    case "UNIQUE_BODY_TEXT":
    case WorkflowSignalSourceKind.UniqueBodyText:
      return WorkflowSignalSourceKind.UniqueBodyText;
    case "ATTACHMENT_TEXT":
    case WorkflowSignalSourceKind.AttachmentText:
      return WorkflowSignalSourceKind.AttachmentText;
    default:
      return WorkflowSignalSourceKind.AttachmentOcr;
  }
}

function toDatabaseClassificationReasonCode(
  value: MessageClassificationResult["explanation"]["reasons"][number]["code"]
) {
  switch (value) {
    case "action_requested":
      return "ACTION_REQUESTED" as const;
    case "due_date_detected":
      return "DUE_DATE_DETECTED" as const;
    case "deadline_cue_detected":
      return "DEADLINE_CUE_DETECTED" as const;
    case "invoice_cue_detected":
      return "INVOICE_CUE_DETECTED" as const;
    case "notice_cue_detected":
      return "NOTICE_CUE_DETECTED" as const;
    case "counterparty_detected":
      return "COUNTERPARTY_DETECTED" as const;
    case "attachment_evidence_used":
      return "ATTACHMENT_EVIDENCE_USED" as const;
    case "low_confidence":
      return "LOW_CONFIDENCE" as const;
    default:
      return "AMBIGUOUS_CONTENT" as const;
  }
}

function fromDatabaseClassificationReasonCode(value: string) {
  switch (value) {
    case "ACTION_REQUESTED":
    case ClassificationReasonCode.ActionRequested:
      return ClassificationReasonCode.ActionRequested;
    case "DUE_DATE_DETECTED":
    case ClassificationReasonCode.DueDateDetected:
      return ClassificationReasonCode.DueDateDetected;
    case "DEADLINE_CUE_DETECTED":
    case ClassificationReasonCode.DeadlineCueDetected:
      return ClassificationReasonCode.DeadlineCueDetected;
    case "INVOICE_CUE_DETECTED":
    case ClassificationReasonCode.InvoiceCueDetected:
      return ClassificationReasonCode.InvoiceCueDetected;
    case "NOTICE_CUE_DETECTED":
    case ClassificationReasonCode.NoticeCueDetected:
      return ClassificationReasonCode.NoticeCueDetected;
    case "COUNTERPARTY_DETECTED":
    case ClassificationReasonCode.CounterpartyDetected:
      return ClassificationReasonCode.CounterpartyDetected;
    case "ATTACHMENT_EVIDENCE_USED":
    case ClassificationReasonCode.AttachmentEvidenceUsed:
      return ClassificationReasonCode.AttachmentEvidenceUsed;
    case "LOW_CONFIDENCE":
    case ClassificationReasonCode.LowConfidence:
      return ClassificationReasonCode.LowConfidence;
    default:
      return ClassificationReasonCode.AmbiguousContent;
  }
}

function fromDatabaseWorkflowEntityKind(value: string) {
  switch (value) {
    case "COUNTERPARTY":
    case WorkflowEntityKind.Counterparty:
      return WorkflowEntityKind.Counterparty;
    case "COMMITTEE":
    case WorkflowEntityKind.Committee:
      return WorkflowEntityKind.Committee;
    case "EVENT":
    case WorkflowEntityKind.Event:
      return WorkflowEntityKind.Event;
    case "INVOICE":
    case WorkflowEntityKind.Invoice:
      return WorkflowEntityKind.Invoice;
    case "PERSON":
    case WorkflowEntityKind.Person:
      return WorkflowEntityKind.Person;
    case "ORGANIZATION":
    case WorkflowEntityKind.Organization:
      return WorkflowEntityKind.Organization;
    case "POLICY":
    case WorkflowEntityKind.Policy:
      return WorkflowEntityKind.Policy;
    default:
      return WorkflowEntityKind.Document;
  }
}

function toDatabaseWorkflowStatus(value: MessageWorkflowStatus) {
  switch (value) {
    case MessageWorkflowStatus.PendingTaskMaterialization:
      return "PENDING_TASK_MATERIALIZATION" as const;
    case MessageWorkflowStatus.ActiveActionable:
      return "ACTIVE_ACTIONABLE" as const;
    case MessageWorkflowStatus.ActiveInformationalUnread:
      return "ACTIVE_INFORMATIONAL_UNREAD" as const;
    case MessageWorkflowStatus.ActiveInformationalReviewed:
      return "ACTIVE_INFORMATIONAL_REVIEWED" as const;
    case MessageWorkflowStatus.FilingBlocked:
      return "FILING_BLOCKED" as const;
    default:
      return "ELIGIBLE_TO_FILE" as const;
  }
}

function fromDatabaseWorkflowStatus(value: MessageWorkflowStateRow["status"]) {
  switch (value) {
    case "PENDING_TASK_MATERIALIZATION":
      return MessageWorkflowStatus.PendingTaskMaterialization;
    case "ACTIVE_ACTIONABLE":
      return MessageWorkflowStatus.ActiveActionable;
    case "ACTIVE_INFORMATIONAL_UNREAD":
      return MessageWorkflowStatus.ActiveInformationalUnread;
    case "ACTIVE_INFORMATIONAL_REVIEWED":
      return MessageWorkflowStatus.ActiveInformationalReviewed;
    case "FILING_BLOCKED":
      return MessageWorkflowStatus.FilingBlocked;
    default:
      return MessageWorkflowStatus.EligibleToFile;
  }
}

function toDatabaseFilingState(value: FilingState) {
  switch (value) {
    case FilingState.ActiveActionable:
      return "ACTIVE_ACTIONABLE" as const;
    case FilingState.ActiveInformationalUnread:
      return "ACTIVE_INFORMATIONAL_UNREAD" as const;
    case FilingState.EligibleToFile:
      return "ELIGIBLE_TO_FILE" as const;
    case FilingState.Filed:
      return "FILED" as const;
    case FilingState.FilingBlocked:
      return "FILING_BLOCKED" as const;
    default:
      return "PENDING_CLASSIFICATION" as const;
  }
}

function fromDatabaseFilingState(value: MessageRecord["filingState"] | MessageWorkflowStateRow["filingState"]) {
  switch (value) {
    case "ACTIVE_ACTIONABLE":
      return FilingState.ActiveActionable;
    case "ACTIVE_INFORMATIONAL_UNREAD":
      return FilingState.ActiveInformationalUnread;
    case "ELIGIBLE_TO_FILE":
      return FilingState.EligibleToFile;
    case "FILED":
      return FilingState.Filed;
    case "FILING_BLOCKED":
      return FilingState.FilingBlocked;
    default:
      return FilingState.PendingClassification;
  }
}

function toDatabaseRequirement(value: MessageWorkflowStateRecord["requirements"][number]) {
  switch (value) {
    case "message_read":
      return "MESSAGE_READ" as const;
    case "critical_work_cleared":
      return "CRITICAL_WORK_CLEARED" as const;
    case "manual_review_completed":
      return "MANUAL_REVIEW_COMPLETED" as const;
    case "policy_clearance":
      return "POLICY_CLEARANCE" as const;
    default:
      return "ALL_REQUIRED_TASKS_RESOLVED" as const;
  }
}

function fromDatabaseRequirement(value: MessageWorkflowStateRow["requirements"][number]) {
  switch (value) {
    case "MESSAGE_READ":
      return "message_read" as const;
    case "CRITICAL_WORK_CLEARED":
      return "critical_work_cleared" as const;
    case "MANUAL_REVIEW_COMPLETED":
      return "manual_review_completed" as const;
    case "POLICY_CLEARANCE":
      return "policy_clearance" as const;
    default:
      return "all_required_tasks_resolved" as const;
  }
}

function toDatabaseBlockedBy(value: MessageWorkflowStateRecord["blockedBy"][number]) {
  switch (value) {
    case "classification_pending":
      return "CLASSIFICATION_PENDING" as const;
    case "task_materialization_pending":
      return "TASK_MATERIALIZATION_PENDING" as const;
    case "message_unread":
      return "MESSAGE_UNREAD" as const;
    case "snoozed_task":
      return "SNOOZED_TASK" as const;
    case "delegated_task":
      return "DELEGATED_TASK" as const;
    case "critical_work_remaining":
      return "CRITICAL_WORK_REMAINING" as const;
    case "awaiting_review":
      return "AWAITING_REVIEW" as const;
    case "policy_hold":
      return "POLICY_HOLD" as const;
    default:
      return "OPEN_TASK" as const;
  }
}

function fromDatabaseBlockedBy(value: MessageWorkflowStateRow["blockedBy"][number]) {
  switch (value) {
    case "CLASSIFICATION_PENDING":
      return "classification_pending" as const;
    case "TASK_MATERIALIZATION_PENDING":
      return "task_materialization_pending" as const;
    case "MESSAGE_UNREAD":
      return "message_unread" as const;
    case "SNOOZED_TASK":
      return "snoozed_task" as const;
    case "DELEGATED_TASK":
      return "delegated_task" as const;
    case "CRITICAL_WORK_REMAINING":
      return "critical_work_remaining" as const;
    case "AWAITING_REVIEW":
      return "awaiting_review" as const;
    case "POLICY_HOLD":
      return "policy_hold" as const;
    default:
      return "open_task" as const;
  }
}

function fromDatabaseTaskStatus(value: TaskRecordRow["status"]) {
  switch (value) {
    case "SNOOZED":
      return TaskStatus.Snoozed;
    case "DELEGATED":
      return TaskStatus.Delegated;
    case "DONE":
      return TaskStatus.Done;
    case "DISMISSED":
      return TaskStatus.Dismissed;
    default:
      return TaskStatus.Open;
  }
}

function toDatabaseTaskStatus(value: TaskStatus) {
  switch (value) {
    case TaskStatus.Snoozed:
      return "SNOOZED" as const;
    case TaskStatus.Delegated:
      return "DELEGATED" as const;
    case TaskStatus.Done:
      return "DONE" as const;
    case TaskStatus.Dismissed:
      return "DISMISSED" as const;
    default:
      return "OPEN" as const;
  }
}

function fromDatabaseTaskStatusReason(
  value: NonNullable<TaskRecordRow["resolutionReason"]> | TaskLifecycleEventRow["reason"]
) {
  switch (value) {
    case "USER_COMPLETED":
      return TaskStatusReason.UserCompleted;
    case "USER_DISMISSED":
      return TaskStatusReason.UserDismissed;
    case "DELEGATED":
      return TaskStatusReason.Delegated;
    case "SNOOZED":
      return TaskStatusReason.Snoozed;
    default:
      return TaskStatusReason.ResolvedByWorkflow;
  }
}

function toDatabaseTaskStatusReason(value: TaskStatusReason) {
  switch (value) {
    case TaskStatusReason.UserCompleted:
      return "USER_COMPLETED" as const;
    case TaskStatusReason.UserDismissed:
      return "USER_DISMISSED" as const;
    case TaskStatusReason.Delegated:
      return "DELEGATED" as const;
    case TaskStatusReason.Snoozed:
      return "SNOOZED" as const;
    default:
      return "RESOLVED_BY_WORKFLOW" as const;
  }
}

function fromDatabaseTaskSourceKind(value: TaskSourceLinkRow["sourceKind"]) {
  switch (value) {
    case "MANUAL":
      return TaskSourceKind.Manual;
    case "WORKFLOW_RULE":
      return TaskSourceKind.WorkflowRule;
    default:
      return TaskSourceKind.ClassificationTaskCandidate;
  }
}
