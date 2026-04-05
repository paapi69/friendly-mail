import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  ClassificationReasonCode,
  MailSurface,
  MessageType,
  OperationalHealthStatus,
  TenantUserRole,
  VerificationCheckStatus,
  WorkflowSignalSourceKind
} from "@friendly-mail/contracts";
import { createPrismaMailboxClassificationVerificationService } from "./mailbox-classification-verification-service";

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

describe("mailbox classification verification service", () => {
  it("builds a warning report with pending coverage, low-confidence visibility, and high-risk signal gaps", async () => {
    const service = createPrismaMailboxClassificationVerificationService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123"
            }
          })
        },
        message: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "message_invoice",
              ingestionVersionKey: "version_invoice"
            },
            {
              id: "message_notice",
              ingestionVersionKey: "version_notice"
            },
            {
              id: "message_fyi",
              ingestionVersionKey: "version_fyi"
            },
            {
              id: "message_pending",
              ingestionVersionKey: "version_pending"
            },
            {
              id: "message_not_ingested",
              ingestionVersionKey: null
            }
          ])
        },
        messageClassification: {
          findMany: vi.fn().mockResolvedValue([
            {
              mailboxId: "mailbox_123",
              messageId: "message_invoice",
              ingestionVersionKey: "version_invoice",
              actionability: "ACTIONABLE",
              messageType: "INVOICE",
              confidenceScore: 0.91,
              explanationJson: {
                summary: "Invoice classification.",
                lowConfidence: false,
                reasons: []
              },
              dueDatesJson: [
                {
                  id: "due_invoice",
                  label: "Requested due date",
                  value: "2026-04-10T00:00:00.000Z",
                  confidenceScore: 0.91,
                  provenance: [
                    {
                      sourceKind: WorkflowSignalSourceKind.BodyText,
                      field: "bodyText"
                    }
                  ]
                }
              ],
              entitiesJson: [
                {
                  id: "entity_invoice",
                  kind: "invoice",
                  value: "INV-42",
                  confidenceScore: 0.88,
                  provenance: []
                }
              ],
              taskCandidatesJson: [
                {
                  id: "task_invoice",
                  title: "Pay invoice INV-42",
                  confidenceScore: 0.84,
                  rationale: "Pay the invoice.",
                  provenance: []
                }
              ],
              criticalityLevel: "ELEVATED",
              classifiedAt: new Date("2026-04-05T09:30:00.000Z")
            },
            {
              mailboxId: "mailbox_123",
              messageId: "message_notice",
              ingestionVersionKey: "version_notice",
              actionability: "ACTIONABLE",
              messageType: "NOTICE",
              confidenceScore: 0.77,
              explanationJson: {
                summary: "Notice classification.",
                lowConfidence: false,
                reasons: []
              },
              dueDatesJson: [],
              entitiesJson: [],
              taskCandidatesJson: [
                {
                  id: "task_notice",
                  title: "Respond to notice",
                  confidenceScore: 0.8,
                  rationale: "Respond to the notice.",
                  provenance: []
                }
              ],
              criticalityLevel: "CRITICAL",
              classifiedAt: new Date("2026-04-05T09:31:00.000Z")
            },
            {
              mailboxId: "mailbox_123",
              messageId: "message_fyi",
              ingestionVersionKey: "version_fyi",
              actionability: "INFORMATIONAL",
              messageType: "FYI",
              confidenceScore: 0.42,
              explanationJson: {
                summary: "Low-confidence FYI classification.",
                lowConfidence: true,
                reasons: [
                  {
                    code: ClassificationReasonCode.AmbiguousContent,
                    summary: "The content is ambiguous."
                  }
                ]
              },
              dueDatesJson: [],
              entitiesJson: [],
              taskCandidatesJson: [],
              criticalityLevel: "NORMAL",
              classifiedAt: new Date("2026-04-05T09:32:00.000Z")
            }
          ])
        }
      } as never,
      logger: silentLogger(),
      now: () => new Date("2026-04-05T12:00:00.000Z")
    });

    const result = await service.getMailboxClassificationVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.overallStatus).toBe(OperationalHealthStatus.Warning);
    expect(result.coverage).toEqual({
      trackedMessages: 5,
      eligibleMessages: 4,
      classifiedMessages: 3,
      pendingClassificationMessages: 1,
      actionableMessages: 2,
      informationalMessages: 1,
      messageTypeCounts: [
        {
          messageType: MessageType.Fyi,
          count: 1
        },
        {
          messageType: MessageType.Invoice,
          count: 1
        },
        {
          messageType: MessageType.Notice,
          count: 1
        }
      ]
    });
    expect(result.confidence).toEqual({
      averageScore: 0.7,
      lowConfidenceMessages: 1,
      mediumConfidenceMessages: 0,
      highConfidenceMessages: 2,
      ambiguousMessages: 1
    });
    expect(result.signals).toEqual({
      messagesWithDueDates: 1,
      messagesWithEntities: 1,
      messagesWithTaskCandidates: 2,
      messagesWithCriticality: 3,
      highRiskMessages: 2,
      highRiskMessagesWithDueDates: 1
    });
    expect(result.degradedCases).toEqual({
      lowConfidenceMessageIds: ["message_fyi"],
      ambiguousMessageIds: ["message_fyi"],
      highRiskMissingDueDateMessageIds: ["message_notice"]
    });
    expect(result.checks).toEqual([
      expect.objectContaining({
        code: "classification_coverage",
        status: VerificationCheckStatus.Warn
      }),
      expect.objectContaining({
        code: "message_type_presence",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "high_risk_due_date_visibility",
        status: VerificationCheckStatus.Warn
      }),
      expect.objectContaining({
        code: "criticality_signal_presence",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "low_confidence_visibility",
        status: VerificationCheckStatus.Warn
      })
    ]);
  });

  it("reports healthy readiness when current ingested messages are classified with visible signals", async () => {
    const service = createPrismaMailboxClassificationVerificationService({
      prisma: {
        mailbox: {
          findFirst: vi.fn().mockResolvedValue({
            id: "mailbox_123",
            tenantId: "tenant_123",
            connection: {
              userId: "user_123"
            }
          })
        },
        message: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "message_invoice",
              ingestionVersionKey: "version_invoice"
            },
            {
              id: "message_policy",
              ingestionVersionKey: "version_policy"
            }
          ])
        },
        messageClassification: {
          findMany: vi.fn().mockResolvedValue([
            {
              mailboxId: "mailbox_123",
              messageId: "message_invoice",
              ingestionVersionKey: "version_invoice",
              actionability: "ACTIONABLE",
              messageType: "INVOICE",
              confidenceScore: 0.89,
              explanationJson: {
                summary: "Invoice classification.",
                lowConfidence: false,
                reasons: []
              },
              dueDatesJson: [
                {
                  id: "due_invoice",
                  label: "Requested due date",
                  value: "2026-04-10T00:00:00.000Z",
                  confidenceScore: 0.91,
                  provenance: []
                }
              ],
              entitiesJson: [],
              taskCandidatesJson: [
                {
                  id: "task_invoice",
                  title: "Pay invoice INV-42",
                  confidenceScore: 0.84,
                  rationale: "Pay the invoice.",
                  provenance: []
                }
              ],
              criticalityLevel: "ELEVATED",
              classifiedAt: new Date("2026-04-05T09:30:00.000Z")
            },
            {
              mailboxId: "mailbox_123",
              messageId: "message_policy",
              ingestionVersionKey: "version_policy",
              actionability: "INFORMATIONAL",
              messageType: "POLICY",
              confidenceScore: 0.81,
              explanationJson: {
                summary: "Policy classification.",
                lowConfidence: false,
                reasons: []
              },
              dueDatesJson: [],
              entitiesJson: [
                {
                  id: "entity_policy",
                  kind: "policy",
                  value: "Travel policy",
                  confidenceScore: 0.74,
                  provenance: []
                }
              ],
              taskCandidatesJson: [],
              criticalityLevel: "NORMAL",
              classifiedAt: new Date("2026-04-05T09:31:00.000Z")
            }
          ])
        }
      } as never,
      logger: silentLogger(),
      now: () => new Date("2026-04-05T12:00:00.000Z")
    });

    const result = await service.getMailboxClassificationVerification({
      session: exampleSession,
      mailboxId: "mailbox_123"
    });

    expect(result.overallStatus).toBe(OperationalHealthStatus.Healthy);
    expect(result.checks).toEqual([
      expect.objectContaining({
        code: "classification_coverage",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "message_type_presence",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "high_risk_due_date_visibility",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "criticality_signal_presence",
        status: VerificationCheckStatus.Pass
      }),
      expect.objectContaining({
        code: "low_confidence_visibility",
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
