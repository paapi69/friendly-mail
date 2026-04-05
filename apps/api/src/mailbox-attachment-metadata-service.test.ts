import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxAttachmentMetadataService } from "./mailbox-attachment-metadata-service";

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

describe("mailbox attachment metadata service", () => {
  it("retrieves attachment metadata and persists durable extraction decisions for an ingested message", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            id: "graph_attachment_pdf",
            name: "notice.pdf",
            contentType: "application/pdf",
            size: 204800,
            isInline: false,
            lastModifiedDateTime: "2026-04-04T10:10:00Z"
          },
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            id: "graph_attachment_inline_logo",
            name: "logo.png",
            contentType: "image/png",
            size: 8192,
            isInline: true,
            lastModifiedDateTime: "2026-04-04T10:11:00Z"
          },
          {
            "@odata.type": "#microsoft.graph.itemAttachment",
            id: "graph_attachment_item",
            name: "forwarded-message.eml",
            contentType: "message/rfc822",
            size: 4096,
            lastModifiedDateTime: "2026-04-04T10:12:00Z"
          },
          {
            "@odata.type": "#microsoft.graph.referenceAttachment",
            id: "graph_attachment_reference",
            name: "linked-contract.docx",
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 2048,
            lastModifiedDateTime: "2026-04-04T10:13:00Z"
          }
        ]
      })
    );
    const attachmentUpsert = vi.fn().mockResolvedValue({});

    const service = createPrismaMailboxAttachmentMetadataService({
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
            hasAttachments: true,
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          upsert: attachmentUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:00:00.000Z")
    });

    const result = await service.syncMessageAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      attachmentCount: 4,
      candidateCount: 1,
      unsupportedCount: 3,
      syncedAt: "2026-04-04T11:00:00.000Z",
      attachments: [
        {
          graphAttachmentId: "graph_attachment_pdf",
          name: "notice.pdf",
          contentType: "application/pdf",
          sizeInBytes: 204800,
          isInline: false,
          attachmentKind: "file",
          lastModifiedDateTime: "2026-04-04T10:10:00Z",
          isExtractionCandidate: true,
          extractionDecisionReason: "pdf_supported",
          extractionStatus: "pending"
        },
        {
          graphAttachmentId: "graph_attachment_inline_logo",
          name: "logo.png",
          contentType: "image/png",
          sizeInBytes: 8192,
          isInline: true,
          attachmentKind: "file",
          lastModifiedDateTime: "2026-04-04T10:11:00Z",
          isExtractionCandidate: false,
          extractionDecisionReason: "inline_attachment_skipped",
          extractionStatus: "unsupported"
        },
        {
          graphAttachmentId: "graph_attachment_item",
          name: "forwarded-message.eml",
          contentType: "message/rfc822",
          sizeInBytes: 4096,
          isInline: false,
          attachmentKind: "item",
          lastModifiedDateTime: "2026-04-04T10:12:00Z",
          isExtractionCandidate: false,
          extractionDecisionReason: "item_attachment_deferred",
          extractionStatus: "unsupported"
        },
        {
          graphAttachmentId: "graph_attachment_reference",
          name: "linked-contract.docx",
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeInBytes: 2048,
          isInline: false,
          attachmentKind: "reference",
          lastModifiedDateTime: "2026-04-04T10:13:00Z",
          isExtractionCandidate: false,
          extractionDecisionReason: "reference_attachment_deferred",
          extractionStatus: "unsupported"
        }
      ]
    });
    expect(attachmentUpsert).toHaveBeenCalledTimes(4);
    expect(attachmentUpsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          mailboxId_graphAttachmentId: {
            mailboxId: "mailbox_123",
            graphAttachmentId: "graph_attachment_pdf"
          }
        },
        update: expect.objectContaining({
          messageId: "message_123",
          graphMessageId: "graph_message_123",
          attachmentKind: "FILE",
          isExtractionCandidate: true,
          extractionDecisionReason: "pdf_supported",
          extractionStatus: "PENDING"
        })
      })
    );
    expect(attachmentUpsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        update: expect.objectContaining({
          attachmentKind: "FILE",
          isExtractionCandidate: false,
          extractionDecisionReason: "inline_attachment_skipped",
          extractionStatus: "UNSUPPORTED"
        })
      })
    );
    expect(attachmentUpsert).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        update: expect.objectContaining({
          attachmentKind: "ITEM",
          extractionDecisionReason: "item_attachment_deferred",
          extractionStatus: "UNSUPPORTED"
        })
      })
    );
    expect(attachmentUpsert).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        update: expect.objectContaining({
          attachmentKind: "REFERENCE",
          extractionDecisionReason: "reference_attachment_deferred",
          extractionStatus: "UNSUPPORTED"
        })
      })
    );
  });

  it("skips Graph attachment reads when the ingested message reports no attachments", async () => {
    const fetch = vi.fn();
    const attachmentUpsert = vi.fn();

    const service = createPrismaMailboxAttachmentMetadataService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: "unused"
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            hasAttachments: false,
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          upsert: attachmentUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012"
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:05:00.000Z")
    });

    const result = await service.syncMessageAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      attachmentCount: 0,
      candidateCount: 0,
      unsupportedCount: 0,
      syncedAt: "2026-04-04T11:05:00.000Z",
      attachments: []
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(attachmentUpsert).not.toHaveBeenCalled();
  });

  it("rejects attachment sync when the message has not been ingested yet", async () => {
    const service = createPrismaMailboxAttachmentMetadataService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: "unused"
            }
          })
        },
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            hasAttachments: true,
            ingestionVersionKey: null
          })
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012"
      },
      logger: silentLogger()
    });

    await expect(
      service.syncMessageAttachments({
        session: exampleSession,
        mailboxId: "mailbox_123",
        messageId: "message_123"
      })
    ).rejects.toMatchObject({
      code: "MAILBOX_MESSAGE_NOT_INGESTED",
      statusCode: 409
    });
  });

  it("preserves completed extraction state when the same PDF attachment is resynchronized", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            id: "graph_attachment_pdf",
            name: "notice.pdf",
            contentType: "application/pdf",
            size: 204800,
            isInline: false,
            lastModifiedDateTime: "2026-04-04T10:10:00Z"
          }
        ]
      })
    );
    const attachmentUpsert = vi.fn().mockResolvedValue({});

    const service = createPrismaMailboxAttachmentMetadataService({
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
            hasAttachments: true,
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
              name: "notice.pdf",
              contentType: "application/pdf",
              sizeInBytes: 204800,
              isInline: false,
              attachmentKind: "FILE",
              lastGraphModifiedAt: new Date("2026-04-04T10:10:00.000Z"),
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "COMPLETED",
              extractionAttempts: 2,
              lastExtractionAt: new Date("2026-04-04T11:10:00.000Z"),
              lastExtractionErrorCode: null
            }
          ]),
          upsert: attachmentUpsert
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:12:00.000Z")
    });

    const result = await service.syncMessageAttachments({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result.attachments).toEqual([
      {
        graphAttachmentId: "graph_attachment_pdf",
        name: "notice.pdf",
        contentType: "application/pdf",
        sizeInBytes: 204800,
        isInline: false,
        attachmentKind: "file",
        lastModifiedDateTime: "2026-04-04T10:10:00Z",
        isExtractionCandidate: true,
        extractionDecisionReason: "pdf_supported",
        extractionStatus: "completed"
      }
    ]);
    expect(attachmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          extractionStatus: "COMPLETED",
          extractionAttempts: 2,
          lastExtractionAt: new Date("2026-04-04T11:10:00.000Z"),
          lastExtractionErrorCode: null
        })
      })
    );
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

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
