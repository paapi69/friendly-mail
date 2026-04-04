import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  MailboxConnectionStatus,
  MailboxKind,
  TenantUserRole
} from "@friendly-mail/contracts";
import {
  createServer,
  type ApiAuthService,
  type ApiMailboxFolderSyncService,
  type ApiMailboxIngestionService,
  type ApiMailboxMessageSyncService,
  type ApiMailboxReadinessService,
  type ApiMailboxSubscriptionService,
  type ApiMailboxOnboardingService
} from "./server";

type SessionPayload = {
  session: {
    id: string;
    expiresAt: string;
    surface: MailSurface;
    principal: {
      userId: string;
      tenantId: string;
      email: string;
      displayName: string;
      role: TenantUserRole;
      authProvider: AuthProvider;
    };
    authBoundary: {
      productIdentity: "friendly_mail_internal";
      mailboxIdentity: "microsoft_graph";
      graphConnectionState: "not_connected";
    };
  };
};

const exampleSession: SessionPayload = {
  session: {
    id: "session_123",
    expiresAt: "2026-04-01T00:00:00.000Z",
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
      productIdentity: "friendly_mail_internal",
      mailboxIdentity: "microsoft_graph",
      graphConnectionState: "not_connected"
    }
  }
};

describe("api auth routes", () => {
  afterEach(async () => {
    await Promise.all(
      [...serversForCleanup].map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
      )
    );
    serversForCleanup.clear();
  });

  it("rejects session reads when no session token is present", async () => {
    const server = createTestServer({
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn()
    });
    const response = await request(server, {
      method: "GET",
      path: "/auth/session"
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({
      error: expect.objectContaining({
        code: "AUTHENTICATION_REQUIRED"
      })
    });
  });

  it("creates a local session and sets a cookie on successful login", async () => {
    const authService: ApiAuthService = {
      login: vi.fn().mockResolvedValue({
        token: "opaque-session-token",
        session: exampleSession.session
      }),
      getSession: vi.fn(),
      logout: vi.fn()
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "POST",
      path: "/auth/login",
      body: {
        email: "owner@friendlymail.dev",
        password: "not-used-in-test",
        surface: MailSurface.Dashboard
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]?.[0]).toContain(
      "friendly_mail_session=opaque-session-token"
    );
    expect(JSON.parse(response.body)).toEqual(exampleSession);
    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@friendlymail.dev",
        surface: MailSurface.Dashboard
      })
    );
  });

  it("returns the current session for authenticated requests", async () => {
    const authService: ApiAuthService = {
      login: vi.fn(),
      getSession: vi.fn().mockResolvedValue(exampleSession.session),
      logout: vi.fn()
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "GET",
      path: "/auth/session",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(exampleSession);
    expect(authService.getSession).toHaveBeenCalledWith("cookie-session-token");
  });

  it("clears the session cookie during logout", async () => {
    const authService: ApiAuthService = {
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined)
    };
    const server = createTestServer(authService);
    const response = await request(server, {
      method: "POST",
      path: "/auth/logout",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
    expect(authService.logout).toHaveBeenCalledWith("cookie-session-token");
  });

  it("starts delegated mailbox onboarding and sets state cookies", async () => {
    const onboardingService: ApiMailboxOnboardingService = {
      beginConnect: vi.fn().mockResolvedValue({
        authorizationUrl: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
        state: "signed-state",
        codeVerifier: "pkce-verifier"
      }),
      completeConnect: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      onboardingService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/connect/start",
      body: {
        surface: MailSurface.OutlookAddIn
      },
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      authorizationUrl: "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize"
    });
    expect(response.headers["set-cookie"]).toHaveLength(2);
    expect(response.headers["set-cookie"]?.[0]).toContain("friendly_mail_session_graph_state=");
    expect(response.headers["set-cookie"]?.[1]).toContain("friendly_mail_session_graph_pkce=");
    expect(onboardingService.beginConnect).toHaveBeenCalledWith({
      session: exampleSession.session,
      surface: MailSurface.OutlookAddIn
    });
  });

  it("completes delegated mailbox onboarding from the Microsoft callback", async () => {
    const onboardingService: ApiMailboxOnboardingService = {
      beginConnect: vi.fn(),
      completeConnect: vi.fn().mockResolvedValue({
        mailbox: {
          id: "mailbox_123",
          tenantId: "tenant_123",
          displayName: "Owner",
          emailAddress: "owner@friendlymail.dev",
          graphMailboxId: "graph_user_123",
          kind: MailboxKind.User
        },
        connection: {
          id: "connection_123",
          mailboxId: "mailbox_123",
          tenantId: "tenant_123",
          userId: "user_123",
          graphTenantId: "graph_tenant_123",
          graphUserId: "graph_user_123",
          status: MailboxConnectionStatus.Active,
          grantedScopes: ["Mail.Read", "User.Read"],
          connectedAt: "2026-04-01T10:45:00.000Z",
          lastValidatedAt: "2026-04-01T10:45:00.000Z"
        }
      }),
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      onboardingService
    );

    const response = await request(server, {
      method: "GET",
      path: "/auth/microsoft/callback?code=auth-code-123&state=signed-state",
      headers: {
        Cookie:
          "friendly_mail_session=cookie-session-token; friendly_mail_session_graph_state=signed-state; friendly_mail_session_graph_pkce=pkce-verifier"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailbox: {
        id: "mailbox_123",
        tenantId: "tenant_123",
        displayName: "Owner",
        emailAddress: "owner@friendlymail.dev",
        graphMailboxId: "graph_user_123",
        kind: "user"
      },
      connection: expect.objectContaining({
        id: "connection_123",
        status: "active"
      })
    });
    expect(response.headers["set-cookie"]?.[0]).toContain("friendly_mail_session_graph_state=");
    expect(response.headers["set-cookie"]?.[1]).toContain("friendly_mail_session_graph_pkce=");
    expect(onboardingService.completeConnect).toHaveBeenCalledWith({
      session: exampleSession.session,
      code: "auth-code-123",
      state: "signed-state",
      expectedState: "signed-state",
      codeVerifier: "pkce-verifier"
    });
  });

  it("syncs mailbox folders for an authenticated mailbox owner", async () => {
    const folderSyncService: ApiMailboxFolderSyncService = {
      syncMailboxFolders: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        discoveredFolders: 3,
        rootFolders: 2,
        syncedAt: "2026-04-01T11:00:00.000Z"
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      folderSyncService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/folders/sync",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      discoveredFolders: 3,
      rootFolders: 2,
      syncedAt: "2026-04-01T11:00:00.000Z"
    });
    expect(folderSyncService.syncMailboxFolders).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("checks shared-mailbox readiness for an authenticated mailbox owner", async () => {
    const mailboxReadinessService: ApiMailboxReadinessService = {
      checkSharedMailboxReadiness: vi.fn().mockResolvedValue({
        sourceMailboxId: "mailbox_123",
        sharedMailboxAddress: "legal@friendlymail.dev",
        checkedAt: "2026-04-03T11:30:00.000Z",
        status: "limited",
        fallbackMode: "recommendation_only",
        grantedScopes: ["Mail.Read.Shared", "User.Read"],
        requiredScopes: ["Mail.Read.Shared", "Mail.ReadWrite.Shared"],
        capabilities: {
          delegatedSharedFolderRead: true,
          webhookBackedSync: false,
          backgroundDeltaRepair: false,
          sendWorkflowActions: false
        },
        checks: []
      }),
      getMailboxOperationalVerification: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      mailboxReadinessService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/shared-mailbox-readiness",
      body: {
        sharedMailboxAddress: "legal@friendlymail.dev"
      },
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        status: "limited",
        fallbackMode: "recommendation_only"
      })
    );
    expect(mailboxReadinessService.checkSharedMailboxReadiness).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev"
    });
  });

  it("syncs message metadata for a tracked folder", async () => {
    const messageSyncService: ApiMailboxMessageSyncService = {
      syncFolderMessages: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        syncedMessages: 2,
        removedMessages: 1,
        deltaLink:
          "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
        syncedAt: "2026-04-02T05:15:00.000Z"
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      messageSyncService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/folders/folder_123/messages/sync",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      folderId: "folder_123",
      syncedMessages: 2,
      removedMessages: 1,
      deltaLink:
        "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc",
      syncedAt: "2026-04-02T05:15:00.000Z"
    });
    expect(messageSyncService.syncFolderMessages).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      folderId: "folder_123"
    });
  });

  it("ingests a tracked mailbox message into normalized content", async () => {
    const mailboxIngestionService: ApiMailboxIngestionService = {
      ingestMessage: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        hasAttachments: true,
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        ingestedAt: "2026-04-04T11:00:00.000Z",
        envelope: {
          mailboxId: "mailbox_123",
          messageId: "message_123",
          graphMessageId: "graph_message_123",
          graphChangeKey: "change_key_456",
          subject: "Quarterly notice",
          bodyContentType: "text",
          bodyText: "Please review the attached packet.",
          hasAttachments: true
        }
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxIngestionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/messages/message_123/ingest",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123"
      })
    );
    expect(mailboxIngestionService.ingestMessage).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
  });

  it("returns mailbox operational verification for an authenticated mailbox owner", async () => {
    const mailboxReadinessService: ApiMailboxReadinessService = {
      checkSharedMailboxReadiness: vi.fn(),
      getMailboxOperationalVerification: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        checkedAt: "2026-04-03T11:30:00.000Z",
        overallStatus: "warning",
        subscription: {
          graphSubscriptionId: "subscription_123",
          status: "active",
          health: "warning",
          expiresAt: "2026-04-04T00:00:00.000Z",
          minutesUntilExpiry: 750
        },
        deltaSync: {
          trackedFolders: 1,
          healthyFolders: 1,
          staleFolders: 0,
          failedFolders: 0,
          missingCursorFolders: 0,
          maxCursorLagMinutes: 12,
          folders: []
        },
        immutableIds: {
          status: "enforced",
          messageReads: true,
          messageLists: true,
          deltaQueries: true,
          subscriptionCreation: true
        },
        checks: []
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      mailboxReadinessService
    );

    const response = await request(server, {
      method: "GET",
      path: "/mailboxes/mailbox_123/operational-verification",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        mailboxId: "mailbox_123",
        overallStatus: "warning"
      })
    );
    expect(mailboxReadinessService.getMailboxOperationalVerification).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("ensures a mailbox subscription for an authenticated mailbox owner", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn().mockResolvedValue({
        mailboxId: "mailbox_123",
        operation: "created",
        subscription: {
          mailboxId: "mailbox_123",
          graphSubscriptionId: "subscription_123",
          resource: "/users/graph_user_123/messages",
          changeTypes: ["created", "deleted", "updated"],
          status: "active",
          notificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/notifications",
          lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/microsoft/graph/lifecycle",
          expiresAt: "2026-04-10T11:30:00.000Z"
        }
      }),
      handleWebhookNotifications: vi.fn()
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn().mockResolvedValue(exampleSession.session),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/mailboxes/mailbox_123/subscriptions/ensure",
      headers: {
        Cookie: "friendly_mail_session=cookie-session-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      mailboxId: "mailbox_123",
      operation: "created",
      subscription: expect.objectContaining({
        graphSubscriptionId: "subscription_123",
        status: "active"
      })
    });
    expect(mailboxSubscriptionService.ensureMailboxSubscription).toHaveBeenCalledWith({
      session: exampleSession.session,
      mailboxId: "mailbox_123"
    });
  });

  it("returns the decoded validation token for Graph webhook validation", async () => {
    const server = createTestServer({
      login: vi.fn(),
      getSession: vi.fn(),
      logout: vi.fn()
    });

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/notifications?validationToken=hello%20world"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("text/plain");
    expect(response.body).toBe("hello world");
  });

  it("accepts Graph change notifications and hands them to the webhook service", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn().mockResolvedValue({
        acceptedNotifications: 1,
        ignoredNotifications: 0,
        queuedNotifications: 1
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn(),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/notifications",
      body: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            changeType: "updated"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(202);
    expect(response.body).toBe("");
    expect(mailboxSubscriptionService.handleWebhookNotifications).toHaveBeenCalledWith({
      kind: "change",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            changeType: "updated"
          }
        ]
      }
    });
  });

  it("accepts Graph lifecycle notifications and hands them to the webhook service", async () => {
    const mailboxSubscriptionService: ApiMailboxSubscriptionService = {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn().mockResolvedValue({
        acceptedNotifications: 1,
        ignoredNotifications: 0,
        queuedNotifications: 1
      })
    };
    const server = createTestServer(
      {
        login: vi.fn(),
        getSession: vi.fn(),
        logout: vi.fn()
      },
      undefined,
      undefined,
      undefined,
      undefined,
      mailboxSubscriptionService
    );

    const response = await request(server, {
      method: "POST",
      path: "/webhooks/microsoft/graph/lifecycle",
      body: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            lifecycleEvent: "reauthorizationRequired"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(202);
    expect(mailboxSubscriptionService.handleWebhookNotifications).toHaveBeenCalledWith({
      kind: "lifecycle",
      payload: {
        value: [
          {
            subscriptionId: "subscription_123",
            clientState: "secret_client_state",
            lifecycleEvent: "reauthorizationRequired"
          }
        ]
      }
    });
  });
});

function createTestServer(
  authService: ApiAuthService,
  mailboxOnboardingService?: ApiMailboxOnboardingService,
  mailboxReadinessService?: ApiMailboxReadinessService,
  mailboxFolderSyncService?: ApiMailboxFolderSyncService,
  mailboxMessageSyncService?: ApiMailboxMessageSyncService,
  mailboxSubscriptionService?: ApiMailboxSubscriptionService,
  mailboxIngestionService?: ApiMailboxIngestionService
) {
  const server = createServer({
    env: {
      NODE_ENV: "test",
      API_PORT: 0,
      SESSION_COOKIE_NAME: "friendly_mail_session",
      SESSION_MAX_AGE_HOURS: 12
    },
    authService,
    mailboxOnboardingService: mailboxOnboardingService ?? {
      beginConnect: vi.fn(),
      completeConnect: vi.fn()
    },
    mailboxReadinessService: mailboxReadinessService ?? {
      checkSharedMailboxReadiness: vi.fn(),
      getMailboxOperationalVerification: vi.fn()
    },
    mailboxFolderSyncService: mailboxFolderSyncService ?? {
      syncMailboxFolders: vi.fn()
    },
    mailboxMessageSyncService: mailboxMessageSyncService ?? {
      syncFolderMessages: vi.fn()
    },
    mailboxSubscriptionService: mailboxSubscriptionService ?? {
      ensureMailboxSubscription: vi.fn(),
      handleWebhookNotifications: vi.fn()
    },
    mailboxIngestionService: mailboxIngestionService ?? {
      ingestMessage: vi.fn()
    },
    logger: {
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
    }
  });

  return registerServer(server);
}

function registerServer(server: http.Server) {
  serversForCleanup.add(server);
  return server;
}

const serversForCleanup = new Set<http.Server>();

async function request(
  server: http.Server,
  input: {
    method: string;
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
) {
  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected the test server to listen on a TCP port");
  }

  const body = input.body ? JSON.stringify(input.body) : undefined;
  const requestHeaders: Record<string, string> = {
    ...input.headers
  };

  if (body) {
    requestHeaders["content-type"] = "application/json";
    requestHeaders["content-length"] = String(Buffer.byteLength(body));
  }

  return new Promise<{
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: string;
  }>((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        method: input.method,
        path: input.path,
        headers: requestHeaders
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          resolve({
            statusCode: response.statusCode ?? 500,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
}
