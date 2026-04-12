import { createGraphConnector, type FetchLike } from "@friendly-mail/graph";
import {
  FolderSyncStatus,
  GraphSubscriptionStatus,
  OperationalHealthStatus,
  SharedMailboxReadinessStatus,
  VerificationCheckStatus,
  type MailboxOperationalVerificationReport,
  type SessionView,
  type SharedMailboxReadinessReport,
  type VerificationCheck
} from "@friendly-mail/contracts";
import { type PrismaClient } from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxReadinessEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type CheckSharedMailboxReadinessInput = {
  session: SessionView;
  mailboxId: string;
  sharedMailboxAddress: string;
};

type GetMailboxOperationalVerificationInput = {
  session: SessionView;
  mailboxId: string;
};

export type MailboxReadinessService = {
  checkSharedMailboxReadiness(
    input: CheckSharedMailboxReadinessInput
  ): Promise<SharedMailboxReadinessReport>;
  getMailboxOperationalVerification(
    input: GetMailboxOperationalVerificationInput
  ): Promise<MailboxOperationalVerificationReport>;
};

export type CreatePrismaMailboxReadinessServiceInput = {
  prisma: PrismaClient;
  env: MailboxReadinessEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

const SHARED_MAILBOX_REQUIRED_SCOPES = ["Mail.Read.Shared", "Mail.ReadWrite.Shared"];
const SUBSCRIPTION_EXPIRY_WARNING_MINUTES = 24 * 60;
const SUBSCRIPTION_EXPIRY_CRITICAL_MINUTES = 60;
const DELTA_CURSOR_STALE_MINUTES = 60;

export function createPrismaMailboxReadinessService(
  input: CreatePrismaMailboxReadinessServiceInput
): MailboxReadinessService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async checkSharedMailboxReadiness(readinessInput) {
      const checkedAt = now();
      const mailbox = await getOwnedActiveMailbox(input.prisma, readinessInput);
      const sharedMailboxAddress = normalizeMailboxAddress(readinessInput.sharedMailboxAddress);
      const grantedScopes = [...mailbox.connection.grantedScopes].sort();
      const hasSharedDelegatedScope = grantedScopes.some((scope) =>
        SHARED_MAILBOX_REQUIRED_SCOPES.includes(scope)
      );
      const checks: VerificationCheck[] = [];
      let delegatedSharedFolderRead = false;

      if (!hasSharedDelegatedScope) {
        checks.push({
          code: "shared_scope_present",
          status: VerificationCheckStatus.Fail,
          detail:
            "Shared mailbox delegated read scopes are missing. Friendly Mail needs Mail.Read.Shared or Mail.ReadWrite.Shared before it can probe delegated shared-mailbox access."
        });
      } else {
        checks.push({
          code: "shared_scope_present",
          status: VerificationCheckStatus.Pass,
          detail:
            "Delegated shared-mailbox scopes are present, so Friendly Mail can probe shared-folder read access."
        });

        const graph = createGraphConnector({
          tokenProvider: async () =>
            decryptMicrosoftToken(
              mailbox.connection.accessTokenCiphertext,
              input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
            ),
          fetch: fetchImpl,
          logger: input.logger.child({
            integration: "microsoft-graph",
            mailboxId: mailbox.id,
            sharedMailboxAddress
          })
        });

        try {
          const page = await graph.listMailFolders({
            userId: sharedMailboxAddress,
            top: 1
          });

          delegatedSharedFolderRead = page.items.length > 0;
          checks.push({
            code: "shared_folder_access",
            status: delegatedSharedFolderRead
              ? VerificationCheckStatus.Pass
              : VerificationCheckStatus.Fail,
            detail: delegatedSharedFolderRead
              ? "Friendly Mail can read at least one shared mailbox folder with the delegated token."
              : "Microsoft Graph did not return any readable folders for the shared mailbox probe."
          });
        } catch (error) {
          const appError = error instanceof AppError ? error : undefined;
          checks.push({
            code: "shared_folder_access",
            status: VerificationCheckStatus.Fail,
            detail:
              appError?.message ??
              "Friendly Mail could not verify delegated access to the shared mailbox."
          });
        }
      }

      checks.push({
        code: "webhook_subscription_support",
        status: VerificationCheckStatus.Fail,
        detail:
          "Delegated shared-mailbox scopes are not enough for webhook-backed shared mailbox eventing. Friendly Mail keeps shared mailboxes in recommendation-only mode until an application-permission path is added."
      });

      const status =
        hasSharedDelegatedScope && delegatedSharedFolderRead
          ? SharedMailboxReadinessStatus.Limited
          : SharedMailboxReadinessStatus.Unsupported;
      const fallbackMode =
        status === SharedMailboxReadinessStatus.Limited
          ? "recommendation_only"
          : "unsupported";

      return {
        sourceMailboxId: mailbox.id,
        sharedMailboxAddress,
        checkedAt: checkedAt.toISOString(),
        status,
        fallbackMode,
        grantedScopes,
        requiredScopes: [...SHARED_MAILBOX_REQUIRED_SCOPES],
        capabilities: {
          delegatedSharedFolderRead,
          webhookBackedSync: false,
          backgroundDeltaRepair: false,
          sendWorkflowActions: false
        },
        checks
      };
    },

    async getMailboxOperationalVerification(verificationInput) {
      const checkedAt = now();
      const mailbox = await getOwnedActiveMailbox(input.prisma, verificationInput);
      const subscription = await input.prisma.graphSubscription.findFirst({
        where: {
          mailboxId: mailbox.id
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
      const folders = await input.prisma.folder.findMany({
        where: {
          mailboxId: mailbox.id,
          isSyncEnabled: true
        },
        include: {
          syncState: true
        },
        orderBy: {
          id: "asc"
        }
      });

      const subscriptionHealth = buildSubscriptionHealth(subscription, checkedAt);
      const deltaSync = buildDeltaSyncHealth(folders, checkedAt);
      const immutableIds = {
        status: "enforced" as const,
        messageReads: true,
        messageLists: true,
        deltaQueries: true,
        subscriptionCreation: true
      };
      const checks: VerificationCheck[] = [
        {
          code: "subscription_health",
          status:
            subscriptionHealth.health === OperationalHealthStatus.Critical
              ? VerificationCheckStatus.Fail
              : subscriptionHealth.health === OperationalHealthStatus.Warning
                ? VerificationCheckStatus.Warn
                : VerificationCheckStatus.Pass,
          detail: describeSubscriptionHealth(subscriptionHealth)
        },
        {
          code: "delta_cursor_health",
          status:
            deltaSync.failedFolders > 0
              ? VerificationCheckStatus.Fail
              : deltaSync.staleFolders > 0 || deltaSync.missingCursorFolders > 0
                ? VerificationCheckStatus.Warn
                : VerificationCheckStatus.Pass,
          detail: describeDeltaSyncHealth(deltaSync)
        },
        {
          code: "immutable_ids_enforced",
          status: VerificationCheckStatus.Pass,
          detail:
            "The Graph connector enforces immutable IDs on supported message reads, list calls, delta queries, and subscription creation."
        }
      ];

      return {
        mailboxId: mailbox.id,
        checkedAt: checkedAt.toISOString(),
        overallStatus: deriveOverallStatus(checks),
        subscription: subscriptionHealth,
        deltaSync,
        immutableIds,
        checks
      };
    }
  };
}

async function getOwnedActiveMailbox(
  prisma: PrismaClient,
  input: {
    session: SessionView;
    mailboxId: string;
  }
) {
  const mailbox = await prisma.mailbox.findFirst({
    where: {
      id: input.mailboxId,
      tenantId: input.session.principal.tenantId
    },
    include: {
      connection: true
    }
  });

  if (!mailbox) {
    throw new AppError("MAILBOX_NOT_FOUND", "Mailbox not found.", {
      statusCode: 404
    });
  }

  if (!mailbox.connection || mailbox.connection.userId !== input.session.principal.userId) {
    throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
      statusCode: 403
    });
  }

  if (
    mailbox.connection.status !== "ACTIVE" ||
    !mailbox.connection.accessTokenCiphertext
  ) {
    throw new AppError(
      "MAILBOX_CONNECTION_INACTIVE",
      "Mailbox connection is not active for readiness checks.",
      {
        statusCode: 409
      }
    );
  }

  return mailbox as typeof mailbox & {
    connection: NonNullable<typeof mailbox.connection> & {
      accessTokenCiphertext: string;
      grantedScopes: string[];
    };
  };
}

function buildSubscriptionHealth(
  subscription:
    | {
        graphSubscriptionId: string;
        status: string;
        expiresAt: Date;
        lastNotificationAt: Date | null;
        lastLifecycleEventAt: Date | null;
        lastErrorCode: string | null;
      }
    | null,
  checkedAt: Date
) {
  if (!subscription) {
    return {
      status: "missing" as const,
      health: OperationalHealthStatus.Critical
    };
  }

  const minutesUntilExpiry = getMinutesDifference(subscription.expiresAt, checkedAt);
  const normalizedStatus = normalizeGraphSubscriptionStatus(subscription.status);
  const health = deriveSubscriptionHealth(normalizedStatus, minutesUntilExpiry);

  return {
    graphSubscriptionId: subscription.graphSubscriptionId,
    status: normalizedStatus,
    health,
    expiresAt: subscription.expiresAt.toISOString(),
    minutesUntilExpiry,
    lastNotificationAt: subscription.lastNotificationAt?.toISOString(),
    lastLifecycleEventAt: subscription.lastLifecycleEventAt?.toISOString(),
    lastErrorCode: subscription.lastErrorCode ?? undefined
  };
}

function buildDeltaSyncHealth(
  folders: Array<{
    id: string;
    displayName: string;
    syncState: {
      syncStatus: string;
      lastSyncedAt: Date | null;
      lastCursorUpdatedAt: Date | null;
      lastErrorCode: string | null;
    } | null;
  }>,
  checkedAt: Date
) {
  const reports = folders.map((folder) => {
    const lastCursorUpdatedAt = folder.syncState?.lastCursorUpdatedAt ?? undefined;
    const cursorLagMinutes = lastCursorUpdatedAt
      ? getMinutesDifference(checkedAt, lastCursorUpdatedAt)
      : undefined;
    const normalizedStatus = normalizeFolderSyncStatus(folder.syncState?.syncStatus);

    return {
      folderId: folder.id,
      displayName: folder.displayName,
      status: normalizedStatus,
      lastSyncedAt: folder.syncState?.lastSyncedAt?.toISOString(),
      lastCursorUpdatedAt: lastCursorUpdatedAt?.toISOString(),
      cursorLagMinutes,
      lastErrorCode: folder.syncState?.lastErrorCode ?? undefined
    };
  });
  const failedFolders = reports.filter((folder) => folder.status === FolderSyncStatus.Failed).length;
  const missingCursorFolders = reports.filter((folder) => folder.status === "missing").length;
  const staleFolders = reports.filter((folder) => {
    if (folder.status === "missing") {
      return true;
    }

    return (folder.cursorLagMinutes ?? 0) >= DELTA_CURSOR_STALE_MINUTES;
  }).length;
  const healthyFolders = reports.filter(
    (folder) =>
      folder.status !== "missing" &&
      folder.status !== FolderSyncStatus.Failed &&
      (folder.cursorLagMinutes ?? 0) < DELTA_CURSOR_STALE_MINUTES
  ).length;

  return {
    trackedFolders: reports.length,
    healthyFolders,
    staleFolders,
    failedFolders,
    missingCursorFolders,
    maxCursorLagMinutes: Math.max(0, ...reports.map((folder) => folder.cursorLagMinutes ?? 0)),
    folders: reports
  };
}

function normalizeMailboxAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new AppError(
      "INVALID_SHARED_MAILBOX_ADDRESS",
      "Shared mailbox address must be provided.",
      {
        statusCode: 400
      }
    );
  }

  return normalized;
}

function normalizeGraphSubscriptionStatus(value: string): GraphSubscriptionStatus {
  switch (value) {
    case "PENDING":
      return GraphSubscriptionStatus.Pending;
    case "ACTIVE":
      return GraphSubscriptionStatus.Active;
    case "EXPIRED":
      return GraphSubscriptionStatus.Expired;
    case "REMOVED":
      return GraphSubscriptionStatus.Removed;
    case "REAUTH_REQUIRED":
      return GraphSubscriptionStatus.ReauthRequired;
    case "FAILED":
      return GraphSubscriptionStatus.Failed;
    default:
      return GraphSubscriptionStatus.Failed;
  }
}

function normalizeFolderSyncStatus(value: string | undefined) {
  switch (value) {
    case "PENDING":
      return FolderSyncStatus.Pending;
    case "ACTIVE":
      return FolderSyncStatus.Active;
    case "IDLE":
      return FolderSyncStatus.Idle;
    case "FAILED":
      return FolderSyncStatus.Failed;
    default:
      return "missing" as const;
  }
}

function deriveSubscriptionHealth(
  status: GraphSubscriptionStatus,
  minutesUntilExpiry: number
) {
  if (
    status === GraphSubscriptionStatus.Failed ||
    status === GraphSubscriptionStatus.Removed ||
    status === GraphSubscriptionStatus.Expired ||
    status === GraphSubscriptionStatus.ReauthRequired
  ) {
    return OperationalHealthStatus.Critical;
  }

  if (minutesUntilExpiry <= SUBSCRIPTION_EXPIRY_CRITICAL_MINUTES) {
    return OperationalHealthStatus.Critical;
  }

  if (minutesUntilExpiry <= SUBSCRIPTION_EXPIRY_WARNING_MINUTES) {
    return OperationalHealthStatus.Warning;
  }

  return OperationalHealthStatus.Healthy;
}

function deriveOverallStatus(checks: VerificationCheck[]) {
  if (checks.some((check) => check.status === VerificationCheckStatus.Fail)) {
    return OperationalHealthStatus.Critical;
  }

  if (checks.some((check) => check.status === VerificationCheckStatus.Warn)) {
    return OperationalHealthStatus.Warning;
  }

  return OperationalHealthStatus.Healthy;
}

function describeSubscriptionHealth(subscription: {
  status: GraphSubscriptionStatus | "missing";
  health: OperationalHealthStatus;
  minutesUntilExpiry?: number;
  lastErrorCode?: string;
}) {
  if (subscription.status === "missing") {
    return "No Graph subscription is stored for this mailbox.";
  }

  if (subscription.health === OperationalHealthStatus.Critical) {
    if (subscription.lastErrorCode) {
      return `Graph subscription needs attention: ${subscription.lastErrorCode}.`;
    }

    return `Graph subscription is ${subscription.status} and expires in ${subscription.minutesUntilExpiry ?? 0} minutes.`;
  }

  if (subscription.health === OperationalHealthStatus.Warning) {
    return `Graph subscription is active but expires in ${subscription.minutesUntilExpiry ?? 0} minutes.`;
  }

  return "Graph subscription health looks stable.";
}

function describeDeltaSyncHealth(deltaSync: {
  trackedFolders: number;
  staleFolders: number;
  failedFolders: number;
  missingCursorFolders: number;
  maxCursorLagMinutes: number;
}) {
  if (!deltaSync.trackedFolders) {
    return "No sync-enabled folders are configured for this mailbox yet.";
  }

  if (deltaSync.failedFolders > 0) {
    return `${deltaSync.failedFolders} tracked folders have failed delta sync state.`;
  }

  if (deltaSync.staleFolders > 0 || deltaSync.missingCursorFolders > 0) {
    return `${deltaSync.staleFolders} tracked folders are stale and the max cursor lag is ${deltaSync.maxCursorLagMinutes} minutes.`;
  }

  return "Tracked folder cursors are current.";
}

function getMinutesDifference(later: Date, earlier: Date) {
  return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000));
}
