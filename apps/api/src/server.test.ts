import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, MailSurface, TenantUserRole } from "@friendly-mail/contracts";
import { createServer, type ApiAuthService } from "./server";

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
});

function createTestServer(authService: ApiAuthService) {
  const server = createServer({
    env: {
      NODE_ENV: "test",
      API_PORT: 0,
      SESSION_COOKIE_NAME: "friendly_mail_session",
      SESSION_MAX_AGE_HOURS: 12
    },
    authService,
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
