import { describe, expect, it, vi } from "vitest";
import {
  createLocalUser,
  databaseTables,
  recordAuditEvent,
  upsertFolderSyncState,
  upsertGraphSubscription,
  upsertMailboxConnection,
  UserRole
} from "./index";

describe("database baseline", () => {
  it("tracks the core MVP tables", () => {
    expect(databaseTables).toEqual([
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

  it("upserts mailbox connections with normalized scopes and nullable state", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "connection_123"
    });
    const connectedAt = new Date("2026-04-01T10:00:00.000Z");
    const expiresAt = new Date("2026-04-01T11:00:00.000Z");

    await upsertMailboxConnection(
      {
        mailboxConnection: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", " User.Read ", "Mail.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        connectedAt,
        accessTokenExpiresAt: expiresAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123"
      },
      update: {
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", "User.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        accessTokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: null,
        connectedAt,
        lastValidatedAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", "User.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        accessTokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: null,
        connectedAt,
        lastValidatedAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });

  it("upserts folder sync state with delta-link tracking", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "folder_sync_123"
    });
    const lastSyncedAt = new Date("2026-04-01T10:15:00.000Z");

    await upsertFolderSyncState(
      {
        folderSyncState: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        folderId: "folder_123"
      },
      update: {
        mailboxId: "mailbox_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt,
        lastCursorUpdatedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt,
        lastCursorUpdatedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });

  it("upserts graph subscriptions with normalized change types", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "graph_subscription_123"
    });
    const expiresAt = new Date("2026-04-01T13:00:00.000Z");

    await upsertGraphSubscription(
      {
        graphSubscription: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        resource: "/me/messages",
        changeTypes: ["updated", "created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        status: "ACTIVE",
        expiresAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        graphSubscriptionId: "subscription_123"
      },
      update: {
        mailboxId: "mailbox_123",
        resource: "/me/messages",
        changeTypes: ["created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        lifecycleNotificationUrl: null,
        clientStateHash: null,
        status: "ACTIVE",
        expiresAt,
        lastValidatedAt: null,
        lastNotificationAt: null,
        lastLifecycleEventAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        resource: "/me/messages",
        changeTypes: ["created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        lifecycleNotificationUrl: null,
        clientStateHash: null,
        status: "ACTIVE",
        expiresAt,
        lastValidatedAt: null,
        lastNotificationAt: null,
        lastLifecycleEventAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });
});
