import { describe, expect, it } from "vitest";
import {
  AuditEventAction,
  AuditEventRecord,
  AuthProvider,
  FilingEligibility,
  FilingState,
  MailboxKind,
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
      graphMessageId: "graph_message_123",
      subject: "Invoice due Friday",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      priority: MessagePriority.Critical,
      filingState: FilingState.ActiveActionable,
      fromAddress: "vendor@example.com",
      receivedAt: "2026-03-31T11:00:00.000Z",
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
    expect(message.messageType).toBe("invoice");
    expect(task.priority).toBe("high");
    expect(filing.blockedBy).toBe("open_task");
    expect(audit.action).toBe("message.filed");
  });
});
