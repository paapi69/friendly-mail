import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  MailSurface,
  OperationalHealthStatus,
  TenantUserRole,
  VerificationCheckStatus
} from "@friendly-mail/contracts";
import { createPrismaMailboxProcessingVerificationService } from "./mailbox-processing-verification-service";

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

describe("mailbox processing verification service", () => {
  it("builds a verification report with ingestion backlog, retries, failures, and unsupported reasons", async () => {
    const service = createPrismaMailboxProcessingVerificationService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: "ciphertext"
            }
          })
        },
        message: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "message_1",
              hasAttachments: true,
              ingestionVersionKey: "version_1",
              ingestedAt: new Date("2026-04-04T10:00:00.000Z")
            },
            {
              id: "message_2",
              hasAttachments: true,
              ingestionVersionKey: null,
              ingestedAt: null
            },
            {
              id: "message_3",
              hasAttachments: false,
              ingestionVersionKey: "version_3",
              ingestedAt: new Date("2026-04-04T10:05:00.000Z")
            }
          ])
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_1",
              extractionStatus: "COMPLETED",
              extractionAttempts: 1,
              extractionDecisionReason: "pdf_supported",
              lastExtractionErrorCode: null
            },
            {
              id: "attachment_2",
              extractionStatus: "FAILED",
              extractionAttempts: 2,
              extractionDecisionReason: "pdf_supported",
              lastExtractionErrorCode: "OCR_PROVIDER_UNAVAILABLE"
            },
            {
              id: "attachment_3",
              extractionStatus: "PENDING",
              extractionAttempts: 3,
              extractionDecisionReason: "pdf_supported",
              lastExtractionErrorCode: "PDF_TEXT_EXTRACTION_FAILED"
            },
            {
              id: "attachment_4",
              extractionStatus: "UNSUPPORTED",
              extractionAttempts: 0,
              extractionDecisionReason: "file_type_unsupported",
              lastExtractionErrorCode: null
            },
            {
              id: "attachment_5",
              extractionStatus: "COMPLETED_WITH_OCR",
              extractionAttempts: 1,
              extractionDecisionReason: "pdf_supported",
              lastExtractionErrorCode: null
            },
            {
              id: "attachment_6",
              extractionStatus: "UNSUPPORTED",
              extractionAttempts: 0,
              extractionDecisionReason: "inline_attachment_skipped",
              lastExtractionErrorCode: null
            }
          ])
        }
      } as never,
      logger: silentLogger(),
      now: () => new Date("2026-04-04T11:30:00.000Z")
    });

    const result = await service.getMailboxProcessingVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.overallStatus).toBe(OperationalHealthStatus.Critical);
    expect(result.ingestion).toEqual({
      trackedMessages: 3,
      ingestedMessages: 2,
      pendingMessages: 1,
      messagesWithAttachments: 2
    });
    expect(result.extraction).toEqual({
      trackedAttachments: 6,
      candidateAttachments: 4,
      completedAttachments: 1,
      completedWithOcrAttachments: 1,
      pendingAttachments: 1,
      failedAttachments: 1,
      unsupportedAttachments: 2,
      retriedAttachments: 2,
      retryBacklogAttachments: 2,
      maxExtractionAttempts: 3,
      failureRate: 0.25,
      unsupportedReasons: [
        {
          reason: "file_type_unsupported",
          count: 1
        },
        {
          reason: "inline_attachment_skipped",
          count: 1
        }
      ],
      failureReasons: [
        {
          errorCode: "OCR_PROVIDER_UNAVAILABLE",
          count: 1
        },
        {
          errorCode: "PDF_TEXT_EXTRACTION_FAILED",
          count: 1
        }
      ]
    });
    expect(result.checks).toEqual([
      expect.objectContaining({
        code: "message_ingestion_coverage",
        status: VerificationCheckStatus.Warn
      }),
      expect.objectContaining({
        code: "retry_backlog",
        status: VerificationCheckStatus.Fail
      }),
      expect.objectContaining({
        code: "attachment_failure_rate",
        status: VerificationCheckStatus.Fail
      }),
      expect.objectContaining({
        code: "unsupported_attachment_handling",
        status: VerificationCheckStatus.Pass
      })
    ]);
  });

  it("reports healthy extraction coverage when all tracked work is current", async () => {
    const service = createPrismaMailboxProcessingVerificationService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123",
              status: "ACTIVE",
              accessTokenCiphertext: "ciphertext"
            }
          })
        },
        message: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "message_1",
              hasAttachments: true,
              ingestionVersionKey: "version_1",
              ingestedAt: new Date("2026-04-04T10:00:00.000Z")
            }
          ])
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_1",
              extractionStatus: "COMPLETED",
              extractionAttempts: 1,
              extractionDecisionReason: "pdf_supported",
              lastExtractionErrorCode: null
            },
            {
              id: "attachment_2",
              extractionStatus: "UNSUPPORTED",
              extractionAttempts: 0,
              extractionDecisionReason: "reference_attachment_deferred",
              lastExtractionErrorCode: null
            }
          ])
        }
      } as never,
      logger: silentLogger(),
      now: () => new Date("2026-04-04T11:30:00.000Z")
    });

    const result = await service.getMailboxProcessingVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.overallStatus).toBe(OperationalHealthStatus.Healthy);
    expect(result.checks).toEqual([
      expect.objectContaining({
        code: "message_ingestion_coverage",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "retry_backlog",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "attachment_failure_rate",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "unsupported_attachment_handling",
        status: VerificationCheckStatus.Pass
      })
    ]);
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
