import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  OperationalHealthStatus,
  SharedMailboxReadinessStatus,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxReadinessService } from "./mailbox-readiness-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-03T12:00:00.000Z",
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

describe("mailbox readiness service", () => {
  it("returns an unsupported shared-mailbox result when delegated shared scopes are missing", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn();
    const service = createPrismaMailboxReadinessService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              graphUserId: "graph_user_123",
              status: "ACTIVE",
              grantedScopes: ["Mail.Read", "User.Read"],
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        graphSubscription: {
          findFirst: vi.fn()
        },
        folder: {
          findMany: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.checkSharedMailboxReadiness({
      session: exampleSession,
      mailboxId: "mailbox_123",
      sharedMailboxAddress: "Legal@FriendlyMail.dev"
    });

    expect(result).toEqual({
      sourceMailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev",
      checkedAt: "2026-04-03T11:30:00.000Z",
      status: SharedMailboxReadinessStatus.Unsupported,
      fallbackMode: "unsupported",
      grantedScopes: ["Mail.Read", "User.Read"],
      requiredScopes: ["Mail.Read.Shared", "Mail.ReadWrite.Shared"],
      capabilities: {
        delegatedSharedFolderRead: false,
        webhookBackedSync: false,
        backgroundDeltaRepair: false,
        sendWorkflowActions: false
      },
      checks: expect.arrayContaining([
        expect.objectContaining({
          code: "shared_scope_present",
          status: "fail"
        }),
        expect.objectContaining({
          code: "webhook_subscription_support",
          status: "fail"
        })
      ])
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a limited shared-mailbox result when shared-folder read succeeds", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: "folder_123",
            displayName: "Inbox",
            childFolderCount: 0,
            unreadItemCount: 2,
            totalItemCount: 3,
            isHidden: false
          }
        ]
      })
    );
    const service = createPrismaMailboxReadinessService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              graphUserId: "graph_user_123",
              status: "ACTIVE",
              grantedScopes: ["Mail.Read.Shared", "User.Read"],
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        graphSubscription: {
          findFirst: vi.fn()
        },
        folder: {
          findMany: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.checkSharedMailboxReadiness({
      session: exampleSession,
      mailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev"
    });

    expect(result.status).toBe(SharedMailboxReadinessStatus.Limited);
    expect(result.fallbackMode).toBe("recommendation_only");
    expect(result.capabilities.delegatedSharedFolderRead).toBe(true);
    expect(result.capabilities.webhookBackedSync).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "shared_scope_present",
          status: "pass"
        }),
        expect.objectContaining({
          code: "shared_folder_access",
          status: "pass"
        }),
        expect.objectContaining({
          code: "webhook_subscription_support",
          status: "fail"
        })
      ])
    );
    expect(String(fetch.mock.calls[0][0])).toContain(
      "/users/legal%40friendlymail.dev/mailFolders?"
    );
  });

  it("builds an operational verification report for subscription health and delta lag", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const service = createPrismaMailboxReadinessService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              graphUserId: "graph_user_123",
              status: "ACTIVE",
              grantedScopes: ["Mail.Read", "User.Read"],
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        graphSubscription: {
          findFirst: vi.fn().mockResolvedValue({
            graphSubscriptionId: "subscription_123",
            status: "ACTIVE",
            expiresAt: new Date("2026-04-03T12:15:00.000Z"),
            lastNotificationAt: new Date("2026-04-03T10:55:00.000Z"),
            lastLifecycleEventAt: null,
            lastErrorCode: null
          })
        },
        folder: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "folder_123",
              displayName: "Inbox",
              isSyncEnabled: true,
              syncState: {
                syncStatus: "IDLE",
                lastSyncedAt: new Date("2026-04-03T10:40:00.000Z"),
                lastCursorUpdatedAt: new Date("2026-04-03T10:40:00.000Z"),
                lastErrorCode: null
              }
            },
            {
              id: "folder_456",
              displayName: "Archive",
              isSyncEnabled: true,
              syncState: {
                syncStatus: "FAILED",
                lastSyncedAt: new Date("2026-04-03T08:00:00.000Z"),
                lastCursorUpdatedAt: new Date("2026-04-03T08:00:00.000Z"),
                lastErrorCode: "GRAPH_DELTA_LINK_MISSING"
              }
            }
          ])
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.getMailboxOperationalVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.overallStatus).toBe(OperationalHealthStatus.Critical);
    expect(result.subscription).toEqual({
      graphSubscriptionId: "subscription_123",
      status: "active",
      health: "critical",
      expiresAt: "2026-04-03T12:15:00.000Z",
      minutesUntilExpiry: 45,
      lastNotificationAt: "2026-04-03T10:55:00.000Z",
      lastLifecycleEventAt: undefined,
      lastErrorCode: undefined
    });
    expect(result.deltaSync).toMatchObject({
      trackedFolders: 2,
      healthyFolders: 1,
      staleFolders: 1,
      failedFolders: 1,
      missingCursorFolders: 0,
      maxCursorLagMinutes: 210
    });
    expect(result.immutableIds).toEqual({
      status: "enforced",
      messageReads: true,
      messageLists: true,
      deltaQueries: true,
      subscriptionCreation: true
    });
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "subscription_health",
          status: "fail"
        }),
        expect.objectContaining({
          code: "delta_cursor_health",
          status: "fail"
        }),
        expect.objectContaining({
          code: "immutable_ids_enforced",
          status: "pass"
        })
      ])
    );
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
