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
  "MailboxConnection",
  "Folder",
  "FolderSyncState",
  "GraphSubscription",
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

export type UpsertMailboxConnectionInput = {
  mailboxId: string;
  tenantId: string;
  userId: string;
  graphTenantId: string;
  graphUserId: string;
  status:
    | "PENDING_CONSENT"
    | "ACTIVE"
    | "NEEDS_REAUTH"
    | "FAILED"
    | "DISCONNECTED";
  grantedScopes: string[];
  accessTokenCiphertext?: string;
  refreshTokenCiphertext?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  connectedAt?: Date;
  lastValidatedAt?: Date;
  lastReauthorizedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
};

export type UpsertFolderSyncStateInput = {
  mailboxId: string;
  folderId: string;
  deltaLink?: string;
  syncStatus: "PENDING" | "ACTIVE" | "IDLE" | "FAILED";
  lastSyncedAt?: Date;
  lastCursorUpdatedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
};

export type UpsertMailboxFolderInput = {
  mailboxId: string;
  graphFolderId: string;
  displayName: string;
  parentGraphFolderId?: string;
  isSyncEnabled?: boolean;
};

export type UpsertMailboxMessageInput = {
  mailboxId: string;
  folderId?: string;
  graphMessageId: string;
  graphParentFolderId?: string;
  graphChangeKey?: string;
  internetMessageId?: string;
  conversationId?: string;
  subject: string;
  fromAddress?: string;
  receivedAt?: Date;
  lastGraphModifiedAt?: Date;
  isRead: boolean;
  graphRemovedAt?: Date;
  graphRemovalReason?: "changed" | "deleted";
};

export type MarkMailboxMessageRemovedInput = {
  mailboxId: string;
  graphMessageId: string;
  graphRemovedAt: Date;
  graphRemovalReason: "changed" | "deleted";
};

export type UpsertGraphSubscriptionInput = {
  mailboxId: string;
  graphSubscriptionId: string;
  resource: string;
  changeTypes: string[];
  notificationUrl: string;
  lifecycleNotificationUrl?: string;
  clientStateHash?: string;
  status:
    | "PENDING"
    | "ACTIVE"
    | "EXPIRED"
    | "REMOVED"
    | "REAUTH_REQUIRED"
    | "FAILED";
  expiresAt: Date;
  lastValidatedAt?: Date;
  lastNotificationAt?: Date;
  lastLifecycleEventAt?: Date;
  lastReauthorizedAt?: Date;
  lastErrorCode?: string;
  lastErrorAt?: Date;
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

type MailboxConnectionWriter = {
  mailboxConnection: {
    upsert: (args: {
      where: { mailboxId: string };
      update: {
        tenantId: string;
        userId: string;
        graphTenantId: string;
        graphUserId: string;
        status: UpsertMailboxConnectionInput["status"];
        grantedScopes: string[];
        accessTokenCiphertext: string | null;
        refreshTokenCiphertext: string | null;
        accessTokenExpiresAt: Date | null;
        refreshTokenExpiresAt: Date | null;
        connectedAt: Date | null;
        lastValidatedAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        tenantId: string;
        userId: string;
        graphTenantId: string;
        graphUserId: string;
        status: UpsertMailboxConnectionInput["status"];
        grantedScopes: string[];
        accessTokenCiphertext: string | null;
        refreshTokenCiphertext: string | null;
        accessTokenExpiresAt: Date | null;
        refreshTokenExpiresAt: Date | null;
        connectedAt: Date | null;
        lastValidatedAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type FolderSyncStateWriter = {
  folderSyncState: {
    upsert: (args: {
      where: { folderId: string };
      update: {
        mailboxId: string;
        deltaLink: string | null;
        syncStatus: UpsertFolderSyncStateInput["syncStatus"];
        lastSyncedAt: Date | null;
        lastCursorUpdatedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        folderId: string;
        deltaLink: string | null;
        syncStatus: UpsertFolderSyncStateInput["syncStatus"];
        lastSyncedAt: Date | null;
        lastCursorUpdatedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type FolderWriter = {
  folder: {
    upsert: (args: {
      where: { graphFolderId: string };
      update: {
        mailboxId: string;
        displayName: string;
        parentGraphFolderId: string | null;
        isSyncEnabled: boolean;
      };
      create: {
        mailboxId: string;
        graphFolderId: string;
        displayName: string;
        parentGraphFolderId: string | null;
        isSyncEnabled: boolean;
      };
    }) => Promise<unknown>;
  };
};

type GraphSubscriptionWriter = {
  graphSubscription: {
    upsert: (args: {
      where: { graphSubscriptionId: string };
      update: {
        mailboxId: string;
        resource: string;
        changeTypes: string[];
        notificationUrl: string;
        lifecycleNotificationUrl: string | null;
        clientStateHash: string | null;
        status: UpsertGraphSubscriptionInput["status"];
        expiresAt: Date;
        lastValidatedAt: Date | null;
        lastNotificationAt: Date | null;
        lastLifecycleEventAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
      create: {
        mailboxId: string;
        graphSubscriptionId: string;
        resource: string;
        changeTypes: string[];
        notificationUrl: string;
        lifecycleNotificationUrl: string | null;
        clientStateHash: string | null;
        status: UpsertGraphSubscriptionInput["status"];
        expiresAt: Date;
        lastValidatedAt: Date | null;
        lastNotificationAt: Date | null;
        lastLifecycleEventAt: Date | null;
        lastReauthorizedAt: Date | null;
        lastErrorCode: string | null;
        lastErrorAt: Date | null;
      };
    }) => Promise<unknown>;
  };
};

type UpsertMessageWriter = {
  message: {
    upsert: (args: {
      where: { graphMessageId: string };
      update: {
        mailboxId: string;
        folderId: string | null;
        graphParentFolderId: string | null;
        graphChangeKey: string | null;
        internetMessageId: string | null;
        conversationId: string | null;
        subject: string;
        fromAddress: string | null;
        receivedAt: Date | null;
        lastGraphModifiedAt: Date | null;
        isRead: boolean;
        graphRemovedAt: Date | null;
        graphRemovalReason: string | null;
      };
      create: {
        mailboxId: string;
        folderId: string | null;
        graphMessageId: string;
        graphParentFolderId: string | null;
        graphChangeKey: string | null;
        internetMessageId: string | null;
        conversationId: string | null;
        subject: string;
        fromAddress: string | null;
        receivedAt: Date | null;
        lastGraphModifiedAt: Date | null;
        isRead: boolean;
        graphRemovedAt: Date | null;
        graphRemovalReason: string | null;
      };
    }) => Promise<unknown>;
  };
};

type MessageRemovalWriter = {
  message: {
    updateMany: (args: {
      where: {
        mailboxId: string;
        graphMessageId: string;
      };
      data: {
        folderId: null;
        graphParentFolderId: null;
        graphRemovedAt: Date;
        graphRemovalReason: string;
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

export async function upsertMailboxConnection(
  writer: MailboxConnectionWriter,
  input: UpsertMailboxConnectionInput
) {
  const grantedScopes = normalizeStringList(input.grantedScopes);

  return writer.mailboxConnection.upsert({
    where: {
      mailboxId: input.mailboxId
    },
    update: {
      tenantId: input.tenantId,
      userId: input.userId,
      graphTenantId: input.graphTenantId,
      graphUserId: input.graphUserId,
      status: input.status,
      grantedScopes,
      accessTokenCiphertext: input.accessTokenCiphertext ?? null,
      refreshTokenCiphertext: input.refreshTokenCiphertext ?? null,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      tenantId: input.tenantId,
      userId: input.userId,
      graphTenantId: input.graphTenantId,
      graphUserId: input.graphUserId,
      status: input.status,
      grantedScopes,
      accessTokenCiphertext: input.accessTokenCiphertext ?? null,
      refreshTokenCiphertext: input.refreshTokenCiphertext ?? null,
      accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt ?? null,
      connectedAt: input.connectedAt ?? null,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertFolderSyncState(
  writer: FolderSyncStateWriter,
  input: UpsertFolderSyncStateInput
) {
  return writer.folderSyncState.upsert({
    where: {
      folderId: input.folderId
    },
    update: {
      mailboxId: input.mailboxId,
      deltaLink: input.deltaLink ?? null,
      syncStatus: input.syncStatus,
      lastSyncedAt: input.lastSyncedAt ?? null,
      lastCursorUpdatedAt: input.lastCursorUpdatedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      folderId: input.folderId,
      deltaLink: input.deltaLink ?? null,
      syncStatus: input.syncStatus,
      lastSyncedAt: input.lastSyncedAt ?? null,
      lastCursorUpdatedAt: input.lastCursorUpdatedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertMailboxFolder(writer: FolderWriter, input: UpsertMailboxFolderInput) {
  return writer.folder.upsert({
    where: {
      graphFolderId: input.graphFolderId
    },
    update: {
      mailboxId: input.mailboxId,
      displayName: input.displayName,
      parentGraphFolderId: input.parentGraphFolderId ?? null,
      isSyncEnabled: input.isSyncEnabled ?? true
    },
    create: {
      mailboxId: input.mailboxId,
      graphFolderId: input.graphFolderId,
      displayName: input.displayName,
      parentGraphFolderId: input.parentGraphFolderId ?? null,
      isSyncEnabled: input.isSyncEnabled ?? true
    }
  });
}

export async function upsertGraphSubscription(
  writer: GraphSubscriptionWriter,
  input: UpsertGraphSubscriptionInput
) {
  const changeTypes = normalizeStringList(input.changeTypes);

  return writer.graphSubscription.upsert({
    where: {
      graphSubscriptionId: input.graphSubscriptionId
    },
    update: {
      mailboxId: input.mailboxId,
      resource: input.resource,
      changeTypes,
      notificationUrl: input.notificationUrl,
      lifecycleNotificationUrl: input.lifecycleNotificationUrl ?? null,
      clientStateHash: input.clientStateHash ?? null,
      status: input.status,
      expiresAt: input.expiresAt,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastNotificationAt: input.lastNotificationAt ?? null,
      lastLifecycleEventAt: input.lastLifecycleEventAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      graphSubscriptionId: input.graphSubscriptionId,
      resource: input.resource,
      changeTypes,
      notificationUrl: input.notificationUrl,
      lifecycleNotificationUrl: input.lifecycleNotificationUrl ?? null,
      clientStateHash: input.clientStateHash ?? null,
      status: input.status,
      expiresAt: input.expiresAt,
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastNotificationAt: input.lastNotificationAt ?? null,
      lastLifecycleEventAt: input.lastLifecycleEventAt ?? null,
      lastReauthorizedAt: input.lastReauthorizedAt ?? null,
      lastErrorCode: input.lastErrorCode ?? null,
      lastErrorAt: input.lastErrorAt ?? null
    }
  });
}

export async function upsertMailboxMessage(
  writer: UpsertMessageWriter,
  input: UpsertMailboxMessageInput
) {
  return writer.message.upsert({
    where: {
      graphMessageId: input.graphMessageId
    },
    update: {
      mailboxId: input.mailboxId,
      folderId: input.folderId ?? null,
      graphParentFolderId: input.graphParentFolderId ?? null,
      graphChangeKey: input.graphChangeKey ?? null,
      internetMessageId: input.internetMessageId ?? null,
      conversationId: input.conversationId ?? null,
      subject: input.subject,
      fromAddress: input.fromAddress ?? null,
      receivedAt: input.receivedAt ?? null,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isRead: input.isRead,
      graphRemovedAt: input.graphRemovedAt ?? null,
      graphRemovalReason: input.graphRemovalReason ?? null
    },
    create: {
      mailboxId: input.mailboxId,
      folderId: input.folderId ?? null,
      graphMessageId: input.graphMessageId,
      graphParentFolderId: input.graphParentFolderId ?? null,
      graphChangeKey: input.graphChangeKey ?? null,
      internetMessageId: input.internetMessageId ?? null,
      conversationId: input.conversationId ?? null,
      subject: input.subject,
      fromAddress: input.fromAddress ?? null,
      receivedAt: input.receivedAt ?? null,
      lastGraphModifiedAt: input.lastGraphModifiedAt ?? null,
      isRead: input.isRead,
      graphRemovedAt: input.graphRemovedAt ?? null,
      graphRemovalReason: input.graphRemovalReason ?? null
    }
  });
}

export async function markMailboxMessageRemoved(
  writer: MessageRemovalWriter,
  input: MarkMailboxMessageRemovedInput
) {
  return writer.message.updateMany({
    where: {
      mailboxId: input.mailboxId,
      graphMessageId: input.graphMessageId
    },
    data: {
      folderId: null,
      graphParentFolderId: null,
      graphRemovedAt: input.graphRemovedAt,
      graphRemovalReason: input.graphRemovalReason
    }
  });
}

function normalizeStringList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

export * from "@prisma/client";
