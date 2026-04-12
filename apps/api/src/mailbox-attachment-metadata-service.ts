import {
  createGraphConnector,
  type FetchLike,
  type GraphAttachment
} from "@friendly-mail/graph";
import {
  AttachmentKind,
  ExtractionStatus,
  type SessionView
} from "@friendly-mail/contracts";
import {
  type PrismaClient,
  upsertMessageAttachment
} from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { decryptMicrosoftToken } from "./microsoft-token-crypto";

type MailboxAttachmentMetadataEnv = {
  MICROSOFT_TOKEN_ENCRYPTION_KEY: string;
};

type SyncMessageAttachmentsInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type SyncedMessageAttachment = {
  graphAttachmentId: string;
  name: string;
  contentType?: string;
  sizeInBytes: number;
  isInline: boolean;
  attachmentKind: AttachmentKind;
  lastModifiedDateTime?: string;
  isExtractionCandidate: boolean;
  extractionDecisionReason: string;
  extractionStatus:
    | ExtractionStatus.Pending
    | ExtractionStatus.Completed
    | ExtractionStatus.CompletedWithOcr
    | ExtractionStatus.Unsupported
    | ExtractionStatus.Failed;
};

type SyncMessageAttachmentsResult = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  ingestionVersionKey: string;
  attachmentCount: number;
  candidateCount: number;
  unsupportedCount: number;
  syncedAt: string;
  attachments: SyncedMessageAttachment[];
};

export type MailboxAttachmentMetadataService = {
  syncMessageAttachments(
    input: SyncMessageAttachmentsInput
  ): Promise<SyncMessageAttachmentsResult>;
};

export type CreatePrismaMailboxAttachmentMetadataServiceInput = {
  prisma: PrismaClient;
  env: MailboxAttachmentMetadataEnv;
  logger: Logger;
  fetch?: FetchLike;
  now?: () => Date;
};

export function createPrismaMailboxAttachmentMetadataService(
  input: CreatePrismaMailboxAttachmentMetadataServiceInput
): MailboxAttachmentMetadataService {
  const fetchImpl = input.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const now = input.now ?? (() => new Date());

  return {
    async syncMessageAttachments(syncInput) {
      const syncedAt = now();
      const mailbox = await input.prisma.mailbox.findFirst({
        where: {
          id: syncInput.mailboxId,
          tenantId: syncInput.session.principal.tenantId
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

      if (!mailbox.connection || mailbox.connection.userId !== syncInput.session.principal.userId) {
        throw new AppError("MAILBOX_ACCESS_DENIED", "Mailbox access denied.", {
          statusCode: 403
        });
      }

      if (mailbox.connection.status !== "ACTIVE" || !mailbox.connection.accessTokenCiphertext) {
        throw new AppError(
          "MAILBOX_CONNECTION_INACTIVE",
          "Mailbox connection is not active for attachment metadata synchronization.",
          {
            statusCode: 409
          }
        );
      }

      const message = await input.prisma.message.findFirst({
        where: {
          id: syncInput.messageId,
          mailboxId: mailbox.id
        }
      });

      if (!message) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      if (!message.ingestionVersionKey) {
        throw new AppError(
          "MAILBOX_MESSAGE_NOT_INGESTED",
          "Mailbox message must be ingested before attachment metadata can be synchronized.",
          {
            statusCode: 409
          }
        );
      }

      if (!message.hasAttachments) {
        return {
          mailboxId: mailbox.id,
          messageId: message.id,
          graphMessageId: message.graphMessageId,
          ingestionVersionKey: message.ingestionVersionKey,
          attachmentCount: 0,
          candidateCount: 0,
          unsupportedCount: 0,
          syncedAt: syncedAt.toISOString(),
          attachments: []
        };
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

      const attachments = await listAllMessageAttachments({
        graph,
        graphMessageId: message.graphMessageId
      });
      const existingAttachments =
        typeof input.prisma.messageAttachment.findMany === "function"
          ? (await input.prisma.messageAttachment.findMany({
              where: {
                mailboxId: mailbox.id,
                messageId: message.id,
                graphAttachmentId: {
                  in: attachments.map((attachment) => attachment.id)
                }
              }
            })) as ExistingAttachmentRecord[]
          : [];
      const existingAttachmentsByGraphId = new Map(
        existingAttachments.map((attachment) => [attachment.graphAttachmentId, attachment])
      );
      const syncedAttachments: SyncedMessageAttachment[] = [];
      let candidateCount = 0;
      let unsupportedCount = 0;

      for (const attachment of attachments) {
        const selection = decideAttachmentSelection(attachment);
        const extractionState = resolveExtractionState(
          selection,
          existingAttachmentsByGraphId.get(attachment.id)
        );

        if (selection.isExtractionCandidate) {
          candidateCount += 1;
        } else {
          unsupportedCount += 1;
        }

        await upsertMessageAttachment(
          {
            messageAttachment: input.prisma.messageAttachment
          },
          {
            mailboxId: mailbox.id,
            messageId: message.id,
            graphMessageId: message.graphMessageId,
            graphAttachmentId: attachment.id,
            name: attachment.name,
            contentType: attachment.contentType,
            sizeInBytes: attachment.size,
            isInline: attachment.isInline,
            attachmentKind: toDatabaseAttachmentKind(attachment.attachmentKind),
            lastGraphModifiedAt: parseOptionalDate(attachment.lastModifiedDateTime),
            isExtractionCandidate: selection.isExtractionCandidate,
            extractionDecisionReason: selection.extractionDecisionReason,
            extractionStatus: extractionState.databaseStatus,
            extractionAttempts: extractionState.extractionAttempts,
            lastExtractionAt: extractionState.lastExtractionAt,
            lastExtractionErrorCode: extractionState.lastExtractionErrorCode
          }
        );

        syncedAttachments.push({
          graphAttachmentId: attachment.id,
          name: attachment.name,
          contentType: attachment.contentType,
          sizeInBytes: attachment.size,
          isInline: attachment.isInline,
          attachmentKind: toContractAttachmentKind(attachment.attachmentKind),
          lastModifiedDateTime: attachment.lastModifiedDateTime,
          isExtractionCandidate: selection.isExtractionCandidate,
          extractionDecisionReason: selection.extractionDecisionReason,
          extractionStatus: extractionState.contractStatus
        });
      }

      input.logger.info("Synchronized mailbox attachment metadata", {
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        tenantId: mailbox.tenantId,
        userId: syncInput.session.principal.userId,
        attachmentCount: syncedAttachments.length,
        candidateCount,
        unsupportedCount
      });

      return {
        mailboxId: mailbox.id,
        messageId: message.id,
        graphMessageId: message.graphMessageId,
        ingestionVersionKey: message.ingestionVersionKey,
        attachmentCount: syncedAttachments.length,
        candidateCount,
        unsupportedCount,
        syncedAt: syncedAt.toISOString(),
        attachments: syncedAttachments
      };
    }
  };
}

type ExistingAttachmentRecord = {
  graphAttachmentId: string;
  extractionStatus: "NOT_ATTEMPTED" | "PENDING" | "COMPLETED" | "COMPLETED_WITH_OCR" | "UNSUPPORTED" | "FAILED";
  extractionAttempts: number;
  lastExtractionAt: Date | null;
  lastExtractionErrorCode: string | null;
};

type ResolvedExtractionState = {
  databaseStatus: "PENDING" | "COMPLETED" | "COMPLETED_WITH_OCR" | "UNSUPPORTED" | "FAILED";
  contractStatus:
    | ExtractionStatus.Pending
    | ExtractionStatus.Completed
    | ExtractionStatus.CompletedWithOcr
    | ExtractionStatus.Unsupported
    | ExtractionStatus.Failed;
  extractionAttempts?: number;
  lastExtractionAt?: Date;
  lastExtractionErrorCode?: string;
};

async function listAllMessageAttachments(input: {
  graph: ReturnType<typeof createGraphConnector>;
  graphMessageId: string;
}) {
  const attachments: GraphAttachment[] = [];
  let nextPageUrl: string | undefined;

  do {
    const page = await input.graph.listMessageAttachments({
      messageId: input.graphMessageId,
      pageUrl: nextPageUrl,
      top: nextPageUrl ? undefined : 50
    });

    attachments.push(...page.items);
    nextPageUrl = page.nextLink;
  } while (nextPageUrl);

  return attachments;
}

function decideAttachmentSelection(
  attachment: GraphAttachment
): Pick<
  SyncedMessageAttachment,
  "isExtractionCandidate" | "extractionDecisionReason" | "extractionStatus"
> {
  if (attachment.attachmentKind === "item") {
    return {
      isExtractionCandidate: false,
      extractionDecisionReason: "item_attachment_deferred",
      extractionStatus: ExtractionStatus.Unsupported
    };
  }

  if (attachment.attachmentKind === "reference") {
    return {
      isExtractionCandidate: false,
      extractionDecisionReason: "reference_attachment_deferred",
      extractionStatus: ExtractionStatus.Unsupported
    };
  }

  if (attachment.isInline) {
    return {
      isExtractionCandidate: false,
      extractionDecisionReason: "inline_attachment_skipped",
      extractionStatus: ExtractionStatus.Unsupported
    };
  }

  if (isPdfAttachment(attachment)) {
    return {
      isExtractionCandidate: true,
      extractionDecisionReason: "pdf_supported",
      extractionStatus: ExtractionStatus.Pending
    };
  }

  return {
    isExtractionCandidate: false,
    extractionDecisionReason: "file_type_unsupported",
    extractionStatus: ExtractionStatus.Unsupported
  };
}

function isPdfAttachment(attachment: GraphAttachment) {
  const normalizedContentType = attachment.contentType?.trim().toLowerCase() ?? "";
  const normalizedName = attachment.name.trim().toLowerCase();

  return normalizedContentType.includes("pdf") || normalizedName.endsWith(".pdf");
}

function toDatabaseAttachmentKind(kind: GraphAttachment["attachmentKind"]) {
  switch (kind) {
    case "file":
      return "FILE";
    case "item":
      return "ITEM";
    case "reference":
      return "REFERENCE";
  }
}

function toContractAttachmentKind(kind: GraphAttachment["attachmentKind"]) {
  switch (kind) {
    case "file":
      return AttachmentKind.File;
    case "item":
      return AttachmentKind.Item;
    case "reference":
      return AttachmentKind.Reference;
  }
}

function resolveExtractionState(
  selection: Pick<
    SyncedMessageAttachment,
    "isExtractionCandidate" | "extractionDecisionReason" | "extractionStatus"
  >,
  existing: ExistingAttachmentRecord | undefined
): ResolvedExtractionState {
  if (!selection.isExtractionCandidate) {
    return {
      databaseStatus: "UNSUPPORTED" as const,
      contractStatus: ExtractionStatus.Unsupported,
      extractionAttempts: existing?.extractionAttempts,
      lastExtractionAt: existing?.lastExtractionAt ?? undefined,
      lastExtractionErrorCode: existing?.lastExtractionErrorCode ?? undefined
    };
  }

  if (!existing || existing.extractionStatus === "UNSUPPORTED" || existing.extractionStatus === "NOT_ATTEMPTED") {
    return {
      databaseStatus: "PENDING" as const,
      contractStatus: ExtractionStatus.Pending,
      extractionAttempts: existing?.extractionAttempts,
      lastExtractionAt: existing?.lastExtractionAt ?? undefined,
      lastExtractionErrorCode: existing?.lastExtractionErrorCode ?? undefined
    };
  }

  return {
    databaseStatus: existing.extractionStatus,
    contractStatus: toContractExtractionStatus(existing.extractionStatus),
    extractionAttempts: existing.extractionAttempts,
    lastExtractionAt: existing.lastExtractionAt ?? undefined,
    lastExtractionErrorCode: existing.lastExtractionErrorCode ?? undefined
  };
}

function toContractExtractionStatus(status: ExistingAttachmentRecord["extractionStatus"]) {
  switch (status) {
    case "PENDING":
      return ExtractionStatus.Pending;
    case "COMPLETED":
      return ExtractionStatus.Completed;
    case "COMPLETED_WITH_OCR":
      return ExtractionStatus.CompletedWithOcr;
    case "FAILED":
      return ExtractionStatus.Failed;
    case "UNSUPPORTED":
    case "NOT_ATTEMPTED":
      return ExtractionStatus.Unsupported;
  }
}

function parseOptionalDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
