import http from "node:http";
import {
  parseCookieHeader,
  readSessionTokenFromHeaders,
  serializeClearedSessionCookie,
  serializeSessionCookie
} from "@friendly-mail/auth";
import { MailSurface, WorkflowStatus } from "@friendly-mail/contracts";
import {
  AppError,
  createCorrelationId,
  type Logger,
  toErrorResponse
} from "@friendly-mail/observability";
import type { AuthService, LoginInput } from "./auth-service";
import type {
  MailboxOnboardingService
} from "./mailbox-onboarding-service";
import type { MailboxFolderSyncService } from "./mailbox-folder-sync-service";
import type { MailboxMessageSyncService } from "./mailbox-message-sync-service";
import type { MailboxSubscriptionService } from "./mailbox-subscription-service";

type ApiEnv = {
  NODE_ENV: "development" | "test" | "production";
  API_PORT: number;
  SESSION_COOKIE_NAME: string;
  SESSION_MAX_AGE_HOURS: number;
};

export type ApiAuthService = Pick<AuthService, "login" | "getSession" | "logout">;
export type ApiMailboxOnboardingService = Pick<
  MailboxOnboardingService,
  "beginConnect" | "completeConnect"
>;
export type ApiMailboxFolderSyncService = Pick<
  MailboxFolderSyncService,
  "syncMailboxFolders"
>;
export type ApiMailboxMessageSyncService = Pick<
  MailboxMessageSyncService,
  "syncFolderMessages"
>;
export type ApiMailboxSubscriptionService = Pick<
  MailboxSubscriptionService,
  "ensureMailboxSubscription" | "handleWebhookNotifications"
>;

export type CreateServerInput = {
  env: ApiEnv;
  authService: ApiAuthService;
  mailboxOnboardingService: ApiMailboxOnboardingService;
  mailboxFolderSyncService: ApiMailboxFolderSyncService;
  mailboxMessageSyncService: ApiMailboxMessageSyncService;
  mailboxSubscriptionService: ApiMailboxSubscriptionService;
  logger: Logger;
};

export function createServer(input: CreateServerInput) {
  return http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const correlationId = createCorrelationId();
    const requestLogger = input.logger.child({
      correlationId,
      method: request.method ?? "GET",
      path: requestUrl.pathname
    });

    try {
      if (
        request.method === "GET" &&
        (requestUrl.pathname === "/" || requestUrl.pathname === "/health")
      ) {
        writeJson(response, 200, {
          service: "friendly-mail-api",
          status: WorkflowStatus.Healthy,
          environment: input.env.NODE_ENV,
          correlationId
        });
        requestLogger.info("Request completed", {
          statusCode: 200
        });
        return;
      }

      const isGraphChangeWebhook =
        request.method === "POST" &&
        requestUrl.pathname === "/webhooks/microsoft/graph/notifications";
      const isGraphLifecycleWebhook =
        request.method === "POST" &&
        requestUrl.pathname === "/webhooks/microsoft/graph/lifecycle";

      if (isGraphChangeWebhook || isGraphLifecycleWebhook) {
        const validationToken = requestUrl.searchParams.get("validationToken");

        if (validationToken) {
          writeText(response, 200, validationToken);
          requestLogger.info("Validated Microsoft Graph webhook endpoint", {
            statusCode: 200,
            webhookKind: isGraphChangeWebhook ? "change" : "lifecycle"
          });
          return;
        }

        const body = await readJsonBody(request);
        await input.mailboxSubscriptionService.handleWebhookNotifications({
          kind: isGraphChangeWebhook ? "change" : "lifecycle",
          payload: body
        });

        response.writeHead(202);
        response.end();
        requestLogger.info("Accepted Microsoft Graph webhook payload", {
          statusCode: 202,
          webhookKind: isGraphChangeWebhook ? "change" : "lifecycle"
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/auth/login") {
        const body = await readJsonBody(request);
        const loginInput = parseLoginInput(body, request);
        const result = await input.authService.login(loginInput);
        const cookie = serializeSessionCookie({
          token: result.token,
          name: input.env.SESSION_COOKIE_NAME,
          maxAgeSeconds: input.env.SESSION_MAX_AGE_HOURS * 60 * 60,
          secure: input.env.NODE_ENV === "production"
        });

        writeJson(
          response,
          200,
          {
            session: result.session
          },
          {
            "set-cookie": cookie
          }
        );
        requestLogger.info("Local session created", {
          statusCode: 200,
          sessionId: result.session.id
        });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/auth/session") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );

        writeJson(response, 200, {
          session
        });
        requestLogger.info("Session fetched", {
          statusCode: 200,
          sessionId: session.id
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/auth/logout") {
        const token = readSessionTokenFromHeaders(request.headers, input.env.SESSION_COOKIE_NAME);

        if (token) {
          await input.authService.logout(token);
        }

        response.writeHead(204, {
          "set-cookie": serializeClearedSessionCookie({
            name: input.env.SESSION_COOKIE_NAME,
            secure: input.env.NODE_ENV === "production"
          })
        });
        response.end();
        requestLogger.info("Session cleared", {
          statusCode: 204
        });
        return;
      }

      if (request.method === "POST" && requestUrl.pathname === "/mailboxes/connect/start") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const body = await readJsonBody(request);
        const surface = parseSurface(body, session.surface);
        const result = await input.mailboxOnboardingService.beginConnect({
          session,
          surface
        });

        writeJson(
          response,
          200,
          {
            authorizationUrl: result.authorizationUrl
          },
          {
            "set-cookie": [
              serializeSessionCookie({
                token: result.state,
                name: getGraphStateCookieName(input.env.SESSION_COOKIE_NAME),
                maxAgeSeconds: 10 * 60,
                secure: input.env.NODE_ENV === "production"
              }),
              serializeSessionCookie({
                token: result.codeVerifier,
                name: getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME),
                maxAgeSeconds: 10 * 60,
                secure: input.env.NODE_ENV === "production"
              })
            ]
          }
        );
        requestLogger.info("Prepared mailbox connect redirect", {
          statusCode: 200,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      if (request.method === "GET" && requestUrl.pathname === "/auth/microsoft/callback") {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        const cookies = parseCookieHeader(request.headers.cookie);
        const expectedState = cookies[getGraphStateCookieName(input.env.SESSION_COOKIE_NAME)];
        const codeVerifier = cookies[getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME)];

        if (!code || !state || !expectedState || !codeVerifier) {
          throw new AppError(
            "GRAPH_CONNECT_CALLBACK_INVALID",
            "Microsoft mailbox callback is missing required parameters.",
            {
              statusCode: 400
            }
          );
        }

        const result = await input.mailboxOnboardingService.completeConnect({
          session,
          code,
          state,
          expectedState,
          codeVerifier
        });

        writeJson(
          response,
          200,
          result,
          {
            "set-cookie": [
              serializeClearedSessionCookie({
                name: getGraphStateCookieName(input.env.SESSION_COOKIE_NAME),
                secure: input.env.NODE_ENV === "production"
              }),
              serializeClearedSessionCookie({
                name: getGraphPkceCookieName(input.env.SESSION_COOKIE_NAME),
                secure: input.env.NODE_ENV === "production"
              })
            ]
          }
        );
        requestLogger.info("Connected mailbox through Microsoft callback", {
          statusCode: 200,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId
        });
        return;
      }

      const mailboxFolderSyncMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/folders\/sync$/)
          : null;

      if (mailboxFolderSyncMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxFolderSyncMatch[1]);
        const result = await input.mailboxFolderSyncService.syncMailboxFolders({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Synced mailbox folders", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          discoveredFolders: result.discoveredFolders
        });
        return;
      }

      const mailboxMessageSyncMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/folders\/([^/]+)\/messages\/sync$/)
          : null;

      if (mailboxMessageSyncMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxMessageSyncMatch[1]);
        const folderId = decodeURIComponent(mailboxMessageSyncMatch[2]);
        const result = await input.mailboxMessageSyncService.syncFolderMessages({
          session,
          mailboxId,
          folderId
        });

        writeJson(response, 200, result);
        requestLogger.info("Synced mailbox message metadata", {
          statusCode: 200,
          mailboxId,
          folderId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          syncedMessages: result.syncedMessages,
          removedMessages: result.removedMessages
        });
        return;
      }

      const mailboxSubscriptionEnsureMatch =
        request.method === "POST"
          ? requestUrl.pathname.match(/^\/mailboxes\/([^/]+)\/subscriptions\/ensure$/)
          : null;

      if (mailboxSubscriptionEnsureMatch) {
        const session = await requireSession(
          input.authService,
          request,
          input.env.SESSION_COOKIE_NAME
        );
        const mailboxId = decodeURIComponent(mailboxSubscriptionEnsureMatch[1]);
        const result = await input.mailboxSubscriptionService.ensureMailboxSubscription({
          session,
          mailboxId
        });

        writeJson(response, 200, result);
        requestLogger.info("Ensured mailbox subscription", {
          statusCode: 200,
          mailboxId,
          userId: session.principal.userId,
          tenantId: session.principal.tenantId,
          operation: result.operation,
          graphSubscriptionId: result.subscription.graphSubscriptionId
        });
        return;
      }

      throw new AppError("ROUTE_NOT_FOUND", "Route not found", {
        statusCode: 404
      });
    } catch (error) {
      const errorResponse = toErrorResponse(error, correlationId);
      response.writeHead(errorResponse.statusCode, {
        "content-type": "application/json"
      });
      response.end(JSON.stringify(errorResponse.body));
      requestLogger.error("Request failed", {
        statusCode: errorResponse.statusCode,
        error
      });
    }
  });
}

async function requireSession(
  authService: ApiAuthService,
  request: http.IncomingMessage,
  cookieName: string
) {
  const token = readSessionTokenFromHeaders(request.headers, cookieName);

  if (!token) {
    throw new AppError("AUTHENTICATION_REQUIRED", "Authentication required", {
      statusCode: 401
    });
  }

  const session = await authService.getSession(token);

  if (!session) {
    throw new AppError("AUTHENTICATION_REQUIRED", "Authentication required", {
      statusCode: 401
    });
  }

  return session;
}

async function readJsonBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", "Request body must be valid JSON", {
      statusCode: 400
    });
  }
}

function parseLoginInput(body: unknown, request: http.IncomingMessage): LoginInput {
  if (!isObject(body)) {
    throw new AppError("INVALID_AUTH_REQUEST", "Login payload is invalid", {
      statusCode: 400
    });
  }

  if (!isNonEmptyString(body.email) || !isNonEmptyString(body.password)) {
    throw new AppError("INVALID_AUTH_REQUEST", "Email and password are required", {
      statusCode: 400
    });
  }

  const surface = body.surface === MailSurface.OutlookAddIn
    ? MailSurface.OutlookAddIn
    : body.surface === MailSurface.Dashboard
      ? MailSurface.Dashboard
      : undefined;

  if (!surface) {
    throw new AppError("INVALID_AUTH_REQUEST", "Surface must be provided", {
      statusCode: 400
    });
  }

  return {
    email: body.email,
    password: body.password,
    surface,
    tenantId: isNonEmptyString(body.tenantId) ? body.tenantId : undefined,
    userAgent: typeof request.headers["user-agent"] === "string"
      ? request.headers["user-agent"]
      : undefined,
    ipAddress: request.socket.remoteAddress ?? undefined
  };
}

function writeJson(
  response: http.ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string | string[]>
) {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    ...headers
  });
  response.end(JSON.stringify(body));
}

function writeText(response: http.ServerResponse, statusCode: number, body: string) {
  response.writeHead(statusCode, {
    "content-type": "text/plain"
  });
  response.end(body);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSurface(body: unknown, fallbackSurface: MailSurface) {
  if (!isObject(body)) {
    return fallbackSurface;
  }

  return body.surface === MailSurface.OutlookAddIn
    ? MailSurface.OutlookAddIn
    : body.surface === MailSurface.Dashboard
      ? MailSurface.Dashboard
      : fallbackSurface;
}

function getGraphStateCookieName(sessionCookieName: string) {
  return `${sessionCookieName}_graph_state`;
}

function getGraphPkceCookieName(sessionCookieName: string) {
  return `${sessionCookieName}_graph_pkce`;
}
