import { describe, expect, it, vi } from "vitest";
import { MailboxKind, MailSurface, TenantUserRole, AuthProvider } from "@friendly-mail/contracts";
import { createPrismaMailboxOnboardingService } from "./mailbox-onboarding-service";

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
    graphConnectionState: "not_connected" as const
  }
};

describe("mailbox onboarding service", () => {
  it("creates an authorization URL with signed state and PKCE values", async () => {
    const service = createPrismaMailboxOnboardingService({
      prisma: {} as never,
      env: exampleEnv(),
      logger: silentLogger()
    });

    const result = await service.beginConnect({
      session: exampleSession,
      surface: MailSurface.OutlookAddIn
    });

    expect(result.state).toContain(".");
    expect(result.codeVerifier.length).toBeGreaterThan(20);

    const url = new URL(result.authorizationUrl);
    expect(url.origin).toBe("https://login.microsoftonline.com");
    expect(url.pathname).toBe("/organizations/oauth2/v2.0/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:4000/auth/microsoft/callback"
    );
    expect(url.searchParams.get("scope")).toContain("Mail.Read");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBe(result.state);
  });

  it("redeems the auth code, validates the mailbox, and persists mailbox linkage", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: createUnsignedJwt({
            tid: "graph_tenant_123"
          }),
          refresh_token: "refresh_token_123",
          expires_in: 3600,
          scope: "Mail.Read User.Read"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "graph_user_123",
          displayName: "Owner",
          mail: "owner@friendlymail.dev",
          userPrincipalName: "owner@friendlymail.dev"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          value: [
            {
              id: "folder_123",
              displayName: "Inbox",
              childFolderCount: 1,
              unreadItemCount: 0,
              totalItemCount: 1,
              isHidden: false
            }
          ]
        })
      );
    const mailboxUpsert = vi.fn().mockResolvedValue({
      id: "mailbox_123",
      tenantId: "tenant_123",
      displayName: "Owner",
      emailAddress: "owner@friendlymail.dev",
      graphMailboxId: "graph_user_123"
    });
    const connectionUpsert = vi.fn().mockResolvedValue({
      id: "connection_123"
    });
    const connectionLookup = vi.fn().mockResolvedValue({
      id: "connection_123",
      mailboxId: "mailbox_123",
      tenantId: "tenant_123",
      userId: "user_123",
      graphTenantId: "graph_tenant_123",
      graphUserId: "graph_user_123",
      status: "ACTIVE",
      grantedScopes: ["Mail.Read", "User.Read"],
      connectedAt: new Date("2026-04-01T10:45:00.000Z"),
      accessTokenExpiresAt: new Date("2026-04-01T11:45:00.000Z"),
      refreshTokenExpiresAt: null,
      lastValidatedAt: new Date("2026-04-01T10:45:00.000Z"),
      lastReauthorizedAt: null,
      lastErrorCode: null
    });
    const now = new Date("2026-04-01T10:45:00.000Z");
    const service = createPrismaMailboxOnboardingService({
      prisma: {
        mailbox: {
          upsert: mailboxUpsert
        },
        mailboxConnection: {
          upsert: connectionUpsert,
          findUniqueOrThrow: connectionLookup
        }
      } as never,
      env: exampleEnv(),
      logger: silentLogger(),
      fetch,
      now: () => new Date(now)
    });

    const begin = await service.beginConnect({
      session: exampleSession,
      surface: MailSurface.Dashboard
    });
    const result = await service.completeConnect({
      session: exampleSession,
      code: "auth_code_123",
      state: begin.state,
      expectedState: begin.state,
      codeVerifier: begin.codeVerifier
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain("/oauth2/v2.0/token");
    expect(mailboxUpsert).toHaveBeenCalledWith({
      where: {
        emailAddress: "owner@friendlymail.dev"
      },
      update: expect.objectContaining({
        graphMailboxId: "graph_user_123",
        kind: "USER"
      }),
      create: expect.objectContaining({
        emailAddress: "owner@friendlymail.dev",
        kind: "USER"
      })
    });
    expect(connectionUpsert).toHaveBeenCalledOnce();
    expect(result.mailbox).toEqual({
      id: "mailbox_123",
      tenantId: "tenant_123",
      displayName: "Owner",
      emailAddress: "owner@friendlymail.dev",
      graphMailboxId: "graph_user_123",
      kind: MailboxKind.User
    });
    expect(result.connection).toEqual(
      expect.objectContaining({
        id: "connection_123",
        status: "active",
        graphTenantId: "graph_tenant_123"
      })
    );
  });
});

function exampleEnv() {
  return {
    APP_BASE_URL: "http://localhost:3000",
    MICROSOFT_CLIENT_ID: "client_123",
    MICROSOFT_CLIENT_SECRET: "client_secret_123",
    MICROSOFT_AUTHORITY_URL: "https://login.microsoftonline.com/organizations",
    MICROSOFT_GRAPH_REDIRECT_URI: "http://localhost:4000/auth/microsoft/callback",
    MICROSOFT_GRAPH_SCOPES: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "User.Read",
      "Mail.Read"
    ],
    MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012",
    SESSION_SECRET: "session_secret_123",
    MICROSOFT_TENANT_ID: "tenant_123"
  };
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

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function createUnsignedJwt(claims: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.signature`;
}
