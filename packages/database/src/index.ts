import { AuthProvider, PrismaClient, UserRole } from "@prisma/client";

declare global {
  var __friendlyMailPrisma__: PrismaClient | undefined;
}

export const databaseTables = [
  "Tenant",
  "User",
  "TenantMembership",
  "Session",
  "Mailbox",
  "Folder",
  "Message",
  "Task",
  "AuditEvent"
] as const;

export type DatabaseTable = (typeof databaseTables)[number];

export type RecordAuditEventInput = {
  tenantId: string;
  actor?: string;
  action: string;
  entityType: string;
  entityId: string;
  messageId?: string;
  payload?: Record<string, unknown>;
};

export type CreateLocalUserInput = {
  email: string;
  displayName: string;
  passwordHash: string;
  tenantId: string;
  role: UserRole;
};

type AuditEventWriter = {
  auditEvent: {
    create: (args: {
      data: {
        tenantId: string;
        actor?: string;
        action: string;
        entityType: string;
        entityId: string;
        messageId?: string;
        payloadJson: string | null;
      };
    }) => Promise<unknown>;
  };
};

type LocalUserWriter = {
  user: {
    upsert: (args: {
      where: { email: string };
      update: {
        displayName: string;
        authProvider: AuthProvider;
        passwordHash: string;
      };
      create: {
        email: string;
        displayName: string;
        authProvider: AuthProvider;
        passwordHash: string;
        memberships: {
          create: {
            tenantId: string;
            role: UserRole;
          };
        };
      };
      include: {
        memberships: true;
      };
    }) => Promise<unknown>;
  };
};

export function createPrismaClient() {
  return new PrismaClient();
}

export function getPrismaClient() {
  const existing = globalThis.__friendlyMailPrisma__;
  if (existing) {
    return existing;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalThis.__friendlyMailPrisma__ = client;
  }

  return client;
}

export async function recordAuditEvent(
  writer: AuditEventWriter,
  input: RecordAuditEventInput
) {
  return writer.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      actor: input.actor,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      messageId: input.messageId,
      payloadJson: input.payload ? JSON.stringify(input.payload) : null
    }
  });
}

export async function createLocalUser(writer: LocalUserWriter, input: CreateLocalUserInput) {
  return writer.user.upsert({
    where: {
      email: input.email
    },
    update: {
      displayName: input.displayName,
      authProvider: AuthProvider.LOCAL_PASSWORD,
      passwordHash: input.passwordHash
    },
    create: {
      email: input.email,
      displayName: input.displayName,
      authProvider: AuthProvider.LOCAL_PASSWORD,
      passwordHash: input.passwordHash,
      memberships: {
        create: {
          tenantId: input.tenantId,
          role: input.role
        }
      }
    },
    include: {
      memberships: true
    }
  });
}

export * from "@prisma/client";
