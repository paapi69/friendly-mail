import {
  createSessionToken,
  hashSessionToken,
  verifyPassword
} from "@friendly-mail/auth";
import {
  AuthProvider as PrismaAuthProvider,
  AppSurface as PrismaAppSurface,
  type PrismaClient,
  UserRole as PrismaUserRole
} from "@friendly-mail/database";
import {
  AppError,
  type Logger
} from "@friendly-mail/observability";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole,
  type SessionView
} from "@friendly-mail/contracts";

export type LoginInput = {
  email: string;
  password: string;
  surface: MailSurface;
  tenantId?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type AuthSessionResult = {
  token: string;
  session: SessionView;
};

export type AuthService = {
  login(input: LoginInput): Promise<AuthSessionResult>;
  getSession(token: string): Promise<SessionView | null>;
  logout(token: string): Promise<void>;
};

export type CreatePrismaAuthServiceInput = {
  prisma: PrismaClient;
  sessionSecret: string;
  sessionMaxAgeHours: number;
  logger: Logger;
};

export function createPrismaAuthService(input: CreatePrismaAuthServiceInput): AuthService {
  return {
    async login(loginInput) {
      const normalizedEmail = loginInput.email.trim().toLowerCase();
      const user = await input.prisma.user.findUnique({
        where: {
          email: normalizedEmail
        },
        include: {
          memberships: true
        }
      });

      if (!user || user.authProvider !== PrismaAuthProvider.LOCAL_PASSWORD || !user.passwordHash) {
        throw invalidCredentialsError();
      }

      const passwordMatches = await verifyPassword(loginInput.password, user.passwordHash);

      if (!passwordMatches) {
        throw invalidCredentialsError();
      }

      const membership = pickMembership(user.memberships, loginInput.tenantId);
      const sessionToken = createSessionToken();
      const sessionRecord = await input.prisma.session.create({
        data: {
          tokenHash: hashSessionToken(sessionToken, input.sessionSecret),
          userId: user.id,
          tenantId: membership.tenantId,
          authProvider: PrismaAuthProvider.LOCAL_PASSWORD,
          role: membership.role,
          surface: toPrismaAppSurface(loginInput.surface),
          userAgent: truncate(loginInput.userAgent),
          ipAddress: truncate(loginInput.ipAddress),
          expiresAt: addHours(new Date(), input.sessionMaxAgeHours)
        }
      });

      input.logger.info("Created local session", {
        userId: user.id,
        tenantId: membership.tenantId,
        sessionId: sessionRecord.id,
        surface: loginInput.surface
      });

      return {
        token: sessionToken,
        session: {
          id: sessionRecord.id,
          expiresAt: sessionRecord.expiresAt.toISOString(),
          surface: loginInput.surface,
          principal: {
            userId: user.id,
            tenantId: membership.tenantId,
            email: user.email,
            displayName: user.displayName,
            role: fromPrismaUserRole(membership.role),
            authProvider: AuthProvider.LocalPassword
          },
          authBoundary: {
            productIdentity: "friendly_mail_internal",
            mailboxIdentity: "microsoft_graph",
            graphConnectionState: "not_connected"
          }
        }
      };
    },

    async getSession(token) {
      const session = await input.prisma.session.findUnique({
        where: {
          tokenHash: hashSessionToken(token, input.sessionSecret)
        },
        include: {
          user: true
        }
      });

      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return null;
      }

      return {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        surface: fromPrismaAppSurface(session.surface),
        principal: {
          userId: session.user.id,
          tenantId: session.tenantId,
          email: session.user.email,
          displayName: session.user.displayName,
          role: fromPrismaUserRole(session.role),
          authProvider: fromPrismaAuthProvider(session.authProvider)
        },
        authBoundary: {
          productIdentity: "friendly_mail_internal",
          mailboxIdentity: "microsoft_graph",
          graphConnectionState: "not_connected"
        }
      };
    },

    async logout(token) {
      await input.prisma.session.updateMany({
        where: {
          tokenHash: hashSessionToken(token, input.sessionSecret),
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }
  };
}

function pickMembership(
  memberships: Array<{
    tenantId: string;
    role: PrismaUserRole;
  }>,
  tenantId?: string
) {
  if (tenantId) {
    const membership = memberships.find((item) => item.tenantId === tenantId);

    if (!membership) {
      throw new AppError("TENANT_ACCESS_DENIED", "Tenant access denied", {
        statusCode: 403
      });
    }

    return membership;
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  throw new AppError("TENANT_SELECTION_REQUIRED", "Tenant selection required", {
    statusCode: 400
  });
}

function invalidCredentialsError() {
  return new AppError("INVALID_CREDENTIALS", "Invalid credentials", {
    statusCode: 401
  });
}

function toPrismaAppSurface(surface: MailSurface) {
  return surface === MailSurface.OutlookAddIn
    ? PrismaAppSurface.OUTLOOK_ADDIN
    : PrismaAppSurface.DASHBOARD;
}

function fromPrismaAppSurface(surface: PrismaAppSurface) {
  return surface === PrismaAppSurface.OUTLOOK_ADDIN
    ? MailSurface.OutlookAddIn
    : MailSurface.Dashboard;
}

function fromPrismaUserRole(role: PrismaUserRole) {
  return role === PrismaUserRole.ADMIN ? TenantUserRole.Admin : TenantUserRole.Member;
}

function fromPrismaAuthProvider(provider: PrismaAuthProvider) {
  return provider === PrismaAuthProvider.MICROSOFT_ENTRA
    ? AuthProvider.MicrosoftEntra
    : AuthProvider.LocalPassword;
}

function addHours(value: Date, hours: number) {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function truncate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.slice(0, 512);
}
