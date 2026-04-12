export enum MailSurface {
  Dashboard = "dashboard",
  OutlookAddIn = "outlook-addin"
}

export enum MailboxKind {
  User = "user",
  Shared = "shared"
}

export enum MailboxConnectionStatus {
  PendingConsent = "pending_consent",
  Active = "active",
  NeedsReauth = "needs_reauth",
  Failed = "failed",
  Disconnected = "disconnected"
}

export enum AuthProvider {
  LocalPassword = "local_password",
  MicrosoftEntra = "microsoft_entra"
}

export enum TenantUserRole {
  Admin = "admin",
  Member = "member"
}

export enum MessageActionability {
  Actionable = "actionable",
  Informational = "informational"
}

export enum MessageType {
  Contract = "contract",
  Notice = "notice",
  Letter = "letter",
  Policy = "policy",
  Committee = "committee",
  Event = "event",
  Invoice = "invoice",
  Internal = "internal",
  Fyi = "fyi"
}

export enum MessagePriority {
  Low = "low",
  Normal = "normal",
  High = "high",
  Critical = "critical"
}

export enum FilingState {
  PendingClassification = "pending_classification",
  ActiveActionable = "active_actionable",
  ActiveInformationalUnread = "active_informational_unread",
  EligibleToFile = "eligible_to_file",
  Filed = "filed",
  FilingBlocked = "filing_blocked"
}

export enum TaskStatus {
  Open = "open",
  Snoozed = "snoozed",
  Delegated = "delegated",
  Done = "done",
  Dismissed = "dismissed"
}

export enum TaskStatusReason {
  UserCompleted = "user_completed",
  UserDismissed = "user_dismissed",
  ResolvedByWorkflow = "resolved_by_workflow",
  Delegated = "delegated",
  Snoozed = "snoozed"
}

export enum TaskSourceKind {
  ClassificationTaskCandidate = "classification_task_candidate",
  Manual = "manual",
  WorkflowRule = "workflow_rule"
}

export enum WorkflowStatus {
  Healthy = "healthy"
}

export enum WorkflowLifecycleStatus {
  Pending = "pending",
  Active = "active",
  Blocked = "blocked",
  Resolved = "resolved"
}

export enum MessageWorkflowStatus {
  PendingTaskMaterialization = "pending_task_materialization",
  ActiveActionable = "active_actionable",
  ActiveInformationalUnread = "active_informational_unread",
  ActiveInformationalReviewed = "active_informational_reviewed",
  FilingBlocked = "filing_blocked",
  EligibleToFile = "eligible_to_file"
}

export enum FilingDecisionStatus {
  Blocked = "blocked",
  Eligible = "eligible",
  Executed = "executed",
  Failed = "failed"
}

export enum MailboxActionType {
  MoveMessage = "move_message",
  ApplyCategory = "apply_category",
  ForwardMessage = "forward_message",
  StampOutgoingReference = "stamp_outgoing_reference"
}

export enum MailboxActionMode {
  SuggestionOnly = "suggestion_only",
  AutoApply = "auto_apply",
  ApprovedApply = "approved_apply"
}

export enum MailboxActionStatus {
  Suggested = "suggested",
  PendingApproval = "pending_approval",
  Succeeded = "succeeded",
  Failed = "failed",
  Skipped = "skipped"
}

export enum FolderSyncStatus {
  Pending = "pending",
  Active = "active",
  Idle = "idle",
  Failed = "failed"
}

export enum GraphSubscriptionStatus {
  Pending = "pending",
  Active = "active",
  Expired = "expired",
  Removed = "removed",
  ReauthRequired = "reauth_required",
  Failed = "failed"
}

export enum MessageBodyContentType {
  Text = "text"
}

export enum AttachmentKind {
  File = "file",
  Item = "item",
  Reference = "reference"
}

export enum ExtractionStatus {
  NotAttempted = "not_attempted",
  Pending = "pending",
  Completed = "completed",
  CompletedWithOcr = "completed_with_ocr",
  Unsupported = "unsupported",
  Failed = "failed"
}

export enum ExtractionArtifactKind {
  AttachmentText = "attachment_text",
  AttachmentOcr = "attachment_ocr"
}

export enum VerificationCheckStatus {
  Pass = "pass",
  Warn = "warn",
  Fail = "fail"
}

export enum OperationalHealthStatus {
  Healthy = "healthy",
  Warning = "warning",
  Critical = "critical"
}

export enum SharedMailboxReadinessStatus {
  Ready = "ready",
  Limited = "limited",
  Unsupported = "unsupported"
}

export enum WorkflowSignalSourceKind {
  MessageMetadata = "message_metadata",
  BodyText = "body_text",
  UniqueBodyText = "unique_body_text",
  AttachmentText = "attachment_text",
  AttachmentOcr = "attachment_ocr"
}

export enum WorkflowEntityKind {
  Counterparty = "counterparty",
  Committee = "committee",
  Event = "event",
  Invoice = "invoice",
  Person = "person",
  Organization = "organization",
  Policy = "policy",
  Document = "document"
}

export enum WorkflowCriticalityLevel {
  Normal = "normal",
  Elevated = "elevated",
  Critical = "critical"
}

export enum ClassificationReasonCode {
  ActionRequested = "action_requested",
  DueDateDetected = "due_date_detected",
  DeadlineCueDetected = "deadline_cue_detected",
  InvoiceCueDetected = "invoice_cue_detected",
  NoticeCueDetected = "notice_cue_detected",
  CounterpartyDetected = "counterparty_detected",
  AttachmentEvidenceUsed = "attachment_evidence_used",
  LowConfidence = "low_confidence",
  AmbiguousContent = "ambiguous_content"
}

export enum AuditEventAction {
  MessageFiled = "message.filed",
  MessageCategorized = "message.categorized",
  MessageForwarded = "message.forwarded",
  MessageNumbered = "message.numbered",
  TaskCreated = "task.created",
  TaskResolved = "task.resolved",
  SessionCreated = "session.created",
  SessionRevoked = "session.revoked"
}

export type AuditEntityType =
  | "tenant"
  | "mailbox"
  | "message"
  | "task"
  | "session"
  | "routing_rule";

export type FilingBlockedBy =
  | "classification_pending"
  | "task_materialization_pending"
  | "message_unread"
  | "open_task"
  | "snoozed_task"
  | "delegated_task"
  | "critical_work_remaining"
  | "awaiting_review"
  | "policy_hold";

export type FilingEligibilityRequirement =
  | "message_read"
  | "all_required_tasks_resolved"
  | "critical_work_cleared"
  | "manual_review_completed"
  | "policy_clearance";

export type AuthBoundary = {
  productIdentity: "friendly_mail_internal";
  mailboxIdentity: "microsoft_graph";
  graphConnectionState: "not_connected" | "connected";
};

export type SessionPrincipal = {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: TenantUserRole;
  authProvider: AuthProvider;
};

export type SessionView = {
  id: string;
  expiresAt: string;
  surface: MailSurface;
  principal: SessionPrincipal;
  authBoundary: AuthBoundary;
};

export type MailboxRecord = {
  id: string;
  tenantId: string;
  displayName: string;
  emailAddress: string;
  kind: MailboxKind;
  graphMailboxId?: string;
};

export type MailboxConnectionRecord = {
  id: string;
  mailboxId: string;
  tenantId: string;
  userId: string;
  graphTenantId: string;
  graphUserId: string;
  status: MailboxConnectionStatus;
  grantedScopes: string[];
  connectedAt?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  lastValidatedAt?: string;
  lastReauthorizedAt?: string;
  lastErrorCode?: string;
};

export type FolderSyncStateRecord = {
  id: string;
  mailboxId: string;
  folderId: string;
  status: FolderSyncStatus;
  deltaLink?: string;
  lastSyncedAt?: string;
  lastCursorUpdatedAt?: string;
  lastErrorCode?: string;
};

export type GraphSubscriptionRecord = {
  id: string;
  mailboxId: string;
  graphSubscriptionId: string;
  resource: string;
  changeTypes: string[];
  status: GraphSubscriptionStatus;
  notificationUrl: string;
  lifecycleNotificationUrl?: string;
  expiresAt: string;
  lastValidatedAt?: string;
  lastNotificationAt?: string;
  lastLifecycleEventAt?: string;
  lastReauthorizedAt?: string;
  lastErrorCode?: string;
};

export type VerificationCheck = {
  code: string;
  status: VerificationCheckStatus;
  detail: string;
};

export type SharedMailboxReadinessReport = {
  sourceMailboxId: string;
  sharedMailboxAddress: string;
  checkedAt: string;
  status: SharedMailboxReadinessStatus;
  fallbackMode: "recommendation_only" | "unsupported";
  grantedScopes: string[];
  requiredScopes: string[];
  capabilities: {
    delegatedSharedFolderRead: boolean;
    webhookBackedSync: boolean;
    backgroundDeltaRepair: boolean;
    sendWorkflowActions: boolean;
  };
  checks: VerificationCheck[];
};

export type MailboxOperationalFolderReport = {
  folderId: string;
  displayName: string;
  status: FolderSyncStatus | "missing";
  lastSyncedAt?: string;
  lastCursorUpdatedAt?: string;
  cursorLagMinutes?: number;
  lastErrorCode?: string;
};

export type MailboxOperationalVerificationReport = {
  mailboxId: string;
  checkedAt: string;
  overallStatus: OperationalHealthStatus;
  subscription: {
    graphSubscriptionId?: string;
    status: GraphSubscriptionStatus | "missing";
    health: OperationalHealthStatus;
    expiresAt?: string;
    minutesUntilExpiry?: number;
    lastNotificationAt?: string;
    lastLifecycleEventAt?: string;
    lastErrorCode?: string;
  };
  deltaSync: {
    trackedFolders: number;
    healthyFolders: number;
    staleFolders: number;
    failedFolders: number;
    missingCursorFolders: number;
    maxCursorLagMinutes: number;
    folders: MailboxOperationalFolderReport[];
  };
  immutableIds: {
    status: "enforced";
    messageReads: boolean;
    messageLists: boolean;
    deltaQueries: boolean;
    subscriptionCreation: boolean;
  };
  checks: VerificationCheck[];
};

export type ProcessingVerificationCountByReason = {
  reason: string;
  count: number;
};

export type ProcessingVerificationCountByErrorCode = {
  errorCode: string;
  count: number;
};

export type ClassificationVerificationCountByMessageType = {
  messageType: MessageType;
  count: number;
};

export type MailboxProcessingVerificationReport = {
  mailboxId: string;
  checkedAt: string;
  overallStatus: OperationalHealthStatus;
  ingestion: {
    trackedMessages: number;
    ingestedMessages: number;
    pendingMessages: number;
    messagesWithAttachments: number;
  };
  extraction: {
    trackedAttachments: number;
    candidateAttachments: number;
    completedAttachments: number;
    completedWithOcrAttachments: number;
    pendingAttachments: number;
    failedAttachments: number;
    unsupportedAttachments: number;
    retriedAttachments: number;
    retryBacklogAttachments: number;
    maxExtractionAttempts: number;
    failureRate: number;
    unsupportedReasons: ProcessingVerificationCountByReason[];
    failureReasons: ProcessingVerificationCountByErrorCode[];
  };
  checks: VerificationCheck[];
};

export type MailboxClassificationVerificationReport = {
  mailboxId: string;
  checkedAt: string;
  overallStatus: OperationalHealthStatus;
  coverage: {
    trackedMessages: number;
    eligibleMessages: number;
    classifiedMessages: number;
    pendingClassificationMessages: number;
    actionableMessages: number;
    informationalMessages: number;
    messageTypeCounts: ClassificationVerificationCountByMessageType[];
  };
  confidence: {
    averageScore: number;
    lowConfidenceMessages: number;
    mediumConfidenceMessages: number;
    highConfidenceMessages: number;
    ambiguousMessages: number;
  };
  signals: {
    messagesWithDueDates: number;
    messagesWithEntities: number;
    messagesWithTaskCandidates: number;
    messagesWithCriticality: number;
    highRiskMessages: number;
    highRiskMessagesWithDueDates: number;
  };
  degradedCases: {
    lowConfidenceMessageIds: string[];
    ambiguousMessageIds: string[];
    highRiskMissingDueDateMessageIds: string[];
  };
  checks: VerificationCheck[];
};

export type WorkflowSignalProvenance = {
  sourceKind: WorkflowSignalSourceKind;
  attachmentId?: string;
  artifactId?: string;
  field?: string;
  excerpt?: string;
};

export type ClassificationReason = {
  code: ClassificationReasonCode;
  summary: string;
  provenance?: WorkflowSignalProvenance[];
};

export type DueDateSignal = {
  id: string;
  label: string;
  value: string;
  confidenceScore: number;
  rationale?: string;
  provenance: WorkflowSignalProvenance[];
};

export type WorkflowEntitySignal = {
  id: string;
  kind: WorkflowEntityKind;
  value: string;
  normalizedValue?: string;
  confidenceScore: number;
  rationale?: string;
  provenance: WorkflowSignalProvenance[];
};

export type TaskCandidateSignal = {
  id: string;
  title: string;
  summary?: string;
  dueAt?: string;
  confidenceScore: number;
  rationale: string;
  provenance: WorkflowSignalProvenance[];
};

export type WorkflowUrgencySignal = {
  level: MessagePriority;
  confidenceScore: number;
  rationale: string;
  reasons: ClassificationReason[];
};

export type WorkflowCriticalitySignal = {
  level: WorkflowCriticalityLevel;
  confidenceScore: number;
  rationale: string;
  reasons: ClassificationReason[];
};

export type MessageClassificationExplanation = {
  summary: string;
  lowConfidence: boolean;
  reasons: ClassificationReason[];
};

export type MessageWorkflowSignals = {
  dueDates: DueDateSignal[];
  entities: WorkflowEntitySignal[];
  taskCandidates: TaskCandidateSignal[];
  urgency: WorkflowUrgencySignal;
  criticality: WorkflowCriticalitySignal;
};

export type MessageClassificationResult = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifiedAt: string;
  classifierVersion: string;
  actionability: MessageActionability;
  messageType: MessageType;
  confidenceScore: number;
  explanation: MessageClassificationExplanation;
  signals: MessageWorkflowSignals;
};

export type ClassificationConfidenceBand = "low" | "medium" | "high";

export type ClassificationReasonReadModel = {
  code: ClassificationReasonCode;
  summary: string;
  provenance: {
    sourceKinds: WorkflowSignalSourceKind[];
    attachmentIds: string[];
    artifactIds: string[];
    fields: string[];
  };
};

export type MessageClassificationReadModel = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifiedAt: string;
  classifierVersion: string;
  actionability: MessageActionability;
  messageType: MessageType;
  confidence: {
    overall: {
      score: number;
      band: ClassificationConfidenceBand;
      lowConfidence: boolean;
    };
    signals: {
      dueDates: {
        count: number;
        maxScore?: number;
      };
      entities: {
        count: number;
        maxScore?: number;
      };
      taskCandidates: {
        count: number;
        maxScore?: number;
      };
      urgency: {
        score: number;
        band: ClassificationConfidenceBand;
        level: MessagePriority;
      };
      criticality: {
        score: number;
        band: ClassificationConfidenceBand;
        level: WorkflowCriticalityLevel;
      };
    };
  };
  explanation: {
    summary: string;
    lowConfidence: boolean;
    reasons: ClassificationReasonReadModel[];
    urgency: {
      level: MessagePriority;
      rationale: string;
      reasons: ClassificationReasonReadModel[];
    };
    criticality: {
      level: WorkflowCriticalityLevel;
      rationale: string;
      reasons: ClassificationReasonReadModel[];
    };
  };
  signals: {
    summary: {
      dueDateCount: number;
      entityCount: number;
      taskCandidateCount: number;
      nextDueDate?: Pick<DueDateSignal, "id" | "label" | "value" | "confidenceScore">;
      topEntities: Array<
        Pick<
          WorkflowEntitySignal,
          "id" | "kind" | "value" | "normalizedValue" | "confidenceScore"
        >
      >;
      topTaskCandidates: Array<
        Pick<TaskCandidateSignal, "id" | "title" | "dueAt" | "confidenceScore">
      >;
    };
    dueDates: DueDateSignal[];
    entities: WorkflowEntitySignal[];
    taskCandidates: TaskCandidateSignal[];
  };
};

export type MessageRecord = {
  id: string;
  mailboxId: string;
  folderId?: string;
  graphMessageId: string;
  graphParentFolderId?: string;
  graphChangeKey?: string;
  internetMessageId?: string;
  conversationId?: string;
  subject: string;
  actionability: MessageActionability;
  messageType: MessageType;
  priority: MessagePriority;
  filingState: FilingState;
  fromAddress?: string;
  receivedAt?: string;
  lastGraphModifiedAt?: string;
  graphRemovedAt?: string;
  graphRemovalReason?: "changed" | "deleted";
  isRead: boolean;
  bodyPreview?: string;
  bodyContentType?: MessageBodyContentType;
  bodyText?: string;
  uniqueBodyText?: string;
  webLink?: string;
  hasAttachments?: boolean;
  ingestionVersionKey?: string;
  ingestedAt?: string;
  lastIngestedAt?: string;
};

export type MessageAttachmentRecord = {
  id: string;
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  graphAttachmentId: string;
  name: string;
  contentType?: string;
  sizeInBytes: number;
  isInline: boolean;
  attachmentKind: AttachmentKind;
  lastGraphModifiedAt?: string;
  isExtractionCandidate: boolean;
  extractionDecisionReason?: string;
  extractionStatus: ExtractionStatus;
  extractionAttempts: number;
  lastExtractionAt?: string;
  lastExtractionErrorCode?: string;
};

export type ExtractionArtifactRecord = {
  id: string;
  mailboxId: string;
  messageId: string;
  attachmentId: string;
  artifactKind: ExtractionArtifactKind;
  storageKey: string;
  textLength?: number;
  contentHash?: string;
  confidenceScore?: number;
  sourceVersionKey: string;
  createdAt: string;
};

export type TaskRecord = {
  id: string;
  mailboxId: string;
  sourceMessageId?: string;
  sourceTaskCandidateId?: string;
  title: string;
  status: TaskStatus;
  priority: MessagePriority;
  criticality: WorkflowCriticalityLevel;
  ownerUserId?: string;
  assignedUserId?: string;
  delegatedByUserId?: string;
  snoozedUntil?: string;
  updatedAt?: string;
  dueAt?: string;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionReason?: TaskStatusReason;
  resolutionNote?: string;
};

export type TaskSourceLinkRecord = {
  id: string;
  mailboxId: string;
  taskId: string;
  messageId: string;
  sourceKind: TaskSourceKind;
  classificationIngestionVersionKey?: string;
  classifierVersion?: string;
  taskCandidateId?: string;
  dueDateSignalIds: string[];
  entitySignalIds: string[];
  provenance: WorkflowSignalProvenance[];
  createdAt: string;
};

export type TaskLifecycleEventRecord = {
  id: string;
  mailboxId: string;
  taskId: string;
  fromStatus?: TaskStatus;
  toStatus: TaskStatus;
  reason: TaskStatusReason;
  actorUserId?: string;
  delegatedToUserId?: string;
  note?: string;
  occurredAt: string;
};

export type MessageWorkflowStateRecord = {
  id: string;
  mailboxId: string;
  messageId: string;
  actionability: MessageActionability;
  status: MessageWorkflowStatus;
  filingState: FilingState;
  priority: MessagePriority;
  criticality: WorkflowCriticalityLevel;
  isEligibleToFile: boolean;
  requirements: FilingEligibilityRequirement[];
  blockedBy: FilingBlockedBy[];
  blockingTaskIds: string[];
  unresolvedTaskCount: number;
  openTaskCount: number;
  snoozedTaskCount: number;
  delegatedTaskCount: number;
  informationalReadRequired: boolean;
  messageIsRead: boolean;
  lastEvaluatedAt: string;
};

export type FilingEligibility = {
  mailboxId: string;
  messageId: string;
  workflowStateId?: string;
  state: FilingState;
  isEligible: boolean;
  requirements: FilingEligibilityRequirement[];
  blockedBy: FilingBlockedBy[];
  targetFolderId?: string;
  summary: string;
  evaluatedAt: string;
};

export type TaskWorkflowReadModel = {
  task: TaskRecord;
  sourceLinks: TaskSourceLinkRecord[];
  latestLifecycleEvent?: TaskLifecycleEventRecord;
  sourceMessage: {
    mailboxId: string;
    messageId: string;
    subject: string;
    actionability?: MessageActionability;
    messageType?: MessageType;
    filingState?: FilingState;
  };
};

export type MessageWorkflowReadModel = {
  mailboxId: string;
  messageId: string;
  workflowState: MessageWorkflowStateRecord;
  filingEligibility: FilingEligibility;
  classification?: {
    ingestionVersionKey: string;
    classifierVersion: string;
    actionability: MessageActionability;
    messageType: MessageType;
    confidenceScore: number;
    explanationSummary: string;
  };
  tasks: TaskWorkflowReadModel[];
};

export type TaskMaterializationResult = {
  mailboxId: string;
  messageId: string;
  ingestionVersionKey: string;
  classifierVersion: string;
  actionability: MessageActionability;
  materializationStatus: "materialized" | "already_current";
  createdTaskCount: number;
  reusedTaskCount: number;
  materializedAt: string;
  workflowState: MessageWorkflowStateRecord;
  filingEligibility: FilingEligibility;
  tasks: TaskWorkflowReadModel[];
};

export type TaskTransitionRequest = {
  status: TaskStatus;
  reason?: TaskStatusReason;
  note?: string;
  snoozedUntil?: string;
  assignedUserId?: string;
};

export type TaskTransitionResult = {
  mailboxId: string;
  task: TaskWorkflowReadModel;
  workflowState?: MessageWorkflowStateRecord;
  filingEligibility?: FilingEligibility;
};

export type MailboxTaskWorkflowVerificationReport = {
  mailboxId: string;
  checkedAt: string;
  overallStatus: OperationalHealthStatus;
  coverage: {
    classifiedActionableMessages: number;
    messagesWithTaskCandidates: number;
    messagesWithMaterializedTasks: number;
    pendingMaterializationMessages: number;
    workflowStateMessages: number;
    totalTasks: number;
  };
  integrity: {
    orphanedTaskIds: string[];
    taskIdsMissingSourceLinks: string[];
    messageIdsMissingWorkflowState: string[];
    messageIdsMarkedEligibleWithUnresolvedTasks: string[];
    invalidLifecycleTaskIds: string[];
  };
  checks: VerificationCheck[];
};

export type FilingDecisionRecord = {
  id: string;
  mailboxId: string;
  messageId: string;
  workflowStateId?: string;
  actionability: MessageActionability;
  status: FilingDecisionStatus;
  mode: MailboxActionMode;
  requirements: FilingEligibilityRequirement[];
  blockedBy: FilingBlockedBy[];
  targetFolderId?: string;
  targetFolderGraphId?: string;
  targetFolderName?: string;
  suggestedCategories: string[];
  summary: string;
  rationale?: string;
  sourceMessageIsRead: boolean;
  approvedByUserId?: string;
  decidedAt: string;
  executedAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

export type MailboxActionAttemptRecord = {
  id: string;
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
  graphMessageId?: string;
  graphRequestId?: string;
  errorCode?: string;
  errorMessage?: string;
  attemptedAt: string;
  completedAt?: string;
};

export type OutgoingSequenceRecord = {
  id: string;
  mailboxId: string;
  sequenceKey: string;
  prefix: string;
  lastAllocatedValue: number;
  updatedAt: string;
};

export type FilingDecisionReadModel = {
  mailboxId: string;
  messageId: string;
  decision: FilingDecisionRecord;
  workflowState: MessageWorkflowStateRecord;
  filingEligibility: FilingEligibility;
  classification?: {
    ingestionVersionKey: string;
    classifierVersion: string;
    actionability: MessageActionability;
    messageType: MessageType;
    confidenceScore: number;
    explanationSummary: string;
  };
  targetFolder?: {
    id?: string;
    graphFolderId?: string;
    name: string;
    source: "mailbox_folder" | "well_known";
  };
  recommendedActions: Array<{
    actionType: MailboxActionType;
    mode: MailboxActionMode;
    summary: string;
  }>;
};

export type MailboxActionExecutionResult = {
  mailboxId: string;
  messageId: string;
  decision: FilingDecisionRecord;
  attempts: MailboxActionAttemptRecord[];
  workflowState?: MessageWorkflowStateRecord;
  filingEligibility?: FilingEligibility;
  message?: {
    graphMessageId: string;
    graphParentFolderId?: string;
    filingState: FilingState;
  };
};

export type MailboxActionVerificationReport = {
  mailboxId: string;
  checkedAt: string;
  overallStatus: OperationalHealthStatus;
  coverage: {
    trackedMessages: number;
    decisions: number;
    eligibleDecisions: number;
    executedDecisions: number;
    attempts: number;
    succeededAttempts: number;
    failedAttempts: number;
  };
  integrity: {
    messageIdsMissingDecision: string[];
    decisionIdsMissingAttempts: string[];
    decisionIdsWithFailedLatestAttempt: string[];
    messageIdsFiledWithoutSucceededMove: string[];
  };
  capabilityGaps: {
    routingBlockedMessageIds: string[];
    numberingBlockedMessageIds: string[];
  };
  checks: VerificationCheck[];
};

export type AuditEventRecord = {
  id: string;
  tenantId: string;
  action: AuditEventAction;
  entityType: AuditEntityType;
  entityId: string;
  occurredAt: string;
  actor?: string;
  messageId?: string;
  payload?: Record<string, unknown>;
};
