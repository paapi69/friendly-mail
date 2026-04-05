import { AuthProvider, Prisma, PrismaClient, UserRole } from "@prisma/client";

declare global {
  var __friendlyMailPrisma__: PrismaClient | undefined;
}

export const databaseTables = [
  "Tenant",
  "User",
  "TenantMembership",
  "Session",
  "Mailbox",
  "MailboxConnection",
  "Folder",
  "FolderSyncState",
  "GraphSubscription",
  "Message",
  "MessageAttachment",
  "ExtractionArtifact",
  "MessageClassification",
  "Task",
  "AuditEvent"
] as const;

export type DatabaseTable = (typeof databaseTables)[number];

export type RecordAuditEventInput = {
  tenantId: string;
  actor?: string;
  action: string;
  entityType: string;
  entityId: string;
  messageId?: string;
  payload?: Record<string, unknown>;
};

export type CreateLocalUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
  tenantId: string;
  role: UserRole;
};

export type UpsertMailboxConnectionInput = {
  mailboxId: string;
  tenantId: string;
  userId: string;
  graphTenantId: string;
  graphUserId: string;
  status:
    | "PENDING_CONSENT"
    | "ACTIVE"
    | "NEEDS_REAUTH"
    | "FAILED"
    | "DISCONNECTED";
  grantedScopes: string[];
  accessTokenCiphertext?: string;
  refreshTokenCiphertext?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  connectedAt?: Date;
  lastValidatedAt?: Date;
  lastReauthorizedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
};

export type UpsertFolderSyncStateInput = {
  mailboxId: string;
  folderId: string;
  deltaLink?: string;
  syncStatus: "PENDING" | "ACTIVE" | "IDLE" | "FAILED";
  lastSyncedAt?: Date;
  lastCursorUpdatedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
};

export type UpsertMailboxFolderInput = {
  mailboxId: string;
  graphFolderId: string;
  displayName: string;
  parentGraphFolderId?: string;
  isSyncEnabled?: boolean;
};

export type UpsertMailboxMessageInput = {
  mailboxId: string;
  folderId?: string;
  graphMessageId: string;
  graphParentFolderId?: string;
  graphChangeKey?: string;
  internetMessageId?: string;
  conversationId?: string;
  subject: string;
  fromAddress?: string;
  receivedAt?: Date;
  lastGraphModifiedAt?: Date;
  isRead: boolean;
  graphRemovedAt?: Date;
  graphRemovalReason?: "changed" | "deleted";
};

export type MarkMailboxMessageRemovedInput = {
  mailboxId: string;
  graphMessageId: string;
  graphRemovedAt: Date;
  graphRemovalReason: "changed" | "deleted";
};

export type UpsertMailboxMessageContentInput = {
  mailboxId: string;
  graphMessageId: string;
  bodyPreview?: string;
  bodyContentType: "TEXT";
  bodyText?: string;
  uniqueBodyText?: string;
  webLink?: string;
  hasAttachments: boolean;
  ingestionVersionKey: string;
  ingestedAt: Date;
};

export type UpsertMessageAttachmentInput = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  graphAttachmentId: string;
  name: string;
  contentType?: string;
  sizeInBytes: number;
  isInline: boolean;
  attachmentKind: "FILE" | "ITEM" | "REFERENCE";
  lastGraphModifiedAt?: Date;
  isExtractionCandidate: boolean;
  extractionDecisionReason?: string;
  extractionStatus:
    | "NOT_ATTEMPTED"
    | "PENDING"
    | "COMPLETED"
    | "COMPLETED_WITH_OCR"
    | "UNSUPPORTED"
    | "FAILED";
  extractionAttempts?: number;
  lastExtractionAt?: Date;
  lastExtractionErrorCode?: string;
};

export type UpsertAttachmentExtractionArtifactInput = {
  mailboxId: string;
  messageId: string;
  attachmentId: string;
  artifactKind: "ATTACHMENT_TEXT" | "ATTACHMENT_OCR";
  storageKey: string;
  textLength?: number;
  contentHash?: string;
  confidenceScore?: number;
  sourceVersionKey: string;
  createdAt?: Date;
};

export type ClassificationReasonCodeValue =
  | "ACTION_REQUESTED"
  | "DUE_DATE_DETECTED"
  | "DEADLINE_CUE_DETECTED"
  | "INVOICE_CUE_DETECTED"
  | "NOTICE_CUE_DETECTED"
  | "COUNTERPARTY_DETECTED"
  | "ATTACHMENT_EVIDENCE_USED"
  | "LOW_CONFIDENCE"
  | "AMBIGUOUS_CONTENT";

export type WorkflowSignalSourceKindValue =
  | "MESSAGE_METADATA"
  | "BODY_TEXT"
  | "UNIQUE_BODY_TEXT"
  | "ATTACHMENT_TEXT"
  | "ATTACHMENT_OCR";

export type WorkflowEntityKindValue =
  | "COUNTERPARTY"
  | "COMMITTEE"
  | "EVENT"
  | "INVOICE"
  | "PERSON"
  | "ORGANIZATION"
  | "POLICY"
  | "DOCUMENT";

export type WorkflowSignalProvenanceSnapshot = {
  sourceKind: WorkflowSignalSourceKindValue;
  attachmentId?: string;
  artifactId?: string;
  field?: string;
  excerpt?: string;
};

export type ClassificationReasonSnapshot = {
  code: ClassificationReasonCodeValue;
  summary: string;
  provenance?: WorkflowSignalProvenanceSnapshot[];
};

export type DueDateSignalSnapshot = {
  id: string;
  label: string;
  value: string;
  confidenceScore: number;
  rationale?: string;
  provenance: WorkflowSignalProvenanceSnapshot[];
};

export type WorkflowEntitySignalSnapshot = {
  id: string;
  kind: WorkflowEntityKindValue;
  value: string;
  normalizedValue?: string;
  confidenceScore: number;
  rationale?: string;
  provenance: WorkflowSignalProvenanceSnapshot[];
};

export type TaskCandidateSignalSnapshot = {
  id: string;
  title: string;
  summary?: string;
  dueAt?: string;
  confidenceScore: number;
  rationale: string;
  provenance: WorkflowSignalProvenanceSnapshot[];
};

export type WorkflowUrgencySignalSnapshot = {
  level: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  confidenceScore: number;
  rationale: string;
  reasons: ClassificationReasonSnapshot[];
};

export type WorkflowCriticalitySignalSnapshot = {
  level: "NORMAL" | "ELEVATED" | "CRITICAL";
  confidenceScore: number;
  rationale: string;
  reasons: ClassificationReasonSnapshot[];
};

export type UpsertMessageClassificationInput = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifierVersion: string;
  classifiedAt?: Date;
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
  explanation: {
    summary: string;
    lowConfidence: boolean;
    reasons: ClassificationReasonSnapshot[];
  };
  signals: {
    dueDates: DueDateSignalSnapshot[];
    entities: WorkflowEntitySignalSnapshot[];
    taskCandidates: TaskCandidateSignalSnapshot[];
    urgency: WorkflowUrgencySignalSnapshot;
    criticality: WorkflowCriticalitySignalSnapshot;
  };
};

export type UpsertGraphSubscriptionInput = {
  mailboxId: string;
  graphSubscriptionId: string;
  resource: string;
  changeTypes: string[];
  notificationUrl: string;
  lifecycleNotificationUrl?: string;
  clientStateHash?: string;
  status:
    | "PENDING"
    | "ACTIVE"
    | "EXPIRED"
    | "REMOVED"
    | "REAUTH_REQUIRED"
    | "FAILED";
  expiresAt: Date;
  lastValidatedAt?: Date;
  lastNotificationAt?: Date;
  lastLifecycleEventAt?: Date;
  lastReauthorizedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
};

type AuditEventWriter = {
  auditEvent: {
    create: (args: {
      data: {
        tenantId: string;
        actor?: string;
        action: string;
        entityType: string;
        entityId: string;
        messageId?: string;
        payloadJson: string | null;
      };
    }) => Promise<unknown>;
  };
};

type LocalUserWriter = {
  user: {
    upsert: (args: {
      where: { email: string };
      update: {
        displayName: string;
        authProvider: AuthProvider;
        passwordHash: string;
      };
      create: {
        email: string;
        displayName: string;
        authProvider: AuthProvider;
        passwordHash: string;
        memberships: {
          create: {
            tenantId: string;
            role: UserRole;
          };
        };
      };
      include: {
        memberships: true;
      };
    }) => Promise<unknown>;
  };
};

type MailboxConnectionWriter = {
  mailboxConnection: {
    upsert: (args: {
      where: { mailboxId: string };
      update: {
        tenantId: string;
        userId: string;
        graphTenantId: string;
        graphUserId: string;
        status: UpsertMailboxConnectionInput["status"];
        grantedScopes: string[];
        accessTokenCiphertext: string | null;
        refreshTokenCiphertext: string | null;
        accessTokenExpiresAt: Date | null;
        refreshTokenExpiresAt: Date | null;
        connectedAt: Date | null;
        lastValidatedAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        tenantId: string;
        userId: string;
        graphTenantId: string;
        graphUserId: string;
        status: UpsertMailboxConnectionInput["status"];
        grantedScopes: string[];
        accessTokenCiphertext: string | null;
        refreshTokenCiphertext: string | null;
        accessTokenExpiresAt: Date | null;
        refreshTokenExpiresAt: Date | null;
        connectedAt: Date | null;
        lastValidatedAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type FolderSyncStateWriter = {
  folderSyncState: {
    upsert: (args: {
      where: { folderId: string };
      update: {
        mailboxId: string;
        deltaLink: string | null;
        syncStatus: UpsertFolderSyncStateInput["syncStatus"];
        lastSyncedAt: Date | null;
        lastCursorUpdatedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        folderId: string;
        deltaLink: string | null;
        syncStatus: UpsertFolderSyncStateInput["syncStatus"];
        lastSyncedAt: Date | null;
        lastCursorUpdatedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type FolderWriter = {
  folder: {
    upsert: (args: {
      where: { graphFolderId: string };
      update: {
        mailboxId: string;
        displayName: string;
        parentGraphFolderId: string | null;
        isSyncEnabled: boolean;
      };
      create: {
        mailboxId: string;
        graphFolderId: string;
        displayName: string;
        parentGraphFolderId: string | null;
        isSyncEnabled: boolean;
      };
    }) => Promise<unknown>;
  };
};

type GraphSubscriptionWriter = {
  graphSubscription: {
    upsert: (args: {
      where: { graphSubscriptionId: string };
      update: {
        mailboxId: string;
        resource: string;
        changeTypes: string[];
        notificationUrl: string;
        lifecycleNotificationUrl: string | null;
        clientStateHash: string | null;
        status: UpsertGraphSubscriptionInput["status"];
        expiresAt: Date;
        lastValidatedAt: Date | null;
        lastNotificationAt: Date | null;
        lastLifecycleEventAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        graphSubscriptionId: string;
        resource: string;
        changeTypes: string[];
        notificationUrl: string;
        lifecycleNotificationUrl: string | null;
        clientStateHash: string | null;
        status: UpsertGraphSubscriptionInput["status"];
        expiresAt: Date;
        lastValidatedAt: Date | null;
        lastNotificationAt: Date | null;
        lastLifecycleEventAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type UpsertMessageWriter = {
  message: {
    upsert: (args: {
      where: { graphMessageId: string };
      update: {
        mailboxId: string;
        folderId: string | null;
        graphParentFolderId: string | null;
        graphChangeKey: string | null;
        internetMessageId: string | null;
        conversationId: string | null;
        subject: string;
        fromAddress: string | null;
        receivedAt: Date | null;
        lastGraphModifiedAt: Date | null;
        isRead: boolean;
        graphRemovedAt: Date | null;
        graphRemovalReason: string | null;
      };
      create: {
        mailboxId: string;
        folderId: string | null;
        graphMessageId: string;
        graphParentFolderId: string | null;
        graphChangeKey: string | null;
        internetMessageId: string | null;
        conversationId: string | null;
        subject: string;
        fromAddress: string | null;
        receivedAt: Date | null;
        lastGraphModifiedAt: Date | null;
        isRead: boolean;
        graphRemovedAt: Date | null;
        graphRemovalReason: string | null;
      };
    }) => Promise<unknown>;
  };
};

type MessageRemovalWriter = {
  message: {
    updateMany: (args: {
      where: {
        mailboxId: string;
        graphMessageId: string;
      };
      data: {
        folderId: null;
        graphParentFolderId: null;
        graphRemovedAt: Date;
        graphRemovalReason: string;
      };
    }) => Promise<unknown>;
  };
};

type MessageContentWriter = {
  message: {
    updateMany: (args: {
      where: {
        mailboxId: string;
        graphMessageId: string;
      };
      data: {
        bodyPreview: string | null;
        bodyContentType: UpsertMailboxMessageContentInput["bodyContentType"];
        bodyText: string | null;
        uniqueBodyText: string | null;
        webLink: string | null;
        hasAttachments: boolean;
        ingestionVersionKey: string;
        ingestedAt: Date;
        lastIngestedAt: Date;
      };
    }) => Promise<unknown>;
  };
};

type MessageAttachmentWriter = {
  messageAttachment: {
    upsert: (args: {
      where: {
        mailboxId_graphAttachmentId: {
          mailboxId: string;
          graphAttachmentId: string;
        };
      };
      update: {
        messageId: string;
        graphMessageId: string;
        name: string;
        contentType: string | null;
        sizeInBytes: number;
        isInline: boolean;
        attachmentKind: UpsertMessageAttachmentInput["attachmentKind"];
        lastGraphModifiedAt: Date | null;
        isExtractionCandidate: boolean;
        extractionDecisionReason: string | null;
        extractionStatus: UpsertMessageAttachmentInput["extractionStatus"];
        extractionAttempts: number;
        lastExtractionAt: Date | null;
        lastExtractionErrorCode: string | null;
      };
      create: {
        mailboxId: string;
        messageId: string;
        graphMessageId: string;
        graphAttachmentId: string;
        name: string;
        contentType: string | null;
        sizeInBytes: number;
        isInline: boolean;
        attachmentKind: UpsertMessageAttachmentInput["attachmentKind"];
        lastGraphModifiedAt: Date | null;
        isExtractionCandidate: boolean;
        extractionDecisionReason: string | null;
        extractionStatus: UpsertMessageAttachmentInput["extractionStatus"];
        extractionAttempts: number;
        lastExtractionAt: Date | null;
        lastExtractionErrorCode: string | null;
      };
    }) => Promise<unknown>;
  };
};

type ExtractionArtifactWriter = {
  extractionArtifact: {
    upsert: (args: {
      where: {
        attachmentId_artifactKind: {
          attachmentId: string;
          artifactKind: UpsertAttachmentExtractionArtifactInput["artifactKind"];
        };
      };
      update: {
        mailboxId: string;
        messageId: string;
        storageKey: string;
        textLength: number | null;
        contentHash: string | null;
        confidenceScore: number | null;
        sourceVersionKey: string;
        createdAt: Date;
      };
      create: {
        mailboxId: string;
        messageId: string;
        attachmentId: string;
        artifactKind: UpsertAttachmentExtractionArtifactInput["artifactKind"];
        storageKey: string;
        textLength: number | null;
        contentHash: string | null;
        confidenceScore: number | null;
        sourceVersionKey: string;
        createdAt: Date;
      };
    }) => Promise<unknown>;
  };
};

type MessageClassificationWriter = {
  messageClassification: {
    upsert: (args: {
      where: {
        messageId_ingestionVersionKey_classifierVersion: {
          messageId: string;
          ingestionVersionKey: string;
          classifierVersion: string;
        };
      };
      update: {
        mailboxId: string;
        actionability: UpsertMessageClassificationInput["actionability"];
        messageType: UpsertMessageClassificationInput["messageType"];
        confidenceScore: number;
        explanationSummary: string;
        explanationLowConfidence: boolean;
        explanationJson: Prisma.InputJsonValue;
        dueDatesJson: Prisma.InputJsonValue;
        entitiesJson: Prisma.InputJsonValue;
        taskCandidatesJson: Prisma.InputJsonValue;
        urgencyLevel: UpsertMessageClassificationInput["signals"]["urgency"]["level"];
        urgencyConfidenceScore: number;
        urgencyRationale: string;
        urgencyReasonsJson: Prisma.InputJsonValue;
        criticalityLevel: UpsertMessageClassificationInput["signals"]["criticality"]["level"];
        criticalityConfidenceScore: number;
        criticalityRationale: string;
        criticalityReasonsJson: Prisma.InputJsonValue;
        sourceAttachmentIds: string[];
        sourceArtifactIds: string[];
        classifiedAt: Date;
      };
      create: {
        mailboxId: string;
        messageId: string;
        ingestionVersionKey: string;
        classifierVersion: string;
        actionability: UpsertMessageClassificationInput["actionability"];
        messageType: UpsertMessageClassificationInput["messageType"];
        confidenceScore: number;
        explanationSummary: string;
        explanationLowConfidence: boolean;
        explanationJson: Prisma.InputJsonValue;
        dueDatesJson: Prisma.InputJsonValue;
        entitiesJson: Prisma.InputJsonValue;
        taskCandidatesJson: Prisma.InputJsonValue;
        urgencyLevel: UpsertMessageClassificationInput["signals"]["urgency"]["level"];
        urgencyConfidenceScore: number;
        urgencyRationale: string;
        urgencyReasonsJson: Prisma.InputJsonValue;
        criticalityLevel: UpsertMessageClassificationInput["signals"]["criticality"]["level"];
        criticalityConfidenceScore: number;
        criticalityRationale: string;
        criticalityReasonsJson: Prisma.InputJsonValue;
        sourceAttachmentIds: string[];
        sourceArtifactIds: string[];
        classifiedAt: Date;
      };
    }) => Promise<unknown>;
  };
};

export function createPrismaClient() {
  return new PrismaClient();
}

export function getPrismaClient() {
  const existing = globalThis.__friendlyMailPrisma__;
  if (existing) {
    return existing;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__friendlyMailPrisma__ = client;
  }

  return client;
}

export async function recordAuditEvent(
  writer: AuditEventWriter,
  input: RecordAuditEventInput
) {
  return writer.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      actor: input.actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      messageId: input.messageId,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null
    }
  });
}

export async function createLocalUser(writer: LocalUserWriter, input: CreateLocalUserInput) {
  return writer.user.upsert({
    where: {
      email: input.email
    },
    update: {
      displayName: input.displayName,
      authProvider: AuthProvider.LOCAL_PASSWORD,
      passwordHash: input.passwordHash
    },
    create: {
      email: input.email,
      displayName: input.displayName,
      authProvider: AuthProvider.LOCAL_PASSWORD,
      passwordHash: input.passwordHash,
      memberships: {
        create: {
          tenantId: input.tenantId,
          role: input.role
        }
      }
    },
    include: {
      memberships: true
    }
  });
}

export async function upsertMailboxConnection(
  writer: MailboxConnectionWriter,
  input: UpsertMailboxConnectionInput
) {
  const grantedScopes = normalizeStringList(input.grantedScopes);

  return writer.mailboxConnection.upsert({
    where: {
      mailboxId: input.mailboxId
    },
    update: {
      tenantId: input.tenantId,
      userId: input.userId,
      graphTenantId: input.graphTenantId,
      graphUserId: input.graphUserId,
      status: input.status,
      grantedScopes,
      accessTokenCiphertext: input.accessTokenCiphertext ?? null,
      refreshTokenCiphertext: input.refreshTokenCiphertext ?? null,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      tenantId: input.tenantId,
      userId: input.userId,
      graphTenantId: input.graphTenantId,
      graphUserId: input.graphUserId,
      status: input.status,
      grantedScopes,
      accessTokenCiphertext: input.accessTokenCiphertext ?? null,
      refreshTokenCiphertext: input.refreshTokenCiphertext ?? null,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertFolderSyncState(
  writer: FolderSyncStateWriter,
  input: UpsertFolderSyncStateInput
) {
  return writer.folderSyncState.upsert({
    where: {
      folderId: input.folderId
    },
    update: {
      mailboxId: input.mailboxId,
      deltaLink: input.deltaLink ?? null,
      syncStatus: input.syncStatus,
      lastSyncedAt: input.lastSyncedAt ?? null,
      lastCursorUpdatedAt: input.lastCursorUpdatedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      folderId: input.folderId,
      deltaLink: input.deltaLink ?? null,
      syncStatus: input.syncStatus,
      lastSyncedAt: input.lastSyncedAt ?? null,
      lastCursorUpdatedAt: input.lastCursorUpdatedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertMailboxFolder(writer: FolderWriter, input: UpsertMailboxFolderInput) {
  return writer.folder.upsert({
    where: {
      graphFolderId: input.graphFolderId
    },
    update: {
      mailboxId: input.mailboxId,
      displayName: input.displayName,
      parentGraphFolderId: input.parentGraphFolderId ?? null,
      isSyncEnabled: input.isSyncEnabled ?? true
    },
    create: {
      mailboxId: input.mailboxId,
      graphFolderId: input.graphFolderId,
      displayName: input.displayName,
      parentGraphFolderId: input.parentGraphFolderId ?? null,
      isSyncEnabled: input.isSyncEnabled ?? true
    }
  });
}

export async function upsertGraphSubscription(
  writer: GraphSubscriptionWriter,
  input: UpsertGraphSubscriptionInput
) {
  const changeTypes = normalizeStringList(input.changeTypes);

  return writer.graphSubscription.upsert({
    where: {
      graphSubscriptionId: input.graphSubscriptionId
    },
    update: {
      mailboxId: input.mailboxId,
      resource: input.resource,
      changeTypes,
      notificationUrl: input.notificationUrl,
      lifecycleNotificationUrl: input.lifecycleNotificationUrl ?? null,
      clientStateHash: input.clientStateHash ?? null,
      status: input.status,
      expiresAt: input.expiresAt,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastNotificationAt: input.lastNotificationAt ?? null,
      lastLifecycleEventAt: input.lastLifecycleEventAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      graphSubscriptionId: input.graphSubscriptionId,
      resource: input.resource,
      changeTypes,
      notificationUrl: input.notificationUrl,
      lifecycleNotificationUrl: input.lifecycleNotificationUrl ?? null,
      clientStateHash: input.clientStateHash ?? null,
      status: input.status,
      expiresAt: input.expiresAt,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastNotificationAt: input.lastNotificationAt ?? null,
      lastLifecycleEventAt: input.lastLifecycleEventAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertMailboxMessage(
  writer: UpsertMessageWriter,
  input: UpsertMailboxMessageInput
) {
  return writer.message.upsert({
    where: {
      graphMessageId: input.graphMessageId
    },
    update: {
      mailboxId: input.mailboxId,
      folderId: input.folderId ?? null,
      graphParentFolderId: input.graphParentFolderId ?? null,
      graphChangeKey: input.graphChangeKey ?? null,
      internetMessageId: input.internetMessageId ?? null,
      conversationId: input.conversationId ?? null,
      subject: input.subject,
      fromAddress: input.fromAddress ?? null,
      receivedAt: input.receivedAt ?? null,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isRead: input.isRead,
      graphRemovedAt: input.graphRemovedAt ?? null,
      graphRemovalReason: input.graphRemovalReason ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      folderId: input.folderId ?? null,
      graphMessageId: input.graphMessageId,
      graphParentFolderId: input.graphParentFolderId ?? null,
      graphChangeKey: input.graphChangeKey ?? null,
      internetMessageId: input.internetMessageId ?? null,
      conversationId: input.conversationId ?? null,
      subject: input.subject,
      fromAddress: input.fromAddress ?? null,
      receivedAt: input.receivedAt ?? null,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isRead: input.isRead,
      graphRemovedAt: input.graphRemovedAt ?? null,
      graphRemovalReason: input.graphRemovalReason ?? null
    }
  });
}

export async function markMailboxMessageRemoved(
  writer: MessageRemovalWriter,
  input: MarkMailboxMessageRemovedInput
) {
  return writer.message.updateMany({
    where: {
      mailboxId: input.mailboxId,
      graphMessageId: input.graphMessageId
    },
    data: {
      folderId: null,
      graphParentFolderId: null,
      graphRemovedAt: input.graphRemovedAt,
      graphRemovalReason: input.graphRemovalReason
    }
  });
}

export async function upsertMailboxMessageContent(
  writer: MessageContentWriter,
  input: UpsertMailboxMessageContentInput
) {
  return writer.message.updateMany({
    where: {
      mailboxId: input.mailboxId,
      graphMessageId: input.graphMessageId
    },
    data: {
      bodyPreview: input.bodyPreview ?? null,
      bodyContentType: input.bodyContentType,
      bodyText: input.bodyText ?? null,
      uniqueBodyText: input.uniqueBodyText ?? null,
      webLink: input.webLink ?? null,
      hasAttachments: input.hasAttachments,
      ingestionVersionKey: input.ingestionVersionKey,
      ingestedAt: input.ingestedAt,
      lastIngestedAt: input.ingestedAt
    }
  });
}

export async function upsertMessageAttachment(
  writer: MessageAttachmentWriter,
  input: UpsertMessageAttachmentInput
) {
  return writer.messageAttachment.upsert({
    where: {
      mailboxId_graphAttachmentId: {
        mailboxId: input.mailboxId,
        graphAttachmentId: input.graphAttachmentId
      }
    },
    update: {
      messageId: input.messageId,
      graphMessageId: input.graphMessageId,
      name: input.name,
      contentType: input.contentType ?? null,
      sizeInBytes: input.sizeInBytes,
      isInline: input.isInline,
      attachmentKind: input.attachmentKind,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isExtractionCandidate: input.isExtractionCandidate,
      extractionDecisionReason: input.extractionDecisionReason ?? null,
      extractionStatus: input.extractionStatus,
      extractionAttempts: input.extractionAttempts ?? 0,
      lastExtractionAt: input.lastExtractionAt ?? null,
      lastExtractionErrorCode: input.lastExtractionErrorCode ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      messageId: input.messageId,
      graphMessageId: input.graphMessageId,
      graphAttachmentId: input.graphAttachmentId,
      name: input.name,
      contentType: input.contentType ?? null,
      sizeInBytes: input.sizeInBytes,
      isInline: input.isInline,
      attachmentKind: input.attachmentKind,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isExtractionCandidate: input.isExtractionCandidate,
      extractionDecisionReason: input.extractionDecisionReason ?? null,
      extractionStatus: input.extractionStatus,
      extractionAttempts: input.extractionAttempts ?? 0,
      lastExtractionAt: input.lastExtractionAt ?? null,
      lastExtractionErrorCode: input.lastExtractionErrorCode ?? null
    }
  });
}

export async function upsertAttachmentExtractionArtifact(
  writer: ExtractionArtifactWriter,
  input: UpsertAttachmentExtractionArtifactInput
) {
  const createdAt = input.createdAt ?? new Date();

  return writer.extractionArtifact.upsert({
    where: {
      attachmentId_artifactKind: {
        attachmentId: input.attachmentId,
        artifactKind: input.artifactKind
      }
    },
    update: {
      mailboxId: input.mailboxId,
      messageId: input.messageId,
      storageKey: input.storageKey,
      textLength: input.textLength ?? null,
      contentHash: input.contentHash ?? null,
      confidenceScore: input.confidenceScore ?? null,
      sourceVersionKey: input.sourceVersionKey,
      createdAt
    },
    create: {
      mailboxId: input.mailboxId,
      messageId: input.messageId,
      attachmentId: input.attachmentId,
      artifactKind: input.artifactKind,
      storageKey: input.storageKey,
      textLength: input.textLength ?? null,
      contentHash: input.contentHash ?? null,
      confidenceScore: input.confidenceScore ?? null,
      sourceVersionKey: input.sourceVersionKey,
      createdAt
    }
  });
}

export async function upsertMessageClassification(
  writer: MessageClassificationWriter,
  input: UpsertMessageClassificationInput
) {
  const classifiedAt = input.classifiedAt ?? new Date();
  const sourceLinkage = collectMessageClassificationSourceLinkage(input);
  const data = {
    mailboxId: input.mailboxId,
    actionability: input.actionability,
    messageType: input.messageType,
    confidenceScore: input.confidenceScore,
    explanationSummary: input.explanation.summary,
    explanationLowConfidence: input.explanation.lowConfidence,
    explanationJson: toInputJson(input.explanation),
    dueDatesJson: toInputJson(input.signals.dueDates),
    entitiesJson: toInputJson(input.signals.entities),
    taskCandidatesJson: toInputJson(input.signals.taskCandidates),
    urgencyLevel: input.signals.urgency.level,
    urgencyConfidenceScore: input.signals.urgency.confidenceScore,
    urgencyRationale: input.signals.urgency.rationale,
    urgencyReasonsJson: toInputJson(input.signals.urgency.reasons),
    criticalityLevel: input.signals.criticality.level,
    criticalityConfidenceScore: input.signals.criticality.confidenceScore,
    criticalityRationale: input.signals.criticality.rationale,
    criticalityReasonsJson: toInputJson(input.signals.criticality.reasons),
    sourceAttachmentIds: sourceLinkage.sourceAttachmentIds,
    sourceArtifactIds: sourceLinkage.sourceArtifactIds,
    classifiedAt
  };

  return writer.messageClassification.upsert({
    where: {
      messageId_ingestionVersionKey_classifierVersion: {
        messageId: input.messageId,
        ingestionVersionKey: input.ingestionVersionKey,
        classifierVersion: input.classifierVersion
      }
    },
    update: data,
    create: {
      ...data,
      messageId: input.messageId,
      ingestionVersionKey: input.ingestionVersionKey,
      classifierVersion: input.classifierVersion
    }
  });
}

function normalizeStringList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function toInputJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function collectMessageClassificationSourceLinkage(input: UpsertMessageClassificationInput) {
  const attachmentIds = new Set<string>();
  const artifactIds = new Set<string>();

  const collect = (provenance: WorkflowSignalProvenanceSnapshot[] | undefined) => {
    for (const entry of provenance ?? []) {
      if (entry.attachmentId) {
        attachmentIds.add(entry.attachmentId);
      }

      if (entry.artifactId) {
        artifactIds.add(entry.artifactId);
      }
    }
  };

  for (const reason of input.explanation.reasons) {
    collect(reason.provenance);
  }

  for (const dueDate of input.signals.dueDates) {
    collect(dueDate.provenance);
  }

  for (const entity of input.signals.entities) {
    collect(entity.provenance);
  }

  for (const taskCandidate of input.signals.taskCandidates) {
    collect(taskCandidate.provenance);
  }

  for (const reason of input.signals.urgency.reasons) {
    collect(reason.provenance);
  }

  for (const reason of input.signals.criticality.reasons) {
    collect(reason.provenance);
  }

  return {
    sourceAttachmentIds: [...attachmentIds].sort(),
    sourceArtifactIds: [...artifactIds].sort()
  };
}

export * from "@prisma/client";
