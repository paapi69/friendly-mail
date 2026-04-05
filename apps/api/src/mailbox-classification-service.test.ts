import { describe, expect, it, vi } from "vitest";
import {
  AuthProvider,
  ClassificationReasonCode,
  ExtractionStatus,
  MailSurface,
  MessageActionability,
  MessagePriority,
  MessageType,
  TenantUserRole,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  WorkflowCriticalityLevel
} from "@friendly-mail/contracts";
import {
  createPrismaMailboxClassificationService,
  createRulesBasedMailboxClassificationPath
} from "./mailbox-classification-service";

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

describe("mailbox classification service", () => {
  it("packages normalized message content and extracted attachment text into one repeat-safe classification run", async () => {
    const processMessage = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      idempotencyKey: "mailbox_123:graph_message_123:change_key_456",
      processingStatus: "processed"
    });
    const classifyMessage = vi.fn().mockResolvedValue({
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      confidenceScore: 0.92,
      explanation: {
        summary: "The message requests invoice payment by a stated due date.",
        lowConfidence: false,
        reasons: [
          {
            code: ClassificationReasonCode.DueDateDetected,
            summary: "A due date appears in the message body."
          }
        ]
      },
      signals: {
        dueDates: [
          {
            id: "due_date_123",
            label: "Invoice due date",
            value: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.91,
            rationale: "The body says payment is due by April 12.",
            provenance: [
              {
                sourceKind: "body_text",
                field: "bodyText"
              }
            ]
          }
        ],
        entities: [],
        taskCandidates: [],
        urgency: {
          level: MessagePriority.High,
          confidenceScore: 0.83,
          rationale: "The due date is near-term.",
          reasons: []
        },
        criticality: {
          level: WorkflowCriticalityLevel.Elevated,
          confidenceScore: 0.79,
          rationale: "Missing payment would create finance follow-up.",
          reasons: []
        }
      }
    });
    const readArtifactText = vi
      .fn()
      .mockResolvedValueOnce("Invoice number INV-42")
      .mockResolvedValueOnce("Scanned payment notice");
    const upsert = vi.fn().mockResolvedValue({
      id: "classification_123"
    });

    const service = createPrismaMailboxClassificationService({
      prisma: {
        message: {
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            graphMessageId: "graph_message_123",
            subject: "Invoice due Friday",
            fromAddress: "vendor@example.com",
            receivedAt: new Date("2026-04-04T10:00:00.000Z"),
            bodyPreview: "Please pay the attached invoice by Friday.",
            bodyText: "Please pay the attached invoice by Friday.",
            uniqueBodyText: "Please pay the attached invoice by Friday.",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "attachment_123",
              graphAttachmentId: "graph_attachment_123",
              name: "invoice.pdf",
              contentType: "application/pdf",
              isInline: false,
              attachmentKind: "FILE",
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "COMPLETED"
            },
            {
              id: "attachment_456",
              graphAttachmentId: "graph_attachment_456",
              name: "scan.pdf",
              contentType: "application/pdf",
              isInline: false,
              attachmentKind: "FILE",
              isExtractionCandidate: true,
              extractionDecisionReason: "pdf_supported",
              extractionStatus: "COMPLETED_WITH_OCR"
            }
          ])
        },
        extractionArtifact: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "artifact_123",
              attachmentId: "attachment_123",
              artifactKind: "ATTACHMENT_TEXT",
              storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
              sourceVersionKey: "mailbox_123:graph_message_123:change_key_456",
              contentHash: "hash_123",
              confidenceScore: null,
              textLength: 22,
              createdAt: new Date("2026-04-04T11:00:00.000Z")
            },
            {
              id: "artifact_456",
              attachmentId: "attachment_456",
              artifactKind: "ATTACHMENT_OCR",
              storageKey: "artifacts/mailbox_123/attachment_456/ocr.txt",
              sourceVersionKey: "mailbox_123:graph_message_123:change_key_456",
              contentHash: "hash_456",
              confidenceScore: 0.63,
              textLength: 21,
              createdAt: new Date("2026-04-04T11:01:00.000Z")
            }
          ])
        },
        messageClassification: {
          findFirst: vi.fn().mockResolvedValue(null),
          upsert
        }
      } as never,
      logger: silentLogger(),
      mailboxMessageProcessingService: {
        processMessage
      },
      classificationPath: {
        classifierVersion: "baseline-classifier:v1",
        classifyMessage
      },
      readArtifactText,
      now: () => new Date("2026-04-05T09:30:00.000Z")
    });

    const result = await service.classifyMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(processMessage).toHaveBeenCalledWith({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });
    expect(classifyMessage).toHaveBeenCalledWith({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      subject: "Invoice due Friday",
      fromAddress: "vendor@example.com",
      receivedAt: "2026-04-04T10:00:00.000Z",
      bodyPreview: "Please pay the attached invoice by Friday.",
      bodyText: "Please pay the attached invoice by Friday.",
      uniqueBodyText: "Please pay the attached invoice by Friday.",
      attachments: [
        {
          attachmentId: "attachment_123",
          graphAttachmentId: "graph_attachment_123",
          name: "invoice.pdf",
          contentType: "application/pdf",
          isInline: false,
          attachmentKind: "file",
          isExtractionCandidate: true,
          extractionDecisionReason: "pdf_supported",
          extractionStatus: "completed",
          artifacts: [
            {
              artifactId: "artifact_123",
              artifactKind: "attachment_text",
              storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
              contentHash: "hash_123",
              textLength: 22,
              text: "Invoice number INV-42"
            }
          ]
        },
        {
          attachmentId: "attachment_456",
          graphAttachmentId: "graph_attachment_456",
          name: "scan.pdf",
          contentType: "application/pdf",
          isInline: false,
          attachmentKind: "file",
          isExtractionCandidate: true,
          extractionDecisionReason: "pdf_supported",
          extractionStatus: "completed_with_ocr",
          artifacts: [
            {
              artifactId: "artifact_456",
              artifactKind: "attachment_ocr",
              storageKey: "artifacts/mailbox_123/attachment_456/ocr.txt",
              contentHash: "hash_456",
              confidenceScore: 0.63,
              textLength: 21,
              text: "Scanned payment notice"
            }
          ]
        }
      ]
    });
    expect(readArtifactText).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      idempotencyKey: "mailbox_123:graph_message_123:change_key_456:baseline-classifier:v1",
      classifierVersion: "baseline-classifier:v1",
      processingStatus: "processed",
      classificationStatus: "classified",
      classifiedAt: "2026-04-05T09:30:00.000Z",
      result: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
        classifiedAt: "2026-04-05T09:30:00.000Z",
        classifierVersion: "baseline-classifier:v1",
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        confidenceScore: 0.92,
        explanation: {
          summary: "The message requests invoice payment by a stated due date.",
          lowConfidence: false,
          reasons: [
            {
              code: ClassificationReasonCode.DueDateDetected,
              summary: "A due date appears in the message body."
            }
          ]
        },
        signals: {
          dueDates: [
            {
              id: "due_date_123",
              label: "Invoice due date",
              value: "2026-04-12T00:00:00.000Z",
              confidenceScore: 0.91,
              rationale: "The body says payment is due by April 12.",
              provenance: [
                {
                  sourceKind: "body_text",
                  field: "bodyText"
                }
              ]
            }
          ],
          entities: [],
          taskCandidates: [],
          urgency: {
            level: MessagePriority.High,
            confidenceScore: 0.83,
            rationale: "The due date is near-term.",
            reasons: []
          },
          criticality: {
            level: WorkflowCriticalityLevel.Elevated,
            confidenceScore: 0.79,
            rationale: "Missing payment would create finance follow-up.",
            reasons: []
          }
        }
      }
    });
  });

  it("skips duplicate classification work for an unchanged message version and classifier version", async () => {
    const processMessage = vi.fn().mockResolvedValue({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      graphMessageId: "graph_message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
      idempotencyKey: "mailbox_123:graph_message_123:change_key_456",
      processingStatus: "already_current"
    });
    const classifyMessage = vi.fn();
    const readArtifactText = vi.fn();
    const upsert = vi.fn();

    const service = createPrismaMailboxClassificationService({
      prisma: {
        message: {
          findFirst: vi.fn()
        },
        messageAttachment: {
          findMany: vi.fn()
        },
        extractionArtifact: {
          findMany: vi.fn()
        },
        messageClassification: {
          findFirst: vi.fn().mockResolvedValue({
            mailboxId: "mailbox_123",
            messageId: "message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
            classifierVersion: "baseline-classifier:v1",
            actionability: "ACTIONABLE",
            messageType: "INVOICE",
            confidenceScore: 0.92,
            explanationJson: {
              summary: "Existing stored result.",
              lowConfidence: false,
              reasons: []
            },
            dueDatesJson: [],
            entitiesJson: [],
            taskCandidatesJson: [],
            urgencyLevel: "HIGH",
            urgencyConfidenceScore: 0.8,
            urgencyRationale: "Stored urgency rationale.",
            urgencyReasonsJson: [],
            criticalityLevel: "ELEVATED",
            criticalityConfidenceScore: 0.75,
            criticalityRationale: "Stored criticality rationale.",
            criticalityReasonsJson: [],
            classifiedAt: new Date("2026-04-05T09:30:00.000Z")
          }),
          upsert
        }
      } as never,
      logger: silentLogger(),
      mailboxMessageProcessingService: {
        processMessage
      },
      classificationPath: {
        classifierVersion: "baseline-classifier:v1",
        classifyMessage
      },
      readArtifactText
    });

    const result = await service.classifyMessage({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(classifyMessage).not.toHaveBeenCalled();
    expect(readArtifactText).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(result.classificationStatus).toBe("already_current");
    expect(result.processingStatus).toBe("already_current");
    expect(result.result.messageType).toBe(MessageType.Invoice);
    expect(result.result.explanation.summary).toBe("Existing stored result.");
  });

  it("builds a provenance-aware classification read model for downstream consumers", async () => {
    const service = createPrismaMailboxClassificationService({
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
          findFirst: vi.fn().mockResolvedValue({
            id: "message_123",
            mailboxId: "mailbox_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456"
          })
        },
        messageAttachment: {
          findMany: vi.fn()
        },
        extractionArtifact: {
          findMany: vi.fn()
        },
        messageClassification: {
          findFirst: vi.fn().mockResolvedValue({
            mailboxId: "mailbox_123",
            messageId: "message_123",
            ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
            classifierVersion: "rules-classifier:v1",
            actionability: "ACTIONABLE",
            messageType: "INVOICE",
            confidenceScore: 0.92,
            explanationJson: {
              summary: "The message is actionable because it requests invoice payment by a stated due date.",
              lowConfidence: false,
              reasons: [
                {
                  code: ClassificationReasonCode.DueDateDetected,
                  summary: "A payment deadline was found in the body text.",
                  provenance: [
                    {
                      sourceKind: WorkflowSignalSourceKind.BodyText,
                      field: "bodyText"
                    }
                  ]
                }
              ]
            },
            dueDatesJson: [
              {
                id: "due_date_123",
                label: "Requested due date",
                value: "2026-04-10T00:00:00.000Z",
                confidenceScore: 0.91,
                rationale: "The message says payment is due by Friday.",
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
                id: "entity_123",
                kind: WorkflowEntityKind.Invoice,
                value: "INV-42",
                normalizedValue: "inv-42",
                confidenceScore: 0.89,
                rationale: "The message references a specific invoice identifier.",
                provenance: [
                  {
                    sourceKind: WorkflowSignalSourceKind.MessageMetadata,
                    field: "subject"
                  }
                ]
              }
            ],
            taskCandidatesJson: [
              {
                id: "task_candidate_123",
                title: "Pay invoice INV-42",
                summary: "Suggested from invoice payment language in the message.",
                dueAt: "2026-04-10T00:00:00.000Z",
                confidenceScore: 0.84,
                rationale: "The message is actionable because it asks the recipient to pay.",
                provenance: [
                  {
                    sourceKind: WorkflowSignalSourceKind.BodyText,
                    field: "bodyText"
                  }
                ]
              }
            ],
            urgencyLevel: "HIGH",
            urgencyConfidenceScore: 0.84,
            urgencyRationale: "The message includes a near-term due date, so it should be surfaced quickly.",
            urgencyReasonsJson: [
              {
                code: ClassificationReasonCode.DueDateDetected,
                summary: "A due date is close enough to raise urgency.",
                provenance: [
                  {
                    sourceKind: WorkflowSignalSourceKind.BodyText,
                    field: "bodyText"
                  }
                ]
              }
            ],
            criticalityLevel: "ELEVATED",
            criticalityConfidenceScore: 0.82,
            criticalityRationale: "Invoice messages are elevated criticality because missing payment has finance consequences.",
            criticalityReasonsJson: [
              {
                code: ClassificationReasonCode.InvoiceCueDetected,
                summary: "Invoice payment language makes the message more critical than routine mail.",
                provenance: [
                  {
                    sourceKind: WorkflowSignalSourceKind.MessageMetadata,
                    field: "subject"
                  }
                ]
              }
            ],
            classifiedAt: new Date("2026-04-05T09:30:00.000Z")
          })
        }
      } as never,
      logger: silentLogger(),
      mailboxMessageProcessingService: {
        processMessage: vi.fn()
      }
    });

    const result = await service.getMessageClassificationReadModel({
      session: exampleSession,
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(result).toMatchObject({
      mailboxId: "mailbox_123",
      messageId: "message_123",
      classifierVersion: "rules-classifier:v1",
      confidence: {
        overall: {
          score: 0.92,
          band: "high",
          lowConfidence: false
        },
        signals: {
          dueDates: {
            count: 1,
            maxScore: 0.91
          },
          urgency: {
            score: 0.84,
            band: "high",
            level: MessagePriority.High
          },
          criticality: {
            score: 0.82,
            band: "high",
            level: WorkflowCriticalityLevel.Elevated
          }
        }
      },
      explanation: {
        summary: "The message is actionable because it requests invoice payment by a stated due date.",
        reasons: [
          {
            code: ClassificationReasonCode.DueDateDetected,
            provenance: {
              sourceKinds: [WorkflowSignalSourceKind.BodyText],
              fields: ["bodyText"]
            }
          }
        ]
      },
      signals: {
        summary: {
          dueDateCount: 1,
          entityCount: 1,
          taskCandidateCount: 1,
          nextDueDate: {
            id: "due_date_123",
            value: "2026-04-10T00:00:00.000Z"
          }
        }
      }
    });
  });
});

describe("rules-based mailbox classification path", () => {
  it.each([
    {
      name: "contract signature request as actionable contract",
      job: createJob({
        subject: "Please review and sign the service agreement",
        bodyText: "Attached is the contract for signature. Please sign by Friday."
      }),
      expectedActionability: MessageActionability.Actionable,
      expectedType: MessageType.Contract
    },
    {
      name: "attachment-driven legal notice as actionable notice",
      job: createJob({
        subject: "Documents for your review",
        bodyText: "Please see the attached PDF.",
        attachments: [
          createAttachment({
            attachmentId: "attachment_notice",
            artifactId: "artifact_notice",
            text: "Formal notice of hearing. Response required within seven days."
          })
        ]
      }),
      expectedActionability: MessageActionability.Actionable,
      expectedType: MessageType.Notice
    },
    {
      name: "letter response request as actionable letter",
      job: createJob({
        subject: "Attached letter from counsel",
        bodyText: "Please review the attached letter and respond this week."
      }),
      expectedActionability: MessageActionability.Actionable,
      expectedType: MessageType.Letter
    },
    {
      name: "policy update as informational policy",
      job: createJob({
        subject: "Updated travel policy for FYI",
        bodyText: "For your information, the updated policy is attached. No action required."
      }),
      expectedActionability: MessageActionability.Informational,
      expectedType: MessageType.Policy
    },
    {
      name: "committee minutes as informational committee mail",
      job: createJob({
        subject: "Committee meeting minutes",
        bodyText: "Minutes from the finance committee meeting are attached for reference."
      }),
      expectedActionability: MessageActionability.Informational,
      expectedType: MessageType.Committee
    },
    {
      name: "event RSVP request as actionable event mail",
      job: createJob({
        subject: "Please RSVP for the annual leadership event",
        bodyText: "Register for the event and confirm your attendance by Thursday."
      }),
      expectedActionability: MessageActionability.Actionable,
      expectedType: MessageType.Event
    },
    {
      name: "invoice payment request as actionable invoice",
      job: createJob({
        subject: "Invoice INV-42 payment due Friday",
        bodyText: "Please pay the attached invoice by Friday."
      }),
      expectedActionability: MessageActionability.Actionable,
      expectedType: MessageType.Invoice
    },
    {
      name: "internal team update as informational internal mail",
      job: createJob({
        subject: "Internal team update",
        bodyText: "Internal update from the leadership team for awareness only."
      }),
      expectedActionability: MessageActionability.Informational,
      expectedType: MessageType.Internal
    },
    {
      name: "fyi summary as informational FYI",
      job: createJob({
        subject: "FYI monthly summary",
        bodyText: "For your information, this is a summary only. No action required."
      }),
      expectedActionability: MessageActionability.Informational,
      expectedType: MessageType.Fyi
    }
  ])("classifies $name", async ({ job, expectedActionability, expectedType }) => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(job);

    expect(result.actionability).toBe(expectedActionability);
    expect(result.messageType).toBe(expectedType);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.6);
    expect(result.explanation.summary.length).toBeGreaterThan(0);
    expect(result.explanation.reasons.length).toBeGreaterThan(0);
    expect(Array.isArray(result.signals.dueDates)).toBe(true);
    expect(Array.isArray(result.signals.entities)).toBe(true);
    expect(Array.isArray(result.signals.taskCandidates)).toBe(true);
  });

  it("marks low-confidence ambiguous mail visibly instead of inventing certainty", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Quick note",
        bodyText: "Sharing this update."
      })
    );

    expect(result.messageType).toBe(MessageType.Fyi);
    expect(result.actionability).toBe(MessageActionability.Informational);
    expect(result.confidenceScore).toBeLessThan(0.6);
    expect(result.explanation.lowConfidence).toBe(true);
    expect(result.explanation.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.LowConfidence
        })
      ])
    );
  });

  it("records attachment provenance when attachment evidence drives the classification", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Documents enclosed",
        attachments: [
          createAttachment({
            attachmentId: "attachment_invoice",
            artifactId: "artifact_invoice",
            text: "Invoice 2026-0042. Payment due immediately."
          })
        ]
      })
    );

    expect(result.messageType).toBe(MessageType.Invoice);
    expect(result.explanation.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.AttachmentEvidenceUsed,
          provenance: expect.arrayContaining([
            expect.objectContaining({
              sourceKind: WorkflowSignalSourceKind.AttachmentText,
              attachmentId: "attachment_invoice",
              artifactId: "artifact_invoice"
            })
          ])
        })
      ])
    );
  });

  it("extracts due dates, invoice entities, and a payment task candidate from body text", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Invoice INV-42 payment due Friday",
        bodyText: "Vendor ACME Legal asks that you pay invoice INV-42 by Friday."
      })
    );

    expect(result.messageType).toBe(MessageType.Invoice);
    expect(result.signals.dueDates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Requested due date",
          value: "2026-04-10T00:00:00.000Z",
          provenance: expect.arrayContaining([
            expect.objectContaining({
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText"
            })
          ])
        })
      ])
    );
    expect(result.signals.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: WorkflowEntityKind.Invoice,
          value: "INV-42",
          normalizedValue: "inv-42"
        }),
        expect.objectContaining({
          kind: WorkflowEntityKind.Counterparty,
          value: "ACME Legal",
          normalizedValue: "acme legal"
        })
      ])
    );
    expect(result.signals.taskCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Pay invoice INV-42",
          dueAt: "2026-04-10T00:00:00.000Z",
          provenance: expect.arrayContaining([
            expect.objectContaining({
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText"
            })
          ])
        })
      ])
    );
  });

  it("extracts attachment-derived deadlines, event entities, and RSVP task candidates with provenance", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Leadership summit materials",
        attachments: [
          createAttachment({
            attachmentId: "attachment_event",
            artifactId: "artifact_event",
            text: "Leadership Summit event. Please RSVP within seven days and confirm your attendance."
          })
        ]
      })
    );

    expect(result.messageType).toBe(MessageType.Event);
    expect(result.signals.dueDates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "2026-04-11T00:00:00.000Z",
          provenance: expect.arrayContaining([
            expect.objectContaining({
              sourceKind: WorkflowSignalSourceKind.AttachmentText,
              attachmentId: "attachment_event",
              artifactId: "artifact_event"
            })
          ])
        })
      ])
    );
    expect(result.signals.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: WorkflowEntityKind.Event,
          value: "Leadership Summit",
          normalizedValue: "leadership summit"
        })
      ])
    );
    expect(result.signals.taskCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "RSVP to Leadership Summit",
          dueAt: "2026-04-11T00:00:00.000Z",
          provenance: expect.arrayContaining([
            expect.objectContaining({
              sourceKind: WorkflowSignalSourceKind.AttachmentText,
              attachmentId: "attachment_event",
              artifactId: "artifact_event"
            })
          ])
        })
      ])
    );
  });

  it("extracts committee and document entities from informational mail without inventing task candidates", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Finance committee meeting minutes",
        bodyText: "Minutes from the Finance Committee meeting are attached for reference in the board packet."
      })
    );

    expect(result.messageType).toBe(MessageType.Committee);
    expect(result.signals.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: WorkflowEntityKind.Committee,
          value: "Finance Committee",
          normalizedValue: "finance committee"
        }),
        expect.objectContaining({
          kind: WorkflowEntityKind.Document,
          value: "board packet",
          normalizedValue: "board packet"
        })
      ])
    );
    expect(result.signals.taskCandidates).toEqual([]);
  });

  it("scores a near-due invoice as high urgency and elevated criticality", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        receivedAt: "2026-04-09T10:00:00.000Z",
        subject: "Invoice INV-42 payment due Friday",
        bodyText: "Vendor ACME Legal asks that you pay invoice INV-42 by Friday."
      })
    );

    expect(result.signals.urgency).toEqual(
      expect.objectContaining({
        level: MessagePriority.High
      })
    );
    expect(result.signals.urgency.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.signals.urgency.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.DueDateDetected
        })
      ])
    );
    expect(result.signals.criticality).toEqual(
      expect.objectContaining({
        level: WorkflowCriticalityLevel.Elevated
      })
    );
    expect(result.signals.criticality.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.InvoiceCueDetected
        })
      ])
    );
  });

  it("scores a formal notice as high urgency and critical criticality", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "Formal notice of hearing",
        attachments: [
          createAttachment({
            attachmentId: "attachment_notice_risk",
            artifactId: "artifact_notice_risk",
            text: "Formal notice of hearing. Response required within seven days."
          })
        ]
      })
    );

    expect(result.signals.urgency.level).toBe(MessagePriority.High);
    expect(result.signals.criticality.level).toBe(WorkflowCriticalityLevel.Critical);
    expect(result.signals.criticality.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.NoticeCueDetected
        })
      ])
    );
  });

  it("keeps a clear FYI summary at low urgency and normal criticality", async () => {
    const path = createRulesBasedMailboxClassificationPath();

    const result = await path.classifyMessage(
      createJob({
        subject: "FYI monthly summary",
        bodyText: "For your information, this is a summary only. No action required."
      })
    );

    expect(result.signals.urgency.level).toBe(MessagePriority.Low);
    expect(result.signals.criticality.level).toBe(WorkflowCriticalityLevel.Normal);
    expect(result.signals.urgency.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ClassificationReasonCode.AmbiguousContent
        })
      ])
    );
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

function createJob(overrides: Partial<Parameters<ReturnType<typeof createRulesBasedMailboxClassificationPath>["classifyMessage"]>[0]> = {}) {
  return {
    mailboxId: "mailbox_123",
    messageId: "message_123",
    graphMessageId: "graph_message_123",
    ingestionVersionKey: "mailbox_123:graph_message_123:change_key_456",
    subject: "Message subject",
    fromAddress: "sender@example.com",
    receivedAt: "2026-04-04T10:00:00.000Z",
    bodyPreview: overrides.bodyText,
    bodyText: "",
    uniqueBodyText: "",
    attachments: [],
    ...overrides
  };
}

function createAttachment(input: {
  attachmentId: string;
  artifactId: string;
  text: string;
}) {
  return {
    attachmentId: input.attachmentId,
    graphAttachmentId: `${input.attachmentId}_graph`,
    name: `${input.attachmentId}.pdf`,
    contentType: "application/pdf",
    isInline: false,
    attachmentKind: "file" as const,
    isExtractionCandidate: true,
    extractionDecisionReason: "pdf_supported",
    extractionStatus: ExtractionStatus.Completed,
    artifacts: [
      {
        artifactId: input.artifactId,
        artifactKind: "attachment_text" as const,
        storageKey: `artifacts/mailbox_123/${input.attachmentId}/text.txt`,
        text: input.text
      }
    ]
  };
}
