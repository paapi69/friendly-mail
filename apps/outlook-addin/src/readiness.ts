import {
  OperationalHealthStatus,
  type MailboxOperationalVerificationReport
} from "@friendly-mail/contracts";

import { type AddinContext } from "./host";
import type { AddinApiErrorKind } from "./api";

export type MailboxReadinessStatus =
  | "ready"
  | "connecting"
  | "syncing"
  | "disconnected"
  | "degraded"
  | "unsupported-context";

export type MailboxReadinessAction =
  | "connect"
  | "refresh"
  | "view-workflow"
  | "review-support";

export interface MailboxReadinessViewModel {
  status: MailboxReadinessStatus;
  headline: string;
  summary: string;
  primaryAction: MailboxReadinessAction;
  primaryActionLabel: string;
  detailRows: Array<{ label: string; value: string }>;
}

export interface MailboxReadinessInput {
  context: AddinContext;
  mailboxId: string | null;
  verification: MailboxOperationalVerificationReport | null;
  verificationError: AddinApiErrorKind | null;
  isLoading: boolean;
  isConnecting: boolean;
}

function formatCheckedAt(value?: string): string {
  if (!value) {
    return "Not checked yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getVerificationDetails(
  verification: MailboxOperationalVerificationReport
): Array<{ label: string; value: string }> {
  return [
    {
      label: "Mailbox",
      value: verification.mailboxId
    },
    {
      label: "Subscription",
      value: verification.subscription.status
    },
    {
      label: "Tracked folders",
      value: `${verification.deltaSync.trackedFolders}`
    },
    {
      label: "Last checked",
      value: formatCheckedAt(verification.checkedAt)
    }
  ];
}

export function deriveMailboxReadinessViewModel(
  input: MailboxReadinessInput
): MailboxReadinessViewModel {
  const { context, mailboxId, verification, verificationError, isLoading, isConnecting } = input;

  if (context.mode === "message-compose") {
    return {
      status: "unsupported-context",
      headline: "Mailbox readiness is for message review",
      summary:
        "Compose is available as a placeholder in this preview, but mailbox readiness belongs to read-mode message review.",
      primaryAction: "review-support",
      primaryActionLabel: "Return to message review",
      detailRows: [
        {
          label: "Current mode",
          value: "Compose"
        },
        {
          label: "Supported first slice",
          value: "Read mode"
        }
      ]
    };
  }

  if (context.stage === "missing-item") {
    return {
      status: "unsupported-context",
      headline: "Select a message to continue",
      summary:
        "Friendly Mail can only show mailbox readiness when Outlook has a supported message selected.",
      primaryAction: "review-support",
      primaryActionLabel: "Select a message",
      detailRows: [
        {
          label: "Host state",
          value: "No supported message selected"
        },
        {
          label: "Pinned task pane",
          value: context.isPinnedCapable ? "Supported" : "Unavailable"
        }
      ]
    };
  }

  if (context.stage === "unsupported-client") {
    return {
      status: "unsupported-context",
      headline: "This Outlook context is not supported yet",
      summary:
        "Friendly Mail currently targets Outlook on the web and new Outlook on Windows for the add-in experience.",
      primaryAction: "review-support",
      primaryActionLabel: "Review support",
      detailRows: [
        {
          label: "Detected host",
          value: context.clientFamily
        },
        {
          label: "Supported clients",
          value: "Outlook on the web, new Outlook on Windows"
        }
      ]
    };
  }

  if (context.stage === "host-unavailable") {
    return {
      status: "degraded",
      headline: "Friendly Mail could not reach Outlook context",
      summary:
        "The add-in is open, but Outlook host details are unavailable, so readiness cannot be trusted right now.",
      primaryAction: "refresh",
      primaryActionLabel: "Retry",
      detailRows: [
        {
          label: "Host state",
          value: "Unavailable"
        },
        {
          label: "Mailbox binding",
          value: "Not confirmed"
        }
      ]
    };
  }

  if (isConnecting) {
    return {
      status: "connecting",
      headline: "Connecting your mailbox",
      summary:
        "Friendly Mail is preparing the Outlook mailbox connection so readiness and workflow details can load.",
      primaryAction: "refresh",
      primaryActionLabel: "Refresh status",
      detailRows: [
        {
          label: "Connection",
          value: "In progress"
        },
        {
          label: "Support scope",
          value: "Read mode"
        }
      ]
    };
  }

  if (!mailboxId) {
    return {
      status: "disconnected",
      headline: "Connect your mailbox to Friendly Mail",
      summary:
        "Friendly Mail can see the Outlook message context, but it does not have a connected mailbox to check sync or workflow readiness yet.",
      primaryAction: "connect",
      primaryActionLabel: "Connect mailbox",
      detailRows: [
        {
          label: "Mailbox connection",
          value: "Not connected"
        },
        {
          label: "Current message",
          value: context.message.subject ?? "Selected in Outlook"
        }
      ]
    };
  }

  if (verificationError === "unauthorized" || verificationError === "not-found") {
    return {
      status: "disconnected",
      headline: "Friendly Mail needs mailbox access",
      summary:
        "The mailbox could not be found for this preview or the current session is not authorized to load readiness yet.",
      primaryAction: "connect",
      primaryActionLabel: "Connect mailbox",
      detailRows: [
        {
          label: "Mailbox",
          value: mailboxId
        },
        {
          label: "Status",
          value: "Authorization required"
        }
      ]
    };
  }

  if (isLoading) {
    return {
      status: "syncing",
      headline: "Checking mailbox readiness",
      summary:
        "Friendly Mail is loading mailbox health and sync signals before showing the workflow experience.",
      primaryAction: "refresh",
      primaryActionLabel: "Refresh status",
      detailRows: [
        {
          label: "Mailbox",
          value: mailboxId
        },
        {
          label: "Sync state",
          value: "Loading"
        }
      ]
    };
  }

  if (verificationError) {
    return {
      status: "degraded",
      headline: "Mailbox readiness is temporarily unavailable",
      summary:
        "Friendly Mail could not reach reliable readiness signals, so it is holding the workflow panel until the mailbox status is current again.",
      primaryAction: "refresh",
      primaryActionLabel: "Retry",
      detailRows: [
        {
          label: "Mailbox",
          value: mailboxId
        },
        {
          label: "Status",
          value: "Readiness unavailable"
        }
      ]
    };
  }

  if (!verification) {
    return {
      status: "syncing",
      headline: "Checking mailbox readiness",
      summary:
        "Friendly Mail is waiting for the latest mailbox verification result before it unlocks the workflow view.",
      primaryAction: "refresh",
      primaryActionLabel: "Refresh status",
      detailRows: [
        {
          label: "Mailbox",
          value: mailboxId
        },
        {
          label: "Verification",
          value: "Pending"
        }
      ]
    };
  }

  const details = getVerificationDetails(verification);
  const hasSyncLag =
    verification.deltaSync.staleFolders > 0 || verification.deltaSync.missingCursorFolders > 0;
  const hasCriticalIssue =
    verification.overallStatus === OperationalHealthStatus.Critical ||
    verification.deltaSync.failedFolders > 0 ||
    verification.subscription.health === OperationalHealthStatus.Critical;

  if (hasCriticalIssue) {
    return {
      status: "degraded",
      headline: "Mailbox sync needs attention",
      summary:
        "Friendly Mail found a critical mailbox or subscription issue, so the workflow panel should wait until sync health is back within a safe range.",
      primaryAction: "refresh",
      primaryActionLabel: "Retry",
      detailRows: details
    };
  }

  if (
    verification.overallStatus === OperationalHealthStatus.Warning ||
    verification.subscription.health === OperationalHealthStatus.Warning ||
    hasSyncLag
  ) {
    return {
      status: "syncing",
      headline: "Mailbox is connected and catching up",
      summary:
        "Friendly Mail can see the mailbox, but sync freshness is still settling before the workflow view should be treated as fully current.",
      primaryAction: "refresh",
      primaryActionLabel: "Refresh status",
      detailRows: details
    };
  }

  return {
    status: "ready",
    headline: "Friendly Mail is ready for this message",
    summary:
      "Mailbox connection, subscription health, and sync freshness are healthy enough to move into the workflow summary.",
    primaryAction: "view-workflow",
    primaryActionLabel: "View message workflow",
    detailRows: details
  };
}
