import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  GraphSubscriptionStatus,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxSubscriptionService } from "./mailbox-subscription-service";

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

describe("mailbox subscription service", () => {
  it("creates a top-level message subscription for an active mailbox", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "subscription_123",
        resource: "/users/graph_user_123/messages",
        changeType: "created,updated,deleted",
        expirationDateTime: "2026-04-10T11:30:00.000Z",
        notificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/notifications",
        lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/lifecycle",
        clientState: "graph_client_state_123"
      })
    );
    const graphSubscriptionUpsert = vi.fn().mockResolvedValue({
      id: "db_subscription_123"
    });
    const queueAdd = vi.fn().mockResolvedValue(undefined);
    const service = createPrismaMailboxSubscriptionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              graphUserId: "graph_user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        graphSubscription: {
          findFirst: vi.fn().mockResolvedValue(null),
          findUnique: vi.fn(),
          update: vi.fn(),
          upsert: graphSubscriptionUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        MICROSOFT_WEBHOOK_BASE_URL: "https://friendlymail.dev"
      },
      logger: silentLogger(),
      fetch,
      notificationQueue: {
        add: queueAdd
      },
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.ensureMailboxSubscription({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.operation).toBe("created");
    expect(result.subscription).toEqual({
      mailboxId: "mailbox_123",
      graphSubscriptionId: "subscription_123",
      resource: "/users/graph_user_123/messages",
      changeTypes: ["created", "deleted", "updated"],
      status: GraphSubscriptionStatus.Active,
      notificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/notifications",
      lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/lifecycle",
      expiresAt: "2026-04-10T11:30:00.000Z"
    });
    expect(graphSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          graphSubscriptionId: "subscription_123"
        },
        update: expect.objectContaining({
          mailboxId: "mailbox_123",
          status: "ACTIVE"
        }),
        create: expect.objectContaining({
          mailboxId: "mailbox_123",
          status: "ACTIVE"
        })
      })
    );
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it("renews an existing subscription and treats the patch as the reauthorization path", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "subscription_123",
        resource: "/users/graph_user_123/messages",
        changeType: "created,updated,deleted",
        expirationDateTime: "2026-04-10T11:30:00.000Z",
        notificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/notifications",
        lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/lifecycle"
      })
    );
    const graphSubscriptionUpsert = vi.fn().mockResolvedValue({
      id: "db_subscription_123"
    });
    const service = createPrismaMailboxSubscriptionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              graphUserId: "graph_user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        graphSubscription: {
          findFirst: vi.fn().mockResolvedValue({
            id: "db_subscription_123",
            graphSubscriptionId: "subscription_123",
            status: "ACTIVE"
          }),
          findUnique: vi.fn(),
          update: vi.fn(),
          upsert: graphSubscriptionUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        MICROSOFT_WEBHOOK_BASE_URL: "https://friendlymail.dev"
      },
      logger: silentLogger(),
      fetch,
      notificationQueue: {
        add: vi.fn()
      },
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.ensureMailboxSubscription({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.operation).toBe("renewed");
    expect(fetch.mock.calls[0][0]).toBe(
      "https://graph.microsoft.com/v1.0/subscriptions/subscription_123"
    );
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "PATCH"
    });
    expect(graphSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          graphSubscriptionId: "subscription_123"
        },
        update: expect.objectContaining({
          lastReauthorizedAt: new Date("2026-04-03T11:30:00.000Z")
        })
      })
    );
  });

  it("validates and queues accepted change notifications", async () => {
    const queueAdd = vi.fn().mockResolvedValue(undefined);
    const graphSubscriptionUpdate = vi.fn().mockResolvedValue({});
    const service = createPrismaMailboxSubscriptionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn()
        },
        graphSubscription: {
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue({
            mailboxId: "mailbox_123",
            graphSubscriptionId: "subscription_123",
            clientStateHash: hashValue("secret_client_state"),
            status: "ACTIVE"
          }),
          update: graphSubscriptionUpdate,
          upsert: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012",
        MICROSOFT_WEBHOOK_BASE_URL: "https://friendlymail.dev"
      },
      logger: silentLogger(),
      notificationQueue: {
        add: queueAdd
      },
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.handleWebhookNotifications({
      kind: "change",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            subscriptionExpirationDateTime: "2026-04-10T11:30:00.000Z",
            changeType: "updated",
            resource: "Users('graph_user_123')/messages('message_123')",
            clientState: "secret_client_state",
            tenantId: "graph_tenant_123",
            resourceData: {
              id: "message_123"
            }
          }
        ]
      }
    });

    expect(result).toEqual({
      acceptedNotifications: 1,
      ignoredNotifications: 0,
      queuedNotifications: 1
    });
    expect(graphSubscriptionUpdate).toHaveBeenCalledWith({
      where: {
        graphSubscriptionId: "subscription_123"
      },
      data: expect.objectContaining({
        status: "ACTIVE",
        lastNotificationAt: new Date("2026-04-03T11:30:00.000Z")
      })
    });
    expect(queueAdd).toHaveBeenCalledWith(
      "mailbox_123:subscription_123:change:updated",
      expect.objectContaining({
        kind: "graph_change_notification",
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        changeType: "updated",
        resourceDataId: "message_123"
      })
    );
  });

  it("marks reauthorization lifecycle events and queues them for downstream handling", async () => {
    const queueAdd = vi.fn().mockResolvedValue(undefined);
    const graphSubscriptionUpdate = vi.fn().mockResolvedValue({});
    const service = createPrismaMailboxSubscriptionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn()
        },
        graphSubscription: {
          findFirst: vi.fn(),
          findUnique: vi.fn().mockResolvedValue({
            mailboxId: "mailbox_123",
            graphSubscriptionId: "subscription_123",
            clientStateHash: hashValue("secret_client_state"),
            status: "ACTIVE"
          }),
          update: graphSubscriptionUpdate,
          upsert: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012",
        MICROSOFT_WEBHOOK_BASE_URL: "https://friendlymail.dev"
      },
      logger: silentLogger(),
      notificationQueue: {
        add: queueAdd
      },
      now: () => new Date("2026-04-03T11:30:00.000Z")
    });

    const result = await service.handleWebhookNotifications({
      kind: "lifecycle",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            subscriptionExpirationDateTime: "2026-04-10T11:30:00.000Z",
            lifecycleEvent: "reauthorizationRequired",
            clientState: "secret_client_state",
            tenantId: "graph_tenant_123"
          }
        ]
      }
    });

    expect(result).toEqual({
      acceptedNotifications: 1,
      ignoredNotifications: 0,
      queuedNotifications: 1
    });
    expect(graphSubscriptionUpdate).toHaveBeenCalledWith({
      where: {
        graphSubscriptionId: "subscription_123"
      },
      data: expect.objectContaining({
        status: "REAUTH_REQUIRED",
        lastLifecycleEventAt: new Date("2026-04-03T11:30:00.000Z"),
        lastErrorCode: "GRAPH_SUBSCRIPTION_REAUTH_REQUIRED"
      })
    });
    expect(queueAdd).toHaveBeenCalledWith(
      "mailbox_123:subscription_123:lifecycle:reauthorizationRequired",
      expect.objectContaining({
        kind: "graph_lifecycle_notification",
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        lifecycleEvent: "reauthorizationRequired"
      })
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

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
