import { describe, expect, it, vi } from "vitest";
import { createLocalUser, databaseTables, recordAuditEvent, UserRole } from "./index";

describe("database baseline", () => {
  it("tracks the core MVP tables", () => {
    expect(databaseTables).toEqual([
      "Tenant",
      "User",
      "TenantMembership",
      "Session",
      "Mailbox",
      "Folder",
      "Message",
      "Task",
      "AuditEvent"
    ]);
  });

  it("records audit events with serialized payloads", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "audit_123"
    });

    await recordAuditEvent(
      {
        auditEvent: { create }
      },
      {
        tenantId: "tenant_123",
        actor: "system",
        action: "message.filed",
        entityType: "message",
        entityId: "msg_123",
        messageId: "msg_123",
        payload: {
          fromFolderId: "inbox",
          toFolderId: "archive"
        }
      }
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant_123",
        actor: "system",
        action: "message.filed",
        entityType: "message",
        entityId: "msg_123",
        messageId: "msg_123",
        payloadJson: JSON.stringify({
          fromFolderId: "inbox",
          toFolderId: "archive"
        })
      }
    });
  });

  it("creates local users with a tenant membership", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "user_123"
    });

    await createLocalUser(
      {
        user: {
          upsert
        }
      },
      {
        email: "owner@friendlymail.dev",
        displayName: "Owner",
        passwordHash: "hash",
        tenantId: "tenant_123",
        role: UserRole.ADMIN
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        email: "owner@friendlymail.dev"
      },
      update: {
        displayName: "Owner",
        authProvider: "LOCAL_PASSWORD",
        passwordHash: "hash"
      },
      create: {
        email: "owner@friendlymail.dev",
        displayName: "Owner",
        authProvider: "LOCAL_PASSWORD",
        passwordHash: "hash",
        memberships: {
          create: {
            tenantId: "tenant_123",
            role: UserRole.ADMIN
          }
        }
      },
      include: {
        memberships: true
      }
    });
  });
});
