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

export enum WorkflowStatus {
  Healthy = "healthy"
}

export enum WorkflowLifecycleStatus {
  Pending = "pending",
  Active = "active",
  Blocked = "blocked",
  Resolved = "resolved"
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

export enum AuditEventAction {
  MessageFiled = "message.filed",
  MessageCategorized = "message.categorized",
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
  | "message_unread"
  | "open_task"
  | "awaiting_review"
  | "policy_hold";

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
  title: string;
  status: TaskStatus;
  priority: MessagePriority;
  dueAt?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionReason?: TaskStatusReason;
};

export type FilingEligibility = {
  mailboxId: string;
  messageId: string;
  state: FilingState;
  isEligible: boolean;
  targetFolderId?: string;
  blockedBy?: FilingBlockedBy;
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
