import { type SessionView } from "@friendly-mail/contracts";
import { type PrismaClient } from "@friendly-mail/database";
import { AppError, type Logger } from "@friendly-mail/observability";
import { type MailboxAttachmentMetadataService } from "./mailbox-attachment-metadata-service";
import { type MailboxIngestionService } from "./mailbox-ingestion-service";
import { type MailboxPdfExtractionService } from "./mailbox-pdf-extraction-service";

type ProcessMessageInput = {
  session: SessionView;
  mailboxId: string;
  messageId: string;
};

type ProcessMessageResult = {
  mailboxId: string;
  messageId: string;
  graphMessageId: string;
  ingestionVersionKey: string;
  idempotencyKey: string;
  processingStatus: "processed" | "already_current";
  ingestion:
    | {
        action: "ingested" | "reprocessed" | "already_current";
        hasAttachments: boolean;
        ingestedAt: string;
      };
  attachmentSync:
    | {
        action: "synced";
        attachmentCount: number;
        candidateCount: number;
        unsupportedCount: number;
        syncedAt: string;
      }
    | {
        action: "skipped_no_attachments";
      };
  extraction:
    | {
        action: "processed" | "skipped_already_current";
        extractedCount: number;
        failedCount: number;
        skippedCount: number;
        extractedAt: string;
      }
    | {
        action: "skipped_no_attachments" | "skipped_no_candidates";
      };
};

export type MailboxMessageProcessingService = {
  processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult>;
};

export type CreatePrismaMailboxMessageProcessingServiceInput = {
  prisma: PrismaClient;
  logger: Logger;
  mailboxIngestionService: MailboxIngestionService;
  mailboxAttachmentMetadataService: MailboxAttachmentMetadataService;
  mailboxPdfExtractionService: MailboxPdfExtractionService;
};

type ExistingMessageRecord = {
  id: string;
  mailboxId: string;
  graphMessageId: string;
  ingestionVersionKey: string | null;
};

export function createPrismaMailboxMessageProcessingService(
  input: CreatePrismaMailboxMessageProcessingServiceInput
): MailboxMessageProcessingService {
  return {
    async processMessage(processInput) {
      const existingMessage = (await input.prisma.message.findFirst({
        where: {
          id: processInput.messageId,
          mailboxId: processInput.mailboxId
        }
      })) as ExistingMessageRecord | null;

      if (!existingMessage) {
        throw new AppError("MAILBOX_MESSAGE_NOT_FOUND", "Tracked mailbox message not found.", {
          statusCode: 404
        });
      }

      const ingestion = await input.mailboxIngestionService.ingestMessage(processInput);
      const ingestionAction =
        existingMessage.ingestionVersionKey === null
          ? "ingested"
          : existingMessage.ingestionVersionKey === ingestion.ingestionVersionKey
            ? "already_current"
            : "reprocessed";

      if (!ingestion.hasAttachments) {
        return {
          mailboxId: ingestion.mailboxId,
          messageId: ingestion.messageId,
          graphMessageId: ingestion.graphMessageId,
          ingestionVersionKey: ingestion.ingestionVersionKey,
          idempotencyKey: ingestion.ingestionVersionKey,
          processingStatus: "processed",
          ingestion: {
            action: ingestionAction,
            hasAttachments: false,
            ingestedAt: ingestion.ingestedAt
          },
          attachmentSync: {
            action: "skipped_no_attachments"
          },
          extraction: {
            action: "skipped_no_attachments"
          }
        };
      }

      const attachmentSync =
        await input.mailboxAttachmentMetadataService.syncMessageAttachments(processInput);

      if (attachmentSync.candidateCount === 0) {
        return {
          mailboxId: ingestion.mailboxId,
          messageId: ingestion.messageId,
          graphMessageId: ingestion.graphMessageId,
          ingestionVersionKey: ingestion.ingestionVersionKey,
          idempotencyKey: ingestion.ingestionVersionKey,
          processingStatus: "processed",
          ingestion: {
            action: ingestionAction,
            hasAttachments: true,
            ingestedAt: ingestion.ingestedAt
          },
          attachmentSync: {
            action: "synced",
            attachmentCount: attachmentSync.attachmentCount,
            candidateCount: attachmentSync.candidateCount,
            unsupportedCount: attachmentSync.unsupportedCount,
            syncedAt: attachmentSync.syncedAt
          },
          extraction: {
            action: "skipped_no_candidates"
          }
        };
      }

      const extraction = await input.mailboxPdfExtractionService.extractPdfAttachments(processInput);
      const extractionAction =
        extraction.extractedCount === 0 && extraction.failedCount === 0 && extraction.skippedCount > 0
          ? "skipped_already_current"
          : "processed";
      const processingStatus =
        ingestionAction === "already_current" && extractionAction === "skipped_already_current"
          ? "already_current"
          : "processed";

      input.logger.info("Processed mailbox message through ingestion and extraction orchestration", {
        mailboxId: ingestion.mailboxId,
        messageId: ingestion.messageId,
        graphMessageId: ingestion.graphMessageId,
        ingestionVersionKey: ingestion.ingestionVersionKey,
        ingestionAction,
        extractionAction,
        processingStatus
      });

      return {
        mailboxId: ingestion.mailboxId,
        messageId: ingestion.messageId,
        graphMessageId: ingestion.graphMessageId,
        ingestionVersionKey: ingestion.ingestionVersionKey,
        idempotencyKey: ingestion.ingestionVersionKey,
        processingStatus,
        ingestion: {
          action: ingestionAction,
          hasAttachments: true,
          ingestedAt: ingestion.ingestedAt
        },
        attachmentSync: {
          action: "synced",
          attachmentCount: attachmentSync.attachmentCount,
          candidateCount: attachmentSync.candidateCount,
          unsupportedCount: attachmentSync.unsupportedCount,
          syncedAt: attachmentSync.syncedAt
        },
        extraction: {
          action: extractionAction,
          extractedCount: extraction.extractedCount,
          failedCount: extraction.failedCount,
          skippedCount: extraction.skippedCount,
          extractedAt: extraction.extractedAt
        }
      };
    }
  };
}
