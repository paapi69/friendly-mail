import { describe, expect, it, vi } from "vitest";
import {
  AttachmentKind,
  allocateOutgoingSequenceNumber,
  createMailboxActionAttempt,
  ExtractionArtifactKind,
  ExtractionStatus,
  createLocalUser,
  createTaskLifecycleEvent,
  databaseTables,
  markMailboxMessageRemoved,
  upsertFilingDecision,
  MessageWorkflowStatus,
  MessageActionability,
  MessagePriority,
  MessageType,
  recordAuditEvent,
  TaskSourceKind,
  TaskStatus,
  TaskStatusReason,
  upsertMessageWorkflowState,
  upsertMessageClassification,
  upsertAttachmentExtractionArtifact,
  upsertMailboxMessageContent,
  upsertMessageAttachment,
  upsertMailboxMessage,
  upsertMailboxFolder,
  upsertFolderSyncState,
  upsertGraphSubscription,
  upsertMailboxConnection,
  upsertTaskRecord,
  upsertTaskSourceLink,
  UserRole,
  WorkflowCriticalityLevel
} from "./index";

describe("database baseline", () => {
  it("tracks the core MVP tables", () => {
    expect(databaseTables).toEqual([
      "Tenant",
      "User",
      "TenantMembership",
      "Session",
      "Mailbox",
      "MailboxConnection",
      "Folder",
      "FolderSyncState",
      "GraphSubscription",
      "Message",
      "MessageAttachment",
      "ExtractionArtifact",
      "MessageClassification",
      "Task",
      "TaskSourceLink",
      "TaskLifecycleEvent",
      "MessageWorkflowState",
      "FilingDecision",
      "MailboxActionAttempt",
      "OutgoingSequence",
      "AuditEvent"
    ]);
  });

  it("records audit events with serialized payloads", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "audit_123"
    });

    await recordAuditEvent(
      {
        auditEvent: { create }
      },
      {
        tenantId: "tenant_123",
        actor: "system",
        action: "message.filed",
        entityType: "message",
        entityId: "msg_123",
        messageId: "msg_123",
        payload: {
          fromFolderId: "inbox",
          toFolderId: "archive"
        }
      }
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant_123",
        actor: "system",
        action: "message.filed",
        entityType: "message",
        entityId: "msg_123",
        messageId: "msg_123",
        payloadJson: JSON.stringify({
          fromFolderId: "inbox",
          toFolderId: "archive"
        })
      }
    });
  });

  it("creates local users with a tenant membership", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "user_123"
    });

    await createLocalUser(
      {
        user: {
          upsert
        }
      },
      {
        email: "owner@friendlymail.dev",
        displayName: "Owner",
        passwordHash: "hash",
        tenantId: "tenant_123",
        role: UserRole.ADMIN
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        email: "owner@friendlymail.dev"
      },
      update: {
        displayName: "Owner",
        authProvider: "LOCAL_PASSWORD",
        passwordHash: "hash"
      },
      create: {
        email: "owner@friendlymail.dev",
        displayName: "Owner",
        authProvider: "LOCAL_PASSWORD",
        passwordHash: "hash",
        memberships: {
          create: {
            tenantId: "tenant_123",
            role: UserRole.ADMIN
          }
        }
      },
      include: {
        memberships: true
      }
    });
  });

  it("upserts mailbox connections with normalized scopes and nullable state", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "connection_123"
    });
    const connectedAt = new Date("2026-04-01T10:00:00.000Z");
    const expiresAt = new Date("2026-04-01T11:00:00.000Z");

    await upsertMailboxConnection(
      {
        mailboxConnection: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", " User.Read ", "Mail.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        connectedAt,
        accessTokenExpiresAt: expiresAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123"
      },
      update: {
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", "User.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        accessTokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: null,
        connectedAt,
        lastValidatedAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        tenantId: "tenant_123",
        userId: "user_123",
        graphTenantId: "entra_tenant_123",
        graphUserId: "graph_user_123",
        status: "ACTIVE",
        grantedScopes: ["Mail.Read", "User.Read"],
        accessTokenCiphertext: "ciphertext_access",
        refreshTokenCiphertext: "ciphertext_refresh",
        accessTokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: null,
        connectedAt,
        lastValidatedAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });

  it("upserts folder sync state with delta-link tracking", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "folder_sync_123"
    });
    const lastSyncedAt = new Date("2026-04-01T10:15:00.000Z");

    await upsertFolderSyncState(
      {
        folderSyncState: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        folderId: "folder_123"
      },
      update: {
        mailboxId: "mailbox_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt,
        lastCursorUpdatedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        deltaLink: "https://graph.microsoft.com/delta-token",
        syncStatus: "ACTIVE",
        lastSyncedAt,
        lastCursorUpdatedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });

  it("upserts mailbox folders with parent linkage", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "folder_123"
    });

    await upsertMailboxFolder(
      {
        folder: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        graphFolderId: "graph_folder_123",
        displayName: "Contracts",
        parentGraphFolderId: "graph_root_folder"
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        graphFolderId: "graph_folder_123"
      },
      update: {
        mailboxId: "mailbox_123",
        displayName: "Contracts",
        parentGraphFolderId: "graph_root_folder",
        isSyncEnabled: true
      },
      create: {
        mailboxId: "mailbox_123",
        graphFolderId: "graph_folder_123",
        displayName: "Contracts",
        parentGraphFolderId: "graph_root_folder",
        isSyncEnabled: true
      }
    });
  });

  it("upserts graph subscriptions with normalized change types", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "graph_subscription_123"
    });
    const expiresAt = new Date("2026-04-01T13:00:00.000Z");

    await upsertGraphSubscription(
      {
        graphSubscription: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        resource: "/me/messages",
        changeTypes: ["updated", "created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        status: "ACTIVE",
        expiresAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        graphSubscriptionId: "subscription_123"
      },
      update: {
        mailboxId: "mailbox_123",
        resource: "/me/messages",
        changeTypes: ["created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        lifecycleNotificationUrl: null,
        clientStateHash: null,
        status: "ACTIVE",
        expiresAt,
        lastValidatedAt: null,
        lastNotificationAt: null,
        lastLifecycleEventAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      },
      create: {
        mailboxId: "mailbox_123",
        graphSubscriptionId: "subscription_123",
        resource: "/me/messages",
        changeTypes: ["created", "updated"],
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        lifecycleNotificationUrl: null,
        clientStateHash: null,
        status: "ACTIVE",
        expiresAt,
        lastValidatedAt: null,
        lastNotificationAt: null,
        lastLifecycleEventAt: null,
        lastReauthorizedAt: null,
        lastErrorCode: null,
        lastErrorAt: null
      }
    });
  });

  it("upserts mailbox messages with stable sync metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "message_123"
    });
    const receivedAt = new Date("2026-04-02T05:00:00.000Z");
    const modifiedAt = new Date("2026-04-02T05:05:00.000Z");

    await upsertMailboxMessage(
      {
        message: {
          upsert
        }
      },
      {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        graphMessageId: "graph_message_123",
        graphParentFolderId: "graph_folder_inbox",
        graphChangeKey: "change_key_123",
        internetMessageId: "<message-123@example.com>",
        conversationId: "conversation_123",
        subject: "Invoice due Friday",
        fromAddress: "vendor@example.com",
        receivedAt,
        lastGraphModifiedAt: modifiedAt,
        isRead: false
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        graphMessageId: "graph_message_123"
      },
      update: {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        graphParentFolderId: "graph_folder_inbox",
        graphChangeKey: "change_key_123",
        internetMessageId: "<message-123@example.com>",
        conversationId: "conversation_123",
        subject: "Invoice due Friday",
        fromAddress: "vendor@example.com",
        receivedAt,
        lastGraphModifiedAt: modifiedAt,
        isRead: false,
        graphRemovedAt: null,
        graphRemovalReason: null
      },
      create: {
        mailboxId: "mailbox_123",
        folderId: "folder_123",
        graphMessageId: "graph_message_123",
        graphParentFolderId: "graph_folder_inbox",
        graphChangeKey: "change_key_123",
        internetMessageId: "<message-123@example.com>",
        conversationId: "conversation_123",
        subject: "Invoice due Friday",
        fromAddress: "vendor@example.com",
        receivedAt,
        lastGraphModifiedAt: modifiedAt,
        isRead: false,
        graphRemovedAt: null,
        graphRemovalReason: null
      }
    });
  });

  it("marks mailbox messages removed without deleting internal workflow history", async () => {
    const updateMany = vi.fn().mockResolvedValue({
      count: 1
    });
    const removedAt = new Date("2026-04-02T05:10:00.000Z");

    await markMailboxMessageRemoved(
      {
        message: {
          updateMany
        }
      },
      {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123",
        graphRemovalReason: "deleted",
        graphRemovedAt: removedAt
      }
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123"
      },
      data: {
        folderId: null,
        graphParentFolderId: null,
        graphRemovedAt: removedAt,
        graphRemovalReason: "deleted"
      }
    });
  });

  it("upserts normalized message-body content for Epic 3 ingestion", async () => {
    const updateMany = vi.fn().mockResolvedValue({
      count: 1
    });
    const ingestedAt = new Date("2026-04-04T07:15:00.000Z");

    await upsertMailboxMessageContent(
      {
        message: {
          updateMany
        }
      },
      {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123",
        bodyPreview: "Please review the attached notice.",
        bodyContentType: "TEXT",
        bodyText: "Please review the attached notice.\n\nRegards,\nLegal Team",
        uniqueBodyText: "Please review the attached notice.",
        webLink: "https://outlook.office.com/mail/message",
        hasAttachments: true,
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        ingestedAt
      }
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123"
      },
      data: {
        bodyPreview: "Please review the attached notice.",
        bodyContentType: "TEXT",
        bodyText: "Please review the attached notice.\n\nRegards,\nLegal Team",
        uniqueBodyText: "Please review the attached notice.",
        webLink: "https://outlook.office.com/mail/message",
        hasAttachments: true,
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        ingestedAt,
        lastIngestedAt: ingestedAt
      }
    });
  });

  it("upserts attachment inventory records with extraction state", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "attachment_123"
    });
    const modifiedAt = new Date("2026-04-04T07:20:00.000Z");

    await upsertMessageAttachment(
      {
        messageAttachment: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphAttachmentId: "graph_attachment_123",
        name: "notice.pdf",
        contentType: "application/pdf",
        sizeInBytes: 204800,
        isInline: false,
        attachmentKind: AttachmentKind.FILE,
        lastGraphModifiedAt: modifiedAt,
        isExtractionCandidate: true,
        extractionDecisionReason: "pdf_supported",
        extractionStatus: ExtractionStatus.PENDING
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        mailboxId_graphAttachmentId: {
          mailboxId: "mailbox_123",
          graphAttachmentId: "graph_attachment_123"
        }
      },
      update: {
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        name: "notice.pdf",
        contentType: "application/pdf",
        sizeInBytes: 204800,
        isInline: false,
        attachmentKind: AttachmentKind.FILE,
        lastGraphModifiedAt: modifiedAt,
        isExtractionCandidate: true,
        extractionDecisionReason: "pdf_supported",
        extractionStatus: ExtractionStatus.PENDING,
        extractionAttempts: 0,
        lastExtractionAt: null,
        lastExtractionErrorCode: null
      },
      create: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        graphMessageId: "graph_message_123",
        graphAttachmentId: "graph_attachment_123",
        name: "notice.pdf",
        contentType: "application/pdf",
        sizeInBytes: 204800,
        isInline: false,
        attachmentKind: AttachmentKind.FILE,
        lastGraphModifiedAt: modifiedAt,
        isExtractionCandidate: true,
        extractionDecisionReason: "pdf_supported",
        extractionStatus: ExtractionStatus.PENDING,
        extractionAttempts: 0,
        lastExtractionAt: null,
        lastExtractionErrorCode: null
      }
    });
  });

  it("upserts extraction artifacts with storage references and provenance", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "artifact_123"
    });
    const createdAt = new Date("2026-04-04T07:30:00.000Z");

    await upsertAttachmentExtractionArtifact(
      {
        extractionArtifact: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        attachmentId: "attachment_123",
        artifactKind: ExtractionArtifactKind.ATTACHMENT_TEXT,
        storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
        textLength: 4210,
        contentHash: "sha256:abc123",
        confidenceScore: 0.98,
        sourceVersionKey: "mailbox_123:graph_message_123:change_key_123",
        createdAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        attachmentId_artifactKind: {
          attachmentId: "attachment_123",
        artifactKind: ExtractionArtifactKind.ATTACHMENT_TEXT
        }
      },
      update: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
        textLength: 4210,
        contentHash: "sha256:abc123",
        confidenceScore: 0.98,
        sourceVersionKey: "mailbox_123:graph_message_123:change_key_123",
        createdAt
      },
      create: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        attachmentId: "attachment_123",
        artifactKind: ExtractionArtifactKind.ATTACHMENT_TEXT,
        storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
        textLength: 4210,
        contentHash: "sha256:abc123",
        confidenceScore: 0.98,
        sourceVersionKey: "mailbox_123:graph_message_123:change_key_123",
        createdAt
      }
    });
  });

  it("upserts versioned message classifications with durable workflow-signal storage", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "classification_123"
    });
    const classifiedAt = new Date("2026-04-05T10:00:00.000Z");

    await upsertMessageClassification(
      {
        messageClassification: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-and-model:v1",
        classifiedAt,
        actionability: MessageActionability.ACTIONABLE,
        messageType: MessageType.INVOICE,
        confidenceScore: 0.92,
        explanation: {
          summary: "The message requests payment by a stated due date.",
          lowConfidence: false,
          reasons: [
            {
              code: "DUE_DATE_DETECTED",
              summary: "The body contains a payment deadline.",
              provenance: [
                {
                  sourceKind: "BODY_TEXT",
                  field: "bodyText"
                }
              ]
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
                  sourceKind: "BODY_TEXT",
                  field: "bodyText"
                },
                {
                  sourceKind: "ATTACHMENT_TEXT",
                  attachmentId: "attachment_123",
                  artifactId: "artifact_123",
                  field: "textLength"
                }
              ]
            }
          ],
          entities: [
            {
              id: "entity_123",
              kind: "INVOICE",
              value: "Invoice INV-2026-0042",
              normalizedValue: "INV-2026-0042",
              confidenceScore: 0.88,
              rationale: "The invoice number appears in the PDF text.",
              provenance: [
                {
                  sourceKind: "ATTACHMENT_TEXT",
                  attachmentId: "attachment_123",
                  artifactId: "artifact_123",
                  field: "textLength"
                }
              ]
            }
          ],
          taskCandidates: [
            {
              id: "task_candidate_123",
              title: "Pay invoice INV-2026-0042",
              summary: "Review and pay the attached invoice.",
              dueAt: "2026-04-12T00:00:00.000Z",
              confidenceScore: 0.9,
              rationale: "The message explicitly requests payment before the due date.",
              provenance: [
                {
                  sourceKind: "BODY_TEXT",
                  field: "subject"
                }
              ]
            }
          ],
          urgency: {
            level: MessagePriority.HIGH,
            confidenceScore: 0.86,
            rationale: "A near-term due date makes the message time-sensitive.",
            reasons: [
              {
                code: "DUE_DATE_DETECTED",
                summary: "A concrete due date was detected in the message."
              }
            ]
          },
          criticality: {
            level: WorkflowCriticalityLevel.ELEVATED,
            confidenceScore: 0.81,
            rationale: "Missing the payment deadline creates avoidable finance risk.",
            reasons: [
              {
                code: "INVOICE_CUE_DETECTED",
                summary: "Invoice handling is a business-critical workflow."
              }
            ]
          }
        }
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        messageId_ingestionVersionKey_classifierVersion: {
          messageId: "message_123",
          ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
          classifierVersion: "rules-and-model:v1"
        }
      },
      update: {
        mailboxId: "mailbox_123",
        actionability: MessageActionability.ACTIONABLE,
        messageType: MessageType.INVOICE,
        confidenceScore: 0.92,
        explanationSummary: "The message requests payment by a stated due date.",
        explanationLowConfidence: false,
        explanationJson: {
          summary: "The message requests payment by a stated due date.",
          lowConfidence: false,
          reasons: [
            {
              code: "DUE_DATE_DETECTED",
              summary: "The body contains a payment deadline.",
              provenance: [
                {
                  sourceKind: "BODY_TEXT",
                  field: "bodyText"
                }
              ]
            }
          ]
        },
        dueDatesJson: [
          {
            id: "due_date_123",
            label: "Invoice due date",
            value: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.91,
            rationale: "The body says payment is due by April 12.",
            provenance: [
              {
                sourceKind: "BODY_TEXT",
                field: "bodyText"
              },
              {
                sourceKind: "ATTACHMENT_TEXT",
                attachmentId: "attachment_123",
                artifactId: "artifact_123",
                field: "textLength"
              }
            ]
          }
        ],
        entitiesJson: [
          {
            id: "entity_123",
            kind: "INVOICE",
            value: "Invoice INV-2026-0042",
            normalizedValue: "INV-2026-0042",
            confidenceScore: 0.88,
            rationale: "The invoice number appears in the PDF text.",
            provenance: [
              {
                sourceKind: "ATTACHMENT_TEXT",
                attachmentId: "attachment_123",
                artifactId: "artifact_123",
                field: "textLength"
              }
            ]
          }
        ],
        taskCandidatesJson: [
          {
            id: "task_candidate_123",
            title: "Pay invoice INV-2026-0042",
            summary: "Review and pay the attached invoice.",
            dueAt: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.9,
            rationale: "The message explicitly requests payment before the due date.",
            provenance: [
              {
                sourceKind: "BODY_TEXT",
                field: "subject"
              }
            ]
          }
        ],
        urgencyLevel: MessagePriority.HIGH,
        urgencyConfidenceScore: 0.86,
        urgencyRationale: "A near-term due date makes the message time-sensitive.",
        urgencyReasonsJson: [
          {
            code: "DUE_DATE_DETECTED",
            summary: "A concrete due date was detected in the message."
          }
        ],
        criticalityLevel: WorkflowCriticalityLevel.ELEVATED,
        criticalityConfidenceScore: 0.81,
        criticalityRationale: "Missing the payment deadline creates avoidable finance risk.",
        criticalityReasonsJson: [
          {
            code: "INVOICE_CUE_DETECTED",
            summary: "Invoice handling is a business-critical workflow."
          }
        ],
        sourceAttachmentIds: ["attachment_123"],
        sourceArtifactIds: ["artifact_123"],
        classifiedAt
      },
      create: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-and-model:v1",
        actionability: MessageActionability.ACTIONABLE,
        messageType: MessageType.INVOICE,
        confidenceScore: 0.92,
        explanationSummary: "The message requests payment by a stated due date.",
        explanationLowConfidence: false,
        explanationJson: {
          summary: "The message requests payment by a stated due date.",
          lowConfidence: false,
          reasons: [
            {
              code: "DUE_DATE_DETECTED",
              summary: "The body contains a payment deadline.",
              provenance: [
                {
                  sourceKind: "BODY_TEXT",
                  field: "bodyText"
                }
              ]
            }
          ]
        },
        dueDatesJson: [
          {
            id: "due_date_123",
            label: "Invoice due date",
            value: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.91,
            rationale: "The body says payment is due by April 12.",
            provenance: [
              {
                sourceKind: "BODY_TEXT",
                field: "bodyText"
              },
              {
                sourceKind: "ATTACHMENT_TEXT",
                attachmentId: "attachment_123",
                artifactId: "artifact_123",
                field: "textLength"
              }
            ]
          }
        ],
        entitiesJson: [
          {
            id: "entity_123",
            kind: "INVOICE",
            value: "Invoice INV-2026-0042",
            normalizedValue: "INV-2026-0042",
            confidenceScore: 0.88,
            rationale: "The invoice number appears in the PDF text.",
            provenance: [
              {
                sourceKind: "ATTACHMENT_TEXT",
                attachmentId: "attachment_123",
                artifactId: "artifact_123",
                field: "textLength"
              }
            ]
          }
        ],
        taskCandidatesJson: [
          {
            id: "task_candidate_123",
            title: "Pay invoice INV-2026-0042",
            summary: "Review and pay the attached invoice.",
            dueAt: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.9,
            rationale: "The message explicitly requests payment before the due date.",
            provenance: [
              {
                sourceKind: "BODY_TEXT",
                field: "subject"
              }
            ]
          }
        ],
        urgencyLevel: MessagePriority.HIGH,
        urgencyConfidenceScore: 0.86,
        urgencyRationale: "A near-term due date makes the message time-sensitive.",
        urgencyReasonsJson: [
          {
            code: "DUE_DATE_DETECTED",
            summary: "A concrete due date was detected in the message."
          }
        ],
        criticalityLevel: WorkflowCriticalityLevel.ELEVATED,
        criticalityConfidenceScore: 0.81,
        criticalityRationale: "Missing the payment deadline creates avoidable finance risk.",
        criticalityReasonsJson: [
          {
            code: "INVOICE_CUE_DETECTED",
            summary: "Invoice handling is a business-critical workflow."
          }
        ],
        sourceAttachmentIds: ["attachment_123"],
        sourceArtifactIds: ["artifact_123"],
        classifiedAt
      }
    });
  });

  it("stores empty provenance linkage arrays when classification output only references message text", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "classification_124"
    });

    await upsertMessageClassification(
      {
        messageClassification: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_456",
        ingestionVersionKey: "mailbox_123:graph_message_456:change_key_123",
        classifierVersion: "rules-and-model:v1",
        actionability: MessageActionability.INFORMATIONAL,
        messageType: MessageType.FYI,
        confidenceScore: 0.71,
        explanation: {
          summary: "The message shares information without requesting follow-up.",
          lowConfidence: false,
          reasons: [
            {
              code: "AMBIGUOUS_CONTENT",
              summary: "The message body reads like an FYI update.",
              provenance: [
                {
                  sourceKind: "BODY_TEXT",
                  field: "bodyText"
                }
              ]
            }
          ]
        },
        signals: {
          dueDates: [],
          entities: [],
          taskCandidates: [],
          urgency: {
            level: MessagePriority.NORMAL,
            confidenceScore: 0.64,
            rationale: "No near-term deadline was found.",
            reasons: []
          },
          criticality: {
            level: WorkflowCriticalityLevel.NORMAL,
            confidenceScore: 0.67,
            rationale: "The message appears informational only.",
            reasons: []
          }
        }
      }
    );

    const call = upsert.mock.calls[0]?.[0];

    expect(call.update.sourceAttachmentIds).toEqual([]);
    expect(call.update.sourceArtifactIds).toEqual([]);
    expect(call.create.sourceAttachmentIds).toEqual([]);
    expect(call.create.sourceArtifactIds).toEqual([]);
  });

  it("upserts Epic 5 task records with ownership, criticality, and resolution metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "task_123"
    });
    const createdAt = new Date("2026-04-05T12:00:00.000Z");
    const updatedAt = new Date("2026-04-05T12:05:00.000Z");
    const dueAt = new Date("2026-04-12T00:00:00.000Z");
    const snoozedUntil = new Date("2026-04-08T09:00:00.000Z");

    await upsertTaskRecord(
      {
        task: {
          upsert: upsert as never
        }
      },
      {
        taskKey: "task:mailbox_123:message_123:task_candidate_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        sourceTaskCandidateId: "task_candidate_123",
        title: "Pay invoice INV-2026-0042",
        description: "Review and pay the attached invoice before the due date.",
        status: TaskStatus.OPEN,
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        ownerUserId: "user_owner",
        assignedUserId: "user_assignee",
        delegatedByUserId: "user_delegate",
        snoozedUntil,
        dueAt,
        createdAt,
        updatedAt,
        resolvedAt: null,
        resolutionReason: null,
        resolutionNote: null
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        taskKey: "task:mailbox_123:message_123:task_candidate_123"
      },
      update: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        sourceTaskCandidateId: "task_candidate_123",
        title: "Pay invoice INV-2026-0042",
        description: "Review and pay the attached invoice before the due date.",
        status: TaskStatus.OPEN,
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        ownerUserId: "user_owner",
        assignedUserId: "user_assignee",
        delegatedByUserId: "user_delegate",
        snoozedUntil,
        dueAt,
        createdAt,
        updatedAt,
        resolvedAt: null,
        resolutionReason: null,
        resolutionNote: null
      },
      create: {
        taskKey: "task:mailbox_123:message_123:task_candidate_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        sourceTaskCandidateId: "task_candidate_123",
        title: "Pay invoice INV-2026-0042",
        description: "Review and pay the attached invoice before the due date.",
        status: TaskStatus.OPEN,
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        ownerUserId: "user_owner",
        assignedUserId: "user_assignee",
        delegatedByUserId: "user_delegate",
        snoozedUntil,
        dueAt,
        createdAt,
        updatedAt,
        resolvedAt: null,
        resolutionReason: null,
        resolutionNote: null
      }
    });
  });

  it("upserts task source links with classifier lineage and signal linkage", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "task_source_link_123"
    });
    const createdAt = new Date("2026-04-05T12:10:00.000Z");

    await upsertTaskSourceLink(
      {
        taskSourceLink: {
          upsert: upsert as never
        }
      },
      {
        taskId: "task_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        sourceKind: TaskSourceKind.CLASSIFICATION_TASK_CANDIDATE,
        classificationIngestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-classifier:v1",
        taskCandidateId: "task_candidate_123",
        dueDateSignalIds: ["due_date_123"],
        entitySignalIds: ["entity_123", "entity_124"],
        provenance: [
          {
            sourceKind: "BODY_TEXT",
            field: "bodyText"
          },
          {
            sourceKind: "ATTACHMENT_TEXT",
            attachmentId: "attachment_123",
            artifactId: "artifact_123",
            field: "textLength"
          }
        ],
        createdAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        taskId_sourceKind_messageId_taskCandidateId: {
          taskId: "task_123",
          sourceKind: TaskSourceKind.CLASSIFICATION_TASK_CANDIDATE,
          messageId: "message_123",
          taskCandidateId: "task_candidate_123"
        }
      },
      update: {
        mailboxId: "mailbox_123",
        classificationIngestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-classifier:v1",
        dueDateSignalIds: ["due_date_123"],
        entitySignalIds: ["entity_123", "entity_124"],
        provenanceJson: [
          {
            sourceKind: "BODY_TEXT",
            field: "bodyText"
          },
          {
            sourceKind: "ATTACHMENT_TEXT",
            attachmentId: "attachment_123",
            artifactId: "artifact_123",
            field: "textLength"
          }
        ],
        createdAt
      },
      create: {
        taskId: "task_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        sourceKind: TaskSourceKind.CLASSIFICATION_TASK_CANDIDATE,
        classificationIngestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-classifier:v1",
        taskCandidateId: "task_candidate_123",
        dueDateSignalIds: ["due_date_123"],
        entitySignalIds: ["entity_123", "entity_124"],
        provenanceJson: [
          {
            sourceKind: "BODY_TEXT",
            field: "bodyText"
          },
          {
            sourceKind: "ATTACHMENT_TEXT",
            attachmentId: "attachment_123",
            artifactId: "artifact_123",
            field: "textLength"
          }
        ],
        createdAt
      }
    });
  });

  it("creates lifecycle events for auditable task transitions", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "task_event_123"
    });
    const occurredAt = new Date("2026-04-05T12:20:00.000Z");

    await createTaskLifecycleEvent(
      {
        taskLifecycleEvent: {
          create: create as never
        }
      },
      {
        mailboxId: "mailbox_123",
        taskId: "task_123",
        fromStatus: TaskStatus.OPEN,
        toStatus: TaskStatus.DELEGATED,
        reason: TaskStatusReason.DELEGATED,
        actorUserId: "user_owner",
        delegatedToUserId: "user_delegate",
        note: "Finance team will handle this invoice.",
        occurredAt
      }
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        mailboxId: "mailbox_123",
        taskId: "task_123",
        fromStatus: TaskStatus.OPEN,
        toStatus: TaskStatus.DELEGATED,
        reason: TaskStatusReason.DELEGATED,
        actorUserId: "user_owner",
        delegatedToUserId: "user_delegate",
        note: "Finance team will handle this invoice.",
        occurredAt
      }
    });
  });

  it("upserts message workflow state with blocker arrays and task counts", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "workflow_state_123"
    });
    const lastEvaluatedAt = new Date("2026-04-05T12:30:00.000Z");

    await upsertMessageWorkflowState(
      {
        messageWorkflowState: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        actionability: MessageActionability.ACTIONABLE,
        status: MessageWorkflowStatus.FILING_BLOCKED,
        filingState: "FILING_BLOCKED",
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        isEligibleToFile: false,
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED", "CRITICAL_WORK_CLEARED"],
        blockedBy: ["CRITICAL_WORK_REMAINING", "OPEN_TASK"],
        blockingTaskIds: ["task_123"],
        unresolvedTaskCount: 1,
        openTaskCount: 1,
        snoozedTaskCount: 0,
        delegatedTaskCount: 0,
        informationalReadRequired: false,
        messageIsRead: true,
        lastEvaluatedAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        messageId: "message_123"
      },
      update: {
        mailboxId: "mailbox_123",
        actionability: MessageActionability.ACTIONABLE,
        status: MessageWorkflowStatus.FILING_BLOCKED,
        filingState: "FILING_BLOCKED",
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        isEligibleToFile: false,
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED", "CRITICAL_WORK_CLEARED"],
        blockedBy: ["CRITICAL_WORK_REMAINING", "OPEN_TASK"],
        blockingTaskIds: ["task_123"],
        unresolvedTaskCount: 1,
        openTaskCount: 1,
        snoozedTaskCount: 0,
        delegatedTaskCount: 0,
        informationalReadRequired: false,
        messageIsRead: true,
        lastEvaluatedAt
      },
      create: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        actionability: MessageActionability.ACTIONABLE,
        status: MessageWorkflowStatus.FILING_BLOCKED,
        filingState: "FILING_BLOCKED",
        priority: MessagePriority.HIGH,
        criticality: WorkflowCriticalityLevel.ELEVATED,
        isEligibleToFile: false,
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED", "CRITICAL_WORK_CLEARED"],
        blockedBy: ["CRITICAL_WORK_REMAINING", "OPEN_TASK"],
        blockingTaskIds: ["task_123"],
        unresolvedTaskCount: 1,
        openTaskCount: 1,
        snoozedTaskCount: 0,
        delegatedTaskCount: 0,
        informationalReadRequired: false,
        messageIsRead: true,
        lastEvaluatedAt
      }
    });
  });

  it("upserts filing decisions with folder targets and action readiness metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "filing_decision_123"
    });
    const decidedAt = new Date("2026-04-05T14:00:00.000Z");

    await upsertFilingDecision(
      {
        filingDecision: {
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowStateId: "workflow_state_123",
        actionability: "ACTIONABLE",
        status: "ELIGIBLE",
        mode: "SUGGESTION_ONLY",
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        suggestedCategories: ["FriendlyMail/Actionable", "FriendlyMail/Invoice"],
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED"],
        blockedBy: [],
        summary: "The message is ready to file.",
        rationale: "No unresolved blockers remain.",
        sourceMessageIsRead: true,
        decidedAt
      }
    );

    expect(upsert).toHaveBeenCalledWith({
      where: {
        messageId: "message_123"
      },
      update: {
        mailboxId: "mailbox_123",
        workflowStateId: "workflow_state_123",
        actionability: "ACTIONABLE",
        status: "ELIGIBLE",
        mode: "SUGGESTION_ONLY",
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        suggestedCategories: ["FriendlyMail/Actionable", "FriendlyMail/Invoice"],
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED"],
        blockedBy: [],
        summary: "The message is ready to file.",
        rationale: "No unresolved blockers remain.",
        sourceMessageIsRead: true,
        approvedByUserId: null,
        decidedAt,
        executedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null
      },
      create: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowStateId: "workflow_state_123",
        actionability: "ACTIONABLE",
        status: "ELIGIBLE",
        mode: "SUGGESTION_ONLY",
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        suggestedCategories: ["FriendlyMail/Actionable", "FriendlyMail/Invoice"],
        requirements: ["ALL_REQUIRED_TASKS_RESOLVED"],
        blockedBy: [],
        summary: "The message is ready to file.",
        rationale: "No unresolved blockers remain.",
        sourceMessageIsRead: true,
        approvedByUserId: null,
        decidedAt,
        executedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null
      }
    });
  });

  it("creates mailbox action attempts with auditable action outcome fields", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "attempt_123"
    });
    const attemptedAt = new Date("2026-04-05T14:10:00.000Z");
    const completedAt = new Date("2026-04-05T14:10:05.000Z");

    await createMailboxActionAttempt(
      {
        mailboxActionAttempt: {
          create: create as never
        }
      },
      {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        filingDecisionId: "filing_decision_123",
        actionType: "MOVE_MESSAGE",
        mode: "AUTO_APPLY",
        status: "SUCCEEDED",
        actorUserId: "user_123",
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        graphMessageId: "graph_message_123",
        graphRequestId: "request_123",
        attemptedAt,
        completedAt
      }
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        filingDecisionId: "filing_decision_123",
        actionType: "MOVE_MESSAGE",
        mode: "AUTO_APPLY",
        status: "SUCCEEDED",
        actorUserId: "user_123",
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        categoryName: null,
        forwardedTo: null,
        referenceNumber: null,
        graphMessageId: "graph_message_123",
        graphRequestId: "request_123",
        errorCode: null,
        errorMessage: null,
        attemptedAt,
        completedAt
      }
    });
  });

  it("allocates outgoing reference numbers from a durable mailbox sequence", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      lastAllocatedValue: 41
    });
    const upsert = vi.fn().mockResolvedValue({
      id: "sequence_123"
    });

    const result = await allocateOutgoingSequenceNumber(
      {
        outgoingSequence: {
          findUnique: findUnique as never,
          upsert: upsert as never
        }
      },
      {
        mailboxId: "mailbox_123",
        sequenceKey: "default",
        prefix: "FM-2026"
      }
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        mailboxId_sequenceKey: {
          mailboxId: "mailbox_123",
          sequenceKey: "default"
        }
      }
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        mailboxId_sequenceKey: {
          mailboxId: "mailbox_123",
          sequenceKey: "default"
        }
      },
      update: {
        prefix: "FM-2026",
        lastAllocatedValue: 42
      },
      create: {
        mailboxId: "mailbox_123",
        sequenceKey: "default",
        prefix: "FM-2026",
        lastAllocatedValue: 42
      }
    });
    expect(result).toEqual({
      sequenceKey: "default",
      prefix: "FM-2026",
      value: 42,
      referenceNumber: "FM-2026-0042"
    });
  });
});
