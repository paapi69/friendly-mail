import {
  FilingDecisionStatus,
  FilingState,
  MailboxActionMode,
  MailboxActionType,
  MessageActionability,
  MessagePriority,
  MessageType,
  MessageWorkflowStatus,
  WorkflowCriticalityLevel,
  type FilingDecisionReadModel
} from "@friendly-mail/contracts";
import { describe, expect, it } from "vitest";

import { deriveFilingDecisionPanelViewModel } from "./filing";

function createDecision(status: FilingDecisionStatus): FilingDecisionReadModel {
  return {
    mailboxId: "mailbox_123",
    messageId: "message_123",
    decision: {
      id: "decision_123",
      mailboxId: "mailbox_123",
      messageId: "message_123",
      workflowStateId: "workflow_state_123",
      actionability: MessageActionability.Actionable,
      status,
      mode: status === FilingDecisionStatus.Executed ? MailboxActionMode.ApprovedApply : MailboxActionMode.SuggestionOnly,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: status === FilingDecisionStatus.Blocked ? ["open_task"] : [],
      targetFolderId: "folder_archive",
      targetFolderGraphId: "graph_folder_archive",
      targetFolderName: "Archive",
      suggestedCategories: ["FriendlyMail/Actionable", "FriendlyMail/Notice"],
      summary:
        status === FilingDecisionStatus.Blocked
          ? "Filing stays blocked until the review task is resolved."
          : status === FilingDecisionStatus.Executed
            ? "The message is filed and no delayed-filing blockers remain."
            : "The message is eligible to file to Archive and can apply 2 mailbox categories.",
      rationale: "Target folder: Archive (mailbox_folder).",
      sourceMessageIsRead: true,
      decidedAt: "2026-04-11T04:00:00.000Z",
      executedAt:
        status === FilingDecisionStatus.Executed ? "2026-04-11T04:03:00.000Z" : undefined,
      lastErrorMessage:
        status === FilingDecisionStatus.Failed ? "Graph move failed." : undefined
    },
    workflowState: {
      id: "workflow_state_123",
      mailboxId: "mailbox_123",
      messageId: "message_123",
      actionability: MessageActionability.Actionable,
      status: MessageWorkflowStatus.FilingBlocked,
      filingState:
        status === FilingDecisionStatus.Executed ? FilingState.Filed : FilingState.FilingBlocked,
      priority: MessagePriority.High,
      criticality: WorkflowCriticalityLevel.Critical,
      isEligibleToFile: status !== FilingDecisionStatus.Blocked,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: status === FilingDecisionStatus.Blocked ? ["open_task"] : [],
      blockingTaskIds: status === FilingDecisionStatus.Blocked ? ["task_123"] : [],
      unresolvedTaskCount: status === FilingDecisionStatus.Blocked ? 1 : 0,
      openTaskCount: status === FilingDecisionStatus.Blocked ? 1 : 0,
      snoozedTaskCount: 0,
      delegatedTaskCount: 0,
      informationalReadRequired: false,
      messageIsRead: true,
      lastEvaluatedAt: "2026-04-11T04:00:00.000Z"
    },
    filingEligibility: {
      mailboxId: "mailbox_123",
      messageId: "message_123",
      workflowStateId: "workflow_state_123",
      state:
        status === FilingDecisionStatus.Executed ? FilingState.Filed : FilingState.FilingBlocked,
      isEligible: status !== FilingDecisionStatus.Blocked,
      requirements: ["all_required_tasks_resolved"],
      blockedBy: status === FilingDecisionStatus.Blocked ? ["open_task"] : [],
      summary:
        status === FilingDecisionStatus.Blocked
          ? "Filing stays blocked until the review task is resolved."
          : "The message is eligible to file because all required task work is resolved.",
      evaluatedAt: "2026-04-11T04:00:00.000Z"
    },
    classification: {
      ingestionVersionKey: "ingestion_123",
      classifierVersion: "rules-classifier:v1",
      actionability: MessageActionability.Actionable,
      messageType: MessageType.Notice,
      confidenceScore: 0.91,
      explanationSummary: "Formal notice with filing guidance."
    },
    targetFolder: {
      id: "folder_archive",
      graphFolderId: "graph_folder_archive",
      name: "Archive",
      source: "mailbox_folder"
    },
    recommendedActions: [
      {
        actionType: MailboxActionType.ApplyCategory,
        mode: MailboxActionMode.SuggestionOnly,
        summary: "Apply FriendlyMail/Notice before filing the message."
      },
      {
        actionType: MailboxActionType.MoveMessage,
        mode: MailboxActionMode.SuggestionOnly,
        summary: "Move the message to Archive when delayed-filing rules allow it."
      }
    ]
  };
}

describe("deriveFilingDecisionPanelViewModel", () => {
  it("shows blockers when filing remains blocked", () => {
    const viewModel = deriveFilingDecisionPanelViewModel({
      readinessStatus: "ready",
      decision: createDecision(FilingDecisionStatus.Blocked),
      error: null,
      isLoading: false
    });

    expect(viewModel.status).toBe("blocked");
    expect(viewModel.canApprove).toBe(false);
    expect(viewModel.blockerRows[0]?.label).toBe("Open Task");
  });

  it("offers explicit approval when the message is eligible to file", () => {
    const viewModel = deriveFilingDecisionPanelViewModel({
      readinessStatus: "ready",
      decision: createDecision(FilingDecisionStatus.Eligible),
      error: null,
      isLoading: false
    });

    expect(viewModel.status).toBe("ready");
    expect(viewModel.canApprove).toBe(true);
    expect(viewModel.primaryActionLabel).toBe("Approve filing");
  });

  it("shows an executed state after filing has been applied", () => {
    const viewModel = deriveFilingDecisionPanelViewModel({
      readinessStatus: "ready",
      decision: createDecision(FilingDecisionStatus.Executed),
      error: null,
      isLoading: false
    });

    expect(viewModel.status).toBe("executed");
    expect(viewModel.statusBadge).toBe("Filed");
    expect(viewModel.canApprove).toBe(false);
  });
});
