import crypto from "node:crypto";
import { createGraphConnector, type FetchLike, type GraphChangeType } from "@friendly-mail/graph";
import {
  GraphSubscriptionStatus,
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertGraphSubscription
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxSubscriptionEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
  MICROSOFT_WEBHOOK_BASE_URL: string;
};

type EnsureMailboxSubscriptionInput = {
  session: SessionView;
  mailboxId: string;
};

type EnsureMailboxSubscriptionResult = {
  mailboxId: string;
  operation: "created" | "renewed";
  subscription: {
    mailboxId: string;
    graphSubscriptionId: string;
    resource: string;
    changeTypes: GraphChangeType[];
    status: GraphSubscriptionStatus;
    notificationUrl: string;
    lifecycleNotificationUrl?: string;
    expiresAt: string;
  };
};

type HandleWebhookNotificationsInput = {
  kind: "change" | "lifecycle";
  payload: unknown;
};

type HandleWebhookNotificationsResult = {
  acceptedNotifications: number;
  ignoredNotifications: number;
  queuedNotifications: number;
};

type MailboxNotificationQueueJob =
  | {
      kind: "graph_change_notification";
      mailboxId: string;
      graphSubscriptionId: string;
      receivedAt: string;
      tenantId?: string;
      changeType: string;
      resource?: string;
      resourceDataId?: string;
      subscriptionExpirationDateTime?: string;
    }
  | {
      kind: "graph_lifecycle_notification";
      mailboxId: string;
      graphSubscriptionId: string;
      receivedAt: string;
      tenantId?: string;
      lifecycleEvent: string;
      subscriptionExpirationDateTime?: string;
    };

type MailboxNotificationQueue = {
  add(name: string, data: MailboxNotificationQueueJob): Promise<unknown>;
};

export type MailboxSubscriptionService = {
  ensureMailboxSubscription(
    input: EnsureMailboxSubscriptionInput
  ): Promise<EnsureMailboxSubscriptionResult>;
  handleWebhookNotifications(
    input: HandleWebhookNotificationsInput
  ): Promise<HandleWebhookNotificationsResult>;
};

export type CreatePrismaMailboxSubscriptionServiceInput = {
  prisma: PrismaClient;
  env: MailboxSubscriptionEnv;
  logger: Logger;
  notificationQueue: MailboxNotificationQueue;
  fetch?: FetchLike;
  now?: () => Date;
};

const OUTLOOK_MESSAGE_CHANGE_TYPES: GraphChangeType[] = ["created", "updated", "deleted"];
const OUTLOOK_SUBSCRIPTION_LIFETIME_MINUTES = 10020;

export function createPrismaMailboxSubscriptionService(
  input: CreatePrismaMailboxSubscriptionServiceInput
): MailboxSubscriptionService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async ensureMailboxSubscription(subscriptionInput) {
      const currentTime = now();
      const mailbox = await getOwnedActiveMailbox(input.prisma, subscriptionInput);
      const accessToken = decryptMicrosoftToken(
        mailbox.connection.accessTokenCiphertext,
        input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
      );
      const graph = createGraphConnector({
        tokenProvider: async () => accessToken,
        fetch: fetchImpl,
        logger: input.logger.child({
          integration: "microsoft-graph",
          mailboxId: mailbox.id
        })
      });
      const existingSubscription = await input.prisma.graphSubscription.findFirst({
        where: {
          mailboxId: mailbox.id
        },
        orderBy: {
          updatedAt: "desc"
        }
      });

      const notificationUrl = buildWebhookUrl(
        input.env.MICROSOFT_WEBHOOK_BASE_URL,
        "/webhooks/microsoft/graph/notifications"
      );
      const lifecycleNotificationUrl = buildWebhookUrl(
        input.env.MICROSOFT_WEBHOOK_BASE_URL,
        "/webhooks/microsoft/graph/lifecycle"
      );
      const expirationDateTime = createSubscriptionExpiration(currentTime);

      if (
        existingSubscription &&
        (existingSubscription.status === "ACTIVE" ||
          existingSubscription.status === "REAUTH_REQUIRED")
      ) {
        const renewedSubscription = await graph.renewSubscription({
          subscriptionId: existingSubscription.graphSubscriptionId,
          expirationDateTime
        });

        await upsertGraphSubscription(
          {
            graphSubscription: input.prisma.graphSubscription
          },
          {
            mailboxId: mailbox.id,
            graphSubscriptionId: renewedSubscription.id,
            resource: renewedSubscription.resource,
            changeTypes: renewedSubscription.changeTypes,
            notificationUrl: renewedSubscription.notificationUrl,
            lifecycleNotificationUrl: renewedSubscription.lifecycleNotificationUrl,
            clientStateHash: existingSubscription.clientStateHash ?? undefined,
            status: "ACTIVE",
            expiresAt: parseRequiredDate(
              renewedSubscription.expirationDateTime,
              "GRAPH_SUBSCRIPTION_INVALID_EXPIRY"
            ),
            lastValidatedAt: currentTime,
            lastReauthorizedAt: currentTime,
            lastErrorCode: undefined,
            lastErrorAt: undefined
          }
        );

        input.logger.info("Renewed Microsoft Graph subscription", {
          mailboxId: mailbox.id,
          graphSubscriptionId: renewedSubscription.id
        });

        return {
          mailboxId: mailbox.id,
          operation: "renewed",
          subscription: {
            mailboxId: mailbox.id,
            graphSubscriptionId: renewedSubscription.id,
            resource: renewedSubscription.resource,
            changeTypes: renewedSubscription.changeTypes,
            status: GraphSubscriptionStatus.Active,
            notificationUrl: renewedSubscription.notificationUrl,
            lifecycleNotificationUrl: renewedSubscription.lifecycleNotificationUrl,
            expiresAt: renewedSubscription.expirationDateTime
          }
        };
      }

      const clientState = crypto.randomBytes(24).toString("base64url");
      const createdSubscription = await graph.createMessageSubscription({
        userId: mailbox.connection.graphUserId,
        changeTypes: OUTLOOK_MESSAGE_CHANGE_TYPES,
        notificationUrl,
        lifecycleNotificationUrl,
        expirationDateTime,
        clientState
      });

      await upsertGraphSubscription(
        {
          graphSubscription: input.prisma.graphSubscription
        },
        {
          mailboxId: mailbox.id,
          graphSubscriptionId: createdSubscription.id,
          resource: createdSubscription.resource,
          changeTypes: createdSubscription.changeTypes,
          notificationUrl: createdSubscription.notificationUrl,
          lifecycleNotificationUrl: createdSubscription.lifecycleNotificationUrl,
          clientStateHash: hashClientState(clientState),
          status: "ACTIVE",
          expiresAt: parseRequiredDate(
            createdSubscription.expirationDateTime,
            "GRAPH_SUBSCRIPTION_INVALID_EXPIRY"
          ),
          lastValidatedAt: currentTime,
          lastErrorCode: undefined,
          lastErrorAt: undefined
        }
      );

      input.logger.info("Created Microsoft Graph subscription", {
        mailboxId: mailbox.id,
        graphSubscriptionId: createdSubscription.id
      });

      return {
        mailboxId: mailbox.id,
        operation: "created",
        subscription: {
          mailboxId: mailbox.id,
          graphSubscriptionId: createdSubscription.id,
          resource: createdSubscription.resource,
          changeTypes: createdSubscription.changeTypes,
          status: GraphSubscriptionStatus.Active,
          notificationUrl: createdSubscription.notificationUrl,
          lifecycleNotificationUrl: createdSubscription.lifecycleNotificationUrl,
          expiresAt: createdSubscription.expirationDateTime
        }
      };
    },

    async handleWebhookNotifications(notificationInput) {
      const currentTime = now();
      const payload = asRecord(notificationInput.payload);
      const values = Array.isArray(payload.value) ? payload.value : [];
      let acceptedNotifications = 0;
      let ignoredNotifications = 0;
      let queuedNotifications = 0;

      for (const item of values) {
        const notification = asRecord(item);
        const subscriptionId = asOptionalString(notification.subscriptionId);
        if (!subscriptionId) {
          ignoredNotifications += 1;
          continue;
        }

        const storedSubscription = await input.prisma.graphSubscription.findUnique({
          where: {
            graphSubscriptionId: subscriptionId
          }
        });

        if (!storedSubscription) {
          ignoredNotifications += 1;
          input.logger.warn("Ignoring Graph webhook for an unknown subscription", {
            graphSubscriptionId: subscriptionId,
            kind: notificationInput.kind
          });
          continue;
        }

        const clientState = asOptionalString(notification.clientState);
        if (
          storedSubscription.clientStateHash &&
          (!clientState || hashClientState(clientState) !== storedSubscription.clientStateHash)
        ) {
          ignoredNotifications += 1;
          input.logger.warn("Ignoring Graph webhook with invalid client state", {
            graphSubscriptionId: subscriptionId,
            kind: notificationInput.kind
          });
          continue;
        }

        const subscriptionExpirationDateTime = asOptionalString(
          notification.subscriptionExpirationDateTime
        );
        const expiresAt = parseOptionalDate(subscriptionExpirationDateTime);

        if (notificationInput.kind === "change") {
          const changeType = asOptionalString(notification.changeType);
          if (!changeType) {
            ignoredNotifications += 1;
            continue;
          }

          acceptedNotifications += 1;
          await input.prisma.graphSubscription.update({
            where: {
              graphSubscriptionId: subscriptionId
            },
            data: {
              status: "ACTIVE",
              expiresAt: expiresAt ?? undefined,
              lastNotificationAt: currentTime,
              lastErrorCode: null,
              lastErrorAt: null
            }
          });
          await input.notificationQueue.add(
            `${storedSubscription.mailboxId}:${subscriptionId}:change:${changeType}`,
            {
              kind: "graph_change_notification",
              mailboxId: storedSubscription.mailboxId,
              graphSubscriptionId: subscriptionId,
              receivedAt: currentTime.toISOString(),
              tenantId: asOptionalString(notification.tenantId),
              changeType,
              resource: asOptionalString(notification.resource),
              resourceDataId: asOptionalString(asRecord(notification.resourceData).id),
              subscriptionExpirationDateTime
            }
          );
          queuedNotifications += 1;
          continue;
        }

        const lifecycleEvent = asOptionalString(notification.lifecycleEvent);
        if (!lifecycleEvent) {
          ignoredNotifications += 1;
          continue;
        }

        acceptedNotifications += 1;
        await input.prisma.graphSubscription.update({
          where: {
            graphSubscriptionId: subscriptionId
          },
          data: {
            status: mapLifecycleStatus(lifecycleEvent),
            expiresAt: expiresAt ?? undefined,
            lastLifecycleEventAt: currentTime,
            lastErrorCode: mapLifecycleErrorCode(lifecycleEvent),
            lastErrorAt: currentTime
          }
        });
        await input.notificationQueue.add(
          `${storedSubscription.mailboxId}:${subscriptionId}:lifecycle:${lifecycleEvent}`,
          {
            kind: "graph_lifecycle_notification",
            mailboxId: storedSubscription.mailboxId,
            graphSubscriptionId: subscriptionId,
            receivedAt: currentTime.toISOString(),
            tenantId: asOptionalString(notification.tenantId),
            lifecycleEvent,
            subscriptionExpirationDateTime
          }
        );
        queuedNotifications += 1;
      }

      input.logger.info("Processed Graph webhook notifications", {
        kind: notificationInput.kind,
        acceptedNotifications,
        ignoredNotifications,
        queuedNotifications
      });

      return {
        acceptedNotifications,
        ignoredNotifications,
        queuedNotifications
      };
    }
  };
}

async function getOwnedActiveMailbox(
  prisma: PrismaClient,
  input: EnsureMailboxSubscriptionInput
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

  if (mailbox.connection.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
    throw new AppError(
      "MAILBOX_CONNECTION_INACTIVE",
      "Mailbox connection is not active for subscription management.",
      {
        statusCode: 409
      }
    );
  }

  return mailbox as typeof mailbox & {
    connection: NonNullable<typeof mailbox.connection> & {
      accessTokenCiphertext: string;
    };
  };
}

function buildWebhookUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function createSubscriptionExpiration(currentTime: Date) {
  return new Date(
    currentTime.getTime() + OUTLOOK_SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000
  ).toISOString();
}

function hashClientState(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function mapLifecycleStatus(lifecycleEvent: string): "ACTIVE" | "REAUTH_REQUIRED" | "REMOVED" {
  if (lifecycleEvent === "reauthorizationRequired") {
    return "REAUTH_REQUIRED";
  }

  if (lifecycleEvent === "subscriptionRemoved") {
    return "REMOVED";
  }

  return "ACTIVE";
}

function mapLifecycleErrorCode(lifecycleEvent: string) {
  if (lifecycleEvent === "reauthorizationRequired") {
    return "GRAPH_SUBSCRIPTION_REAUTH_REQUIRED";
  }

  if (lifecycleEvent === "subscriptionRemoved") {
    return "GRAPH_SUBSCRIPTION_REMOVED";
  }

  if (lifecycleEvent === "missed") {
    return "GRAPH_SUBSCRIPTION_NOTIFICATIONS_MISSED";
  }

  return "GRAPH_SUBSCRIPTION_LIFECYCLE_EVENT";
}

function parseRequiredDate(value: string, code: string) {
  const parsed = parseOptionalDate(value);
  if (!parsed) {
    throw new AppError(code, "Microsoft Graph returned an invalid subscription expiration.", {
      statusCode: 502
    });
  }

  return parsed;
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
