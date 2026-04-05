import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxPdfExtractionService } from "./mailbox-pdf-extraction-service";

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

describe("mailbox pdf extraction service", () => {
  it("downloads supported PDF attachment bytes, extracts text, and persists an attachment artifact", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf"
        }
      })
    );
    const writeTextArtifact = vi.fn().mockResolvedValue({
      storageKey: "artifacts/mailbox_123/attachment_123/text.txt"
    });
    const extractTextFromPdf = vi.fn().mockResolvedValue({
      text: "Payment is due on April 15.\nPlease process this invoice.",
      pageCount: 1
    });
    const attachmentUpsert = vi.fn().mockResolvedValue({});
    const extractionArtifactUpsert = vi.fn().mockResolvedValue({});

    const service = createPrismaMailboxPdfExtractionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_123",
              mailboxId: "mailbox_123",
              messageId: "message_123",
              graphMessageId: "graph_message_123",
              graphAttachmentId: "graph_attachment_pdf",
              name: "invoice.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: new Date("2026-04-04T10:10:00.000Z"),
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "PENDING",
              extractionAttempts: 0,
              lastExtractionAt: null,
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        },
        extractionArtifact: {
          upsert: extractionArtifactUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:15:00.000Z"),
      extractTextFromPdf,
      writeTextArtifact
    });

    const result = await service.extractPdfAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 1,
      failedCount: 0,
      skippedCount: 0,
      extractedAt: "2026-04-04T11:15:00.000Z",
      attachments: [
        {
          attachmentId: "attachment_123",
          graphAttachmentId: "graph_attachment_pdf",
          name: "invoice.pdf",
          extractionStatus: "completed",
          storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
          textLength: 55,
          extractionAttempts: 1
        }
      ]
    });
    expect(extractTextFromPdf).toHaveBeenCalledWith(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]));
    expect(writeTextArtifact).toHaveBeenCalledWith({
      mailboxId: "mailbox_123",
      attachmentId: "attachment_123",
      text: "Payment is due on April 15.\nPlease process this invoice."
    });
    expect(extractionArtifactUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          attachmentId_artifactKind: {
            attachmentId: "attachment_123",
            artifactKind: "ATTACHMENT_TEXT"
          }
        },
        update: expect.objectContaining({
          storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
          textLength: 55,
          sourceVersionKey: "mailbox_123:graph_message_123:change_key_456"
        })
      })
    );
    expect(attachmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          extractionStatus: "COMPLETED",
          extractionAttempts: 1,
          lastExtractionAt: new Date("2026-04-04T11:15:00.000Z"),
          lastExtractionErrorCode: null
        })
      })
    );
  });

  it("fails with OCR provider unavailable when extraction returns no meaningful text and OCR is not enabled", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf"
        }
      })
    );
    const attachmentUpsert = vi.fn().mockResolvedValue({});

    const service = createPrismaMailboxPdfExtractionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_123",
              mailboxId: "mailbox_123",
              messageId: "message_123",
              graphMessageId: "graph_message_123",
              graphAttachmentId: "graph_attachment_pdf",
              name: "scan.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: null,
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "PENDING",
              extractionAttempts: 1,
              lastExtractionAt: null,
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        },
        extractionArtifact: {
          upsert: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        OCR_PROVIDER: "disabled",
        OCR_LANGUAGE: "eng",
        OCR_CONFIDENCE_THRESHOLD: 0.75
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:20:00.000Z"),
      extractTextFromPdf: vi.fn().mockResolvedValue({
        text: "   ",
        pageCount: 1
      }),
      writeTextArtifact: vi.fn()
    });

    const result = await service.extractPdfAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 0,
      failedCount: 1,
      skippedCount: 0,
      extractedAt: "2026-04-04T11:20:00.000Z",
      attachments: [
        {
          attachmentId: "attachment_123",
          graphAttachmentId: "graph_attachment_pdf",
          name: "scan.pdf",
          extractionStatus: "failed",
          errorCode: "OCR_PROVIDER_UNAVAILABLE",
          extractionAttempts: 2
        }
      ]
    });
    expect(attachmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          extractionStatus: "FAILED",
          extractionAttempts: 2,
          lastExtractionErrorCode: "OCR_PROVIDER_UNAVAILABLE"
        })
      })
    );
  });

  it("falls back to OCR when PDF extraction returns no meaningful text and OCR is enabled", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf"
        }
      })
    );
    const writeTextArtifact = vi.fn().mockResolvedValue({
      storageKey: "artifacts/mailbox_123/attachment_ocr_123/ocr.txt"
    });
    const attachmentUpsert = vi.fn().mockResolvedValue({});
    const extractionArtifactUpsert = vi.fn().mockResolvedValue({});
    const runOcrOnPdf = vi.fn().mockResolvedValue({
      text: "Scanned notice due April 20.",
      confidenceScore: 0.63,
      pageCount: 1
    });

    const service = createPrismaMailboxPdfExtractionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_ocr_123",
              mailboxId: "mailbox_123",
              messageId: "message_123",
              graphMessageId: "graph_message_123",
              graphAttachmentId: "graph_attachment_pdf",
              name: "scan.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: null,
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "PENDING",
              extractionAttempts: 0,
              lastExtractionAt: null,
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        },
        extractionArtifact: {
          upsert: extractionArtifactUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        OCR_PROVIDER: "tesseract",
        OCR_LANGUAGE: "eng",
        OCR_CONFIDENCE_THRESHOLD: 0.75
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:25:00.000Z"),
      extractTextFromPdf: vi.fn().mockResolvedValue({
        text: "   ",
        pageCount: 1
      }),
      runOcrOnPdf,
      writeTextArtifact
    });

    const result = await service.extractPdfAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 1,
      failedCount: 0,
      skippedCount: 0,
      extractedAt: "2026-04-04T11:25:00.000Z",
      attachments: [
        {
          attachmentId: "attachment_ocr_123",
          graphAttachmentId: "graph_attachment_pdf",
          name: "scan.pdf",
          extractionStatus: "completed_with_ocr",
          ocrStorageKey: "artifacts/mailbox_123/attachment_ocr_123/ocr.txt",
          textLength: 28,
          extractionAttempts: 1,
          confidenceScore: 0.63,
          qualitySignal: "low_confidence"
        }
      ]
    });
    expect(writeTextArtifact).toHaveBeenCalledWith({
      mailboxId: "mailbox_123",
      attachmentId: "attachment_ocr_123",
      text: "Scanned notice due April 20.",
      artifactFileName: "ocr.txt"
    });
    expect(runOcrOnPdf).toHaveBeenCalledWith(new Uint8Array([37, 80, 68, 70]), {
      language: "eng"
    });
    expect(extractionArtifactUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          attachmentId_artifactKind: {
            attachmentId: "attachment_ocr_123",
            artifactKind: "ATTACHMENT_OCR"
          }
        },
        update: expect.objectContaining({
          storageKey: "artifacts/mailbox_123/attachment_ocr_123/ocr.txt",
          confidenceScore: 0.63
        })
      })
    );
    expect(attachmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          extractionStatus: "COMPLETED_WITH_OCR",
          extractionAttempts: 1,
          lastExtractionAt: new Date("2026-04-04T11:25:00.000Z"),
          lastExtractionErrorCode: null
        })
      })
    );
  });

  it("fails with OCR provider unavailable when OCR fallback is needed but disabled", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf"
        }
      })
    );
    const attachmentUpsert = vi.fn().mockResolvedValue({});

    const service = createPrismaMailboxPdfExtractionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_ocr_123",
              mailboxId: "mailbox_123",
              messageId: "message_123",
              graphMessageId: "graph_message_123",
              graphAttachmentId: "graph_attachment_pdf",
              name: "scan.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: null,
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "PENDING",
              extractionAttempts: 2,
              lastExtractionAt: null,
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        },
        extractionArtifact: {
          upsert: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey,
        OCR_PROVIDER: "disabled",
        OCR_LANGUAGE: "eng",
        OCR_CONFIDENCE_THRESHOLD: 0.75
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:30:00.000Z"),
      extractTextFromPdf: vi.fn().mockResolvedValue({
        text: "\n\n",
        pageCount: 1
      }),
      writeTextArtifact: vi.fn()
    });

    const result = await service.extractPdfAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result.attachments).toEqual([
      {
        attachmentId: "attachment_ocr_123",
        graphAttachmentId: "graph_attachment_pdf",
        name: "scan.pdf",
        extractionStatus: "failed",
        errorCode: "OCR_PROVIDER_UNAVAILABLE",
        extractionAttempts: 3
      }
    ]);
    expect(attachmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          extractionStatus: "FAILED",
          extractionAttempts: 3,
          lastExtractionErrorCode: "OCR_PROVIDER_UNAVAILABLE"
        })
      })
    );
  });

  it("skips extraction when a candidate attachment already has current-version artifacts", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn();
    const extractTextFromPdf = vi.fn();
    const writeTextArtifact = vi.fn();
    const attachmentUpsert = vi.fn();
    const extractionArtifactFindMany = vi.fn().mockResolvedValue([
      {
        id: "artifact_123",
        attachmentId: "attachment_123",
        artifactKind: "ATTACHMENT_TEXT",
        sourceVersionKey: "mailbox_123:graph_message_123:change_key_456"
      }
    ]);

    const service = createPrismaMailboxPdfExtractionService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: encryptMicrosoftToken("access_token_123", encryptionKey)
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_123",
              mailboxId: "mailbox_123",
              messageId: "message_123",
              graphMessageId: "graph_message_123",
              graphAttachmentId: "graph_attachment_pdf",
              name: "invoice.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: new Date("2026-04-04T10:10:00.000Z"),
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "COMPLETED",
              extractionAttempts: 1,
              lastExtractionAt: new Date("2026-04-04T11:15:00.000Z"),
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        },
        extractionArtifact: {
          findMany: extractionArtifactFindMany,
          upsert: vi.fn()
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:45:00.000Z"),
      extractTextFromPdf,
      writeTextArtifact
    });

    const result = await service.extractPdfAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      extractedCount: 0,
      failedCount: 0,
      skippedCount: 1,
      extractedAt: "2026-04-04T11:45:00.000Z",
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
    expect(fetch).not.toHaveBeenCalled();
    expect(extractTextFromPdf).not.toHaveBeenCalled();
    expect(writeTextArtifact).not.toHaveBeenCalled();
    expect(attachmentUpsert).not.toHaveBeenCalled();
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
