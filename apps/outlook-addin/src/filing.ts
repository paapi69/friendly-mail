import {
  FilingDecisionStatus,
  MailboxActionMode,
  type FilingDecisionReadModel
} from "@friendly-mail/contracts";

import type { AddinApiErrorKind } from "./api";
import type { MailboxReadinessStatus } from "./readiness";

export type FilingPanelStatus =
  | "waiting-workflow"
  | "loading"
  | "ready"
  | "blocked"
  | "executed"
  | "failed-read";

export interface FilingDecisionPanelViewModel {
  status: FilingPanelStatus;
  headline: string;
  summary: string;
  statusBadge: string;
  targetFolderLabel: string;
  targetFolderMeta: string;
  categoryLabels: string[];
  blockerRows: Array<{ label: string; value: string }>;
  recommendedActionRows: string[];
  rationale?: string;
  primaryActionLabel: string;
  canApprove: boolean;
  note?: string;
}

export interface FilingDecisionPanelInput {
  readinessStatus: MailboxReadinessStatus;
  decision: FilingDecisionReadModel | null;
  error: AddinApiErrorKind | null;
  isLoading: boolean;
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFolderSource(source?: "mailbox_folder" | "well_known") {
  switch (source) {
    case "mailbox_folder":
      return "Suggested mailbox folder";
    case "well_known":
      return "Suggested Outlook folder";
    default:
      return "No folder suggestion yet";
  }
}

function buildBlockedByRows(decision: FilingDecisionReadModel) {
  return decision.filingEligibility.blockedBy.map((blockedBy) => ({
    label: titleCase(blockedBy),
    value: decision.decision.summary
  }));
}

function buildPrimaryAction(decision: FilingDecisionReadModel) {
  switch (decision.decision.status) {
    case FilingDecisionStatus.Eligible:
      return {
        label: decision.decision.mode === MailboxActionMode.ApprovedApply ? "Apply filing" : "Approve filing",
        canApprove: true
      };
    case FilingDecisionStatus.Failed:
      return {
        label: "Retry filing approval",
        canApprove: true
      };
    case FilingDecisionStatus.Executed:
      return {
        label: "Filed",
        canApprove: false
      };
    default:
      return {
        label: "Filing blocked",
        canApprove: false
      };
  }
}

export function deriveFilingDecisionPanelViewModel(
  input: FilingDecisionPanelInput
): FilingDecisionPanelViewModel {
  if (input.readinessStatus !== "ready") {
    return {
      status: "waiting-workflow",
      headline: "Waiting for filing state",
      summary: "Friendly Mail will show delayed-filing guidance after mailbox readiness and workflow loading finish.",
      statusBadge: "Waiting",
      targetFolderLabel: "No target suggestion yet",
      targetFolderMeta: "Mailbox readiness required",
      categoryLabels: [],
      blockerRows: [],
      recommendedActionRows: [],
      primaryActionLabel: "Waiting",
      canApprove: false
    };
  }

  if (input.isLoading) {
    return {
      status: "loading",
      headline: "Loading filing decision",
      summary: "Friendly Mail is checking blockers, suggested targets, and approval requirements for this message.",
      statusBadge: "Loading",
      targetFolderLabel: "Loading target suggestion",
      targetFolderMeta: "Decision in progress",
      categoryLabels: [],
      blockerRows: [],
      recommendedActionRows: [],
      primaryActionLabel: "Loading",
      canApprove: false
    };
  }

  if (!input.decision) {
    return {
      status: "failed-read",
      headline: "Filing decision unavailable",
      summary: "Friendly Mail could not load delayed-filing guidance for this message right now.",
      statusBadge: "Unavailable",
      targetFolderLabel: "No target suggestion yet",
      targetFolderMeta: "Decision unavailable",
      categoryLabels: [],
      blockerRows: [],
      recommendedActionRows: [],
      primaryActionLabel: "Retry later",
      canApprove: false,
      note: input.error ? `Decision read failed due to ${input.error}.` : undefined
    };
  }

  const primaryAction = buildPrimaryAction(input.decision);
  const targetFolderLabel =
    input.decision.targetFolder?.name ??
    input.decision.decision.targetFolderName ??
    "Archive";
  const targetFolderMeta = formatFolderSource(input.decision.targetFolder?.source);

  switch (input.decision.decision.status) {
    case FilingDecisionStatus.Blocked:
      return {
        status: "blocked",
        headline: "Filing is still blocked",
        summary: input.decision.decision.summary,
        statusBadge: "Blocked",
        targetFolderLabel,
        targetFolderMeta,
        categoryLabels: input.decision.decision.suggestedCategories,
        blockerRows: buildBlockedByRows(input.decision),
        recommendedActionRows: input.decision.recommendedActions.map((action) => action.summary),
        rationale: input.decision.decision.rationale,
        primaryActionLabel: primaryAction.label,
        canApprove: primaryAction.canApprove,
        note: "Resolve the remaining blockers before approving any mailbox action."
      };
    case FilingDecisionStatus.Executed:
      return {
        status: "executed",
        headline: "Message filed",
        summary: input.decision.decision.summary,
        statusBadge: "Filed",
        targetFolderLabel,
        targetFolderMeta,
        categoryLabels: input.decision.decision.suggestedCategories,
        blockerRows: [],
        recommendedActionRows: [],
        rationale: input.decision.decision.rationale,
        primaryActionLabel: primaryAction.label,
        canApprove: primaryAction.canApprove,
        note: "The delayed-filing action is already recorded for this message."
      };
    default:
      return {
        status: "ready",
        headline: "Ready for filing approval",
        summary: input.decision.decision.summary,
        statusBadge:
          input.decision.decision.status === FilingDecisionStatus.Failed ? "Needs retry" : "Eligible",
        targetFolderLabel,
        targetFolderMeta,
        categoryLabels: input.decision.decision.suggestedCategories,
        blockerRows: [],
        recommendedActionRows: input.decision.recommendedActions.map((action) => action.summary),
        rationale: input.decision.decision.rationale,
        primaryActionLabel: primaryAction.label,
        canApprove: primaryAction.canApprove,
        note:
          input.decision.decision.status === FilingDecisionStatus.Failed
            ? input.decision.decision.lastErrorMessage ??
              "The previous mailbox action failed and can be retried."
            : "Approval stays explicit so mailbox moves remain visible and intentional."
      };
  }
}
