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
  "TaskSourceLink",
  "TaskLifecycleEvent",
  "MessageWorkflowState",
  "FilingDecision",
  "MailboxActionAttempt",
  "OutgoingSequence",
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

export type TaskStatusReasonValue =
  | "USER_COMPLETED"
  | "USER_DISMISSED"
  | "RESOLVED_BY_WORKFLOW"
  | "DELEGATED"
  | "SNOOZED";

export type TaskSourceKindValue =
  | "CLASSIFICATION_TASK_CANDIDATE"
  | "MANUAL"
  | "WORKFLOW_RULE";

export type MessageWorkflowStatusValue =
  | "PENDING_TASK_MATERIALIZATION"
  | "ACTIVE_ACTIONABLE"
  | "ACTIVE_INFORMATIONAL_UNREAD"
  | "ACTIVE_INFORMATIONAL_REVIEWED"
  | "FILING_BLOCKED"
  | "ELIGIBLE_TO_FILE";

export type FilingBlockedByValue =
  | "CLASSIFICATION_PENDING"
  | "TASK_MATERIALIZATION_PENDING"
  | "MESSAGE_UNREAD"
  | "OPEN_TASK"
  | "SNOOZED_TASK"
  | "DELEGATED_TASK"
  | "CRITICAL_WORK_REMAINING"
  | "AWAITING_REVIEW"
  | "POLICY_HOLD";

export type FilingEligibilityRequirementValue =
  | "MESSAGE_READ"
  | "ALL_REQUIRED_TASKS_RESOLVED"
  | "CRITICAL_WORK_CLEARED"
  | "MANUAL_REVIEW_COMPLETED"
  | "POLICY_CLEARANCE";

export type UpsertTaskRecordInput = {
  taskKey: string;
  mailboxId: string;
  messageId?: string | null;
  sourceTaskCandidateId?: string | null;
  title: string;
  description?: string | null;
  status: "OPEN" | "SNOOZED" | "DELEGATED" | "DONE" | "DISMISSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  criticality: "NORMAL" | "ELEVATED" | "CRITICAL";
  ownerUserId?: string | null;
  assignedUserId?: string | null;
  delegatedByUserId?: string | null;
  snoozedUntil?: Date | null;
  dueAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date | null;
  resolutionReason?: TaskStatusReasonValue | null;
  resolutionNote?: string | null;
};

export type UpsertTaskSourceLinkInput = {
  taskId: string;
  mailboxId: string;
  messageId: string;
  sourceKind: TaskSourceKindValue;
  classificationIngestionVersionKey?: string | null;
  classifierVersion?: string | null;
  taskCandidateId: string;
  dueDateSignalIds: string[];
  entitySignalIds: string[];
  provenance: WorkflowSignalProvenanceSnapshot[];
  createdAt?: Date;
};

export type CreateTaskLifecycleEventInput = {
  mailboxId: string;
  taskId: string;
  fromStatus?: UpsertTaskRecordInput["status"] | null;
  toStatus: UpsertTaskRecordInput["status"];
  reason: TaskStatusReasonValue;
  actorUserId?: string | null;
  delegatedToUserId?: string | null;
  note?: string | null;
  occurredAt?: Date;
};

export type UpsertMessageWorkflowStateInput = {
  mailboxId: string;
  messageId: string;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  status: MessageWorkflowStatusValue;
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
  requirements: FilingEligibilityRequirementValue[];
  blockedBy: FilingBlockedByValue[];
  blockingTaskIds: string[];
  unresolvedTaskCount: number;
  openTaskCount: number;
  snoozedTaskCount: number;
  delegatedTaskCount: number;
  informationalReadRequired: boolean;
  messageIsRead: boolean;
  lastEvaluatedAt: Date;
};

export type FilingDecisionStatusValue = "BLOCKED" | "ELIGIBLE" | "EXECUTED" | "FAILED";

export type MailboxActionTypeValue =
  | "MOVE_MESSAGE"
  | "APPLY_CATEGORY"
  | "FORWARD_MESSAGE"
  | "STAMP_OUTGOING_REFERENCE";

export type MailboxActionModeValue = "SUGGESTION_ONLY" | "AUTO_APPLY" | "APPROVED_APPLY";

export type MailboxActionStatusValue =
  | "SUGGESTED"
  | "PENDING_APPROVAL"
  | "SUCCEEDED"
  | "FAILED"
  | "SKIPPED";

export type UpsertFilingDecisionInput = {
  mailboxId: string;
  messageId: string;
  workflowStateId?: string | null;
  actionability: "ACTIONABLE" | "INFORMATIONAL";
  status: FilingDecisionStatusValue;
  mode: MailboxActionModeValue;
  targetFolderId?: string | null;
  targetFolderGraphId?: string | null;
  targetFolderName?: string | null;
  suggestedCategories: string[];
  requirements: FilingEligibilityRequirementValue[];
  blockedBy: FilingBlockedByValue[];
  summary: string;
  rationale?: string | null;
  sourceMessageIsRead: boolean;
  approvedByUserId?: string | null;
  decidedAt: Date;
  executedAt?: Date | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
};

export type CreateMailboxActionAttemptInput = {
  mailboxId: string;
  messageId: string;
  filingDecisionId?: string | null;
  actionType: MailboxActionTypeValue;
  mode: MailboxActionModeValue;
  status: MailboxActionStatusValue;
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
  attemptedAt?: Date;
  completedAt?: Date | null;
};

export type AllocateOutgoingSequenceNumberInput = {
  mailboxId: string;
  sequenceKey: string;
  prefix: string;
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

type TaskWriter = {
  task: {
    upsert: (args: {
      where: {
        taskKey: string;
      };
      update: {
        mailboxId: string;
        messageId: string | null;
        sourceTaskCandidateId: string | null;
        title: string;
        description: string | null;
        status: UpsertTaskRecordInput["status"];
        priority: UpsertTaskRecordInput["priority"];
        criticality: UpsertTaskRecordInput["criticality"];
        ownerUserId: string | null;
        assignedUserId: string | null;
        delegatedByUserId: string | null;
        snoozedUntil: Date | null;
        dueAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolutionReason: TaskStatusReasonValue | null;
        resolutionNote: string | null;
      };
      create: {
        taskKey: string;
        mailboxId: string;
        messageId: string | null;
        sourceTaskCandidateId: string | null;
        title: string;
        description: string | null;
        status: UpsertTaskRecordInput["status"];
        priority: UpsertTaskRecordInput["priority"];
        criticality: UpsertTaskRecordInput["criticality"];
        ownerUserId: string | null;
        assignedUserId: string | null;
        delegatedByUserId: string | null;
        snoozedUntil: Date | null;
        dueAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        resolvedAt: Date | null;
        resolutionReason: TaskStatusReasonValue | null;
        resolutionNote: string | null;
      };
    }) => Promise<unknown>;
  };
};

type TaskSourceLinkWriter = {
  taskSourceLink: {
    upsert: (args: {
      where: {
        taskId_sourceKind_messageId_taskCandidateId: {
          taskId: string;
          sourceKind: TaskSourceKindValue;
          messageId: string;
          taskCandidateId: string;
        };
      };
      update: {
        mailboxId: string;
        classificationIngestionVersionKey: string | null;
        classifierVersion: string | null;
        dueDateSignalIds: string[];
        entitySignalIds: string[];
        provenanceJson: Prisma.InputJsonValue;
        createdAt: Date;
      };
      create: {
        taskId: string;
        mailboxId: string;
        messageId: string;
        sourceKind: TaskSourceKindValue;
        classificationIngestionVersionKey: string | null;
        classifierVersion: string | null;
        taskCandidateId: string;
        dueDateSignalIds: string[];
        entitySignalIds: string[];
        provenanceJson: Prisma.InputJsonValue;
        createdAt: Date;
      };
    }) => Promise<unknown>;
  };
};

type TaskLifecycleEventWriter = {
  taskLifecycleEvent: {
    create: (args: {
      data: {
        mailboxId: string;
        taskId: string;
        fromStatus: UpsertTaskRecordInput["status"] | null;
        toStatus: UpsertTaskRecordInput["status"];
        reason: TaskStatusReasonValue;
        actorUserId: string | null;
        delegatedToUserId: string | null;
        note: string | null;
        occurredAt: Date;
      };
    }) => Promise<unknown>;
  };
};

type MessageWorkflowStateWriter = {
  messageWorkflowState: {
    upsert: (args: {
      where: {
        messageId: string;
      };
      update: {
        mailboxId: string;
        actionability: UpsertMessageWorkflowStateInput["actionability"];
        status: UpsertMessageWorkflowStateInput["status"];
        filingState: UpsertMessageWorkflowStateInput["filingState"];
        priority: UpsertMessageWorkflowStateInput["priority"];
        criticality: UpsertMessageWorkflowStateInput["criticality"];
        isEligibleToFile: boolean;
        requirements: FilingEligibilityRequirementValue[];
        blockedBy: FilingBlockedByValue[];
        blockingTaskIds: string[];
        unresolvedTaskCount: number;
        openTaskCount: number;
        snoozedTaskCount: number;
        delegatedTaskCount: number;
        informationalReadRequired: boolean;
        messageIsRead: boolean;
        lastEvaluatedAt: Date;
      };
      create: {
        mailboxId: string;
        messageId: string;
        actionability: UpsertMessageWorkflowStateInput["actionability"];
        status: UpsertMessageWorkflowStateInput["status"];
        filingState: UpsertMessageWorkflowStateInput["filingState"];
        priority: UpsertMessageWorkflowStateInput["priority"];
        criticality: UpsertMessageWorkflowStateInput["criticality"];
        isEligibleToFile: boolean;
        requirements: FilingEligibilityRequirementValue[];
        blockedBy: FilingBlockedByValue[];
        blockingTaskIds: string[];
        unresolvedTaskCount: number;
        openTaskCount: number;
        snoozedTaskCount: number;
        delegatedTaskCount: number;
        informationalReadRequired: boolean;
        messageIsRead: boolean;
        lastEvaluatedAt: Date;
      };
    }) => Promise<unknown>;
  };
};

type FilingDecisionWriter = {
  filingDecision: {
    upsert: (args: {
      where: {
        messageId: string;
      };
      update: {
        mailboxId: string;
        workflowStateId: string | null;
        actionability: "ACTIONABLE" | "INFORMATIONAL";
        status: FilingDecisionStatusValue;
        mode: MailboxActionModeValue;
        targetFolderId: string | null;
        targetFolderGraphId: string | null;
        targetFolderName: string | null;
        suggestedCategories: string[];
        requirements: FilingEligibilityRequirementValue[];
        blockedBy: FilingBlockedByValue[];
        summary: string;
        rationale: string | null;
        sourceMessageIsRead: boolean;
        approvedByUserId: string | null;
        decidedAt: Date;
        executedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
      };
      create: {
        mailboxId: string;
        messageId: string;
        workflowStateId: string | null;
        actionability: "ACTIONABLE" | "INFORMATIONAL";
        status: FilingDecisionStatusValue;
        mode: MailboxActionModeValue;
        targetFolderId: string | null;
        targetFolderGraphId: string | null;
        targetFolderName: string | null;
        suggestedCategories: string[];
        requirements: FilingEligibilityRequirementValue[];
        blockedBy: FilingBlockedByValue[];
        summary: string;
        rationale: string | null;
        sourceMessageIsRead: boolean;
        approvedByUserId: string | null;
        decidedAt: Date;
        executedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorMessage: string | null;
      };
    }) => Promise<unknown>;
  };
};

type MailboxActionAttemptWriter = {
  mailboxActionAttempt: {
    create: (args: {
      data: {
        mailboxId: string;
        messageId: string;
        filingDecisionId: string | null;
        actionType: MailboxActionTypeValue;
        mode: MailboxActionModeValue;
        status: MailboxActionStatusValue;
        actorUserId: string | null;
        targetFolderId: string | null;
        targetFolderGraphId: string | null;
        targetFolderName: string | null;
        categoryName: string | null;
        forwardedTo: string | null;
        referenceNumber: string | null;
        graphMessageId: string | null;
        graphRequestId: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        attemptedAt: Date;
        completedAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type OutgoingSequenceWriter = {
  outgoingSequence: {
    findUnique: (args: {
      where: {
        mailboxId_sequenceKey: {
          mailboxId: string;
          sequenceKey: string;
        };
      };
    }) => Promise<{ lastAllocatedValue: number } | null>;
    upsert: (args: {
      where: {
        mailboxId_sequenceKey: {
          mailboxId: string;
          sequenceKey: string;
        };
      };
      update: {
        prefix: string;
        lastAllocatedValue: number;
      };
      create: {
        mailboxId: string;
        sequenceKey: string;
        prefix: string;
        lastAllocatedValue: number;
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

export async function upsertTaskRecord(writer: TaskWriter, input: UpsertTaskRecordInput) {
  const createdAt = input.createdAt ?? new Date();
  const updatedAt = input.updatedAt ?? createdAt;
  const data = {
    mailboxId: input.mailboxId,
    messageId: input.messageId ?? null,
    sourceTaskCandidateId: input.sourceTaskCandidateId ?? null,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    criticality: input.criticality,
    ownerUserId: input.ownerUserId ?? null,
    assignedUserId: input.assignedUserId ?? null,
    delegatedByUserId: input.delegatedByUserId ?? null,
    snoozedUntil: input.snoozedUntil ?? null,
    dueAt: input.dueAt ?? null,
    createdAt,
    updatedAt,
    resolvedAt: input.resolvedAt ?? null,
    resolutionReason: input.resolutionReason ?? null,
    resolutionNote: input.resolutionNote ?? null
  };

  return writer.task.upsert({
    where: {
      taskKey: input.taskKey
    },
    update: data,
    create: {
      taskKey: input.taskKey,
      ...data
    }
  });
}

export async function upsertTaskSourceLink(
  writer: TaskSourceLinkWriter,
  input: UpsertTaskSourceLinkInput
) {
  const createdAt = input.createdAt ?? new Date();
  const data = {
    mailboxId: input.mailboxId,
    classificationIngestionVersionKey: input.classificationIngestionVersionKey ?? null,
    classifierVersion: input.classifierVersion ?? null,
    dueDateSignalIds: normalizeStringList(input.dueDateSignalIds),
    entitySignalIds: normalizeStringList(input.entitySignalIds),
    provenanceJson: toInputJson(input.provenance),
    createdAt
  };

  return writer.taskSourceLink.upsert({
    where: {
      taskId_sourceKind_messageId_taskCandidateId: {
        taskId: input.taskId,
        sourceKind: input.sourceKind,
        messageId: input.messageId,
        taskCandidateId: input.taskCandidateId
      }
    },
    update: data,
    create: {
      taskId: input.taskId,
      mailboxId: input.mailboxId,
      messageId: input.messageId,
      sourceKind: input.sourceKind,
      classificationIngestionVersionKey: input.classificationIngestionVersionKey ?? null,
      classifierVersion: input.classifierVersion ?? null,
      taskCandidateId: input.taskCandidateId,
      dueDateSignalIds: normalizeStringList(input.dueDateSignalIds),
      entitySignalIds: normalizeStringList(input.entitySignalIds),
      provenanceJson: toInputJson(input.provenance),
      createdAt
    }
  });
}

export async function createTaskLifecycleEvent(
  writer: TaskLifecycleEventWriter,
  input: CreateTaskLifecycleEventInput
) {
  return writer.taskLifecycleEvent.create({
    data: {
      mailboxId: input.mailboxId,
      taskId: input.taskId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      reason: input.reason,
      actorUserId: input.actorUserId ?? null,
      delegatedToUserId: input.delegatedToUserId ?? null,
      note: input.note ?? null,
      occurredAt: input.occurredAt ?? new Date()
    }
  });
}

export async function upsertMessageWorkflowState(
  writer: MessageWorkflowStateWriter,
  input: UpsertMessageWorkflowStateInput
) {
  const data = {
    mailboxId: input.mailboxId,
    actionability: input.actionability,
    status: input.status,
    filingState: input.filingState,
    priority: input.priority,
    criticality: input.criticality,
    isEligibleToFile: input.isEligibleToFile,
    requirements: [...new Set(input.requirements)].sort(),
    blockedBy: [...new Set(input.blockedBy)].sort(),
    blockingTaskIds: normalizeStringList(input.blockingTaskIds),
    unresolvedTaskCount: input.unresolvedTaskCount,
    openTaskCount: input.openTaskCount,
    snoozedTaskCount: input.snoozedTaskCount,
    delegatedTaskCount: input.delegatedTaskCount,
    informationalReadRequired: input.informationalReadRequired,
    messageIsRead: input.messageIsRead,
    lastEvaluatedAt: input.lastEvaluatedAt
  };

  return writer.messageWorkflowState.upsert({
    where: {
      messageId: input.messageId
    },
    update: data,
    create: {
      messageId: input.messageId,
      ...data
    }
  });
}

export async function upsertFilingDecision(
  writer: FilingDecisionWriter,
  input: UpsertFilingDecisionInput
) {
  const data = {
    mailboxId: input.mailboxId,
    workflowStateId: input.workflowStateId ?? null,
    actionability: input.actionability,
    status: input.status,
    mode: input.mode,
    targetFolderId: input.targetFolderId ?? null,
    targetFolderGraphId: input.targetFolderGraphId ?? null,
    targetFolderName: input.targetFolderName ?? null,
    suggestedCategories: normalizeStringList(input.suggestedCategories),
    requirements: [...new Set(input.requirements)].sort(),
    blockedBy: [...new Set(input.blockedBy)].sort(),
    summary: input.summary,
    rationale: input.rationale ?? null,
    sourceMessageIsRead: input.sourceMessageIsRead,
    approvedByUserId: input.approvedByUserId ?? null,
    decidedAt: input.decidedAt,
    executedAt: input.executedAt ?? null,
    lastErrorCode: input.lastErrorCode ?? null,
    lastErrorMessage: input.lastErrorMessage ?? null
  };

  return writer.filingDecision.upsert({
    where: {
      messageId: input.messageId
    },
    update: data,
    create: {
      messageId: input.messageId,
      ...data
    }
  });
}

export async function createMailboxActionAttempt(
  writer: MailboxActionAttemptWriter,
  input: CreateMailboxActionAttemptInput
) {
  return writer.mailboxActionAttempt.create({
    data: {
      mailboxId: input.mailboxId,
      messageId: input.messageId,
      filingDecisionId: input.filingDecisionId ?? null,
      actionType: input.actionType,
      mode: input.mode,
      status: input.status,
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
      attemptedAt: input.attemptedAt ?? new Date(),
      completedAt: input.completedAt ?? null
    }
  });
}

export async function allocateOutgoingSequenceNumber(
  writer: OutgoingSequenceWriter,
  input: AllocateOutgoingSequenceNumberInput
) {
  const existing = await writer.outgoingSequence.findUnique({
    where: {
      mailboxId_sequenceKey: {
        mailboxId: input.mailboxId,
        sequenceKey: input.sequenceKey
      }
    }
  });
  const nextValue = (existing?.lastAllocatedValue ?? 0) + 1;

  await writer.outgoingSequence.upsert({
    where: {
      mailboxId_sequenceKey: {
        mailboxId: input.mailboxId,
        sequenceKey: input.sequenceKey
      }
    },
    update: {
      prefix: input.prefix,
      lastAllocatedValue: nextValue
    },
    create: {
      mailboxId: input.mailboxId,
      sequenceKey: input.sequenceKey,
      prefix: input.prefix,
      lastAllocatedValue: nextValue
    }
  });

  return {
    sequenceKey: input.sequenceKey,
    prefix: input.prefix,
    value: nextValue,
    referenceNumber: `${input.prefix}-${String(nextValue).padStart(4, "0")}`
  };
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
