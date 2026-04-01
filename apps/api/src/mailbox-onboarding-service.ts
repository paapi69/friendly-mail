import crypto from "node:crypto";
import { type FetchLike, createGraphConnector } from "@friendly-mail/graph";
import {
  MailboxConnectionStatus,
  MailboxKind,
  type MailSurface,
  type MailboxConnectionRecord,
  type MailboxRecord,
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertMailboxConnection
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";

type MailboxOnboardingEnv = {
  APP_BASE_URL: string;
  MICROSOFT_TENANT_ID: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  MICROSOFT_AUTHORITY_URL: string;
  MICROSOFT_GRAPH_REDIRECT_URI: string;
  MICROSOFT_GRAPH_SCOPES: string[];
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
  SESSION_SECRET: string;
};

type BeginConnectInput = {
  session: SessionView;
  surface: MailSurface;
};

type BeginConnectResult = {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
};

type CompleteConnectInput = {
  session: SessionView;
  code: string;
  state: string;
  expectedState: string;
  codeVerifier: string;
};

type CompleteConnectResult = {
  mailbox: MailboxRecord;
  connection: MailboxConnectionRecord;
};

export type MailboxOnboardingService = {
  beginConnect(input: BeginConnectInput): Promise<BeginConnectResult>;
  completeConnect(input: CompleteConnectInput): Promise<CompleteConnectResult>;
};

export type CreatePrismaMailboxOnboardingServiceInput = {
  prisma: PrismaClient;
  env: MailboxOnboardingEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

type SignedStatePayload = {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  surface: MailSurface;
  nonce: string;
  issuedAt: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const STATE_TTL_MS = 10 * 60 * 1000;

export function createPrismaMailboxOnboardingService(
  input: CreatePrismaMailboxOnboardingServiceInput
): MailboxOnboardingService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async beginConnect(connectInput) {
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
      const statePayload: SignedStatePayload = {
        sessionId: connectInput.session.id,
        userId: connectInput.session.principal.userId,
        tenantId: connectInput.session.principal.tenantId,
        email: connectInput.session.principal.email,
        surface: connectInput.surface,
        nonce: crypto.randomUUID(),
        issuedAt: now().toISOString()
      };
      const state = signState(statePayload, input.env.SESSION_SECRET);
      const authorizationUrl = buildAuthorizationUrl(input.env, {
        state,
        codeChallenge,
        loginHint: connectInput.session.principal.email
      });

      input.logger.info("Prepared Microsoft mailbox connect flow", {
        tenantId: connectInput.session.principal.tenantId,
        userId: connectInput.session.principal.userId,
        surface: connectInput.surface
      });

      return {
        authorizationUrl,
        state,
        codeVerifier
      };
    },

    async completeConnect(connectInput) {
      if (connectInput.state !== connectInput.expectedState) {
        throw new AppError("GRAPH_CONNECT_STATE_MISMATCH", "Mailbox connect state is invalid.", {
          statusCode: 400
        });
      }

      const statePayload = verifyState(connectInput.state, input.env.SESSION_SECRET, now());

      if (
        statePayload.sessionId !== connectInput.session.id ||
        statePayload.userId !== connectInput.session.principal.userId ||
        statePayload.tenantId !== connectInput.session.principal.tenantId
      ) {
        throw new AppError("GRAPH_CONNECT_STATE_MISMATCH", "Mailbox connect state is invalid.", {
          statusCode: 400
        });
      }

      const tokenResult = await redeemAuthorizationCode(fetchImpl, input.env, {
        code: connectInput.code,
        codeVerifier: connectInput.codeVerifier
      });

      const graph = createGraphConnector({
        tokenProvider: async () => tokenResult.accessToken,
        fetch: fetchImpl,
        logger: input.logger.child({
          integration: "microsoft-graph"
        })
      });

      const graphUser = await graph.getCurrentUser();
      const folderPage = await graph.listMailFolders({
        top: 1
      });
      const mailboxAddress =
        graphUser.mail?.trim().toLowerCase() ?? graphUser.userPrincipalName?.trim().toLowerCase();

      if (!mailboxAddress) {
        throw new AppError(
          "GRAPH_MAILBOX_ADDRESS_MISSING",
          "Connected Microsoft user did not expose a primary mailbox address.",
          {
            statusCode: 502
          }
        );
      }

      if (!folderPage.items.length) {
        throw new AppError(
          "GRAPH_MAILBOX_UNSUPPORTED",
          "The Microsoft mailbox could not be validated for folder access.",
          {
            statusCode: 502
          }
        );
      }

      const mailbox = await input.prisma.mailbox.upsert({
        where: {
          emailAddress: mailboxAddress
        },
        update: {
          tenantId: connectInput.session.principal.tenantId,
          displayName: graphUser.displayName || mailboxAddress,
          graphMailboxId: graphUser.id,
          kind: "USER"
        },
        create: {
          tenantId: connectInput.session.principal.tenantId,
          displayName: graphUser.displayName || mailboxAddress,
          emailAddress: mailboxAddress,
          graphMailboxId: graphUser.id,
          kind: "USER"
        }
      });

      await upsertMailboxConnection(
        {
          mailboxConnection: input.prisma.mailboxConnection
        },
        {
          mailboxId: mailbox.id,
          tenantId: connectInput.session.principal.tenantId,
          userId: connectInput.session.principal.userId,
          graphTenantId: extractTenantId(tokenResult.idTokenClaims, input.env.MICROSOFT_TENANT_ID),
          graphUserId: graphUser.id,
          status: "ACTIVE",
          grantedScopes: tokenResult.scopes,
          accessTokenCiphertext: encryptSecret(
            tokenResult.accessToken,
            input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
          ),
          refreshTokenCiphertext: tokenResult.refreshToken
            ? encryptSecret(tokenResult.refreshToken, input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY)
            : undefined,
          accessTokenExpiresAt: addSeconds(now(), tokenResult.expiresIn),
          connectedAt: now(),
          lastValidatedAt: now()
        }
      );

      const connection = (await input.prisma.mailboxConnection.findUniqueOrThrow({
        where: {
          mailboxId: mailbox.id
        }
      })) as {
        id: string;
        mailboxId: string;
        tenantId: string;
        userId: string;
        graphTenantId: string;
        graphUserId: string;
        status: "ACTIVE";
        grantedScopes: string[];
        connectedAt: Date | null;
        accessTokenExpiresAt: Date | null;
        refreshTokenExpiresAt: Date | null;
        lastValidatedAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
      };

      input.logger.info("Connected delegated Microsoft mailbox", {
        tenantId: connectInput.session.principal.tenantId,
        userId: connectInput.session.principal.userId,
        mailboxId: mailbox.id,
        mailboxAddress
      });

      return {
        mailbox: {
          id: mailbox.id,
          tenantId: mailbox.tenantId,
          displayName: mailbox.displayName,
          emailAddress: mailbox.emailAddress,
          graphMailboxId: mailbox.graphMailboxId ?? undefined,
          kind: MailboxKind.User
        },
        connection: {
          id: connection.id,
          mailboxId: connection.mailboxId,
          tenantId: connection.tenantId,
          userId: connection.userId,
          graphTenantId: connection.graphTenantId,
          graphUserId: connection.graphUserId,
          status: MailboxConnectionStatus.Active,
          grantedScopes: connection.grantedScopes,
          connectedAt: connection.connectedAt?.toISOString(),
          accessTokenExpiresAt: connection.accessTokenExpiresAt?.toISOString(),
          refreshTokenExpiresAt: connection.refreshTokenExpiresAt?.toISOString(),
          lastValidatedAt: connection.lastValidatedAt?.toISOString(),
          lastReauthorizedAt: connection.lastReauthorizedAt?.toISOString(),
          lastErrorCode: connection.lastErrorCode ?? undefined
        }
      };
    }
  };
}

async function redeemAuthorizationCode(
  fetchImpl: FetchLike,
  env: MailboxOnboardingEnv,
  input: {
    code: string;
    codeVerifier: string;
  }
) {
  const tokenUrl = new URL("oauth2/v2.0/token", ensureTrailingSlash(env.MICROSOFT_AUTHORITY_URL));
  const body = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: env.MICROSOFT_GRAPH_REDIRECT_URI,
    code_verifier: input.codeVerifier,
    scope: env.MICROSOFT_GRAPH_SCOPES.join(" ")
  });

  const response = await fetchImpl(tokenUrl.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  const payload = (await response.json()) as TokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new AppError(
      "GRAPH_AUTH_EXCHANGE_FAILED",
      payload.error_description ?? "Microsoft authorization code exchange failed.",
      {
        statusCode: 502,
        details: {
          error: payload.error
        }
      }
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in ?? 3600,
    scopes: normalizeScopes(payload.scope, env.MICROSOFT_GRAPH_SCOPES),
    idTokenClaims: readJwtClaims(payload.access_token)
  };
}

function buildAuthorizationUrl(
  env: MailboxOnboardingEnv,
  input: {
    state: string;
    codeChallenge: string;
    loginHint: string;
  }
) {
  const authorizeUrl = new URL(
    "oauth2/v2.0/authorize",
    ensureTrailingSlash(env.MICROSOFT_AUTHORITY_URL)
  );
  authorizeUrl.searchParams.set("client_id", env.MICROSOFT_CLIENT_ID);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", env.MICROSOFT_GRAPH_REDIRECT_URI);
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", env.MICROSOFT_GRAPH_SCOPES.join(" "));
  authorizeUrl.searchParams.set("state", input.state);
  authorizeUrl.searchParams.set("code_challenge", input.codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "select_account");
  authorizeUrl.searchParams.set("login_hint", input.loginHint);

  return authorizeUrl.toString();
}

function signState(payload: SignedStatePayload, secret: string) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyState(token: string, secret: string, currentTime: Date) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    throw invalidStateError();
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    throw invalidStateError();
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as
    SignedStatePayload;
  const issuedAt = Date.parse(payload.issuedAt);

  if (Number.isNaN(issuedAt) || currentTime.getTime() - issuedAt > STATE_TTL_MS) {
    throw invalidStateError();
  }

  return payload;
}

function invalidStateError() {
  return new AppError("GRAPH_CONNECT_STATE_MISMATCH", "Mailbox connect state is invalid.", {
    statusCode: 400
  });
}

function normalizeScopes(scopeValue: string | undefined, fallbackScopes: string[]) {
  const scopes = scopeValue?.split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
  return scopes?.length ? [...new Set(scopes)].sort() : [...fallbackScopes].sort();
}

function readJwtClaims(token: string) {
  const [, encodedClaims] = token.split(".");
  if (!encodedClaims) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

function extractTenantId(claims: Record<string, unknown>, fallbackTenantId: string) {
  return typeof claims.tid === "string" && claims.tid.length > 0
    ? claims.tid
    : fallbackTenantId;
}

function encryptSecret(value: string, secret: string) {
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function addSeconds(nowValue: Date, seconds: number) {
  return new Date(nowValue.getTime() + seconds * 1000);
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
