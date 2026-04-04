import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxMessageSyncService } from "./mailbox-message-sync-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-02T12:00:00.000Z",
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

describe("mailbox message sync service", () => {
  it("syncs message metadata for a tracked folder and advances the delta link", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: "graph_message_123",
            parentFolderId: "graph_folder_inbox",
            changeKey: "change_key_123",
            conversationId: "conversation_123",
            internetMessageId: "<message-123@example.com>",
            subject: "Invoice due Friday",
            from: {
              emailAddress: {
                address: "vendor@example.com"
              }
            },
            receivedDateTime: "2026-04-02T05:00:00.000Z",
            lastModifiedDateTime: "2026-04-02T05:05:00.000Z",
            isRead: false,
            hasAttachments: false,
            categories: [],
            webLink: "https://outlook.office.com/message/123"
          },
          {
            id: "graph_message_removed_123",
            "@removed": {
              reason: "deleted"
            }
          }
        ],
        "@odata.deltaLink":
          "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc"
      })
    );
    const messageUpsert = vi.fn().mockResolvedValue({
      id: "message_123"
    });
    const messageUpdateMany = vi.fn().mockResolvedValue({
      count: 1
    });
    const syncStateUpsert = vi.fn().mockResolvedValue({});
    const service = createPrismaMailboxMessageSyncService({
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
          findFirst: vi.fn().mockResolvedValue({
            id: "folder_123",
            mailboxId: "mailbox_123",
            graphFolderId: "graph_folder_inbox",
            isSyncEnabled: true
          })
        },
        folderSyncState: {
          findUnique: vi.fn().mockResolvedValue({
            id: "folder_sync_123",
            folderId: "folder_123",
            deltaLink: undefined
          }),
          upsert: syncStateUpsert
        },
        message: {
          upsert: messageUpsert,
          updateMany: messageUpdateMany
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-02T05:15:00.000Z")
    });

    const result = await service.syncFolderMessages({
      session: exampleSession,
      mailboxId: "mailbox_123",
      folderId: "folder_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      folderId: "folder_123",
      syncedMessages: 1,
      removedMessages: 1,
      deltaLink:
        "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
      syncedAt: "2026-04-02T05:15:00.000Z"
    });
    expect(messageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          mailboxId: "mailbox_123",
          folderId: "folder_123",
          graphMessageId: "graph_message_123",
          conversationId: "conversation_123",
          internetMessageId: "<message-123@example.com>",
          graphRemovedAt: null,
          graphRemovalReason: null
        })
      })
    );
    expect(messageUpdateMany).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_removed_123"
      },
      data: {
        folderId: null,
        graphParentFolderId: null,
        graphRemovedAt: new Date("2026-04-02T05:15:00.000Z"),
        graphRemovalReason: "deleted"
      }
    });
    expect(syncStateUpsert.mock.calls).toContainEqual([
      expect.objectContaining({
        update: expect.objectContaining({
          deltaLink:
            "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
          syncStatus: "IDLE",
          lastSyncedAt: new Date("2026-04-02T05:15:00.000Z"),
          lastCursorUpdatedAt: new Date("2026-04-02T05:15:00.000Z")
        })
      })
    ]);
  });

  it("rejects sync for folders that are not tracked for the mailbox", async () => {
    const service = createPrismaMailboxMessageSyncService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: "ciphertext"
            }
          })
        },
        folder: {
          findFirst: vi.fn().mockResolvedValue(null)
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012"
      },
      logger: silentLogger()
    });

    await expect(
      service.syncFolderMessages({
        session: exampleSession,
        mailboxId: "mailbox_123",
        folderId: "folder_123"
      })
    ).rejects.toMatchObject({
      code: "MAILBOX_FOLDER_NOT_FOUND",
      statusCode: 404
    });
  });

  it("reconciles all sync-enabled folders for a mailbox through delta sync", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const encryptedAccessToken = encryptMicrosoftToken("access_token_123", encryptionKey);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "graph_message_123",
              parentFolderId: "graph_folder_inbox",
              subject: "Inbox update",
              isRead: false,
              hasAttachments: false,
              categories: []
            }
          ],
          "@odata.deltaLink":
            "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=1"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "graph_message_removed_123",
              "@removed": {
                reason: "deleted"
              }
            }
          ],
          "@odata.deltaLink":
            "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_archive/messages/delta?$deltatoken=2"
        })
      );
    const syncStateUpsert = vi.fn().mockResolvedValue({});
    const messageUpsert = vi.fn().mockResolvedValue({});
    const messageUpdateMany = vi.fn().mockResolvedValue({});
    const service = createPrismaMailboxMessageSyncService({
      prisma: {
        mailbox: {
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptedAccessToken
            }
          })
        },
        folder: {
          findFirst: vi.fn(),
          findMany: vi.fn().mockResolvedValue([
            {
              id: "folder_123",
              mailboxId: "mailbox_123",
              graphFolderId: "graph_folder_inbox",
              isSyncEnabled: true
            },
            {
              id: "folder_456",
              mailboxId: "mailbox_123",
              graphFolderId: "graph_folder_archive",
              isSyncEnabled: true
            }
          ])
        },
        folderSyncState: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({
              id: "sync_1",
              folderId: "folder_123"
            })
            .mockResolvedValueOnce({
              id: "sync_2",
              folderId: "folder_456"
            }),
          upsert: syncStateUpsert
        },
        message: {
          upsert: messageUpsert,
          updateMany: messageUpdateMany
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-03T09:35:00.000Z")
    });

    const result = await service.reconcileMailbox({
      mailboxId: "mailbox_123",
      reason: "change_notification"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      reconciledFolders: 2,
      skippedFolders: 0,
      syncedMessages: 1,
      removedMessages: 1,
      syncedAt: "2026-04-03T09:35:00.000Z"
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(messageUpsert).toHaveBeenCalledTimes(1);
    expect(messageUpdateMany).toHaveBeenCalledTimes(1);
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
