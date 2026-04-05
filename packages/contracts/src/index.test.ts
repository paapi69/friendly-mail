import { describe, expect, it } from "vitest";
import {
  AttachmentKind,
  AuditEventAction,
  AuditEventRecord,
  AuthProvider,
  ClassificationReasonCode,
  ExtractionArtifactKind,
  ExtractionArtifactRecord,
  ExtractionStatus,
  FilingEligibility,
  FilingDecisionReadModel,
  FilingDecisionStatus,
  type MessageWorkflowStateRecord,
  FilingState,
  FolderSyncStateRecord,
  FolderSyncStatus,
  GraphSubscriptionRecord,
  GraphSubscriptionStatus,
  MailboxKind,
  MailboxOperationalVerificationReport,
  MailboxConnectionRecord,
  MailboxConnectionStatus,
  MailboxActionExecutionResult,
  MailboxActionMode,
  MailboxActionStatus,
  MailboxActionType,
  MailboxRecord,
  MailboxActionVerificationReport,
  MailboxTaskWorkflowVerificationReport,
  MessageAttachmentRecord,
  MessageRecord,
  MessageActionability,
  MessageBodyContentType,
  MessageClassificationResult,
  type MailboxClassificationVerificationReport,
  type MessageClassificationReadModel,
  MessageWorkflowReadModel,
  MessagePriority,
  MessageType,
  MessageWorkflowStatus,
  OperationalHealthStatus,
  OutgoingSequenceRecord,
  WorkflowCriticalityLevel,
  TaskLifecycleEventRecord,
  TaskMaterializationResult,
  TaskSourceKind,
  TaskSourceLinkRecord,
  TaskTransitionRequest,
  TaskTransitionResult,
  TaskWorkflowReadModel,
  WorkflowEntityKind,
  WorkflowSignalSourceKind,
  SharedMailboxReadinessReport,
  SharedMailboxReadinessStatus,
  TaskRecord,
  TaskStatusReason,
  TaskStatus,
  TenantUserRole,
  VerificationCheckStatus
} from "./index";

describe("shared workflow contracts", () => {
  it("exposes the delayed filing states", () => {
    expect(FilingState.EligibleToFile).toBe("eligible_to_file");
    expect(FilingState.FilingBlocked).toBe("filing_blocked");
  });

  it("captures core message actionability states", () => {
    expect(MessageActionability.Actionable).toBe("actionable");
    expect(MessageActionability.Informational).toBe("informational");
  });

  it("defines the MVP task lifecycle states", () => {
    expect(TaskStatus.Done).toBe("done");
    expect(TaskStatus.Dismissed).toBe("dismissed");
    expect(TaskStatusReason.ResolvedByWorkflow).toBe("resolved_by_workflow");
  });

  it("defines Epic 5 workflow-state and task-source vocabulary", () => {
    expect(TaskSourceKind.ClassificationTaskCandidate).toBe("classification_task_candidate");
    expect(MessageWorkflowStatus.PendingTaskMaterialization).toBe(
      "pending_task_materialization"
    );
    expect(MessageWorkflowStatus.EligibleToFile).toBe("eligible_to_file");
  });

  it("defines Epic 6 mailbox-action audit vocabulary", () => {
    expect(AuditEventAction.MessageForwarded).toBe("message.forwarded");
    expect(AuditEventAction.MessageNumbered).toBe("message.numbered");
  });

  it("defines internal auth providers and tenant roles", () => {
    expect(AuthProvider.LocalPassword).toBe("local_password");
    expect(TenantUserRole.Admin).toBe("admin");
  });

  it("defines mailbox connectivity and sync-state contracts", () => {
    const connection: MailboxConnectionRecord = {
      id: "connection_123",
      mailboxId: "mailbox_123",
      tenantId: "tenant_123",
      userId: "user_123",
      graphTenantId: "entra_tenant_123",
      graphUserId: "graph_user_123",
      status: MailboxConnectionStatus.Active,
      grantedScopes: ["Mail.Read", "User.Read"],
      connectedAt: "2026-04-01T10:00:00.000Z",
      accessTokenExpiresAt: "2026-04-01T11:00:00.000Z"
    };
    const folderSync: FolderSyncStateRecord = {
      id: "folder_sync_123",
      mailboxId: "mailbox_123",
      folderId: "folder_123",
      status: FolderSyncStatus.Active,
      deltaLink: "https://graph.microsoft.com/delta-token",
      lastCursorUpdatedAt: "2026-04-01T10:10:00.000Z"
    };
    const subscription: GraphSubscriptionRecord = {
      id: "subscription_123",
      mailboxId: "mailbox_123",
      graphSubscriptionId: "graph_subscription_123",
      resource: "/me/messages",
      changeTypes: ["created", "updated"],
      status: GraphSubscriptionStatus.Active,
      notificationUrl: "https://friendlymail.dev/webhooks/graph",
      expiresAt: "2026-04-01T13:00:00.000Z"
    };

    expect(connection.status).toBe("active");
    expect(folderSync.status).toBe("active");
    expect(subscription.status).toBe("active");
  });

  it("defines mailbox, message, task, and audit contracts shared across surfaces", () => {
    const mailbox: MailboxRecord = {
      id: "mailbox_123",
      tenantId: "tenant_123",
      displayName: "Legal Inbox",
      emailAddress: "legal@friendlymail.dev",
      kind: MailboxKind.Shared,
      graphMailboxId: "graph_mailbox_123"
    };
    const message: MessageRecord = {
      id: "message_123",
      mailboxId: mailbox.id,
      folderId: "folder_123",
      graphMessageId: "graph_message_123",
      graphParentFolderId: "graph_folder_inbox",
      graphChangeKey: "change_key_123",
      internetMessageId: "<message-123@example.com>",
      conversationId: "conversation_123",
      subject: "Invoice due Friday",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      priority: MessagePriority.Critical,
      filingState: FilingState.ActiveActionable,
      fromAddress: "vendor@example.com",
      receivedAt: "2026-03-31T11:00:00.000Z",
      lastGraphModifiedAt: "2026-03-31T11:01:00.000Z",
      isRead: false,
      bodyPreview: "Invoice due Friday",
      bodyContentType: MessageBodyContentType.Text,
      bodyText: "Please pay the attached invoice by Friday.",
      hasAttachments: true,
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123"
    };
    const attachment: MessageAttachmentRecord = {
      id: "attachment_123",
      mailboxId: mailbox.id,
      messageId: message.id,
      graphMessageId: message.graphMessageId,
      graphAttachmentId: "graph_attachment_123",
      name: "invoice.pdf",
      contentType: "application/pdf",
      sizeInBytes: 120400,
      isInline: false,
      attachmentKind: AttachmentKind.File,
      isExtractionCandidate: true,
      extractionDecisionReason: "pdf_supported",
      extractionStatus: ExtractionStatus.Pending,
      extractionAttempts: 0
    };
    const artifact: ExtractionArtifactRecord = {
      id: "artifact_123",
      mailboxId: mailbox.id,
      messageId: message.id,
      attachmentId: attachment.id,
      artifactKind: ExtractionArtifactKind.AttachmentText,
      storageKey: "artifacts/mailbox_123/attachment_123/text.txt",
      textLength: 4210,
      sourceVersionKey: "mailbox_123:graph_message_123:change_key_123",
      createdAt: "2026-03-31T11:06:00.000Z"
    };
    const task: TaskRecord = {
      id: "task_123",
      mailboxId: mailbox.id,
      sourceMessageId: message.id,
      sourceTaskCandidateId: "task_candidate_123",
      title: "Pay invoice",
      criticality: WorkflowCriticalityLevel.Elevated,
      status: TaskStatus.Open,
      priority: MessagePriority.High,
      createdAt: "2026-03-31T11:05:00.000Z"
    };
    const filing: FilingEligibility = {
      mailboxId: mailbox.id,
      messageId: message.id,
      state: FilingState.ActiveActionable,
      isEligible: false,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: ["open_task"],
      summary: "The message still has unresolved workflow work.",
      evaluatedAt: "2026-03-31T11:07:00.000Z"
    };
    const audit: AuditEventRecord = {
      id: "audit_123",
      tenantId: mailbox.tenantId,
      action: AuditEventAction.MessageFiled,
      entityType: "message",
      entityId: message.id,
      occurredAt: "2026-03-31T11:10:00.000Z",
      actor: "system"
    };

    expect(mailbox.kind).toBe("shared");
    expect(message.folderId).toBe("folder_123");
    expect(message.graphParentFolderId).toBe("graph_folder_inbox");
    expect(message.bodyContentType).toBe("text");
    expect(message.messageType).toBe("invoice");
    expect(attachment.attachmentKind).toBe("file");
    expect(artifact.artifactKind).toBe("attachment_text");
    expect(task.priority).toBe("high");
    expect(task.criticality).toBe("elevated");
    expect(filing.blockedBy[0]).toBe("open_task");
    expect(audit.action).toBe("message.filed");
  });

  it("defines task-source links, lifecycle events, and message workflow-state records for Epic 5", () => {
    const task: TaskRecord = {
      id: "task_123",
      mailboxId: "mailbox_123",
      sourceMessageId: "message_123",
      sourceTaskCandidateId: "task_candidate_123",
      title: "Pay Acme Supplies invoice",
      description: "Review and pay the invoice before the due date.",
      status: TaskStatus.Open,
      priority: MessagePriority.High,
      criticality: WorkflowCriticalityLevel.Elevated,
      ownerUserId: "user_owner",
      assignedUserId: "user_assignee",
      dueAt: "2026-04-12T00:00:00.000Z",
      createdAt: "2026-04-05T11:00:00.000Z",
      updatedAt: "2026-04-05T11:00:00.000Z"
    };
    const sourceLink: TaskSourceLinkRecord = {
      id: "task_link_123",
      mailboxId: task.mailboxId,
      taskId: task.id,
      messageId: "message_123",
      sourceKind: TaskSourceKind.ClassificationTaskCandidate,
      classificationIngestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
      classifierVersion: "rules-classifier:v1",
      taskCandidateId: "task_candidate_123",
      dueDateSignalIds: ["due_date_123"],
      entitySignalIds: ["entity_123"],
      provenance: [
        {
          sourceKind: WorkflowSignalSourceKind.BodyText,
          field: "bodyText"
        }
      ],
      createdAt: "2026-04-05T11:00:00.000Z"
    };
    const lifecycleEvent: TaskLifecycleEventRecord = {
      id: "task_event_123",
      mailboxId: task.mailboxId,
      taskId: task.id,
      fromStatus: TaskStatus.Open,
      toStatus: TaskStatus.Delegated,
      reason: TaskStatusReason.Delegated,
      actorUserId: "user_owner",
      delegatedToUserId: "user_delegate",
      note: "Finance will handle payment.",
      occurredAt: "2026-04-05T11:15:00.000Z"
    };
    const workflowState: MessageWorkflowStateRecord = {
      id: "workflow_state_123",
      mailboxId: task.mailboxId,
      messageId: "message_123",
      actionability: MessageActionability.Actionable,
      status: MessageWorkflowStatus.FilingBlocked,
      filingState: FilingState.FilingBlocked,
      priority: MessagePriority.High,
      criticality: WorkflowCriticalityLevel.Elevated,
      isEligibleToFile: false,
      requirements: ["all_required_tasks_resolved", "critical_work_cleared"],
      blockedBy: ["open_task", "critical_work_remaining"],
      blockingTaskIds: [task.id],
      unresolvedTaskCount: 1,
      openTaskCount: 1,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      informationalReadRequired: false,
      messageIsRead: true,
      lastEvaluatedAt: "2026-04-05T11:20:00.000Z"
    };

    expect(sourceLink.sourceKind).toBe("classification_task_candidate");
    expect(lifecycleEvent.toStatus).toBe("delegated");
    expect(workflowState.status).toBe("filing_blocked");
    expect(workflowState.blockedBy).toContain("critical_work_remaining");
  });

  it("defines Epic 5 workflow read models, transitions, materialization, and verification outputs", () => {
    const taskReadModel: TaskWorkflowReadModel = {
      task: {
        id: "task_123",
        mailboxId: "mailbox_123",
        sourceMessageId: "message_123",
        sourceTaskCandidateId: "task_candidate_123",
        title: "Pay Acme Supplies invoice",
        status: TaskStatus.Open,
        priority: MessagePriority.High,
        criticality: WorkflowCriticalityLevel.Elevated,
        ownerUserId: "user_123",
        assignedUserId: "user_123",
        createdAt: "2026-04-05T11:00:00.000Z"
      },
      sourceLinks: [
        {
          id: "task_link_123",
          mailboxId: "mailbox_123",
          taskId: "task_123",
          messageId: "message_123",
          sourceKind: TaskSourceKind.ClassificationTaskCandidate,
          classificationIngestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
          classifierVersion: "rules-classifier:v1",
          taskCandidateId: "task_candidate_123",
          dueDateSignalIds: ["due_date_123"],
          entitySignalIds: ["entity_123"],
          provenance: [
            {
              sourceKind: WorkflowSignalSourceKind.BodyText,
              field: "bodyText"
            }
          ],
          createdAt: "2026-04-05T11:00:00.000Z"
        }
      ],
      latestLifecycleEvent: {
        id: "task_event_123",
        mailboxId: "mailbox_123",
        taskId: "task_123",
        toStatus: TaskStatus.Open,
        reason: TaskStatusReason.ResolvedByWorkflow,
        occurredAt: "2026-04-05T11:00:00.000Z"
      },
      sourceMessage: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        subject: "Invoice due Friday",
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        filingState: FilingState.ActiveActionable
      }
    };
    const workflowReadModel: MessageWorkflowReadModel = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      workflowState: {
        id: "workflow_state_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        actionability: MessageActionability.Actionable,
        status: MessageWorkflowStatus.ActiveActionable,
        filingState: FilingState.ActiveActionable,
        priority: MessagePriority.High,
        criticality: WorkflowCriticalityLevel.Elevated,
        isEligibleToFile: false,
        requirements: ["all_required_tasks_resolved"],
        blockedBy: ["open_task"],
        blockingTaskIds: ["task_123"],
        unresolvedTaskCount: 1,
        openTaskCount: 1,
        snoozedTaskCount: 0,
        delegatedTaskCount: 0,
        informationalReadRequired: false,
        messageIsRead: false,
        lastEvaluatedAt: "2026-04-05T11:05:00.000Z"
      },
      filingEligibility: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowStateId: "workflow_state_123",
        state: FilingState.ActiveActionable,
        isEligible: false,
        requirements: ["all_required_tasks_resolved"],
        blockedBy: ["open_task"],
        summary: "The message stays active because at least one workflow task is still unresolved.",
        evaluatedAt: "2026-04-05T11:05:00.000Z"
      },
      classification: {
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-classifier:v1",
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        confidenceScore: 0.91,
        explanationSummary: "The message requests invoice payment by a stated due date."
      },
      tasks: [taskReadModel]
    };
    const materialization: TaskMaterializationResult = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Actionable,
      materializationStatus: "materialized",
      createdTaskCount: 1,
      reusedTaskCount: 0,
      materializedAt: "2026-04-05T11:00:00.000Z",
      workflowState: workflowReadModel.workflowState,
      filingEligibility: workflowReadModel.filingEligibility,
      tasks: [taskReadModel]
    };
    const transitionRequest: TaskTransitionRequest = {
      status: TaskStatus.Delegated,
      reason: TaskStatusReason.Delegated,
      assignedUserId: "user_delegate",
      note: "Please take the finance follow-up."
    };
    const transitionResult: TaskTransitionResult = {
      mailboxId: "mailbox_123",
      task: taskReadModel,
      workflowState: workflowReadModel.workflowState,
      filingEligibility: workflowReadModel.filingEligibility
    };
    const verification: MailboxTaskWorkflowVerificationReport = {
      mailboxId: "mailbox_123",
      checkedAt: "2026-04-05T11:10:00.000Z",
      overallStatus: OperationalHealthStatus.Warning,
      coverage: {
        classifiedActionableMessages: 4,
        messagesWithTaskCandidates: 3,
        messagesWithMaterializedTasks: 2,
        pendingMaterializationMessages: 1,
        workflowStateMessages: 2,
        totalTasks: 2
      },
      integrity: {
        orphanedTaskIds: [],
        taskIdsMissingSourceLinks: [],
        messageIdsMissingWorkflowState: ["message_999"],
        messageIdsMarkedEligibleWithUnresolvedTasks: [],
        invalidLifecycleTaskIds: []
      },
      checks: [
        {
          code: "workflow_state_coverage",
          status: VerificationCheckStatus.Warn,
          detail: "One actionable message still lacks a workflow-state projection."
        }
      ]
    };

    expect(workflowReadModel.tasks[0]?.task.title).toBe("Pay Acme Supplies invoice");
    expect(materialization.createdTaskCount).toBe(1);
    expect(transitionRequest.status).toBe("delegated");
    expect(transitionResult.workflowState?.blockedBy).toContain("open_task");
    expect(verification.integrity.messageIdsMissingWorkflowState).toEqual(["message_999"]);
  });

  it("defines shared-mailbox readiness and operational verification contracts", () => {
    const sharedMailboxReadiness: SharedMailboxReadinessReport = {
      sourceMailboxId: "mailbox_123",
      sharedMailboxAddress: "legal@friendlymail.dev",
      checkedAt: "2026-04-03T12:00:00.000Z",
      status: SharedMailboxReadinessStatus.Limited,
      fallbackMode: "recommendation_only",
      grantedScopes: ["Mail.Read.Shared", "User.Read"],
      requiredScopes: ["Mail.Read.Shared", "Mail.ReadWrite.Shared"],
      capabilities: {
        delegatedSharedFolderRead: true,
        webhookBackedSync: false,
        backgroundDeltaRepair: false,
        sendWorkflowActions: false
      },
      checks: [
        {
          code: "shared_scope_present",
          status: VerificationCheckStatus.Pass,
          detail: "Delegated shared-mail scopes are available."
        }
      ]
    };
    const operationalVerification: MailboxOperationalVerificationReport = {
      mailboxId: "mailbox_123",
      checkedAt: "2026-04-03T12:00:00.000Z",
      overallStatus: OperationalHealthStatus.Warning,
      subscription: {
        graphSubscriptionId: "graph_subscription_123",
        status: GraphSubscriptionStatus.Active,
        health: OperationalHealthStatus.Warning,
        expiresAt: "2026-04-04T00:00:00.000Z",
        minutesUntilExpiry: 720
      },
      deltaSync: {
        trackedFolders: 1,
        healthyFolders: 0,
        staleFolders: 1,
        failedFolders: 0,
        missingCursorFolders: 0,
        maxCursorLagMinutes: 95,
        folders: [
          {
            folderId: "folder_123",
            displayName: "Inbox",
            status: FolderSyncStatus.Idle,
            lastCursorUpdatedAt: "2026-04-03T10:25:00.000Z",
            cursorLagMinutes: 95
          }
        ]
      },
      immutableIds: {
        status: "enforced",
        messageReads: true,
        messageLists: true,
        deltaQueries: true,
        subscriptionCreation: true
      },
      checks: [
        {
          code: "immutable_ids_enforced",
          status: VerificationCheckStatus.Pass,
          detail: "Connector keeps immutable IDs enabled on supported message paths."
        }
      ]
    };

    expect(sharedMailboxReadiness.status).toBe("limited");
    expect(operationalVerification.overallStatus).toBe("warning");
    expect(operationalVerification.immutableIds.subscriptionCreation).toBe(true);
  });

  it("defines classification, explanation, and workflow-signal contracts separately from task state", () => {
    const classification: MessageClassificationResult = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
      classifiedAt: "2026-04-05T09:30:00.000Z",
      classifierVersion: "rules-and-model:v1",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
      confidenceScore: 0.92,
      explanation: {
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
          },
          {
            code: ClassificationReasonCode.InvoiceCueDetected,
            summary: "The message and attachment both signal invoice handling.",
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "subject"
              },
              {
                sourceKind: WorkflowSignalSourceKind.AttachmentText,
                attachmentId: "attachment_123",
                field: "textLength"
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
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "bodyText"
              }
            ]
          }
        ],
        entities: [
          {
            id: "entity_123",
            kind: WorkflowEntityKind.Counterparty,
            value: "Acme Supplies Ltd.",
            normalizedValue: "acme supplies ltd",
            confidenceScore: 0.88,
            rationale: "The sender and invoice content identify the vendor.",
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.MessageMetadata,
                field: "fromAddress"
              },
              {
                sourceKind: WorkflowSignalSourceKind.AttachmentText,
                attachmentId: "attachment_123",
                field: "textLength"
              }
            ]
          }
        ],
        taskCandidates: [
          {
            id: "task_candidate_123",
            title: "Pay Acme Supplies invoice",
            summary: "Review and pay the attached invoice before the due date.",
            dueAt: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.9,
            rationale: "The message directly requests invoice payment.",
            provenance: [
              {
                sourceKind: WorkflowSignalSourceKind.BodyText,
                field: "bodyText"
              },
              {
                sourceKind: WorkflowSignalSourceKind.AttachmentText,
                attachmentId: "attachment_123",
                field: "textLength"
              }
            ]
          }
        ],
        urgency: {
          level: MessagePriority.High,
          confidenceScore: 0.86,
          rationale: "The due date is near enough to require prompt attention.",
          reasons: [
            {
              code: ClassificationReasonCode.DueDateDetected,
              summary: "A near-term due date raises urgency."
            }
          ]
        },
        criticality: {
          level: WorkflowCriticalityLevel.Elevated,
          confidenceScore: 0.79,
          rationale: "Invoices approaching their due date should remain visible.",
          reasons: [
            {
              code: ClassificationReasonCode.InvoiceCueDetected,
              summary: "Invoice handling is a high-trust workflow path."
            }
          ]
        }
      }
    };

    expect(classification.actionability).toBe("actionable");
    expect(classification.signals.entities[0]?.kind).toBe("counterparty");
    expect(classification.signals.urgency.level).toBe("high");
    expect(classification.signals.criticality.level).toBe("elevated");
    expect(classification.explanation.reasons[0]?.provenance?.[0]?.sourceKind).toBe("body_text");
  });

  it("defines a downstream classification read model with confidence and provenance summaries", () => {
    const readModel: MessageClassificationReadModel = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
      classifiedAt: "2026-04-05T09:30:00.000Z",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Invoice,
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
          entities: {
            count: 2,
            maxScore: 0.88
          },
          taskCandidates: {
            count: 1,
            maxScore: 0.9
          },
          urgency: {
            score: 0.86,
            band: "high",
            level: MessagePriority.High
          },
          criticality: {
            score: 0.79,
            band: "high",
            level: WorkflowCriticalityLevel.Elevated
          }
        }
      },
      explanation: {
        summary: "The message is actionable because it requests invoice payment by a stated due date.",
        lowConfidence: false,
        reasons: [
          {
            code: ClassificationReasonCode.DueDateDetected,
            summary: "A payment deadline was found in the body text.",
            provenance: {
              sourceKinds: [WorkflowSignalSourceKind.BodyText],
              attachmentIds: [],
              artifactIds: [],
              fields: ["bodyText"]
            }
          }
        ],
        urgency: {
          level: MessagePriority.High,
          rationale: "The due date is near enough to require prompt attention.",
          reasons: []
        },
        criticality: {
          level: WorkflowCriticalityLevel.Elevated,
          rationale: "Invoices approaching their due date should remain visible.",
          reasons: []
        }
      },
      signals: {
        summary: {
          dueDateCount: 1,
          entityCount: 2,
          taskCandidateCount: 1,
          nextDueDate: {
            id: "due_date_123",
            label: "Invoice due date",
            value: "2026-04-12T00:00:00.000Z",
            confidenceScore: 0.91
          },
          topEntities: [
            {
              id: "entity_123",
              kind: WorkflowEntityKind.Counterparty,
              value: "Acme Supplies Ltd.",
              normalizedValue: "acme supplies ltd",
              confidenceScore: 0.88
            }
          ],
          topTaskCandidates: [
            {
              id: "task_candidate_123",
              title: "Pay Acme Supplies invoice",
              dueAt: "2026-04-12T00:00:00.000Z",
              confidenceScore: 0.9
            }
          ]
        },
        dueDates: [],
        entities: [],
        taskCandidates: []
      }
    };

    expect(readModel.confidence.overall.band).toBe("high");
    expect(readModel.explanation.reasons[0]?.provenance.sourceKinds[0]).toBe("body_text");
    expect(readModel.signals.summary.taskCandidateCount).toBe(1);
  });

  it("defines a mailbox classification verification report for Epic 4 rollout readiness", () => {
    const report: MailboxClassificationVerificationReport = {
      mailboxId: "mailbox_123",
      checkedAt: "2026-04-05T12:00:00.000Z",
      overallStatus: OperationalHealthStatus.Warning,
      coverage: {
        trackedMessages: 6,
        eligibleMessages: 5,
        classifiedMessages: 4,
        pendingClassificationMessages: 1,
        actionableMessages: 2,
        informationalMessages: 2,
        messageTypeCounts: [
          {
            messageType: MessageType.Invoice,
            count: 1
          },
          {
            messageType: MessageType.Notice,
            count: 1
          }
        ]
      },
      confidence: {
        averageScore: 0.71,
        lowConfidenceMessages: 1,
        mediumConfidenceMessages: 1,
        highConfidenceMessages: 2,
        ambiguousMessages: 1
      },
      signals: {
        messagesWithDueDates: 2,
        messagesWithEntities: 3,
        messagesWithTaskCandidates: 2,
        messagesWithCriticality: 4,
        highRiskMessages: 2,
        highRiskMessagesWithDueDates: 1
      },
      degradedCases: {
        lowConfidenceMessageIds: ["message_5"],
        ambiguousMessageIds: ["message_5"],
        highRiskMissingDueDateMessageIds: ["message_4"]
      },
      checks: [
        {
          code: "classification_coverage",
          status: VerificationCheckStatus.Warn,
          detail: "1 ingested message is still pending classification."
        }
      ]
    };

    expect(report.coverage.classifiedMessages).toBe(4);
    expect(report.confidence.highConfidenceMessages).toBe(2);
    expect(report.degradedCases.highRiskMissingDueDateMessageIds[0]).toBe("message_4");
  });

  it("defines a filing decision read model for delayed filing and mailbox actions", () => {
    const readModel: FilingDecisionReadModel = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      decision: {
        id: "filing_decision_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowStateId: "workflow_state_123",
        actionability: MessageActionability.Actionable,
        status: FilingDecisionStatus.Eligible,
        mode: MailboxActionMode.SuggestionOnly,
        requirements: ["all_required_tasks_resolved"],
        blockedBy: [],
        targetFolderId: "folder_123",
        targetFolderGraphId: "graph_folder_archive",
        targetFolderName: "Archive",
        suggestedCategories: ["FriendlyMail/Actionable", "FriendlyMail/Invoice"],
        summary: "The message is ready to file because all required work is resolved.",
        rationale: "The task is complete and no filing blockers remain.",
        sourceMessageIsRead: true,
        decidedAt: "2026-04-05T14:00:00.000Z"
      },
      workflowState: {
        id: "workflow_state_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        actionability: MessageActionability.Actionable,
        status: MessageWorkflowStatus.EligibleToFile,
        filingState: FilingState.EligibleToFile,
        priority: MessagePriority.High,
        criticality: WorkflowCriticalityLevel.Elevated,
        isEligibleToFile: true,
        requirements: ["all_required_tasks_resolved"],
        blockedBy: [],
        blockingTaskIds: [],
        unresolvedTaskCount: 0,
        openTaskCount: 0,
        snoozedTaskCount: 0,
        delegatedTaskCount: 0,
        informationalReadRequired: false,
        messageIsRead: true,
        lastEvaluatedAt: "2026-04-05T13:58:00.000Z"
      },
      filingEligibility: {
        mailboxId: "mailbox_123",
        messageId: "message_123",
        workflowStateId: "workflow_state_123",
        state: FilingState.EligibleToFile,
        isEligible: true,
        requirements: ["all_required_tasks_resolved"],
        blockedBy: [],
        targetFolderId: "folder_123",
        summary: "The message is ready to file.",
        evaluatedAt: "2026-04-05T13:58:00.000Z"
      },
      classification: {
        ingestionVersionKey: "mailbox_123:graph_message_123:change_key_123",
        classifierVersion: "rules-classifier:v1",
        actionability: MessageActionability.Actionable,
        messageType: MessageType.Invoice,
        confidenceScore: 0.93,
        explanationSummary: "This invoice is actionable and due soon."
      },
      targetFolder: {
        id: "folder_123",
        graphFolderId: "graph_folder_archive",
        name: "Archive",
        source: "mailbox_folder"
      },
      recommendedActions: [
        {
          actionType: MailboxActionType.ApplyCategory,
          mode: MailboxActionMode.SuggestionOnly,
          summary: "Apply Friendly Mail categories before filing."
        },
        {
          actionType: MailboxActionType.MoveMessage,
          mode: MailboxActionMode.SuggestionOnly,
          summary: "Move the message into Archive."
        }
      ]
    };

    expect(readModel.decision.status).toBe("eligible");
    expect(readModel.recommendedActions[0]?.actionType).toBe("apply_category");
    expect(readModel.targetFolder?.source).toBe("mailbox_folder");
  });

  it("defines mailbox action execution and verification records for Epic 6", () => {
    const executionResult: MailboxActionExecutionResult = {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      decision: {
        id: "filing_decision_123",
        mailboxId: "mailbox_123",
        messageId: "message_123",
        actionability: MessageActionability.Informational,
        status: FilingDecisionStatus.Executed,
        mode: MailboxActionMode.AutoApply,
        requirements: ["message_read"],
        blockedBy: [],
        targetFolderName: "Archive",
        suggestedCategories: ["FriendlyMail/FYI"],
        summary: "The informational message was filed after it was read.",
        sourceMessageIsRead: true,
        decidedAt: "2026-04-05T14:10:00.000Z",
        executedAt: "2026-04-05T14:10:05.000Z"
      },
      attempts: [
        {
          id: "attempt_123",
          mailboxId: "mailbox_123",
          messageId: "message_123",
          filingDecisionId: "filing_decision_123",
          actionType: MailboxActionType.MoveMessage,
          mode: MailboxActionMode.AutoApply,
          status: MailboxActionStatus.Succeeded,
          targetFolderGraphId: "archive",
          targetFolderName: "Archive",
          graphMessageId: "graph_message_123",
          attemptedAt: "2026-04-05T14:10:05.000Z",
          completedAt: "2026-04-05T14:10:06.000Z"
        }
      ],
      message: {
        graphMessageId: "graph_message_123",
        graphParentFolderId: "archive",
        filingState: FilingState.Filed
      }
    };

    const sequence: OutgoingSequenceRecord = {
      id: "sequence_123",
      mailboxId: "mailbox_123",
      sequenceKey: "default",
      prefix: "FM-2026",
      lastAllocatedValue: 42,
      updatedAt: "2026-04-05T14:12:00.000Z"
    };

    const verification: MailboxActionVerificationReport = {
      mailboxId: "mailbox_123",
      checkedAt: "2026-04-05T14:30:00.000Z",
      overallStatus: OperationalHealthStatus.Warning,
      coverage: {
        trackedMessages: 4,
        decisions: 3,
        eligibleDecisions: 2,
        executedDecisions: 1,
        attempts: 3,
        succeededAttempts: 2,
        failedAttempts: 1
      },
      integrity: {
        messageIdsMissingDecision: ["message_999"],
        decisionIdsMissingAttempts: ["filing_decision_777"],
        decisionIdsWithFailedLatestAttempt: ["filing_decision_555"],
        messageIdsFiledWithoutSucceededMove: []
      },
      capabilityGaps: {
        routingBlockedMessageIds: ["message_456"],
        numberingBlockedMessageIds: ["message_789"]
      },
      checks: [
        {
          code: "mailbox_action_failures",
          status: VerificationCheckStatus.Warn,
          detail: "1 mailbox action failed and needs review."
        }
      ]
    };

    expect(executionResult.attempts[0]?.status).toBe("succeeded");
    expect(sequence.lastAllocatedValue).toBe(42);
    expect(verification.capabilityGaps.routingBlockedMessageIds[0]).toBe("message_456");
  });
});
