import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxFolderSyncService } from "./mailbox-folder-sync-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-01T12:00:00.000Z",
  surface: MailSurface.Dashboard,
  principal: {
    userId: "user_123",
    tenantId: "tenant_123",
    email: "owner@friendlymail.dev",
    displayName: "Owner",
    role: TenantUserRole.Admin,
    authProvider: AuthProvider.LocalPassword
  },
  authBoundary: {
    productIdentity: "friendly_mail_internal" as const,
    mailboxIdentity: "microsoft_graph" as const,
    graphConnectionState: "connected" as const
  }
};

describe("mailbox folder sync service", () => {
  it("discovers the full folder tree and seeds folder sync state", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "folder_inbox",
              displayName: "Inbox",
              childFolderCount: 1,
              unreadItemCount: 3,
              totalItemCount: 10,
              isHidden: false
            },
            {
              id: "folder_archive",
              displayName: "Archive",
              childFolderCount: 0,
              unreadItemCount: 0,
              totalItemCount: 4,
              isHidden: false
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "folder_contracts",
              displayName: "Contracts",
              parentFolderId: "folder_inbox",
              childFolderCount: 0,
              unreadItemCount: 1,
              totalItemCount: 2,
              isHidden: false
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: []
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: []
        })
      );
    const folderUpsert = vi
      .fn()
      .mockResolvedValueOnce({ id: "persisted_inbox" })
      .mockResolvedValueOnce({ id: "persisted_archive" })
      .mockResolvedValueOnce({ id: "persisted_contracts" });
    const syncStateUpsert = vi.fn().mockResolvedValue({});
    const service = createPrismaMailboxFolderSyncService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        folder: {
          upsert: folderUpsert
        },
        folderSyncState: {
          upsert: syncStateUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-01T11:00:00.000Z")
    });

    const result = await service.syncMailboxFolders({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      discoveredFolders: 3,
      rootFolders: 2,
      syncedAt: "2026-04-01T11:00:00.000Z"
    });
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(folderUpsert).toHaveBeenCalledTimes(3);
    expect(syncStateUpsert).toHaveBeenCalledTimes(3);
    expect(folderUpsert.mock.calls).toContainEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          graphFolderId: "folder_contracts",
          parentGraphFolderId: "folder_inbox"
        })
      })
    ]);
  });

  it("rejects sync for missing or inactive mailbox connections", async () => {
    const service = createPrismaMailboxFolderSyncService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: null
          })
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012"
      },
      logger: silentLogger()
    });

    await expect(
      service.syncMailboxFolders({
        session: exampleSession,
        mailboxId: "mailbox_123"
      })
    ).rejects.toMatchObject({
      code: "MAILBOX_ACCESS_DENIED",
      statusCode: 403
    });
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function silentLogger() {
  return {
    child() {
      return this;
    },
    debug() {
      return undefined;
    },
    info() {
      return undefined;
    },
    warn() {
      return undefined;
    },
    error() {
      return undefined;
    }
  };
}
