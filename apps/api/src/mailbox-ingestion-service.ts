import {
  createGraphConnector,
  type FetchLike,
  type GraphEmailAddress,
  type GraphMessageDetail
} from "@friendly-mail/graph";
import { type SessionView } from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertMailboxMessage,
  upsertMailboxMessageContent
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxIngestionEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type IngestMessageInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

export type NormalizedMailboxMessageEnvelope = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  graphChangeKey: string;
  internetMessageId?: string;
  conversationId?: string;
  parentFolderId?: string;
  subject: string;
  from?: GraphEmailAddress;
  sender?: GraphEmailAddress;
  replyTo: GraphEmailAddress[];
  toRecipients: GraphEmailAddress[];
  ccRecipients: GraphEmailAddress[];
  bccRecipients: GraphEmailAddress[];
  receivedDateTime?: string;
  sentDateTime?: string;
  lastModifiedDateTime?: string;
  isRead: boolean;
  isDraft: boolean;
  categories: string[];
  importance?: string;
  inferenceClassification?: string;
  bodyPreview?: string;
  bodyContentType: "text";
  bodyText?: string;
  uniqueBodyText?: string;
  hasAttachments: boolean;
  webLink?: string;
  ingestionVersionKey: string;
};

type IngestMessageResult = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  hasAttachments: boolean;
  ingestionVersionKey: string;
  ingestedAt: string;
  envelope: NormalizedMailboxMessageEnvelope;
};

export type MailboxIngestionService = {
  ingestMessage(input: IngestMessageInput): Promise<IngestMessageResult>;
};

export type CreatePrismaMailboxIngestionServiceInput = {
  prisma: PrismaClient;
  env: MailboxIngestionEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

export function createPrismaMailboxIngestionService(
  input: CreatePrismaMailboxIngestionServiceInput
): MailboxIngestionService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async ingestMessage(ingestInput) {
      const ingestedAt = now();
      const mailbox = await input.prisma.mailbox.findFirst({
        where: {
          id: ingestInput.mailboxId,
          tenantId: ingestInput.session.principal.tenantId
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

      if (!mailbox.connection || mailbox.connection.userId !== ingestInput.session.principal.userId) {
        throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
          statusCode: 403
        });
      }

      if (mailbox.connection.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
        throw new AppError(
          "MAILBOX_CONNECTION_INACTIVE",
          "Mailbox connection is not active for message ingestion.",
          {
            statusCode: 409
          }
        );
      }

      const message = await input.prisma.message.findFirst({
        where: {
          id: ingestInput.messageId,
          mailboxId: mailbox.id
        }
      });

      if (!message) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      const accessToken = decryptMicrosoftToken(
        mailbox.connection.accessTokenCiphertext,
        input.env.MICROSOFT_TOKEN_ENCRYPTION_KEY
      );
      const graph = createGraphConnector({
        tokenProvider: async () => accessToken,
        fetch: fetchImpl,
        logger: input.logger.child({
          integration: "microsoft-graph",
          mailboxId: mailbox.id,
          messageId: message.id
        })
      });

      const detail = await graph.getMessageDetail({
        messageId: message.graphMessageId
      });

      const envelope = toMessageEnvelope({
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        fallbackParentFolderId: message.graphParentFolderId ?? undefined,
        detail
      });

      await upsertMailboxMessage(
        {
          message: input.prisma.message
        },
        {
          mailboxId: mailbox.id,
          folderId: message.folderId ?? undefined,
          graphMessageId: message.graphMessageId,
          graphParentFolderId: envelope.parentFolderId,
          graphChangeKey: envelope.graphChangeKey,
          internetMessageId: envelope.internetMessageId,
          conversationId: envelope.conversationId,
          subject: envelope.subject,
          fromAddress: envelope.from?.address ?? envelope.sender?.address,
          receivedAt: parseOptionalDate(envelope.receivedDateTime),
          lastGraphModifiedAt: parseOptionalDate(envelope.lastModifiedDateTime),
          isRead: envelope.isRead
        }
      );

      const updateResult = (await upsertMailboxMessageContent(
        {
          message: input.prisma.message
        },
        {
          mailboxId: mailbox.id,
          graphMessageId: message.graphMessageId,
          bodyPreview: envelope.bodyPreview,
          bodyContentType: "TEXT",
          bodyText: envelope.bodyText,
          uniqueBodyText: envelope.uniqueBodyText,
          webLink: envelope.webLink,
          hasAttachments: envelope.hasAttachments,
          ingestionVersionKey: envelope.ingestionVersionKey,
          ingestedAt
        }
      )) as { count?: number };

      if ((updateResult.count ?? 0) < 1) {
        throw new AppError(
          "MAILBOX_MESSAGE_NOT_FOUND",
          "Tracked mailbox message could not be updated for ingestion.",
          {
            statusCode: 404
          }
        );
      }

      input.logger.info("Ingested mailbox message into normalized content", {
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        tenantId: mailbox.tenantId,
        userId: ingestInput.session.principal.userId,
        ingestionVersionKey: envelope.ingestionVersionKey,
        hasAttachments: envelope.hasAttachments
      });

      return {
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        hasAttachments: envelope.hasAttachments,
        ingestionVersionKey: envelope.ingestionVersionKey,
        ingestedAt: ingestedAt.toISOString(),
        envelope
      };
    }
  };
}

function toMessageEnvelope(input: {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  fallbackParentFolderId?: string;
  detail: GraphMessageDetail;
}): NormalizedMailboxMessageEnvelope {
  const graphChangeKey = input.detail.changeKey?.trim();
  if (!graphChangeKey) {
    throw new AppError(
      "GRAPH_MESSAGE_CHANGE_KEY_MISSING",
      "Microsoft Graph message detail is missing a change key for ingestion.",
      {
        statusCode: 502
      }
    );
  }

  const normalizedBody = normalizeBodyContent(input.detail.body);
  const normalizedUniqueBody = normalizeBodyContent(input.detail.uniqueBody);
  const bodyPreview = normalizeInlineText(input.detail.bodyPreview);

  return {
    mailboxId: input.mailboxId,
    messageId: input.messageId,
    graphMessageId: input.graphMessageId,
    graphChangeKey,
    internetMessageId: normalizeInlineText(input.detail.internetMessageId),
    conversationId: normalizeInlineText(input.detail.conversationId),
    parentFolderId:
      normalizeInlineText(input.detail.parentFolderId) ?? input.fallbackParentFolderId,
    subject: normalizeInlineText(input.detail.subject) ?? "",
    from: input.detail.from,
    sender: input.detail.sender,
    replyTo: input.detail.replyTo,
    toRecipients: input.detail.toRecipients,
    ccRecipients: input.detail.ccRecipients,
    bccRecipients: input.detail.bccRecipients,
    receivedDateTime: input.detail.receivedDateTime,
    sentDateTime: input.detail.sentDateTime,
    lastModifiedDateTime: input.detail.lastModifiedDateTime,
    isRead: input.detail.isRead,
    isDraft: input.detail.isDraft,
    categories: input.detail.categories,
    importance: normalizeInlineText(input.detail.importance),
    inferenceClassification: normalizeInlineText(input.detail.inferenceClassification),
    bodyPreview,
    bodyContentType: "text",
    bodyText: normalizedBody,
    uniqueBodyText: normalizedUniqueBody,
    hasAttachments: input.detail.hasAttachments,
    webLink: normalizeInlineText(input.detail.webLink),
    ingestionVersionKey: buildIngestionVersionKey(input.mailboxId, input.graphMessageId, graphChangeKey)
  };
}

function normalizeBodyContent(body: GraphMessageDetail["body"]) {
  if (!body) {
    return undefined;
  }

  if (body.contentType !== "text") {
    throw new AppError(
      "GRAPH_MESSAGE_BODY_UNEXPECTED_TYPE",
      "Microsoft Graph message ingestion expected a text body response.",
      {
        statusCode: 502
      }
    );
  }

  return normalizeMultilineText(body.content);
}

function normalizeInlineText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMultilineText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildIngestionVersionKey(mailboxId: string, graphMessageId: string, graphChangeKey: string) {
  return `${mailboxId}:${graphMessageId}:${graphChangeKey}`;
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
