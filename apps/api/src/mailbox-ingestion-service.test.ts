import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  TenantUserRole
} from "@friendly-mail/contracts";
import { encryptMicrosoftToken } from "./microsoft-token-crypto";
import { createPrismaMailboxIngestionService } from "./mailbox-ingestion-service";

const exampleSession = {
  id: "session_123",
  expiresAt: "2026-04-01T12:00:00.000Z",
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

describe("mailbox ingestion service", () => {
  it("fetches and normalizes a full message body into the persisted ingestion fields", async () => {
    const encryptionKey = "12345678901234567890123456789012";
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "graph_message_123",
        parentFolderId: "graph_folder_inbox",
        changeKey: "change_key_456",
        conversationId: "conversation_123",
        internetMessageId: "<message-123@example.com>",
        subject: "Quarterly notice",
        from: {
          emailAddress: {
            name: "Legal Team",
            address: "legal@example.com"
          }
        },
        sender: {
          emailAddress: {
            name: "Assistant",
            address: "assistant@example.com"
          }
        },
        replyTo: [
          {
            emailAddress: {
              name: "Reply Desk",
              address: "reply@example.com"
            }
          }
        ],
        toRecipients: [
          {
            emailAddress: {
              name: "Owner",
              address: "owner@example.com"
            }
          }
        ],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: "2026-04-04T10:00:00Z",
        sentDateTime: "2026-04-04T09:55:00Z",
        lastModifiedDateTime: "2026-04-04T10:05:00Z",
        isRead: false,
        isDraft: false,
        categories: ["FriendlyMail/Critical"],
        importance: "high",
        inferenceClassification: "focused",
        bodyPreview: " Please review the attached packet. ",
        body: {
          contentType: "text",
          content: "Please review the attached packet.\r\n\r\nRegards,\r\nLegal Team   "
        },
        uniqueBody: {
          contentType: "text",
          content: "Please review the attached packet.\r\n"
        },
        hasAttachments: true,
        webLink: "https://outlook.office.com/mail/message"
      })
    );
    const messageUpsert = vi.fn().mockResolvedValue({
      id: "message_123"
    });
    const messageUpdateMany = vi.fn().mockResolvedValue({
      count: 1
    });

    const service = createPrismaMailboxIngestionService({
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
            folderId: "folder_123",
            graphMessageId: "graph_message_123",
            graphParentFolderId: "graph_folder_inbox"
          }),
          upsert: messageUpsert,
          updateMany: messageUpdateMany
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: encryptionKey
      },
      logger: silentLogger(),
      fetch,
      now: () => new Date("2026-04-04T11:00:00.000Z")
    });

    const result = await service.ingestMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toMatchObject({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      hasAttachments: true,
      ingestedAt: "2026-04-04T11:00:00.000Z",
      envelope: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphChangeKey: "change_key_456",
        bodyContentType: "text",
        bodyPreview: "Please review the attached packet.",
        bodyText: "Please review the attached packet.\n\nRegards,\nLegal Team",
        uniqueBodyText: "Please review the attached packet.",
        hasAttachments: true
      }
    });
    expect(messageUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          subject: "Quarterly notice",
          graphChangeKey: "change_key_456",
          fromAddress: "legal@example.com",
          isRead: false
        })
      })
    );
    expect(messageUpdateMany).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123"
      },
      data: {
        bodyPreview: "Please review the attached packet.",
        bodyContentType: "TEXT",
        bodyText: "Please review the attached packet.\n\nRegards,\nLegal Team",
        uniqueBodyText: "Please review the attached packet.",
        webLink: "https://outlook.office.com/mail/message",
        hasAttachments: true,
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        ingestedAt: new Date("2026-04-04T11:00:00.000Z"),
        lastIngestedAt: new Date("2026-04-04T11:00:00.000Z")
      }
    });
  });

  it("rejects ingestion when the tracked message record is missing", async () => {
    const service = createPrismaMailboxIngestionService({
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
          findFirst: vi.fn().mockResolvedValue(null)
        }
      } as never,
      env: {
        MICROSOFT_TOKEN_ENCRYPTION_KEY: "12345678901234567890123456789012"
      },
      logger: silentLogger()
    });

    await expect(
      service.ingestMessage({
        session: exampleSession,
        mailboxId: "mailbox_123",
        messageId: "message_missing"
      })
    ).rejects.toMatchObject({
      code: "MAILBOX_MESSAGE_NOT_FOUND",
      statusCode: 404
    });
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
