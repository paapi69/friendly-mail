import { describe, expect, it } from "vitest";
import {
  AttachmentKind,
  AuditEventAction,
  AuditEventRecord,
  AuthProvider,
  ExtractionArtifactKind,
  ExtractionArtifactRecord,
  ExtractionStatus,
  FilingEligibility,
  FilingState,
  FolderSyncStateRecord,
  FolderSyncStatus,
  GraphSubscriptionRecord,
  GraphSubscriptionStatus,
  MailboxKind,
  MailboxOperationalVerificationReport,
  MailboxConnectionRecord,
  MailboxConnectionStatus,
  MailboxRecord,
  MessageAttachmentRecord,
  MessageRecord,
  MessageActionability,
  MessageBodyContentType,
  MessagePriority,
  MessageType,
  OperationalHealthStatus,
  SharedMailboxReadinessReport,
  SharedMailboxReadinessStatus,
  TaskRecord,
  TaskStatusReason,
  TaskStatus,
  TenantUserRole,
  VerificationCheckStatus
} from "./index";

describe("shared workflow contracts", () => {
  it("exposes the delayed filing states", () => {
    expect(FilingState.EligibleToFile).toBe("eligible_to_file");
    expect(FilingState.FilingBlocked).toBe("filing_blocked");
  });

  it("captures core message actionability states", () => {
    expect(MessageActionability.Actionable).toBe("actionable");
    expect(MessageActionability.Informational).toBe("informational");
  });

  it("defines the MVP task lifecycle states", () => {
    expect(TaskStatus.Done).toBe("done");
    expect(TaskStatus.Dismissed).toBe("dismissed");
    expect(TaskStatusReason.ResolvedByWorkflow).toBe("resolved_by_workflow");
  });

  it("defines internal auth providers and tenant roles", () => {
    expect(AuthProvider.LocalPassword).toBe("local_password");
    expect(TenantUserRole.Admin).toBe("admin");
  });

  it("defines mailbox connectivity and sync-state contracts", () => {
    const connection: MailboxConnectionRecord = {
      id: "connection_123",
      mailboxId: "mailbox_123",
      tenantId: "tenant_123",
      userId: "user_123",
      graphTenantId: "entra_tenant_123",
      graphUserId: "graph_user_123",
      status: MailboxConnectionStatus.Active,
      grantedScopes: ["Mail.Read", "User.Read"],
      connectedAt: "2026-04-01T10:00:00.000Z",
      accessTokenExpiresAt: "2026-04-01T11:00:00.000Z"
    };
    const folderSync: FolderSyncStateRecord = {
      id: "folder_sync_123",
      mailboxId: "mailbox_123",
      folderId: "folder_123",
      status: FolderSyncStatus.Active,
      deltaLink: "https://graph.microsoft.com/delta-token",
      lastCursorUpdatedAt: "2026-04-01T10:10:00.000Z"
    };
    const subscription: GraphSubscriptionRecord = {
      id: "subscription_123",
      mailboxId: "mailbox_123",
      graphSubscriptionId: "graph_subscription_123",
      resource: "/me/messages",
      changeTypes: ["created", "updated"],
      status: GraphSubscriptionStatus.Active,
      notificationUrl: "https://friendlymail.dev/webhooks/graph",
      expiresAt: "2026-04-01T13:00:00.000Z"
    };

    expect(connection.status).toBe("active");
    expect(folderSync.status).toBe("active");
    expect(subscription.status).toBe("active");
  });

  it("defines mailbox, message, task, and audit contracts shared across surfaces", () => {
    const mailbox: MailboxRecord = {
      id: "mailbox_123",
      tenantId: "tenant_123",
      displayName: "Legal Inbox",
      emailAddress: "legal@friendlymail.dev",
      kind: MailboxKind.Shared,
      graphMailboxId: "graph_mailbox_123"
    };
    const message: MessageRecord = {
      id: "message_123",
      mailboxId: mailbox.id,
      folderId: "folder_123",
      graphMessageId: "graph_message_123",
      graphParentFolderId: "graph_folder_inbox",
      graphChangeKey: "change_key_123",
      internetMessageId: "<message-123@example.com>",
      conversationId: "conversation_123",
      subject: "Invoice due Friday",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      priority: MessagePriority.Critical,
      filingState: FilingState.ActiveActionable,
      fromAddress: "vendor@example.com",
      receivedAt: "2026-03-31T11:00:00.000Z",
      lastGraphModifiedAt: "2026-03-31T11:01:00.000Z",
      isRead: false,
      bodyPreview: "Invoice due Friday",
      bodyContentType: MessageBodyContentType.Text,
      bodyText: "Please pay the attached invoice by Friday.",
      hasAttachments: true,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123"
    };
    const attachment: MessageAttachmentRecord = {
      id: "attachment_123",
      mailboxId: mailbox.id,
      messageId: message.id,
      graphMessageId: message.graphMessageId,
      graphAttachmentId: "graph_attachment_123",
      name: "invoice.pdf",
      contentType: "application/pdf",
      sizeInBytes: 120400,
      isInline: false,
      attachmentKind: AttachmentKind.File,
      isExtractionCandidate: true,
      extractionDecisionReason: "pdf_supported",
      extractionStatus: ExtractionStatus.Pending,
      extractionAttempts: 0
    };
    const artifact: ExtractionArtifactRecord = {
      id: "artifact_123",
      mailboxId: mailbox.id,
      messageId: message.id,
      attachmentId: attachment.id,
      artifactKind: ExtractionArtifactKind.AttachmentText,
      storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
      textLength: 4210,
      sourceVersionKey: "mailbox_123:graph_message_123:change_key_123",
      createdAt: "2026-03-31T11:06:00.000Z"
    };
    const task: TaskRecord = {
      id: "task_123",
      mailboxId: mailbox.id,
      sourceMessageId: message.id,
      title: "Pay invoice",
      status: TaskStatus.Open,
      priority: MessagePriority.High,
      createdAt: "2026-03-31T11:05:00.000Z"
    };
    const filing: FilingEligibility = {
      mailboxId: mailbox.id,
      messageId: message.id,
      state: FilingState.ActiveActionable,
      isEligible: false,
      blockedBy: "open_task"
    };
    const audit: AuditEventRecord = {
      id: "audit_123",
      tenantId: mailbox.tenantId,
      action: AuditEventAction.MessageFiled,
      entityType: "message",
      entityId: message.id,
      occurredAt: "2026-03-31T11:10:00.000Z",
      actor: "system"
    };

    expect(mailbox.kind).toBe("shared");
    expect(message.folderId).toBe("folder_123");
    expect(message.graphParentFolderId).toBe("graph_folder_inbox");
    expect(message.bodyContentType).toBe("text");
    expect(message.messageType).toBe("invoice");
    expect(attachment.attachmentKind).toBe("file");
    expect(artifact.artifactKind).toBe("attachment_text");
    expect(task.priority).toBe("high");
    expect(filing.blockedBy).toBe("open_task");
    expect(audit.action).toBe("message.filed");
  });

  it("defines shared-mailbox readiness and operational verification contracts", () => {
    const sharedMailboxReadiness: SharedMailboxReadinessReport = {
      sourceMailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev",
      checkedAt: "2026-04-03T12:00:00.000Z",
      status: SharedMailboxReadinessStatus.Limited,
      fallbackMode: "recommendation_only",
      grantedScopes: ["Mail.Read.Shared", "User.Read"],
      requiredScopes: ["Mail.Read.Shared", "Mail.ReadWrite.Shared"],
      capabilities: {
        delegatedSharedFolderRead: true,
        webhookBackedSync: false,
        backgroundDeltaRepair: false,
        sendWorkflowActions: false
      },
      checks: [
        {
          code: "shared_scope_present",
          status: VerificationCheckStatus.Pass,
          detail: "Delegated shared-mail scopes are available."
        }
      ]
    };
    const operationalVerification: MailboxOperationalVerificationReport = {
      mailboxId: "mailbox_123",
      checkedAt: "2026-04-03T12:00:00.000Z",
      overallStatus: OperationalHealthStatus.Warning,
      subscription: {
        graphSubscriptionId: "graph_subscription_123",
        status: GraphSubscriptionStatus.Active,
        health: OperationalHealthStatus.Warning,
        expiresAt: "2026-04-04T00:00:00.000Z",
        minutesUntilExpiry: 720
      },
      deltaSync: {
        trackedFolders: 1,
        healthyFolders: 0,
        staleFolders: 1,
        failedFolders: 0,
        missingCursorFolders: 0,
        maxCursorLagMinutes: 95,
        folders: [
          {
            folderId: "folder_123",
            displayName: "Inbox",
            status: FolderSyncStatus.Idle,
            lastCursorUpdatedAt: "2026-04-03T10:25:00.000Z",
            cursorLagMinutes: 95
          }
        ]
      },
      immutableIds: {
        status: "enforced",
        messageReads: true,
        messageLists: true,
        deltaQueries: true,
        subscriptionCreation: true
      },
      checks: [
        {
          code: "immutable_ids_enforced",
          status: VerificationCheckStatus.Pass,
          detail: "Connector keeps immutable IDs enabled on supported message paths."
        }
      ]
    };

    expect(sharedMailboxReadiness.status).toBe("limited");
    expect(operationalVerification.overallStatus).toBe("warning");
    expect(operationalVerification.immutableIds.subscriptionCreation).toBe(true);
  });
});
