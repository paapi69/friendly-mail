import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MailboxActionMode,
  TaskStatus,
  TaskStatusReason
} from "@friendly-mail/contracts";

import {
  executeFilingByMessageId,
  fetchFilingDecisionByMessageId,
  fetchMessageClassificationByGraphMessageId,
  fetchMessageWorkflowByGraphMessageId,
  normalizeApiBaseUrl,
  readAddinApiConfig,
  transitionMailboxTask
} from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeApiBaseUrl", () => {
  it("defaults to the Vite proxy path", () => {
    expect(normalizeApiBaseUrl()).toBe("/api");
  });

  it("removes a trailing slash from explicit values", () => {
    expect(normalizeApiBaseUrl("https://localhost:4000/")).toBe("https://localhost:4000");
  });
});

describe("readAddinApiConfig", () => {
  it("reads mailbox and API settings from the query string", () => {
    expect(
      readAddinApiConfig("?apiBase=https://localhost:4000/&mailboxId=mailbox_123")
    ).toEqual({
      apiBaseUrl: "https://localhost:4000",
      mailboxId: "mailbox_123"
    });
  });

  it("treats empty mailbox IDs as disconnected preview state", () => {
    expect(readAddinApiConfig("?apiBase=/api&mailboxId=")).toEqual({
      apiBaseUrl: "/api",
      mailboxId: null
    });
  });
});

describe("workflow add-in API", () => {
  it("loads message classification by immutable Graph message ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          mailboxId: "mailbox_123",
          messageId: "message_123"
        })
      })
    );

    await fetchMessageClassificationByGraphMessageId({
      config: {
        apiBaseUrl: "/api",
        mailboxId: "mailbox_123"
      },
      mailboxId: "mailbox_123",
      graphMessageId: "graph_message_123"
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/mailboxes/mailbox_123/graph-messages/graph_message_123/classification",
      expect.objectContaining({
        credentials: "include"
      })
    );
  });

  it("raises a not-found error when workflow state is unavailable for the selected message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      })
    );

    await expect(
      fetchMessageWorkflowByGraphMessageId({
        config: {
          apiBaseUrl: "/api",
          mailboxId: "mailbox_123"
        },
        mailboxId: "mailbox_123",
        graphMessageId: "graph_message_123"
      })
    ).rejects.toMatchObject({
      kind: "not-found"
    });
  });

  it("sends task transitions through the mailbox task endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          mailboxId: "mailbox_123",
          task: {
            task: {
              id: "task_123",
              status: "done"
            }
          }
        })
      })
    );

    await transitionMailboxTask({
      config: {
        apiBaseUrl: "/api",
        mailboxId: "mailbox_123"
      },
      mailboxId: "mailbox_123",
      taskId: "task_123",
      transition: {
        status: TaskStatus.Done,
        reason: TaskStatusReason.UserCompleted
      }
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/mailboxes/mailbox_123/tasks/task_123",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include"
      })
    );
  });

  it("loads the filing decision for a materialized message ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          mailboxId: "mailbox_123",
          messageId: "message_123"
        })
      })
    );

    await fetchFilingDecisionByMessageId({
      config: {
        apiBaseUrl: "/api",
        mailboxId: "mailbox_123"
      },
      mailboxId: "mailbox_123",
      messageId: "message_123"
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/mailboxes/mailbox_123/messages/message_123/filing-decision?mode=suggestion_only",
      expect.objectContaining({
        credentials: "include"
      })
    );
  });

  it("executes filing approval through the mailbox action endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          mailboxId: "mailbox_123",
          messageId: "message_123",
          decision: {
            status: "executed"
          }
        })
      })
    );

    await executeFilingByMessageId({
      config: {
        apiBaseUrl: "/api",
        mailboxId: "mailbox_123"
      },
      mailboxId: "mailbox_123",
      messageId: "message_123",
      mode: MailboxActionMode.ApprovedApply
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/mailboxes/mailbox_123/messages/message_123/file",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
  });
});
