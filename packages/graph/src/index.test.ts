import { describe, expect, it, vi } from "vitest";
import { AppError, createLogger } from "@friendly-mail/observability";
import { createGraphConnector } from "./index";

describe("graph connector", () => {
  it("adds auth and immutable-id headers for message reads", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: "graph_message_123",
            parentFolderId: "graph_folder_inbox",
            changeKey: "change_key_123",
            subject: "Invoice due Friday",
            from: {
              emailAddress: {
                address: "vendor@example.com"
              }
            },
            isRead: false,
            hasAttachments: true,
            categories: ["FriendlyMail/Critical"]
          }
        ]
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const page = await connector.listFolderMessages({
      folderId: "AQMkFolder",
      userId: "owner@friendlymail.dev"
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain(
      "/users/owner%40friendlymail.dev/mailFolders/AQMkFolder/messages?"
    );
    expect(String(fetch.mock.calls[0][0])).toContain("%24select=");
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "GET"
    });

    const headers = getHeaders(fetch.mock.calls[0][1]);
    expect(headers.get("Authorization")).toBe("Bearer token_123");
    expect(headers.get("Prefer")).toBe('IdType="ImmutableId"');
    expect(page.items[0]).toMatchObject({
      id: "graph_message_123",
      parentFolderId: "graph_folder_inbox",
      changeKey: "change_key_123",
      fromAddress: "vendor@example.com",
      hasAttachments: true
    });
  });

  it("lists mail folders without the immutable-id header and returns pagination links", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: "folder_123",
            displayName: "Inbox",
            childFolderCount: 2,
            unreadItemCount: 7,
            totalItemCount: 21,
            isHidden: false
          }
        ],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/mailFolders?$skiptoken=abc"
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const page = await connector.listMailFolders({
      includeHiddenFolders: true,
      top: 25
    });

    const headers = getHeaders(fetch.mock.calls[0][1]);
    expect(headers.get("Prefer")).toBeNull();
    expect(String(fetch.mock.calls[0][0])).toContain("includeHiddenFolders=true");
    expect(String(fetch.mock.calls[0][0])).toContain("%24top=25");
    expect(page.nextLink).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders?$skiptoken=abc"
    );
    expect(page.items[0]).toMatchObject({
      id: "folder_123",
      displayName: "Inbox",
      unreadItemCount: 7
    });
  });

  it("retries throttled requests using Retry-After before succeeding", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: "TooManyRequests", message: "Slow down" } }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "2"
          }
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "graph_message_123",
          subject: "Recovered request",
          isRead: true,
          hasAttachments: false,
          categories: []
        })
      );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch,
      sleep,
      logger: createLogger({ service: "graph-test" })
    });

    const message = await connector.getMessage({
      messageId: "graph_message_123"
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(message.subject).toBe("Recovered request");
  });

  it("creates message subscriptions with immutable-id support", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "subscription_123",
        resource: "/users/owner@friendlymail.dev/messages",
        changeType: "updated,created",
        expirationDateTime: "2026-04-01T12:00:00Z",
        notificationUrl: "https://friendlymail.dev/webhooks/graph",
        lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/graph/lifecycle"
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const subscription = await connector.createMessageSubscription({
      userId: "owner@friendlymail.dev",
      changeTypes: ["updated", "created"],
      notificationUrl: "https://friendlymail.dev/webhooks/graph",
      lifecycleNotificationUrl: "https://friendlymail.dev/webhooks/graph/lifecycle",
      expirationDateTime: "2026-04-01T12:00:00Z"
    });

    const headers = getHeaders(fetch.mock.calls[0][1]);
    expect(headers.get("Prefer")).toBe('IdType="ImmutableId"');
    expect(parseBody(fetch.mock.calls[0][1])).toMatchObject({
      resource: "/users/owner%40friendlymail.dev/messages"
    });
    expect(subscription.changeTypes).toEqual(["created", "updated"]);
  });

  it("raises app errors for non-retryable graph failures", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "InvalidAuthenticationToken",
            message: "Access token has expired."
          }
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "request-id": "request_123"
          }
        }
      )
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "expired_token",
      fetch
    });

    await expect(
      connector.getMessage({
        messageId: "graph_message_123"
      })
    ).rejects.toMatchObject({
      code: "GRAPH_UNAUTHORIZED",
      retryable: false,
      statusCode: 502
    } satisfies Partial<AppError>);
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function getHeaders(init: RequestInit | undefined) {
  return init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
}

function parseBody(init: RequestInit | undefined) {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}
