import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  FilingDecisionStatus,
  FilingState,
  MailSurface,
  MailboxActionMode,
  MailboxActionStatus,
  MailboxActionType,
  MessageActionability,
  MessagePriority,
  MessageType,
  OperationalHealthStatus,
  TenantUserRole,
  VerificationCheckStatus,
  WorkflowCriticalityLevel
} from "@friendly-mail/contracts";
import { createPrismaMailboxActionService } from "./mailbox-action-service";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";

const encryptionKey = "12345678901234567890123456789012";
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

describe("mailbox action service", () => {
  it("derives a blocked filing decision from workflow state with suggested target metadata", async () => {
    const rig = createActionTestRig({
      workflow: createWorkflowReadModel({
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        eligibleToFile: false,
        blockedBy: ["open_task"],
        summary: "The message stays active because one workflow task is still open."
      })
    });
    const service = createPrismaMailboxActionService(rig.serviceInput);

    const result = await service.evaluateFilingDecision({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result.decision.status).toBe(FilingDecisionStatus.Blocked);
    expect(result.targetFolder).toEqual(
      expect.objectContaining({
        name: "Invoices"
      })
    );
    expect(result.decision.suggestedCategories).toEqual(
      expect.arrayContaining(["FriendlyMail/Actionable", "FriendlyMail/Invoice"])
    );
    expect(rig.store.filingDecisions[0]?.actionability).toBe("ACTIONABLE");
  });

  it("creates suggestion-only category and move attempts without mutating the message", async () => {
    const rig = createActionTestRig({
      workflow: createWorkflowReadModel({
        actionability: MessageActionability.Informational,
        messageType: MessageType.Fyi,
        eligibleToFile: true,
        isRead: true,
        blockedBy: [],
        requirements: ["message_read"],
        summary: "The message is eligible to file because it has been reviewed."
      })
    });
    const service = createPrismaMailboxActionService(rig.serviceInput);

    const result = await service.executeFiling({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: MailboxActionMode.SuggestionOnly
    });

    expect(result.decision.status).toBe(FilingDecisionStatus.Eligible);
    expect(result.attempts.some((attempt) => attempt.actionType === MailboxActionType.MoveMessage)).toBe(
      true
    );
    expect(result.attempts.every((attempt) => attempt.status === MailboxActionStatus.Suggested)).toBe(
      true
    );
    expect(rig.store.messages[0]?.filingState).toBe("ACTIVE_INFORMATIONAL_UNREAD");
  });

  it("applies categories and files an eligible message when approval mode is used", async () => {
    const rig = createActionTestRig({
      message: {
        isRead: true,
        filingState: "ELIGIBLE_TO_FILE"
      },
      workflow: createWorkflowReadModel({
        actionability: MessageActionability.Informational,
        messageType: MessageType.Fyi,
        eligibleToFile: true,
        isRead: true,
        blockedBy: [],
        requirements: ["message_read"],
        summary: "The message is eligible to file because it has been reviewed."
      }),
      graph: {
        getMessageDetail: vi.fn().mockResolvedValue({
          id: "graph_message_123",
          categories: [],
          subject: "Weekly FYI",
          isDraft: false,
          isRead: true
        }),
        updateMessage: vi.fn().mockResolvedValue({
          id: "graph_message_123",
          changeKey: "change_key_999",
          subject: "Weekly FYI"
        }),
        moveMessage: vi.fn().mockResolvedValue({
          id: "graph_message_123",
          parentFolderId: "graph_folder_archive",
          changeKey: "change_key_1000",
          subject: "Weekly FYI",
          isRead: true
        })
      }
    });
    const service = createPrismaMailboxActionService(rig.serviceInput);

    const result = await service.executeFiling({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: MailboxActionMode.ApprovedApply
    });

    expect(result.decision.status).toBe(FilingDecisionStatus.Executed);
    expect(result.message?.filingState).toBe(FilingState.Filed);
    expect(rig.store.messages[0]?.filingState).toBe("FILED");
    expect(rig.store.auditEvents.map((event) => event.action)).toEqual(
      expect.arrayContaining(["message.categorized", "message.filed"])
    );
  });

  it("routes invoice messages through the forward mailbox action path", async () => {
    const rig = createActionTestRig({
      workflow: createWorkflowReadModel({
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        eligibleToFile: false,
        blockedBy: ["open_task"],
        summary: "The invoice is still open but can be routed to AP."
      }),
      graph: {
        forwardMessage: vi.fn().mockResolvedValue(undefined)
      }
    });
    const service = createPrismaMailboxActionService(rig.serviceInput);

    const result = await service.routeInvoiceMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      forwardTo: "ap@friendlymail.dev",
      mode: MailboxActionMode.ApprovedApply
    });

    expect(result.attempts[0]).toEqual(
      expect.objectContaining({
        actionType: MailboxActionType.ForwardMessage,
        status: MailboxActionStatus.Succeeded,
        forwardedTo: "ap@friendlymail.dev"
      })
    );
    expect(rig.store.auditEvents.some((event) => event.action === "message.forwarded")).toBe(true);
  });

  it("allocates and stamps outgoing reference numbers for draft messages", async () => {
    const rig = createActionTestRig({
      graph: {
        getMessageDetail: vi.fn().mockResolvedValue({
          id: "graph_message_123",
          categories: [],
          subject: "Board update",
          isDraft: true,
          isRead: false
        }),
        updateMessage: vi.fn().mockResolvedValue({
          id: "graph_message_123",
          changeKey: "change_key_2000",
          subject: "[FM-2026-0001] Board update"
        })
      }
    });
    const service = createPrismaMailboxActionService(rig.serviceInput);

    const result = await service.stampOutgoingReference({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: MailboxActionMode.ApprovedApply
    });

    expect(result.attempts[0]).toEqual(
      expect.objectContaining({
        actionType: MailboxActionType.StampOutgoingReference,
        status: MailboxActionStatus.Succeeded,
        referenceNumber: "FM-2026-0001"
      })
    );
    expect(rig.store.messages[0]?.subject).toBe("[FM-2026-0001] Board update");
    expect(rig.store.auditEvents.some((event) => event.action === "message.numbered")).toBe(true);
  });

  it("reports delayed-filing readiness gaps and failed specialized actions", async () => {
    const rig = createActionTestRig();
    rig.store.messages.push({
      id: "message_filed_without_move",
      mailboxId: "mailbox_123",
      graphMessageId: "graph_message_filed_without_move",
      graphParentFolderId: "graph_folder_archive",
      graphChangeKey: "change_key_456",
      subject: "Filed message",
      isRead: true,
      actionability: "INFORMATIONAL",
      filingState: "FILED"
    });
    rig.store.mailboxActionAttempts.push({
      id: "attempt_failed_forward",
      mailboxId: "mailbox_123",
      messageId: "message_123",
      filingDecisionId: null,
      actionType: "FORWARD_MESSAGE",
      mode: "APPROVED_APPLY",
      status: "FAILED",
      actorUserId: "user_123",
      attemptedAt: new Date("2026-04-05T11:00:00.000Z"),
      completedAt: new Date("2026-04-05T11:00:01.000Z"),
      forwardedTo: "ap@friendlymail.dev",
      errorCode: "GRAPH_SEND_BLOCKED",
      errorMessage: "Forwarding is unavailable."
    });

    const service = createPrismaMailboxActionService(rig.serviceInput);
    const report = await service.getMailboxActionVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(report.overallStatus).toBe(OperationalHealthStatus.Critical);
    expect(report.integrity.messageIdsMissingDecision).toEqual(
      expect.arrayContaining(["message_123", "message_filed_without_move"])
    );
    expect(report.capabilityGaps.routingBlockedMessageIds).toEqual(["message_123"]);
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "filed_move_audit",
          status: VerificationCheckStatus.Fail
        })
      ])
    );
  });
});

function createActionTestRig(input?: {
  message?: Partial<Record<string, unknown>>;
  workflow?: ReturnType<typeof createWorkflowReadModel>;
  graph?: Partial<Record<string, ReturnType<typeof vi.fn>>>;
}) {
  const tokenCiphertext = encryptMicrosoftToken("graph_access_token", encryptionKey);
  const store = {
    mailbox: {
      id: "mailbox_123",
      tenantId: "tenant_123",
      connection: {
        userId: "user_123",
        status: "ACTIVE",
        accessTokenCiphertext: tokenCiphertext
      }
    },
    messages: [
      {
        id: "message_123",
        mailboxId: "mailbox_123",
        folderId: "folder_inbox",
        graphMessageId: "graph_message_123",
        graphParentFolderId: "graph_folder_inbox",
        graphChangeKey: "change_key_123",
        subject: "Weekly FYI",
        isRead: false,
        actionability: "INFORMATIONAL",
        filingState: "ACTIVE_INFORMATIONAL_UNREAD",
        ...(input?.message ?? {})
      }
    ] as Array<Record<string, unknown>>,
    folders: [
      {
        id: "folder_inbox",
        mailboxId: "mailbox_123",
        graphFolderId: "graph_folder_inbox",
        displayName: "Inbox"
      },
      {
        id: "folder_archive",
        mailboxId: "mailbox_123",
        graphFolderId: "graph_folder_archive",
        displayName: "Archive"
      },
      {
        id: "folder_invoices",
        mailboxId: "mailbox_123",
        graphFolderId: "graph_folder_invoices",
        displayName: "Invoices"
      }
    ] as Array<Record<string, unknown>>,
    filingDecisions: [] as Array<Record<string, unknown>>,
    mailboxActionAttempts: [] as Array<Record<string, unknown>>,
    outgoingSequences: [] as Array<Record<string, unknown>>,
    workflowStates: [] as Array<Record<string, unknown>>,
    auditEvents: [] as Array<Record<string, unknown>>
  };

  const graphClient = {
    getMessageDetail: input?.graph?.getMessageDetail ?? vi.fn().mockResolvedValue({
      id: "graph_message_123",
      categories: [],
      subject: store.messages[0]?.subject,
      isDraft: false,
      isRead: store.messages[0]?.isRead
    }),
    updateMessage: input?.graph?.updateMessage ?? vi.fn().mockResolvedValue({
      id: "graph_message_123",
      changeKey: "change_key_124",
      subject: store.messages[0]?.subject
    }),
    moveMessage: input?.graph?.moveMessage ?? vi.fn().mockResolvedValue({
      id: "graph_message_123",
      parentFolderId: "graph_folder_archive",
      changeKey: "change_key_125",
      subject: store.messages[0]?.subject,
      isRead: true
    }),
    forwardMessage: input?.graph?.forwardMessage ?? vi.fn().mockResolvedValue(undefined)
  };

  const prisma = {
    mailbox: {
      findFirst: vi.fn().mockResolvedValue(store.mailbox)
    },
    message: {
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          store.messages.find(
            (message) => message.id === where.id && message.mailboxId === where.mailboxId
          ) ?? null
        );
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return store.messages.filter((message) => message.mailboxId === where.mailboxId);
      }),
      update: vi.fn().mockImplementation(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const index = store.messages.findIndex((message) => message.id === where.id);
        store.messages[index] = {
          ...store.messages[index],
          ...data
        };
        return store.messages[index];
      })
    },
    folder: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return store.folders.filter((folder) => folder.mailboxId === where.mailboxId);
      }),
      findFirst: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return (
          store.folders.find(
            (folder) =>
              folder.mailboxId === where.mailboxId &&
              (!where.graphFolderId || folder.graphFolderId === where.graphFolderId)
          ) ?? null
        );
      })
    },
    filingDecision: {
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const index = store.filingDecisions.findIndex(
          (decision) => decision.messageId === where.messageId
        );
        if (index >= 0) {
          store.filingDecisions[index] = {
            ...store.filingDecisions[index],
            ...update
          };
          return store.filingDecisions[index];
        }

        const created = {
          id: `filing_decision_${store.filingDecisions.length + 1}`,
          ...create
        };
        store.filingDecisions.push(created);
        return created;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return store.filingDecisions.filter((decision) => decision.mailboxId === where.mailboxId);
      })
    },
    mailboxActionAttempt: {
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        const created = {
          id: `attempt_${store.mailboxActionAttempts.length + 1}`,
          ...data
        };
        store.mailboxActionAttempts.push(created);
        return created;
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
        return store.mailboxActionAttempts.filter((attempt) => attempt.mailboxId === where.mailboxId);
      })
    },
    outgoingSequence: {
      findUnique: vi.fn().mockImplementation(async ({ where }: { where: { mailboxId_sequenceKey: Record<string, unknown> } }) => {
        const key = where.mailboxId_sequenceKey;
        return (
          store.outgoingSequences.find(
            (sequence) =>
              sequence.mailboxId === key.mailboxId && sequence.sequenceKey === key.sequenceKey
          ) ?? null
        );
      }),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: { mailboxId_sequenceKey: Record<string, unknown> }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const key = where.mailboxId_sequenceKey;
        const index = store.outgoingSequences.findIndex(
          (sequence) =>
            sequence.mailboxId === key.mailboxId && sequence.sequenceKey === key.sequenceKey
        );
        if (index >= 0) {
          store.outgoingSequences[index] = {
            ...store.outgoingSequences[index],
            ...update
          };
          return store.outgoingSequences[index];
        }

        const createdRow = {
          id: `sequence_${store.outgoingSequences.length + 1}`,
          ...create
        };
        store.outgoingSequences.push(createdRow);
        return createdRow;
      })
    },
    messageWorkflowState: {
      upsert: vi.fn().mockImplementation(async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const index = store.workflowStates.findIndex((state) => state.messageId === where.messageId);
        if (index >= 0) {
          store.workflowStates[index] = {
            ...store.workflowStates[index],
            ...update
          };
          return store.workflowStates[index];
        }

        const created = {
          id: `workflow_state_${store.workflowStates.length + 1}`,
          ...create
        };
        store.workflowStates.push(created);
        return created;
      })
    },
    auditEvent: {
      create: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        const created = {
          id: `audit_${store.auditEvents.length + 1}`,
          ...data
        };
        store.auditEvents.push(created);
        return created;
      })
    }
  };

  return {
    store,
    graphClient,
    serviceInput: {
      prisma: prisma as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      mailboxTaskWorkflowService: {
        getMessageWorkflowReadModel: vi
          .fn()
          .mockResolvedValue(input?.workflow ?? createWorkflowReadModel())
      },
      createGraphClient: vi.fn().mockReturnValue(graphClient)
    }
  };
}

function createWorkflowReadModel(input?: {
  actionability?: MessageActionability;
  messageType?: MessageType;
  eligibleToFile?: boolean;
  isRead?: boolean;
  blockedBy?: string[];
  requirements?: string[];
  summary?: string;
}) {
  const actionability = input?.actionability ?? MessageActionability.Informational;
  const eligibleToFile = input?.eligibleToFile ?? false;
  const isRead = input?.isRead ?? false;
  const blockedBy = input?.blockedBy ?? ["awaiting_review"];
  const requirements = input?.requirements ?? ["manual_review_completed"];

  return {
    mailboxId: "mailbox_123",
    messageId: "message_123",
    workflowState: {
      id: "workflow_state_123",
      mailboxId: "mailbox_123",
      messageId: "message_123",
      actionability,
      status: eligibleToFile ? "eligible_to_file" : actionability === MessageActionability.Actionable ? "active_actionable" : "active_informational_reviewed",
      filingState: eligibleToFile ? FilingState.EligibleToFile : actionability === MessageActionability.Actionable ? FilingState.ActiveActionable : FilingState.ActiveInformationalUnread,
      priority: MessagePriority.Normal,
      criticality: WorkflowCriticalityLevel.Normal,
      isEligibleToFile: eligibleToFile,
      requirements,
      blockedBy,
      blockingTaskIds: blockedBy.length > 0 ? ["task_123"] : [],
      unresolvedTaskCount: blockedBy.length > 0 ? 1 : 0,
      openTaskCount: blockedBy.includes("open_task") ? 1 : 0,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      informationalReadRequired: actionability === MessageActionability.Informational,
      messageIsRead: isRead,
      lastEvaluatedAt: "2026-04-05T11:00:00.000Z"
    },
    filingEligibility: {
      messageId: "message_123",
      isEligible: eligibleToFile,
      requirements,
      blockedBy,
      summary:
        input?.summary ??
        (eligibleToFile
          ? "The message is eligible to file."
          : "The message is blocked from filing."),
      rationale: "Workflow state determines delayed-filing readiness."
    },
    classification: {
      ingestionVersionKey: "version_123",
      classifierVersion: "rules-classifier:v1",
      actionability,
      messageType: input?.messageType ?? MessageType.Fyi,
      confidenceScore: 0.88,
      explanationSummary: "The current workflow classification is stable."
    },
    tasks: []
  };
}

function silentLogger() {
  return {
    child() {
      return this;
    },
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
}
