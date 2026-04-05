import {
  AuditEventAction,
  FilingDecisionStatus,
  FilingState,
  MailboxActionMode,
  MailboxActionStatus,
  MailboxActionType,
  MessageActionability,
  MessagePriority,
  MessageType,
  OperationalHealthStatus,
  VerificationCheckStatus,
  WorkflowCriticalityLevel,
  type FilingDecisionReadModel,
  type FilingEligibility,
  type MailboxActionExecutionResult,
  type MailboxActionVerificationReport,
  type MessageWorkflowReadModel,
  type MessageWorkflowStateRecord,
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  allocateOutgoingSequenceNumber,
  createMailboxActionAttempt,
  recordAuditEvent,
  upsertFilingDecision,
  upsertMessageWorkflowState
} from "@friendly-mail/database";
import { createGraphConnector, type FetchLike } from "@friendly-mail/graph";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";
import { type MailboxTaskWorkflowService } from "./mailbox-task-workflow-service";

type MailboxActionEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type EvaluateFilingDecisionInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
  mode?: MailboxActionMode;
};

type ExecuteFilingInput = EvaluateFilingDecisionInput;

type RouteInvoiceMessageInput = EvaluateFilingDecisionInput & {
  forwardTo: string;
  comment?: string;
};

type StampOutgoingReferenceInput = EvaluateFilingDecisionInput & {
  prefix?: string;
  sequenceKey?: string;
};

type GetMailboxActionVerificationInput = {
  session: SessionView;
  mailboxId: string;
};

export type MailboxActionService = {
  evaluateFilingDecision(input: EvaluateFilingDecisionInput): Promise<FilingDecisionReadModel>;
  executeFiling(input: ExecuteFilingInput): Promise<MailboxActionExecutionResult>;
  routeInvoiceMessage(input: RouteInvoiceMessageInput): Promise<MailboxActionExecutionResult>;
  stampOutgoingReference(input: StampOutgoingReferenceInput): Promise<MailboxActionExecutionResult>;
  getMailboxActionVerification(
    input: GetMailboxActionVerificationInput
  ): Promise<MailboxActionVerificationReport>;
};

type GraphClient = ReturnType<typeof createGraphConnector>;

type CreatePrismaMailboxActionServiceInput = {
  prisma: PrismaClient;
  env: MailboxActionEnv;
  logger: Logger;
  mailboxTaskWorkflowService: Pick<
    MailboxTaskWorkflowService,
    "getMessageWorkflowReadModel"
  >;
  fetch?: FetchLike;
  now?: () => Date;
  createGraphClient?: (accessToken: string, mailboxId: string) => GraphClient;
};

type MailboxRow = {
  id: string;
  tenantId: string;
  connection: {
    userId: string;
    status:
      | "PENDING_CONSENT"
      | "ACTIVE"
      | "NEEDS_REAUTH"
      | "FAILED"
      | "DISCONNECTED";
    accessTokenCiphertext?: string | null;
  } | null;
};

type MessageRow = {
  id: string;
  mailboxId: string;
  folderId?: string | null;
  graphMessageId?: string | null;
  graphParentFolderId?: string | null;
  graphChangeKey?: string | null;
  subject: string;
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

type FolderRow = {
  id: string;
  mailboxId: string;
  graphFolderId: string;
  displayName: string;
};

type FilingDecisionRow = {
  id: string;
  mailboxId: string;
  messageId: string;
  workflowStateId?: string | null;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  status: "BLOCKED" | "ELIGIBLE" | "EXECUTED" | "FAILED";
  mode: "SUGGESTION_ONLY" | "AUTO_APPLY" | "APPROVED_APPLY";
  targetFolderId?: string | null;
  targetFolderGraphId?: string | null;
  targetFolderName?: string | null;
  suggestedCategories: string[];
  requirements: string[];
  blockedBy: string[];
  summary: string;
  rationale?: string | null;
  sourceMessageIsRead: boolean;
  approvedByUserId?: string | null;
  decidedAt: Date;
  executedAt?: Date | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
};

type MailboxActionAttemptRow = {
  id: string;
  mailboxId: string;
  messageId: string;
  filingDecisionId?: string | null;
  actionType: "MOVE_MESSAGE" | "APPLY_CATEGORY" | "FORWARD_MESSAGE" | "STAMP_OUTGOING_REFERENCE";
  mode: "SUGGESTION_ONLY" | "AUTO_APPLY" | "APPROVED_APPLY";
  status: "SUGGESTED" | "PENDING_APPROVAL" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  actorUserId?: string | null;
  targetFolderId?: string | null;
  targetFolderGraphId?: string | null;
  targetFolderName?: string | null;
  categoryName?: string | null;
  forwardedTo?: string | null;
  referenceNumber?: string | null;
  graphMessageId?: string | null;
  graphRequestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  attemptedAt: Date;
  completedAt?: Date | null;
};

type DecisionContext = {
  mailbox: MailboxRow;
  message: MessageRow;
  workflow: MessageWorkflowReadModel;
  targetFolder?: {
    id?: string;
    graphFolderId?: string;
    name: string;
    source: "mailbox_folder" | "well_known";
  };
  suggestedCategories: string[];
  status: FilingDecisionStatus;
  mode: MailboxActionMode;
  timestamp: Date;
};

export function createPrismaMailboxActionService(
  input: CreatePrismaMailboxActionServiceInput
): MailboxActionService {
  const now = input.now ?? (() => new Date());

  const createGraphClient =
    input.createGraphClient ??
    ((accessToken: string, mailboxId: string) =>
      createGraphConnector({
        tokenProvider: async () => accessToken,
        fetch: input.fetch,
        logger: input.logger.child({
          integration: "microsoft-graph",
          mailboxId
        })
      }));

  return {
    async evaluateFilingDecision(decisionInput) {
      const context = await loadDecisionContext(input.prisma, input.mailboxTaskWorkflowService, {
        ...decisionInput,
        mode: decisionInput.mode ?? MailboxActionMode.SuggestionOnly,
        timestamp: now()
      });
      const persisted = (await upsertFilingDecision(input.prisma, {
        mailboxId: context.mailbox.id,
        messageId: context.message.id,
        workflowStateId: context.workflow.workflowState.id,
        actionability: toDatabaseActionability(context.workflow.workflowState.actionability),
        status: toDatabaseDecisionStatus(context.status),
        mode: toDatabaseActionMode(context.mode),
        targetFolderId: context.targetFolder?.id ?? null,
        targetFolderGraphId: context.targetFolder?.graphFolderId ?? null,
        targetFolderName: context.targetFolder?.name ?? null,
        suggestedCategories: context.suggestedCategories,
        requirements: context.workflow.filingEligibility.requirements.map(toDatabaseRequirement),
        blockedBy: context.workflow.filingEligibility.blockedBy.map(toDatabaseBlockedBy),
        summary: buildDecisionSummary(context),
        rationale: buildDecisionRationale(context),
        sourceMessageIsRead: context.message.isRead,
        approvedByUserId:
          context.mode === MailboxActionMode.ApprovedApply
            ? decisionInput.session.principal.userId
            : null,
        decidedAt: context.timestamp,
        executedAt:
          context.status === FilingDecisionStatus.Executed ? context.timestamp : null,
        lastErrorCode: null,
        lastErrorMessage: null
      })) as FilingDecisionRow;

      return buildFilingDecisionReadModel(
        persisted,
        context.workflow,
        context.targetFolder,
        buildRecommendedActions(context)
      );
    },

    async executeFiling(executionInput) {
      return executeFilingAction(input, createGraphClient, {
        ...executionInput,
        mode: executionInput.mode ?? MailboxActionMode.SuggestionOnly,
        timestamp: now()
      });
    },

    async routeInvoiceMessage(routeInput) {
      return routeInvoiceAction(input, createGraphClient, {
        ...routeInput,
        mode: routeInput.mode ?? MailboxActionMode.SuggestionOnly,
        timestamp: now()
      });
    },

    async stampOutgoingReference(numberingInput) {
      return stampOutgoingReferenceAction(input, createGraphClient, {
        ...numberingInput,
        mode: numberingInput.mode ?? MailboxActionMode.SuggestionOnly,
        timestamp: now()
      });
    },

    async getMailboxActionVerification(verificationInput) {
      const mailbox = await getOwnedMailbox(input.prisma, verificationInput);
      return buildMailboxActionVerification(input.prisma, mailbox.id, now());
    }
  };
}

async function executeFilingAction(
  input: CreatePrismaMailboxActionServiceInput,
  createGraphClient: (accessToken: string, mailboxId: string) => GraphClient,
  executionInput: ExecuteFilingInput & { mode: MailboxActionMode; timestamp: Date }
) {
  const decisionReadModel = await createPrismaMailboxActionService(input).evaluateFilingDecision(
    executionInput
  );
  const attempts: MailboxActionAttemptRow[] = [];

  if (decisionReadModel.decision.status === FilingDecisionStatus.Blocked) {
    attempts.push(
      await persistMailboxActionAttempt(input.prisma, {
        mailboxId: executionInput.mailboxId,
        messageId: executionInput.messageId,
        filingDecisionId: decisionReadModel.decision.id,
        actionType: MailboxActionType.MoveMessage,
        mode: executionInput.mode,
        status: MailboxActionStatus.Skipped,
        actorUserId: executionInput.session.principal.userId,
        targetFolderId: decisionReadModel.decision.targetFolderId,
        targetFolderGraphId: decisionReadModel.decision.targetFolderGraphId,
        targetFolderName: decisionReadModel.decision.targetFolderName,
        errorCode: "FILING_BLOCKED",
        errorMessage: decisionReadModel.decision.summary,
        attemptedAt: executionInput.timestamp,
        completedAt: executionInput.timestamp
      })
    );

    return buildMailboxActionExecutionResult(decisionReadModel, attempts);
  }

  if (executionInput.mode === MailboxActionMode.SuggestionOnly) {
    attempts.push(
      ...(await persistSuggestedFilingAttempts(input.prisma, decisionReadModel, executionInput))
    );
    return buildMailboxActionExecutionResult(decisionReadModel, attempts);
  }

  const context = await loadDecisionContext(input.prisma, input.mailboxTaskWorkflowService, {
    ...executionInput,
    timestamp: executionInput.timestamp
  });
  const graph = await getMailboxGraphClient(input, createGraphClient, context.mailbox);
  const graphMessageId = requireGraphMessageId(context.message);

  try {
    const detail = await graph.getMessageDetail({
      messageId: graphMessageId
    });
    const categoriesToApply = context.suggestedCategories.filter(
      (category) => !detail.categories.includes(category)
    );

    if (categoriesToApply.length > 0) {
      const updated = await graph.updateMessage({
        messageId: graphMessageId,
        categories: uniqueSorted([...detail.categories, ...categoriesToApply])
      });

      for (const categoryName of categoriesToApply) {
        attempts.push(
          await persistMailboxActionAttempt(input.prisma, {
            mailboxId: context.mailbox.id,
            messageId: context.message.id,
            filingDecisionId: decisionReadModel.decision.id,
            actionType: MailboxActionType.ApplyCategory,
            mode: executionInput.mode,
            status: MailboxActionStatus.Succeeded,
            actorUserId: executionInput.session.principal.userId,
            categoryName,
            graphMessageId: updated.id,
            attemptedAt: executionInput.timestamp,
            completedAt: executionInput.timestamp
          })
        );
      }

      await recordAuditEvent(input.prisma, {
        tenantId: context.mailbox.tenantId,
        actor: executionInput.session.principal.userId,
        action: AuditEventAction.MessageCategorized,
        entityType: "message",
        entityId: context.message.id,
        messageId: context.message.id,
        payload: {
          categories: categoriesToApply
        }
      });
    }

    const moved = await graph.moveMessage({
      messageId: graphMessageId,
      destinationId: decisionReadModel.decision.targetFolderGraphId ?? "archive"
    });

    const moveAttempt = await persistMailboxActionAttempt(input.prisma, {
      mailboxId: context.mailbox.id,
      messageId: context.message.id,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.MoveMessage,
      mode: executionInput.mode,
      status: MailboxActionStatus.Succeeded,
      actorUserId: executionInput.session.principal.userId,
      targetFolderId: decisionReadModel.decision.targetFolderId,
      targetFolderGraphId:
        decisionReadModel.decision.targetFolderGraphId ?? moved.parentFolderId ?? undefined,
      targetFolderName: decisionReadModel.decision.targetFolderName,
      graphMessageId: moved.id,
      attemptedAt: executionInput.timestamp,
      completedAt: executionInput.timestamp
    });
    attempts.push(moveAttempt);

    const updatedWorkflowState = await markMessageFiled(
      input.prisma,
      context,
      moved,
      executionInput.timestamp
    );
    const persistedDecision = (await upsertFilingDecision(input.prisma, {
      mailboxId: context.mailbox.id,
      messageId: context.message.id,
      workflowStateId: decisionReadModel.workflowState.id,
      actionability: toDatabaseActionability(decisionReadModel.decision.actionability),
      status: "EXECUTED",
      mode: toDatabaseActionMode(executionInput.mode),
      targetFolderId: decisionReadModel.decision.targetFolderId ?? null,
      targetFolderGraphId:
        decisionReadModel.decision.targetFolderGraphId ?? moved.parentFolderId ?? null,
      targetFolderName: decisionReadModel.decision.targetFolderName ?? null,
      suggestedCategories: decisionReadModel.decision.suggestedCategories,
      requirements: decisionReadModel.decision.requirements.map(toDatabaseRequirement),
      blockedBy: decisionReadModel.decision.blockedBy.map(toDatabaseBlockedBy),
      summary: decisionReadModel.decision.summary,
      rationale: decisionReadModel.decision.rationale ?? null,
      sourceMessageIsRead: true,
      approvedByUserId:
        executionInput.mode === MailboxActionMode.ApprovedApply
          ? executionInput.session.principal.userId
          : null,
      decidedAt: executionInput.timestamp,
      executedAt: executionInput.timestamp,
      lastErrorCode: null,
      lastErrorMessage: null
    })) as FilingDecisionRow;

    await recordAuditEvent(input.prisma, {
      tenantId: context.mailbox.tenantId,
      actor: executionInput.session.principal.userId,
      action: AuditEventAction.MessageFiled,
      entityType: "message",
      entityId: context.message.id,
      messageId: context.message.id,
      payload: {
        targetFolderId: persistedDecision.targetFolderId,
        targetFolderGraphId: persistedDecision.targetFolderGraphId,
        targetFolderName: persistedDecision.targetFolderName
      }
    });

    return buildMailboxActionExecutionResult(
      buildFilingDecisionReadModel(
        persistedDecision,
        updatedWorkflowState,
        decisionReadModel.targetFolder,
        buildRecommendedActions({
          mailbox: context.mailbox,
          message: context.message,
          workflow: updatedWorkflowState,
          targetFolder: decisionReadModel.targetFolder,
          suggestedCategories: decisionReadModel.decision.suggestedCategories,
          status: FilingDecisionStatus.Executed,
          mode: executionInput.mode,
          timestamp: executionInput.timestamp
        })
      ),
      attempts,
      {
        graphMessageId: moved.id,
        graphParentFolderId: moved.parentFolderId,
        filingState: FilingState.Filed
      }
    );
  } catch (error) {
    attempts.push(
      await persistMailboxActionAttempt(input.prisma, {
        mailboxId: context.mailbox.id,
        messageId: context.message.id,
        filingDecisionId: decisionReadModel.decision.id,
        actionType: MailboxActionType.MoveMessage,
        mode: executionInput.mode,
        status: MailboxActionStatus.Failed,
        actorUserId: executionInput.session.principal.userId,
        targetFolderId: decisionReadModel.decision.targetFolderId,
        targetFolderGraphId: decisionReadModel.decision.targetFolderGraphId,
        targetFolderName: decisionReadModel.decision.targetFolderName,
        errorCode: toAppError(error).code,
        errorMessage: toAppError(error).message,
        attemptedAt: executionInput.timestamp,
        completedAt: executionInput.timestamp
      })
    );

    const failedDecision = (await upsertFilingDecision(input.prisma, {
      mailboxId: executionInput.mailboxId,
      messageId: executionInput.messageId,
      workflowStateId: decisionReadModel.workflowState.id,
      actionability: toDatabaseActionability(decisionReadModel.decision.actionability),
      status: "FAILED",
      mode: toDatabaseActionMode(executionInput.mode),
      targetFolderId: decisionReadModel.decision.targetFolderId ?? null,
      targetFolderGraphId: decisionReadModel.decision.targetFolderGraphId ?? null,
      targetFolderName: decisionReadModel.decision.targetFolderName ?? null,
      suggestedCategories: decisionReadModel.decision.suggestedCategories,
      requirements: decisionReadModel.decision.requirements.map(toDatabaseRequirement),
      blockedBy: decisionReadModel.decision.blockedBy.map(toDatabaseBlockedBy),
      summary: decisionReadModel.decision.summary,
      rationale: decisionReadModel.decision.rationale ?? null,
      sourceMessageIsRead: decisionReadModel.decision.sourceMessageIsRead,
      approvedByUserId:
        executionInput.mode === MailboxActionMode.ApprovedApply
          ? executionInput.session.principal.userId
          : null,
      decidedAt: executionInput.timestamp,
      executedAt: null,
      lastErrorCode: toAppError(error).code,
      lastErrorMessage: toAppError(error).message
    })) as FilingDecisionRow;

    return buildMailboxActionExecutionResult(
      buildFilingDecisionReadModel(
        failedDecision,
        toWorkflowReadModel(decisionReadModel),
        decisionReadModel.targetFolder,
        decisionReadModel.recommendedActions
      ),
      attempts
    );
  }
}

async function routeInvoiceAction(
  input: CreatePrismaMailboxActionServiceInput,
  createGraphClient: (accessToken: string, mailboxId: string) => GraphClient,
  routeInput: RouteInvoiceMessageInput & { mode: MailboxActionMode; timestamp: Date }
) {
  const decisionReadModel = await createPrismaMailboxActionService(input).evaluateFilingDecision(
    routeInput
  );
  const classification = decisionReadModel.classification;
  if (!classification || classification.messageType !== MessageType.Invoice) {
    throw new AppError(
      "MAILBOX_ACTION_UNSUPPORTED",
      "Invoice routing is only supported for messages classified as invoices.",
      {
        statusCode: 409
      }
    );
  }

  if (routeInput.mode === MailboxActionMode.SuggestionOnly) {
    const attempt = await persistMailboxActionAttempt(input.prisma, {
      mailboxId: routeInput.mailboxId,
      messageId: routeInput.messageId,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.ForwardMessage,
      mode: routeInput.mode,
      status: MailboxActionStatus.Suggested,
      actorUserId: routeInput.session.principal.userId,
      forwardedTo: routeInput.forwardTo,
      attemptedAt: routeInput.timestamp
    });
    return buildMailboxActionExecutionResult(decisionReadModel, [attempt]);
  }

  const mailbox = await getOwnedMailbox(input.prisma, routeInput);
  const message = await getOwnedMessage(input.prisma, routeInput);
  const graph = await getMailboxGraphClient(input, createGraphClient, mailbox);

  try {
    await graph.forwardMessage({
      messageId: requireGraphMessageId(message),
      toRecipients: [{ address: routeInput.forwardTo }],
      comment: routeInput.comment
    });
    const attempt = await persistMailboxActionAttempt(input.prisma, {
      mailboxId: routeInput.mailboxId,
      messageId: routeInput.messageId,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.ForwardMessage,
      mode: routeInput.mode,
      status: MailboxActionStatus.Succeeded,
      actorUserId: routeInput.session.principal.userId,
      forwardedTo: routeInput.forwardTo,
      graphMessageId: message.graphMessageId ?? null,
      attemptedAt: routeInput.timestamp,
      completedAt: routeInput.timestamp
    });

    await recordAuditEvent(input.prisma, {
      tenantId: mailbox.tenantId,
      actor: routeInput.session.principal.userId,
      action: AuditEventAction.MessageForwarded,
      entityType: "message",
      entityId: message.id,
      messageId: message.id,
      payload: {
        forwardedTo: routeInput.forwardTo
      }
    });

    return buildMailboxActionExecutionResult(decisionReadModel, [attempt]);
  } catch (error) {
    const attempt = await persistMailboxActionAttempt(input.prisma, {
      mailboxId: routeInput.mailboxId,
      messageId: routeInput.messageId,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.ForwardMessage,
      mode: routeInput.mode,
      status: MailboxActionStatus.Failed,
      actorUserId: routeInput.session.principal.userId,
      forwardedTo: routeInput.forwardTo,
      errorCode: toAppError(error).code,
      errorMessage: toAppError(error).message,
      attemptedAt: routeInput.timestamp,
      completedAt: routeInput.timestamp
    });
    return buildMailboxActionExecutionResult(decisionReadModel, [attempt]);
  }
}

async function stampOutgoingReferenceAction(
  input: CreatePrismaMailboxActionServiceInput,
  createGraphClient: (accessToken: string, mailboxId: string) => GraphClient,
  numberingInput: StampOutgoingReferenceInput & { mode: MailboxActionMode; timestamp: Date }
) {
  const decisionReadModel = await createPrismaMailboxActionService(input).evaluateFilingDecision(
    numberingInput
  );
  const mailbox = await getOwnedMailbox(input.prisma, numberingInput);
  const message = await getOwnedMessage(input.prisma, numberingInput);
  const graph = await getMailboxGraphClient(input, createGraphClient, mailbox);
  const detail = await graph.getMessageDetail({
    messageId: requireGraphMessageId(message)
  });

  if (!detail.isDraft) {
    throw new AppError(
      "OUTGOING_NUMBERING_REQUIRES_DRAFT",
      "Outgoing numbering is only supported for draft messages.",
      {
        statusCode: 409
      }
    );
  }

  if (numberingInput.mode === MailboxActionMode.SuggestionOnly) {
    const attempt = await persistMailboxActionAttempt(input.prisma, {
      mailboxId: numberingInput.mailboxId,
      messageId: numberingInput.messageId,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.StampOutgoingReference,
      mode: numberingInput.mode,
      status: MailboxActionStatus.Suggested,
      actorUserId: numberingInput.session.principal.userId,
      attemptedAt: numberingInput.timestamp
    });
    return buildMailboxActionExecutionResult(decisionReadModel, [attempt]);
  }

  const prefix = numberingInput.prefix?.trim() || buildDefaultSequencePrefix(numberingInput.timestamp);
  const sequence = await allocateOutgoingSequenceNumber(input.prisma, {
    mailboxId: numberingInput.mailboxId,
    sequenceKey: numberingInput.sequenceKey?.trim() || prefix,
    prefix
  });
  const referenceNumber = sequence.referenceNumber;
  const stampedSubject = detail.subject.includes(referenceNumber)
    ? detail.subject
    : `[${referenceNumber}] ${detail.subject}`.trim();
  const updated = await graph.updateMessage({
    messageId: requireGraphMessageId(message),
    subject: stampedSubject
  });

  await input.prisma.message.update({
    where: {
      id: message.id
    },
    data: {
      subject: updated.subject,
      graphChangeKey: updated.changeKey ?? null
    }
  });

  const attempt = await persistMailboxActionAttempt(input.prisma, {
    mailboxId: numberingInput.mailboxId,
    messageId: numberingInput.messageId,
    filingDecisionId: decisionReadModel.decision.id,
    actionType: MailboxActionType.StampOutgoingReference,
    mode: numberingInput.mode,
    status: MailboxActionStatus.Succeeded,
    actorUserId: numberingInput.session.principal.userId,
    referenceNumber,
    graphMessageId: updated.id,
    attemptedAt: numberingInput.timestamp,
    completedAt: numberingInput.timestamp
  });

  await recordAuditEvent(input.prisma, {
    tenantId: mailbox.tenantId,
    actor: numberingInput.session.principal.userId,
    action: AuditEventAction.MessageNumbered,
    entityType: "message",
    entityId: message.id,
    messageId: message.id,
    payload: {
      referenceNumber
    }
  });

  return buildMailboxActionExecutionResult(decisionReadModel, [attempt]);
}

async function loadDecisionContext(
  prisma: PrismaClient,
  mailboxTaskWorkflowService: Pick<MailboxTaskWorkflowService, "getMessageWorkflowReadModel">,
  input: EvaluateFilingDecisionInput & { mode: MailboxActionMode; timestamp: Date }
): Promise<DecisionContext> {
  const mailbox = await getOwnedMailbox(prisma, input);
  const message = await getOwnedMessage(prisma, input);
  const workflow = await mailboxTaskWorkflowService.getMessageWorkflowReadModel({
    session: input.session,
    mailboxId: input.mailboxId,
    messageId: input.messageId
  });
  const folders = (await prisma.folder.findMany({
    where: {
      mailboxId: input.mailboxId
    }
  })) as FolderRow[];
  const targetFolder = suggestTargetFolder(folders, workflow);
  const suggestedCategories = buildSuggestedCategories(workflow);

  return {
    mailbox,
    message,
    workflow,
    targetFolder,
    suggestedCategories,
    status: deriveDecisionStatus(message, workflow),
    mode: input.mode,
    timestamp: input.timestamp
  };
}

async function getOwnedMailbox(
  prisma: PrismaClient,
  input: { session: SessionView; mailboxId: string }
) {
  const mailbox = (await prisma.mailbox.findFirst({
    where: {
      id: input.mailboxId,
      tenantId: input.session.principal.tenantId
    },
    include: {
      connection: true
    }
  })) as MailboxRow | null;

  if (!mailbox) {
    throw new AppError("MAILBOX_NOT_FOUND", "Mailbox not found.", {
      statusCode: 404
    });
  }

  if (!mailbox.connection || mailbox.connection.userId !== input.session.principal.userId) {
    throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
      statusCode: 403
    });
  }

  return mailbox;
}

async function getOwnedMessage(
  prisma: PrismaClient,
  input: { mailboxId: string; messageId: string }
) {
  const message = (await prisma.message.findFirst({
    where: {
      id: input.messageId,
      mailboxId: input.mailboxId
    }
  })) as MessageRow | null;

  if (!message) {
    throw new AppError("MESSAGE_NOT_FOUND", "Message not found.", {
      statusCode: 404
    });
  }

  return message;
}

async function getMailboxGraphClient(
  input: CreatePrismaMailboxActionServiceInput,
  createGraphClient: (accessToken: string, mailboxId: string) => GraphClient,
  mailbox: MailboxRow
) {
  if (mailbox.connection?.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
    throw new AppError(
      "MAILBOX_CONNECTION_INACTIVE",
      "Mailbox connection is not active for mailbox actions.",
      {
        statusCode: 409
      }
    );
  }

  const accessToken = decryptMicrosoftToken(
    mailbox.connection.accessTokenCiphertext,
    input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
  );

  return createGraphClient(accessToken, mailbox.id);
}

function deriveDecisionStatus(message: MessageRow, workflow: MessageWorkflowReadModel) {
  if (message.filingState === "FILED") {
    return FilingDecisionStatus.Executed;
  }

  return workflow.filingEligibility.isEligible
    ? FilingDecisionStatus.Eligible
    : FilingDecisionStatus.Blocked;
}

function buildSuggestedCategories(workflow: MessageWorkflowReadModel) {
  const categories = [
    workflow.workflowState.actionability === MessageActionability.Actionable
      ? "FriendlyMail/Actionable"
      : "FriendlyMail/Informational"
  ];
  if (workflow.classification) {
    categories.push(`FriendlyMail/${toCategoryLabel(workflow.classification.messageType)}`);
  }
  if (workflow.workflowState.criticality === WorkflowCriticalityLevel.Critical) {
    categories.push("FriendlyMail/Critical");
  }
  if (workflow.filingEligibility.isEligible) {
    categories.push("FriendlyMail/ReadyToFile");
  }
  return uniqueSorted(categories);
}

function suggestTargetFolder(folders: FolderRow[], workflow: MessageWorkflowReadModel) {
  const desiredNames = workflow.classification
    ? suggestedFolderNamesForType(workflow.classification.messageType)
    : ["Archive"];

  for (const name of [...desiredNames, "Archive"]) {
    const match = folders.find((folder) => folder.displayName.toLowerCase() === name.toLowerCase());
    if (match) {
      return {
        id: match.id,
        graphFolderId: match.graphFolderId,
        name: match.displayName,
        source: "mailbox_folder" as const
      };
    }
  }

  return {
    graphFolderId: "archive",
    name: "Archive",
    source: "well_known" as const
  };
}

function suggestedFolderNamesForType(messageType: MessageType) {
  switch (messageType) {
    case MessageType.Invoice:
      return ["Invoices", "Accounts Payable"];
    case MessageType.Contract:
      return ["Contracts", "Legal"];
    case MessageType.Notice:
      return ["Notices", "Legal"];
    case MessageType.Policy:
      return ["Policies", "Internal"];
    case MessageType.Committee:
      return ["Committee", "Internal"];
    case MessageType.Event:
      return ["Events", "Calendar"];
    case MessageType.Internal:
      return ["Internal"];
    case MessageType.Letter:
      return ["Letters", "Correspondence"];
    case MessageType.Fyi:
      return ["FYI", "Archive"];
  }
}

function buildDecisionSummary(context: DecisionContext) {
  if (context.status === FilingDecisionStatus.Executed) {
    return "The message has already been filed and the delayed-filing decision is recorded.";
  }

  if (context.status === FilingDecisionStatus.Blocked) {
    return context.workflow.filingEligibility.summary;
  }

  return `The message is eligible to file to ${context.targetFolder?.name ?? "Archive"} and can apply ${context.suggestedCategories.length} mailbox categor${context.suggestedCategories.length === 1 ? "y" : "ies"}.`;
}

function buildDecisionRationale(context: DecisionContext) {
  const parts = [
    context.workflow.classification?.explanationSummary,
    context.workflow.filingEligibility.summary,
    context.targetFolder
      ? `Target folder: ${context.targetFolder.name} (${context.targetFolder.source}).`
      : null
  ].filter(Boolean);

  return parts.join(" ");
}

function buildRecommendedActions(context: DecisionContext) {
  if (context.status === FilingDecisionStatus.Executed) {
    return [];
  }

  if (context.status === FilingDecisionStatus.Blocked) {
    return [
      {
        actionType: MailboxActionType.MoveMessage,
        mode: context.mode,
        summary: context.workflow.filingEligibility.summary
      }
    ];
  }

  const actions = context.suggestedCategories.map((category) => ({
    actionType: MailboxActionType.ApplyCategory,
    mode: context.mode,
    summary: `Apply ${category} before filing the message.`
  }));

  actions.push({
    actionType: MailboxActionType.MoveMessage,
    mode: context.mode,
    summary: `Move the message to ${context.targetFolder?.name ?? "Archive"} when delayed-filing rules allow it.`
  });

  return actions;
}

async function persistSuggestedFilingAttempts(
  prisma: PrismaClient,
  decisionReadModel: FilingDecisionReadModel,
  executionInput: ExecuteFilingInput & { mode: MailboxActionMode; timestamp: Date }
) {
  const attempts: MailboxActionAttemptRow[] = [];

  for (const categoryName of decisionReadModel.decision.suggestedCategories) {
    attempts.push(
      await persistMailboxActionAttempt(prisma, {
        mailboxId: executionInput.mailboxId,
        messageId: executionInput.messageId,
        filingDecisionId: decisionReadModel.decision.id,
        actionType: MailboxActionType.ApplyCategory,
        mode: executionInput.mode,
        status: MailboxActionStatus.Suggested,
        actorUserId: executionInput.session.principal.userId,
        categoryName,
        attemptedAt: executionInput.timestamp
      })
    );
  }

  attempts.push(
    await persistMailboxActionAttempt(prisma, {
      mailboxId: executionInput.mailboxId,
      messageId: executionInput.messageId,
      filingDecisionId: decisionReadModel.decision.id,
      actionType: MailboxActionType.MoveMessage,
      mode: executionInput.mode,
      status: MailboxActionStatus.Suggested,
      actorUserId: executionInput.session.principal.userId,
      targetFolderId: decisionReadModel.decision.targetFolderId,
      targetFolderGraphId: decisionReadModel.decision.targetFolderGraphId,
      targetFolderName: decisionReadModel.decision.targetFolderName,
      attemptedAt: executionInput.timestamp
    })
  );

  return attempts;
}

async function persistMailboxActionAttempt(
  prisma: PrismaClient,
  input: {
    mailboxId: string;
    messageId: string;
    filingDecisionId?: string;
    actionType: MailboxActionType;
    mode: MailboxActionMode;
    status: MailboxActionStatus;
    actorUserId?: string;
    targetFolderId?: string;
    targetFolderGraphId?: string;
    targetFolderName?: string;
    categoryName?: string;
    forwardedTo?: string;
    referenceNumber?: string;
    graphMessageId?: string | null;
    graphRequestId?: string;
    errorCode?: string;
    errorMessage?: string;
    attemptedAt: Date;
    completedAt?: Date;
  }
) {
  return (await createMailboxActionAttempt(prisma, {
    mailboxId: input.mailboxId,
    messageId: input.messageId,
    filingDecisionId: input.filingDecisionId ?? null,
    actionType: toDatabaseActionType(input.actionType),
    mode: toDatabaseActionMode(input.mode),
    status: toDatabaseActionStatus(input.status),
    actorUserId: input.actorUserId ?? null,
    targetFolderId: input.targetFolderId ?? null,
    targetFolderGraphId: input.targetFolderGraphId ?? null,
    targetFolderName: input.targetFolderName ?? null,
    categoryName: input.categoryName ?? null,
    forwardedTo: input.forwardedTo ?? null,
    referenceNumber: input.referenceNumber ?? null,
    graphMessageId: input.graphMessageId ?? null,
    graphRequestId: input.graphRequestId ?? null,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
    attemptedAt: input.attemptedAt,
    completedAt: input.completedAt ?? null
  })) as MailboxActionAttemptRow;
}

async function markMessageFiled(
  prisma: PrismaClient,
  context: DecisionContext,
  movedMessage: { id: string; parentFolderId?: string; changeKey?: string; subject: string; isRead: boolean },
  timestamp: Date
) {
  let localFolderId = context.targetFolder?.id ?? null;
  if (!localFolderId && movedMessage.parentFolderId) {
    const matchedFolder = (await prisma.folder.findFirst({
      where: {
        mailboxId: context.mailbox.id,
        graphFolderId: movedMessage.parentFolderId
      }
    })) as FolderRow | null;
    localFolderId = matchedFolder?.id ?? null;
  }

  await prisma.message.update({
    where: {
      id: context.message.id
    },
    data: {
      graphMessageId: movedMessage.id,
      graphParentFolderId: movedMessage.parentFolderId ?? null,
      graphChangeKey: movedMessage.changeKey ?? null,
      folderId: localFolderId,
      filingState: "FILED",
      isRead: movedMessage.isRead,
      subject: movedMessage.subject
    }
  });

  await upsertMessageWorkflowState(prisma, {
    mailboxId: context.mailbox.id,
    messageId: context.message.id,
    actionability: toDatabaseActionability(context.workflow.workflowState.actionability),
    status: toDatabaseWorkflowStatus(context.workflow.workflowState.status),
    filingState: "FILED",
    priority: toDatabasePriority(context.workflow.workflowState.priority),
    criticality: toDatabaseCriticality(context.workflow.workflowState.criticality),
    isEligibleToFile: true,
    requirements: context.workflow.filingEligibility.requirements.map(toDatabaseRequirement),
    blockedBy: [],
    blockingTaskIds: [],
    unresolvedTaskCount: 0,
    openTaskCount: 0,
    snoozedTaskCount: 0,
    delegatedTaskCount: 0,
    informationalReadRequired: context.workflow.workflowState.informationalReadRequired,
    messageIsRead: true,
    lastEvaluatedAt: timestamp
  });

  return {
    ...context.workflow,
    workflowState: {
      ...context.workflow.workflowState,
      filingState: FilingState.Filed,
      isEligibleToFile: true,
      blockedBy: [],
      blockingTaskIds: [],
      unresolvedTaskCount: 0,
      openTaskCount: 0,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      messageIsRead: true,
      lastEvaluatedAt: timestamp.toISOString()
    },
    filingEligibility: {
      ...context.workflow.filingEligibility,
      isEligible: true,
      blockedBy: [],
      summary: "The message is filed and no delayed-filing blockers remain."
    }
  } satisfies MessageWorkflowReadModel;
}

function buildFilingDecisionReadModel(
  decisionRow: FilingDecisionRow,
  workflow: MessageWorkflowReadModel,
  targetFolder: FilingDecisionReadModel["targetFolder"],
  recommendedActions: FilingDecisionReadModel["recommendedActions"]
): FilingDecisionReadModel {
  return {
    mailboxId: decisionRow.mailboxId,
    messageId: decisionRow.messageId,
    decision: mapFilingDecision(decisionRow),
    workflowState: workflow.workflowState,
    filingEligibility: workflow.filingEligibility,
    classification: workflow.classification,
    targetFolder,
    recommendedActions
  };
}

function buildMailboxActionExecutionResult(
  decision: FilingDecisionReadModel,
  attempts: MailboxActionAttemptRow[],
  message?: MailboxActionExecutionResult["message"]
): MailboxActionExecutionResult {
  return {
    mailboxId: decision.mailboxId,
    messageId: decision.messageId,
    decision: decision.decision,
    attempts: attempts.map(mapMailboxActionAttempt),
    workflowState: decision.workflowState,
    filingEligibility: decision.filingEligibility,
    message
  };
}

function toWorkflowReadModel(decision: FilingDecisionReadModel): MessageWorkflowReadModel {
  return {
    mailboxId: decision.mailboxId,
    messageId: decision.messageId,
    workflowState: decision.workflowState,
    filingEligibility: decision.filingEligibility,
    classification: decision.classification,
    tasks: []
  };
}

async function buildMailboxActionVerification(
  prisma: PrismaClient,
  mailboxId: string,
  checkedAt: Date
): Promise<MailboxActionVerificationReport> {
  const messages = (await prisma.message.findMany({
    where: {
      mailboxId
    }
  })) as MessageRow[];
  const decisions = (await prisma.filingDecision.findMany({
    where: {
      mailboxId
    }
  })) as FilingDecisionRow[];
  const attempts = (await prisma.mailboxActionAttempt.findMany({
    where: {
      mailboxId
    },
    orderBy: {
      attemptedAt: "asc"
    }
  })) as MailboxActionAttemptRow[];

  const trackedMessages = messages.filter((message) => message.filingState !== "PENDING_CLASSIFICATION");
  const eligibleDecisions = decisions.filter((decision) => decision.status === "ELIGIBLE");
  const executedDecisions = decisions.filter((decision) => decision.status === "EXECUTED");
  const failedAttempts = attempts.filter((attempt) => attempt.status === "FAILED");
  const succeededAttempts = attempts.filter((attempt) => attempt.status === "SUCCEEDED");
  const decisionIds = new Set(decisions.map((decision) => decision.messageId));
  const messageIdsMissingDecision = trackedMessages
    .filter((message) => !decisionIds.has(message.id))
    .map((message) => message.id);
  const attemptsByDecisionId = new Map<string, MailboxActionAttemptRow[]>();
  for (const attempt of attempts) {
    if (!attempt.filingDecisionId) {
      continue;
    }
    const current = attemptsByDecisionId.get(attempt.filingDecisionId) ?? [];
    current.push(attempt);
    attemptsByDecisionId.set(attempt.filingDecisionId, current);
  }

  const decisionIdsMissingAttempts = decisions
    .filter(
      (decision) =>
        (decision.status === "EXECUTED" || decision.status === "FAILED") &&
        (attemptsByDecisionId.get(decision.id)?.length ?? 0) === 0
    )
    .map((decision) => decision.id);
  const decisionIdsWithFailedLatestAttempt = [...attemptsByDecisionId.entries()]
    .filter(([, groupedAttempts]) => groupedAttempts.at(-1)?.status === "FAILED")
    .map(([decisionId]) => decisionId);
  const succeededMoveMessageIds = new Set(
    attempts
      .filter(
        (attempt) =>
          attempt.actionType === "MOVE_MESSAGE" && attempt.status === "SUCCEEDED"
      )
      .map((attempt) => attempt.messageId)
  );
  const messageIdsFiledWithoutSucceededMove = messages
    .filter(
      (message) =>
        message.filingState === "FILED" && !succeededMoveMessageIds.has(message.id)
    )
    .map((message) => message.id);
  const routingBlockedMessageIds = uniqueSorted(
    failedAttempts
      .filter((attempt) => attempt.actionType === "FORWARD_MESSAGE")
      .map((attempt) => attempt.messageId)
  );
  const numberingBlockedMessageIds = uniqueSorted(
    failedAttempts
      .filter((attempt) => attempt.actionType === "STAMP_OUTGOING_REFERENCE")
      .map((attempt) => attempt.messageId)
  );
  const checks = [
    {
      code: "filing_decision_coverage",
      status:
        messageIdsMissingDecision.length === 0
          ? VerificationCheckStatus.Pass
          : VerificationCheckStatus.Warn,
      detail:
        messageIdsMissingDecision.length === 0
          ? "Tracked messages have delayed-filing decisions."
          : "Some tracked messages are missing delayed-filing decisions."
    },
    {
      code: "mailbox_action_failures",
      status:
        failedAttempts.length === 0 ? VerificationCheckStatus.Pass : VerificationCheckStatus.Warn,
      detail:
        failedAttempts.length === 0
          ? "Mailbox action attempts are succeeding."
          : "Mailbox action failures need operator review."
    },
    {
      code: "filed_move_audit",
      status:
        messageIdsFiledWithoutSucceededMove.length === 0
          ? VerificationCheckStatus.Pass
          : VerificationCheckStatus.Fail,
      detail:
        messageIdsFiledWithoutSucceededMove.length === 0
          ? "Filed messages have corresponding move audit records."
          : "Some filed messages do not have a succeeded move audit trail."
    }
  ];

  return {
    mailboxId,
    checkedAt: checkedAt.toISOString(),
    overallStatus: deriveOverallStatus(checks),
    coverage: {
      trackedMessages: trackedMessages.length,
      decisions: decisions.length,
      eligibleDecisions: eligibleDecisions.length,
      executedDecisions: executedDecisions.length,
      attempts: attempts.length,
      succeededAttempts: succeededAttempts.length,
      failedAttempts: failedAttempts.length
    },
    integrity: {
      messageIdsMissingDecision,
      decisionIdsMissingAttempts,
      decisionIdsWithFailedLatestAttempt,
      messageIdsFiledWithoutSucceededMove
    },
    capabilityGaps: {
      routingBlockedMessageIds,
      numberingBlockedMessageIds
    },
    checks
  };
}

function deriveOverallStatus(checks: Array<{ status: VerificationCheckStatus }>) {
  if (checks.some((check) => check.status === VerificationCheckStatus.Fail)) {
    return OperationalHealthStatus.Critical;
  }
  if (checks.some((check) => check.status === VerificationCheckStatus.Warn)) {
    return OperationalHealthStatus.Warning;
  }
  return OperationalHealthStatus.Healthy;
}

function mapFilingDecision(row: FilingDecisionRow) {
  return {
    id: row.id,
    mailboxId: row.mailboxId,
    messageId: row.messageId,
    workflowStateId: row.workflowStateId ?? undefined,
    actionability: fromDatabaseActionability(row.actionability),
    status: fromDatabaseDecisionStatus(row.status),
    mode: fromDatabaseActionMode(row.mode),
    requirements: row.requirements.map(fromDatabaseRequirement),
    blockedBy: row.blockedBy.map(fromDatabaseBlockedBy),
    targetFolderId: row.targetFolderId ?? undefined,
    targetFolderGraphId: row.targetFolderGraphId ?? undefined,
    targetFolderName: row.targetFolderName ?? undefined,
    suggestedCategories: row.suggestedCategories,
    summary: row.summary,
    rationale: row.rationale ?? undefined,
    sourceMessageIsRead: row.sourceMessageIsRead,
    approvedByUserId: row.approvedByUserId ?? undefined,
    decidedAt: row.decidedAt.toISOString(),
    executedAt: row.executedAt?.toISOString(),
    lastErrorCode: row.lastErrorCode ?? undefined,
    lastErrorMessage: row.lastErrorMessage ?? undefined
  };
}

function mapMailboxActionAttempt(row: MailboxActionAttemptRow) {
  return {
    id: row.id,
    mailboxId: row.mailboxId,
    messageId: row.messageId,
    filingDecisionId: row.filingDecisionId ?? undefined,
    actionType: fromDatabaseActionType(row.actionType),
    mode: fromDatabaseActionMode(row.mode),
    status: fromDatabaseActionStatus(row.status),
    actorUserId: row.actorUserId ?? undefined,
    targetFolderId: row.targetFolderId ?? undefined,
    targetFolderGraphId: row.targetFolderGraphId ?? undefined,
    targetFolderName: row.targetFolderName ?? undefined,
    categoryName: row.categoryName ?? undefined,
    forwardedTo: row.forwardedTo ?? undefined,
    referenceNumber: row.referenceNumber ?? undefined,
    graphMessageId: row.graphMessageId ?? undefined,
    graphRequestId: row.graphRequestId ?? undefined,
    errorCode: row.errorCode ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    attemptedAt: row.attemptedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}

function toDatabaseDecisionStatus(status: FilingDecisionStatus) {
  switch (status) {
    case FilingDecisionStatus.Blocked:
      return "BLOCKED" as const;
    case FilingDecisionStatus.Eligible:
      return "ELIGIBLE" as const;
    case FilingDecisionStatus.Executed:
      return "EXECUTED" as const;
    case FilingDecisionStatus.Failed:
      return "FAILED" as const;
  }
}

function fromDatabaseDecisionStatus(status: FilingDecisionRow["status"]) {
  switch (status) {
    case "BLOCKED":
      return FilingDecisionStatus.Blocked;
    case "ELIGIBLE":
      return FilingDecisionStatus.Eligible;
    case "EXECUTED":
      return FilingDecisionStatus.Executed;
    case "FAILED":
      return FilingDecisionStatus.Failed;
  }
}

function toDatabaseActionMode(mode: MailboxActionMode) {
  switch (mode) {
    case MailboxActionMode.SuggestionOnly:
      return "SUGGESTION_ONLY" as const;
    case MailboxActionMode.AutoApply:
      return "AUTO_APPLY" as const;
    case MailboxActionMode.ApprovedApply:
      return "APPROVED_APPLY" as const;
  }
}

function fromDatabaseActionMode(mode: FilingDecisionRow["mode"] | MailboxActionAttemptRow["mode"]) {
  switch (mode) {
    case "SUGGESTION_ONLY":
      return MailboxActionMode.SuggestionOnly;
    case "AUTO_APPLY":
      return MailboxActionMode.AutoApply;
    case "APPROVED_APPLY":
      return MailboxActionMode.ApprovedApply;
  }
}

function toDatabaseActionType(type: MailboxActionType) {
  switch (type) {
    case MailboxActionType.MoveMessage:
      return "MOVE_MESSAGE" as const;
    case MailboxActionType.ApplyCategory:
      return "APPLY_CATEGORY" as const;
    case MailboxActionType.ForwardMessage:
      return "FORWARD_MESSAGE" as const;
    case MailboxActionType.StampOutgoingReference:
      return "STAMP_OUTGOING_REFERENCE" as const;
  }
}

function fromDatabaseActionType(type: MailboxActionAttemptRow["actionType"]) {
  switch (type) {
    case "MOVE_MESSAGE":
      return MailboxActionType.MoveMessage;
    case "APPLY_CATEGORY":
      return MailboxActionType.ApplyCategory;
    case "FORWARD_MESSAGE":
      return MailboxActionType.ForwardMessage;
    case "STAMP_OUTGOING_REFERENCE":
      return MailboxActionType.StampOutgoingReference;
  }
}

function toDatabaseActionStatus(status: MailboxActionStatus) {
  switch (status) {
    case MailboxActionStatus.Suggested:
      return "SUGGESTED" as const;
    case MailboxActionStatus.PendingApproval:
      return "PENDING_APPROVAL" as const;
    case MailboxActionStatus.Succeeded:
      return "SUCCEEDED" as const;
    case MailboxActionStatus.Failed:
      return "FAILED" as const;
    case MailboxActionStatus.Skipped:
      return "SKIPPED" as const;
  }
}

function fromDatabaseActionStatus(status: MailboxActionAttemptRow["status"]) {
  switch (status) {
    case "SUGGESTED":
      return MailboxActionStatus.Suggested;
    case "PENDING_APPROVAL":
      return MailboxActionStatus.PendingApproval;
    case "SUCCEEDED":
      return MailboxActionStatus.Succeeded;
    case "FAILED":
      return MailboxActionStatus.Failed;
    case "SKIPPED":
      return MailboxActionStatus.Skipped;
  }
}

function toDatabaseActionability(actionability: MessageActionability) {
  return actionability === MessageActionability.Actionable
    ? ("ACTIONABLE" as const)
    : ("INFORMATIONAL" as const);
}

function fromDatabaseActionability(actionability: FilingDecisionRow["actionability"]) {
  return actionability === "ACTIONABLE"
    ? MessageActionability.Actionable
    : MessageActionability.Informational;
}

function toDatabaseWorkflowStatus(status: MessageWorkflowStateRecord["status"]) {
  switch (status) {
    case "pending_task_materialization":
      return "PENDING_TASK_MATERIALIZATION" as const;
    case "active_actionable":
      return "ACTIVE_ACTIONABLE" as const;
    case "active_informational_unread":
      return "ACTIVE_INFORMATIONAL_UNREAD" as const;
    case "active_informational_reviewed":
      return "ACTIVE_INFORMATIONAL_REVIEWED" as const;
    case "filing_blocked":
      return "FILING_BLOCKED" as const;
    case "eligible_to_file":
      return "ELIGIBLE_TO_FILE" as const;
  }

  throw new AppError("WORKFLOW_STATUS_INVALID", "Workflow status is invalid.", {
    statusCode: 500
  });
}

function toDatabasePriority(priority: MessagePriority) {
  switch (priority) {
    case MessagePriority.Low:
      return "LOW" as const;
    case MessagePriority.Normal:
      return "NORMAL" as const;
    case MessagePriority.High:
      return "HIGH" as const;
    case MessagePriority.Critical:
      return "CRITICAL" as const;
  }
}

function toDatabaseCriticality(criticality: WorkflowCriticalityLevel) {
  switch (criticality) {
    case WorkflowCriticalityLevel.Normal:
      return "NORMAL" as const;
    case WorkflowCriticalityLevel.Elevated:
      return "ELEVATED" as const;
    case WorkflowCriticalityLevel.Critical:
      return "CRITICAL" as const;
  }
}

function toDatabaseRequirement(requirement: FilingEligibility["requirements"][number]) {
  switch (requirement) {
    case "message_read":
      return "MESSAGE_READ" as const;
    case "all_required_tasks_resolved":
      return "ALL_REQUIRED_TASKS_RESOLVED" as const;
    case "critical_work_cleared":
      return "CRITICAL_WORK_CLEARED" as const;
    case "manual_review_completed":
      return "MANUAL_REVIEW_COMPLETED" as const;
    case "policy_clearance":
      return "POLICY_CLEARANCE" as const;
  }
}

function fromDatabaseRequirement(requirement: string) {
  return requirement.toLowerCase() as FilingEligibility["requirements"][number];
}

function toDatabaseBlockedBy(blockedBy: FilingEligibility["blockedBy"][number]) {
  switch (blockedBy) {
    case "classification_pending":
      return "CLASSIFICATION_PENDING" as const;
    case "task_materialization_pending":
      return "TASK_MATERIALIZATION_PENDING" as const;
    case "message_unread":
      return "MESSAGE_UNREAD" as const;
    case "open_task":
      return "OPEN_TASK" as const;
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
  }
}

function fromDatabaseBlockedBy(blockedBy: string) {
  return blockedBy.toLowerCase() as FilingEligibility["blockedBy"][number];
}

function toCategoryLabel(messageType: MessageType) {
  return messageType.charAt(0).toUpperCase() + messageType.slice(1);
}

function buildDefaultSequencePrefix(timestamp: Date) {
  return `FM-${timestamp.getUTCFullYear()}`;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function requireGraphMessageId(message: MessageRow) {
  if (!message.graphMessageId) {
    throw new AppError(
      "GRAPH_MESSAGE_ID_MISSING",
      "The message cannot be mutated because it is missing a Microsoft Graph identity.",
      {
        statusCode: 409
      }
    );
  }

  return message.graphMessageId;
}

function toAppError(error: unknown) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError("MAILBOX_ACTION_FAILED", "Mailbox action failed.", {
    statusCode: 500,
    cause: error
  });
}
