import { describe, expect, it } from "vitest";
import {
  AuditEventAction,
  AuditEventRecord,
  AuthProvider,
  FilingEligibility,
  FilingState,
  FolderSyncStateRecord,
  FolderSyncStatus,
  GraphSubscriptionRecord,
  GraphSubscriptionStatus,
  MailboxKind,
  MailboxConnectionRecord,
  MailboxConnectionStatus,
  MailboxRecord,
  MessageRecord,
  MessageActionability,
  MessagePriority,
  MessageType,
  TaskRecord,
  TaskStatusReason,
  TaskStatus,
  TenantUserRole
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
      isRead: false
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
    expect(message.messageType).toBe("invoice");
    expect(task.priority).toBe("high");
    expect(filing.blockedBy).toBe("open_task");
    expect(audit.action).toBe("message.filed");
  });
});
