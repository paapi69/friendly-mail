import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  ClassificationReasonCode,
  MailSurface,
  MessageActionability,
  MessagePriority,
  MessageType,
  OperationalHealthStatus,
  TaskSourceKind,
  TaskStatus,
  TaskStatusReason,
  TenantUserRole,
  VerificationCheckStatus,
  WorkflowCriticalityLevel,
  WorkflowEntityKind,
  WorkflowSignalSourceKind
} from "@friendly-mail/contracts";
import {
  createPrismaMailboxTaskWorkflowService
} from "./mailbox-task-workflow-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-05T18:00:00.000Z",
  surface: MailSurface.Dashboard,
  principal: {
    userId: "user_123",
    tenantId: "tenant_123",
    email: "owner@friendlymail.dev",
    displayName: "Owner",
    role: TenantUserRole.Admin,
    authProvider: AuthProvider.LocalPassword
  },
  authBoundary: {
    productIdentity: "friendly_mail_internal" as const,
    mailboxIdentity: "microsoft_graph" as const,
    graphConnectionState: "connected" as const
  }
};

describe("mailbox task workflow service", () => {
  it("materializes repeat-safe tasks from current classification output and projects active workflow state", async () => {
    const prisma = createWorkflowTestPrisma();
    const classificationService = {
      classifyMessage: vi.fn().mockResolvedValue(createClassificationResult()),
      getMessageClassificationReadModel: vi.fn()
    };
    const service = createPrismaMailboxTaskWorkflowService({
      prisma: prisma.client as never,
      logger: silentLogger(),
      mailboxClassificationService: classificationService,
      now: () => new Date("2026-04-05T11:00:00.000Z")
    });

    const firstResult = await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(firstResult.materializationStatus).toBe("materialized");
    expect(firstResult.createdTaskCount).toBe(1);
    expect(firstResult.reusedTaskCount).toBe(0);
    expect(firstResult.tasks).toHaveLength(1);
    expect(firstResult.tasks[0]?.task.title).toBe("Pay invoice INV-42");
    expect(firstResult.tasks[0]?.task.priority).toBe(MessagePriority.High);
    expect(firstResult.tasks[0]?.sourceLinks[0]).toEqual(
      expect.objectContaining({
        sourceKind: TaskSourceKind.ClassificationTaskCandidate,
        dueDateSignalIds: ["due_date_123"],
        entitySignalIds: ["entity_invoice_123"],
        classifierVersion: "rules-classifier:v1"
      })
    );
    expect(firstResult.workflowState.status).toBe("active_actionable");
    expect(firstResult.filingEligibility.blockedBy).toEqual(["open_task"]);
    expect(firstResult.filingEligibility.summary).toContain("unresolved");

    const secondResult = await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(secondResult.materializationStatus).toBe("already_current");
    expect(secondResult.createdTaskCount).toBe(0);
    expect(secondResult.reusedTaskCount).toBe(1);
    expect(classificationService.classifyMessage).toHaveBeenCalledTimes(2);
  });

  it("records lifecycle transitions for delegation and completion, then refreshes filing eligibility", async () => {
    const prisma = createWorkflowTestPrisma();
    const classificationService = {
      classifyMessage: vi.fn().mockResolvedValue(createClassificationResult()),
      getMessageClassificationReadModel: vi.fn()
    };
    const service = createPrismaMailboxTaskWorkflowService({
      prisma: prisma.client as never,
      logger: silentLogger(),
      mailboxClassificationService: classificationService,
      now: () => new Date("2026-04-05T11:00:00.000Z")
    });

    const materialized = await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
    const taskId = materialized.tasks[0]?.task.id;

    const delegated = await service.transitionTask({
      session: exampleSession,
      mailboxId: "mailbox_123",
      taskId: taskId!,
      status: TaskStatus.Delegated,
      reason: TaskStatusReason.Delegated,
      assignedUserId: "user_delegate",
      note: "Finance will handle payment."
    });

    expect(delegated.task.task.status).toBe(TaskStatus.Delegated);
    expect(delegated.task.task.assignedUserId).toBe("user_delegate");
    expect(delegated.task.latestLifecycleEvent).toEqual(
      expect.objectContaining({
        toStatus: TaskStatus.Delegated,
        reason: TaskStatusReason.Delegated
      })
    );
    expect(delegated.workflowState?.blockedBy).toEqual(["delegated_task"]);

    const completed = await service.transitionTask({
      session: exampleSession,
      mailboxId: "mailbox_123",
      taskId: taskId!,
      status: TaskStatus.Done,
      reason: TaskStatusReason.UserCompleted,
      note: "Invoice has been paid."
    });

    expect(completed.task.task.status).toBe(TaskStatus.Done);
    expect(completed.task.task.resolutionReason).toBe(TaskStatusReason.UserCompleted);
    expect(completed.workflowState?.isEligibleToFile).toBe(true);
    expect(completed.filingEligibility?.summary).toContain("eligible");

    await expect(
      service.transitionTask({
        session: exampleSession,
        mailboxId: "mailbox_123",
        taskId: taskId!,
        status: TaskStatus.Snoozed,
        reason: TaskStatusReason.Snoozed,
        snoozedUntil: "2026-04-06T09:00:00.000Z"
      })
    ).rejects.toMatchObject({
      code: "TASK_TRANSITION_INVALID"
    });

    const reopened = await service.transitionTask({
      session: exampleSession,
      mailboxId: "mailbox_123",
      taskId: taskId!,
      status: TaskStatus.Open
    });

    expect(reopened.task.task.status).toBe(TaskStatus.Open);
    expect(reopened.task.task.resolutionReason).toBeUndefined();
    expect(reopened.workflowState?.blockedBy).toEqual(["open_task"]);
    expect(reopened.filingEligibility?.isEligible).toBe(false);
  });

  it("builds a workflow read model with linked tasks, classification context, and filing-blocker explanations", async () => {
    const prisma = createWorkflowTestPrisma();
    const service = createPrismaMailboxTaskWorkflowService({
      prisma: prisma.client as never,
      logger: silentLogger(),
      mailboxClassificationService: {
        classifyMessage: vi.fn().mockResolvedValue(createClassificationResult())
      },
      now: () => new Date("2026-04-05T11:00:00.000Z")
    });

    await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    const readModel = await service.getMessageWorkflowReadModel({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(readModel.classification).toEqual(
      expect.objectContaining({
        messageType: MessageType.Invoice,
        actionability: MessageActionability.Actionable
      })
    );
    expect(readModel.tasks[0]?.sourceLinks[0]?.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: WorkflowSignalSourceKind.BodyText
        })
      ])
    );
    expect(readModel.filingEligibility.blockedBy).toEqual(["open_task"]);
    expect(readModel.filingEligibility.summary).toContain("unresolved");
  });

  it("resolves the workflow read model from an immutable Graph message ID", async () => {
    const prisma = createWorkflowTestPrisma();
    const service = createPrismaMailboxTaskWorkflowService({
      prisma: prisma.client as never,
      logger: silentLogger(),
      mailboxClassificationService: {
        classifyMessage: vi.fn().mockResolvedValue(createClassificationResult())
      },
      now: () => new Date("2026-04-05T11:00:00.000Z")
    });

    await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    const readModel = await service.getMessageWorkflowReadModelByGraphMessageId({
      session: exampleSession,
      mailboxId: "mailbox_123",
      graphMessageId: "graph_message_123"
    });

    expect(readModel.messageId).toBe("message_123");
    expect(readModel.workflowState.messageId).toBe("message_123");
  });

  it("reports task-workflow verification coverage and integrity gaps before delayed filing depends on the state engine", async () => {
    const prisma = createWorkflowTestPrisma({
      extraMessages: [
        {
          id: "message_pending",
          mailboxId: "mailbox_123",
          subject: "Formal notice",
          isRead: false,
          ingestionVersionKey: "mailbox_123:graph_message_pending:change_key_789"
        }
      ],
      extraClassifications: [
        {
          mailboxId: "mailbox_123",
          messageId: "message_pending",
          ingestionVersionKey: "mailbox_123:graph_message_pending:change_key_789",
          classifierVersion: "rules-classifier:v1",
          classifiedAt: new Date("2026-04-05T10:45:00.000Z"),
          actionability: "ACTIONABLE",
          messageType: "NOTICE",
          confidenceScore: 0.89,
          explanationJson: {
            summary: "Formal notice with response required.",
            lowConfidence: false,
            reasons: [
              {
                code: ClassificationReasonCode.NoticeCueDetected,
                summary: "Formal notice language appears in the attachment text."
              }
            ]
          },
          dueDatesJson: [],
          entitiesJson: [],
          taskCandidatesJson: [
            {
              id: "task_candidate_notice",
              title: "Respond to the formal notice",
              confidenceScore: 0.83,
              rationale: "The notice requests a formal response.",
              provenance: [
                {
                  sourceKind: WorkflowSignalSourceKind.AttachmentText,
                  attachmentId: "attachment_notice",
                  artifactId: "artifact_notice"
                }
              ]
            }
          ],
          urgencyLevel: "HIGH",
          urgencyConfidenceScore: 0.86,
          urgencyRationale: "Response required language raises urgency.",
          urgencyReasonsJson: [],
          criticalityLevel: "CRITICAL",
          criticalityConfidenceScore: 0.92,
          criticalityRationale: "Formal notices are high risk.",
          criticalityReasonsJson: []
        }
      ],
      extraTasks: [
        {
          id: "task_orphan",
          taskKey: "task:orphan",
          mailboxId: "mailbox_123",
          messageId: "missing_message",
          sourceTaskCandidateId: "missing_task_candidate",
          title: "Orphaned task",
          description: null,
          status: "OPEN",
          priority: "NORMAL",
          criticality: "NORMAL",
          ownerUserId: "user_123",
          assignedUserId: "user_123",
          delegatedByUserId: null,
          snoozedUntil: null,
          dueAt: null,
          createdAt: new Date("2026-04-05T09:00:00.000Z"),
          updatedAt: new Date("2026-04-05T09:00:00.000Z"),
          resolvedAt: null,
          resolutionReason: null,
          resolutionNote: null
        }
      ]
    });
    const service = createPrismaMailboxTaskWorkflowService({
      prisma: prisma.client as never,
      logger: silentLogger(),
      mailboxClassificationService: {
        classifyMessage: vi.fn().mockResolvedValue(createClassificationResult())
      },
      now: () => new Date("2026-04-05T11:30:00.000Z")
    });

    await service.materializeTasks({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    const report = await service.getMailboxTaskWorkflowVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(report.overallStatus).toBe(OperationalHealthStatus.Warning);
    expect(report.coverage.pendingMaterializationMessages).toBe(1);
    expect(report.integrity.orphanedTaskIds).toEqual(["task_orphan"]);
    expect(report.integrity.messageIdsMissingWorkflowState).toEqual(["message_pending"]);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "pending_task_materialization",
          status: VerificationCheckStatus.Warn
        })
      ])
    );
  });
});

function silentLogger() {
  return {
    child() {
      return this;
    },
    debug() {
      return undefined;
    },
    info() {
      return undefined;
    },
    warn() {
      return undefined;
    },
    error() {
      return undefined;
    }
  };
}

function createClassificationResult() {
  return {
    mailboxId: "mailbox_123",
    messageId: "message_123",
    graphMessageId: "graph_message_123",
    ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
    idempotencyKey: "mailbox_123:graph_message_123:change_key_456:rules-classifier:v1",
    classifierVersion: "rules-classifier:v1",
    processingStatus: "processed" as const,
    classificationStatus: "classified" as const,
    classifiedAt: "2026-04-05T10:55:00.000Z",
    result: {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      classifiedAt: "2026-04-05T10:55:00.000Z",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      confidenceScore: 0.91,
      explanation: {
        summary: "The message requests invoice payment by a stated due date.",
        lowConfidence: false,
        reasons: [
          {
            code: ClassificationReasonCode.DueDateDetected,
            summary: "A due date appears in the message body."
          }
        ]
      },
      signals: {
        dueDates: [
          {
            id: "due_date_123",
            label: "Invoice due date",
            value: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.9,
            rationale: "The body says payment is due by April 12.",
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "bodyText"
              }
            ]
          }
        ],
        entities: [
          {
            id: "entity_invoice_123",
            kind: WorkflowEntityKind.Invoice,
            value: "INV-42",
            normalizedValue: "inv-42",
            confidenceScore: 0.88,
            rationale: "An invoice identifier appears in the message.",
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
            id: "task_candidate_123",
            title: "Pay invoice INV-42",
            summary: "Review and pay the attached invoice before the due date.",
            dueAt: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.84,
            rationale: "The message explicitly asks for invoice payment by a due date.",
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "bodyText"
              }
            ]
          }
        ],
        urgency: {
          level: MessagePriority.High,
          confidenceScore: 0.84,
          rationale: "The invoice due date is near-term.",
          reasons: []
        },
        criticality: {
          level: WorkflowCriticalityLevel.Elevated,
          confidenceScore: 0.79,
          rationale: "Missing payment creates operational follow-up.",
          reasons: []
        }
      }
    }
  };
}

function createWorkflowTestPrisma(input?: {
  extraMessages?: Array<{
    id: string;
    mailboxId: string;
    subject: string;
    isRead: boolean;
    ingestionVersionKey: string;
  }>;
  extraClassifications?: Array<Record<string, unknown>>;
  extraTasks?: Array<Record<string, unknown>>;
}) {
  const mailbox = {
    id: "mailbox_123",
    tenantId: "tenant_123",
    connection: {
      userId: "user_123"
    }
  };
  const messages = [
    {
      id: "message_123",
      mailboxId: "mailbox_123",
      graphMessageId: "graph_message_123",
      subject: "Invoice due Friday",
      actionability: null,
      filingState: "PENDING_CLASSIFICATION",
      isRead: false,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
    },
    ...(input?.extraMessages ?? []).map((message) => ({
      graphMessageId: `${message.id}_graph`,
      actionability: null,
      filingState: "PENDING_CLASSIFICATION",
      ...message
    }))
  ];
  const classifications = [
    ...(input?.extraClassifications ?? [])
  ] as Array<Record<string, unknown>>;
  const tasks = [
    ...(input?.extraTasks ?? [])
  ] as Array<Record<string, unknown>>;
  const sourceLinks: Array<Record<string, unknown>> = [];
  const lifecycleEvents: Array<Record<string, unknown>> = [];
  const workflowStates: Array<Record<string, unknown>> = [];

  const client = {
    mailbox: {
      findFirst: vi.fn().mockResolvedValue(mailbox)
    },
    message: {
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          messages.find(
            (message) =>
              message.mailboxId === where.mailboxId &&
              ((where.id && message.id === where.id) ||
                (where.graphMessageId && message.graphMessageId === where.graphMessageId))
          ) ?? null
        );
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return messages.filter((message) => message.mailboxId === where.mailboxId);
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const index = messages.findIndex((message) => message.id === where.id);
        messages[index] = {
          ...messages[index],
          ...data
        };
        return messages[index];
      })
    },
    messageClassification: {
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          classifications.find(
            (classification) =>
              classification.messageId === where.messageId &&
              classification.ingestionVersionKey === where.ingestionVersionKey
          ) ?? null
        );
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return classifications.filter((classification) => classification.mailboxId === where.mailboxId);
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: { messageId_ingestionVersionKey_classifierVersion: Record<string, unknown> }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const key = where.messageId_ingestionVersionKey_classifierVersion;
        const existingIndex = classifications.findIndex(
          (classification) =>
            classification.messageId === key.messageId &&
            classification.ingestionVersionKey === key.ingestionVersionKey &&
            classification.classifierVersion === key.classifierVersion
        );
        if (existingIndex >= 0) {
          classifications[existingIndex] = {
            ...classifications[existingIndex],
            ...update
          };
          return classifications[existingIndex];
        }

        const created = {
          id: create.id ?? `classification_${classifications.length + 1}`,
          ...create
        };
        classifications.push(created);
        return created;
      })
    },
    task: {
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          tasks.find((task) => {
            if (where.id) {
              return task.id === where.id && task.mailboxId === where.mailboxId;
            }

            if (where.taskKey) {
              return task.taskKey === where.taskKey;
            }

            return false;
          }) ?? null
        );
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return tasks.filter((task) => {
          if (where.mailboxId && task.mailboxId !== where.mailboxId) {
            return false;
          }
          if (where.messageId && task.messageId !== where.messageId) {
            return false;
          }
          return true;
        });
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existingIndex = tasks.findIndex((task) => task.taskKey === where.taskKey);
        if (existingIndex >= 0) {
          tasks[existingIndex] = {
            ...tasks[existingIndex],
            ...update
          };
          return tasks[existingIndex];
        }

        const created = {
          id: create.id ?? `task_${tasks.length + 1}`,
          ...create
        };
        tasks.push(created);
        return created;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const index = tasks.findIndex((task) => task.id === where.id);
        tasks[index] = {
          ...tasks[index],
          ...data
        };
        return tasks[index];
      })
    },
    taskSourceLink: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return sourceLinks.filter((link) => {
          if (where.messageId && link.messageId !== where.messageId) {
            return false;
          }
          if (where.taskId && link.taskId !== where.taskId) {
            return false;
          }
          if (
            where.classificationIngestionVersionKey &&
            link.classificationIngestionVersionKey !== where.classificationIngestionVersionKey
          ) {
            return false;
          }
          if (where.classifierVersion && link.classifierVersion !== where.classifierVersion) {
            return false;
          }
          return true;
        });
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: { taskId_sourceKind_messageId_taskCandidateId: Record<string, unknown> }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const key = where.taskId_sourceKind_messageId_taskCandidateId;
        const existingIndex = sourceLinks.findIndex(
          (link) =>
            link.taskId === key.taskId &&
            link.sourceKind === key.sourceKind &&
            link.messageId === key.messageId &&
            link.taskCandidateId === key.taskCandidateId
        );
        if (existingIndex >= 0) {
          sourceLinks[existingIndex] = {
            ...sourceLinks[existingIndex],
            ...update
          };
          return sourceLinks[existingIndex];
        }

        const created = {
          id: create.id ?? `task_link_${sourceLinks.length + 1}`,
          ...create
        };
        sourceLinks.push(created);
        return created;
      })
    },
    taskLifecycleEvent: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return lifecycleEvents.filter((event) => event.taskId === where.taskId);
      }),
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        const created = {
          id: `task_event_${lifecycleEvents.length + 1}`,
          ...data
        };
        lifecycleEvents.push(created);
        return created;
      })
    },
    messageWorkflowState: {
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return workflowStates.find((state) => state.messageId === where.messageId) ?? null;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return workflowStates.filter((state) => state.mailboxId === where.mailboxId);
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const existingIndex = workflowStates.findIndex((state) => state.messageId === where.messageId);
        if (existingIndex >= 0) {
          workflowStates[existingIndex] = {
            ...workflowStates[existingIndex],
            ...update
          };
          return workflowStates[existingIndex];
        }

        const created = {
          id: create.id ?? `workflow_state_${workflowStates.length + 1}`,
          ...create
        };
        workflowStates.push(created);
        return created;
      })
    }
  };

  return {
    client,
    state: {
      messages,
      classifications,
      tasks,
      sourceLinks,
      lifecycleEvents,
      workflowStates
    }
  };
}
