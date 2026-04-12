import {
  MailboxActionMode,
  MailSurface,
  type FilingDecisionReadModel,
  type MailboxActionExecutionResult,
  type MailboxOperationalVerificationReport,
  type MessageClassificationReadModel,
  type MessageWorkflowReadModel,
  type TaskTransitionRequest,
  type TaskTransitionResult
} from "@friendly-mail/contracts";

export interface AddinApiConfig {
  apiBaseUrl: string;
  mailboxId: string | null;
}

export type AddinApiErrorKind =
  | "unauthorized"
  | "not-found"
  | "network"
  | "unknown";

export class AddinApiError extends Error {
  readonly kind: AddinApiErrorKind;

  constructor(kind: AddinApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function normalizeApiBaseUrl(apiBaseUrl?: string | null): string {
  if (!apiBaseUrl) {
    return "/api";
  }

  const trimmed = apiBaseUrl.trim();

  if (trimmed.length === 0) {
    return "/api";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function readAddinApiConfig(search = ""): AddinApiConfig {
  const params = new URLSearchParams(search);
  const mailboxId = params.get("mailboxId")?.trim() ?? "";

  return {
    apiBaseUrl: normalizeApiBaseUrl(params.get("apiBase")),
    mailboxId: mailboxId.length > 0 ? mailboxId : null
  };
}

export async function fetchMailboxOperationalVerification(
  config: AddinApiConfig
): Promise<MailboxOperationalVerificationReport> {
  if (!config.mailboxId) {
    throw new AddinApiError("not-found", "Mailbox ID is required.");
  }

  let response: Response;

  try {
    response = await fetch(
      `${config.apiBaseUrl}/mailboxes/${encodeURIComponent(config.mailboxId)}/operational-verification`,
      {
        credentials: "include"
      }
    );
  } catch {
    throw new AddinApiError(
      "network",
      "Friendly Mail could not reach the mailbox verification API."
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AddinApiError(
      "unauthorized",
      "Friendly Mail needs an authenticated session before it can check mailbox status."
    );
  }

  if (response.status === 404) {
    throw new AddinApiError(
      "not-found",
      "Friendly Mail could not find a connected mailbox for this preview."
    );
  }

  if (!response.ok) {
    throw new AddinApiError(
      "unknown",
      "Friendly Mail could not load mailbox readiness right now."
    );
  }

  return (await response.json()) as MailboxOperationalVerificationReport;
}

export async function fetchMessageClassificationByGraphMessageId(input: {
  config: AddinApiConfig;
  mailboxId: string;
  graphMessageId: string;
}): Promise<MessageClassificationReadModel> {
  return fetchJson<MessageClassificationReadModel>({
    config: input.config,
    path: `/mailboxes/${encodeURIComponent(input.mailboxId)}/graph-messages/${encodeURIComponent(input.graphMessageId)}/classification`,
    notFoundMessage: "Friendly Mail could not find stored classification for the selected Outlook message.",
    unauthorizedMessage:
      "Friendly Mail needs an authenticated session before it can load message classification.",
    unknownMessage: "Friendly Mail could not load message classification right now."
  });
}

export async function fetchMessageWorkflowByGraphMessageId(input: {
  config: AddinApiConfig;
  mailboxId: string;
  graphMessageId: string;
}): Promise<MessageWorkflowReadModel> {
  return fetchJson<MessageWorkflowReadModel>({
    config: input.config,
    path: `/mailboxes/${encodeURIComponent(input.mailboxId)}/graph-messages/${encodeURIComponent(input.graphMessageId)}/workflow`,
    notFoundMessage: "Friendly Mail could not find workflow state for the selected Outlook message.",
    unauthorizedMessage:
      "Friendly Mail needs an authenticated session before it can load message workflow.",
    unknownMessage: "Friendly Mail could not load message workflow right now."
  });
}

export async function transitionMailboxTask(input: {
  config: AddinApiConfig;
  mailboxId: string;
  taskId: string;
  transition: TaskTransitionRequest;
}): Promise<TaskTransitionResult> {
  let response: Response;

  try {
    response = await fetch(
      `${input.config.apiBaseUrl}/mailboxes/${encodeURIComponent(input.mailboxId)}/tasks/${encodeURIComponent(input.taskId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(input.transition)
      }
    );
  } catch {
    throw new AddinApiError("network", "Friendly Mail could not reach the task action API.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AddinApiError(
      "unauthorized",
      "Friendly Mail needs an authenticated session before it can update task state."
    );
  }

  if (response.status === 404) {
    throw new AddinApiError(
      "not-found",
      "Friendly Mail could not find the selected task for this message."
    );
  }

  if (!response.ok) {
    throw new AddinApiError("unknown", "Friendly Mail could not update task state right now.");
  }

  return (await response.json()) as TaskTransitionResult;
}

export async function fetchFilingDecisionByMessageId(input: {
  config: AddinApiConfig;
  mailboxId: string;
  messageId: string;
  mode?: MailboxActionMode;
}): Promise<FilingDecisionReadModel> {
  const params = new URLSearchParams({
    mode: input.mode ?? MailboxActionMode.SuggestionOnly
  });

  return fetchJson<FilingDecisionReadModel>({
    config: input.config,
    path: `/mailboxes/${encodeURIComponent(input.mailboxId)}/messages/${encodeURIComponent(input.messageId)}/filing-decision?${params.toString()}`,
    notFoundMessage: "Friendly Mail could not find filing guidance for the selected message.",
    unauthorizedMessage:
      "Friendly Mail needs an authenticated session before it can load filing guidance.",
    unknownMessage: "Friendly Mail could not load filing guidance right now."
  });
}

export async function executeFilingByMessageId(input: {
  config: AddinApiConfig;
  mailboxId: string;
  messageId: string;
  mode: MailboxActionMode;
}): Promise<MailboxActionExecutionResult> {
  let response: Response;

  try {
    response = await fetch(
      `${input.config.apiBaseUrl}/mailboxes/${encodeURIComponent(input.mailboxId)}/messages/${encodeURIComponent(input.messageId)}/file`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          mode: input.mode
        })
      }
    );
  } catch {
    throw new AddinApiError("network", "Friendly Mail could not reach the filing approval API.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AddinApiError(
      "unauthorized",
      "Friendly Mail needs an authenticated session before it can approve filing."
    );
  }

  if (response.status === 404) {
    throw new AddinApiError(
      "not-found",
      "Friendly Mail could not find the selected message for filing approval."
    );
  }

  if (!response.ok) {
    throw new AddinApiError(
      "unknown",
      "Friendly Mail could not execute filing approval right now."
    );
  }

  return (await response.json()) as MailboxActionExecutionResult;
}

export async function beginMailboxConnect(config: AddinApiConfig): Promise<string> {
  let response: Response;

  try {
    response = await fetch(`${config.apiBaseUrl}/mailboxes/connect/start`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        surface: MailSurface.OutlookAddIn
      })
    });
  } catch {
    throw new AddinApiError(
      "network",
      "Friendly Mail could not reach the mailbox connect flow."
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AddinApiError(
      "unauthorized",
      "Sign in to Friendly Mail before connecting an Outlook mailbox."
    );
  }

  if (!response.ok) {
    throw new AddinApiError(
      "unknown",
      "Friendly Mail could not start mailbox connection right now."
    );
  }

  const body = (await response.json()) as { authorizationUrl?: string };

  if (!body.authorizationUrl) {
    throw new AddinApiError(
      "unknown",
      "Friendly Mail did not return a mailbox authorization URL."
    );
  }

  return body.authorizationUrl;
}

async function fetchJson<T>(input: {
  config: AddinApiConfig;
  path: string;
  notFoundMessage: string;
  unauthorizedMessage: string;
  unknownMessage: string;
}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${input.config.apiBaseUrl}${input.path}`, {
      credentials: "include"
    });
  } catch {
    throw new AddinApiError("network", "Friendly Mail could not reach the Outlook workflow API.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new AddinApiError("unauthorized", input.unauthorizedMessage);
  }

  if (response.status === 404) {
    throw new AddinApiError("not-found", input.notFoundMessage);
  }

  if (!response.ok) {
    throw new AddinApiError("unknown", input.unknownMessage);
  }

  return (await response.json()) as T;
}
