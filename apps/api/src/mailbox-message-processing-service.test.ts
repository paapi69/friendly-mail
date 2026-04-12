import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { createPrismaMailboxMessageProcessingService } from "./mailbox-message-processing-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-04T12:00:00.000Z",
  surface: MailSurface.Dashboard,
  principal: {
    userId: "user_123",
    tenantId: "tenant_123",
    email: "owner@friendlymail.dev",
    displayName: "Owner",
    role: TenantUserRole.Admin,
    authProvider: AuthProvider.LocalPassword
  },
  authBoundary: {
    productIdentity: "friendly_mail_internal" as const,
    mailboxIdentity: "microsoft_graph" as const,
    graphConnectionState: "connected" as const
  }
};

describe("mailbox message processing service", () => {
  it("orchestrates ingestion, attachment sync, and extraction for a materially changed message version", async () => {
    const ingestMessage = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      hasAttachments: true,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      ingestedAt: "2026-04-04T11:00:00.000Z",
      envelope: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphChangeKey: "change_key_456",
        subject: "Quarterly notice",
        bodyContentType: "text",
        hasAttachments: true
      }
    });
    const syncMessageAttachments = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      attachmentCount: 2,
      candidateCount: 1,
      unsupportedCount: 1,
      syncedAt: "2026-04-04T11:05:00.000Z",
      attachments: []
    });
    const extractPdfAttachments = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 1,
      failedCount: 0,
      skippedCount: 0,
      extractedAt: "2026-04-04T11:10:00.000Z",
      attachments: []
    });

    const service = createPrismaMailboxMessageProcessingService({
      prisma: {
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123"
          })
        }
      } as never,
      logger: silentLogger(),
      mailboxIngestionService: {
        ingestMessage
      },
      mailboxAttachmentMetadataService: {
        syncMessageAttachments
      },
      mailboxPdfExtractionService: {
        extractPdfAttachments
      }
    });

    const result = await service.processMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      idempotencyKey: "mailbox_123:graph_message_123:change_key_456",
      processingStatus: "processed",
      ingestion: {
        action: "reprocessed",
        hasAttachments: true,
        ingestedAt: "2026-04-04T11:00:00.000Z"
      },
      attachmentSync: {
        action: "synced",
        attachmentCount: 2,
        candidateCount: 1,
        unsupportedCount: 1,
        syncedAt: "2026-04-04T11:05:00.000Z"
      },
      extraction: {
        action: "processed",
        extractedCount: 1,
        failedCount: 0,
        skippedCount: 0,
        extractedAt: "2026-04-04T11:10:00.000Z"
      }
    });
  });

  it("skips attachment and extraction work for messages without attachments", async () => {
    const ingestMessage = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      hasAttachments: false,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      ingestedAt: "2026-04-04T11:00:00.000Z",
      envelope: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphChangeKey: "change_key_456",
        subject: "Quarterly notice",
        bodyContentType: "text",
        hasAttachments: false
      }
    });
    const syncMessageAttachments = vi.fn();
    const extractPdfAttachments = vi.fn();

    const service = createPrismaMailboxMessageProcessingService({
      prisma: {
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: null
          })
        }
      } as never,
      logger: silentLogger(),
      mailboxIngestionService: {
        ingestMessage
      },
      mailboxAttachmentMetadataService: {
        syncMessageAttachments
      },
      mailboxPdfExtractionService: {
        extractPdfAttachments
      }
    });

    const result = await service.processMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      idempotencyKey: "mailbox_123:graph_message_123:change_key_456",
      processingStatus: "processed",
      ingestion: {
        action: "ingested",
        hasAttachments: false,
        ingestedAt: "2026-04-04T11:00:00.000Z"
      },
      attachmentSync: {
        action: "skipped_no_attachments"
      },
      extraction: {
        action: "skipped_no_attachments"
      }
    });
    expect(syncMessageAttachments).not.toHaveBeenCalled();
    expect(extractPdfAttachments).not.toHaveBeenCalled();
  });

  it("reports already-current processing when the current version has only skipped extraction work", async () => {
    const ingestMessage = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      hasAttachments: true,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      ingestedAt: "2026-04-04T11:00:00.000Z",
      envelope: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphChangeKey: "change_key_456",
        subject: "Quarterly notice",
        bodyContentType: "text",
        hasAttachments: true
      }
    });
    const syncMessageAttachments = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      attachmentCount: 1,
      candidateCount: 1,
      unsupportedCount: 0,
      syncedAt: "2026-04-04T11:05:00.000Z",
      attachments: []
    });
    const extractPdfAttachments = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 0,
      failedCount: 0,
      skippedCount: 1,
      extractedAt: "2026-04-04T11:10:00.000Z",
      attachments: [
        {
          attachmentId: "attachment_123",
          graphAttachmentId: "graph_attachment_pdf",
          name: "invoice.pdf",
          extractionStatus: "skipped",
          reason: "already_extracted_for_message_version",
          extractionAttempts: 1
        }
      ]
    });

    const service = createPrismaMailboxMessageProcessingService({
      prisma: {
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        }
      } as never,
      logger: silentLogger(),
      mailboxIngestionService: {
        ingestMessage
      },
      mailboxAttachmentMetadataService: {
        syncMessageAttachments
      },
      mailboxPdfExtractionService: {
        extractPdfAttachments
      }
    });

    const result = await service.processMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result.processingStatus).toBe("already_current");
    expect(result.ingestion).toEqual({
      action: "already_current",
      hasAttachments: true,
      ingestedAt: "2026-04-04T11:00:00.000Z"
    });
    expect(result.extraction).toEqual({
      action: "skipped_already_current",
      extractedCount: 0,
      failedCount: 0,
      skippedCount: 1,
      extractedAt: "2026-04-04T11:10:00.000Z"
    });
  });
});

function silentLogger() {
  return {
    child() {
      return this;
    },
    debug() {
      return undefined;
    },
    info() {
      return undefined;
    },
    warn() {
      return undefined;
    },
    error() {
      return undefined;
    }
  };
}
