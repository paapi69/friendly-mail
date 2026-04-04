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

  it("maps message delta responses including removed items and delta links", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        value: [
          {
            id: "graph_message_123",
            parentFolderId: "graph_folder_inbox",
            changeKey: "change_key_123",
            subject: "Invoice due Friday",
            isRead: false,
            hasAttachments: false,
            categories: []
          },
          {
            id: "graph_message_removed_123",
            "@removed": {
              reason: "deleted"
            }
          }
        ],
        "@odata.deltaLink":
          "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc"
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const page = await connector.deltaFolderMessages({
      folderId: "graph_folder_inbox",
      top: 25
    });

    const headers = getHeaders(fetch.mock.calls[0][1]);
    expect(headers.get("Prefer")).toBe('IdType="ImmutableId"');
    expect(String(fetch.mock.calls[0][0])).toContain("/mailFolders/graph_folder_inbox/messages/delta?");
    expect(page.deltaLink).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders/graph_folder_inbox/messages/delta?$deltatoken=abc"
    );
    expect(page.items[1]).toMatchObject({
      id: "graph_message_removed_123",
      removedReason: "deleted"
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

  it("fetches message detail with text-body preference and normalized recipients", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "graph_message_123",
        parentFolderId: "graph_folder_inbox",
        changeKey: "change_key_456",
        conversationId: "conversation_123",
        internetMessageId: "<message-123@example.com>",
        subject: "Quarterly notice",
        from: {
          emailAddress: {
            name: "Legal Team",
            address: "legal@example.com"
          }
        },
        sender: {
          emailAddress: {
            name: "Assistant",
            address: "assistant@example.com"
          }
        },
        replyTo: [
          {
            emailAddress: {
              name: "Reply Desk",
              address: "reply@example.com"
            }
          }
        ],
        toRecipients: [
          {
            emailAddress: {
              name: "Owner",
              address: "owner@example.com"
            }
          }
        ],
        ccRecipients: [],
        bccRecipients: [],
        receivedDateTime: "2026-04-04T10:00:00Z",
        sentDateTime: "2026-04-04T09:55:00Z",
        lastModifiedDateTime: "2026-04-04T10:05:00Z",
        isRead: false,
        isDraft: false,
        categories: ["FriendlyMail/Critical"],
        importance: "high",
        inferenceClassification: "focused",
        bodyPreview: "Please review the attached packet.",
        body: {
          contentType: "text",
          content: "Please review the attached packet.\r\n\r\nRegards,\r\nLegal Team"
        },
        uniqueBody: {
          contentType: "text",
          content: "Please review the attached packet."
        },
        hasAttachments: true,
        webLink: "https://outlook.office.com/mail/message"
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const message = await connector.getMessageDetail({
      messageId: "graph_message_123"
    });

    expect(String(fetch.mock.calls[0][0])).toContain("/me/messages/graph_message_123?");
    const headers = getHeaders(fetch.mock.calls[0][1]);
    expect(headers.get("Prefer")).toBe(
      'IdType="ImmutableId", outlook.body-content-type="text"'
    );
    expect(message).toMatchObject({
      id: "graph_message_123",
      changeKey: "change_key_456",
      from: {
        name: "Legal Team",
        address: "legal@example.com"
      },
      sender: {
        name: "Assistant",
        address: "assistant@example.com"
      },
      replyTo: [
        {
          name: "Reply Desk",
          address: "reply@example.com"
        }
      ],
      toRecipients: [
        {
          name: "Owner",
          address: "owner@example.com"
        }
      ],
      body: {
        contentType: "text",
        content: "Please review the attached packet.\r\n\r\nRegards,\r\nLegal Team"
      },
      uniqueBody: {
        contentType: "text",
        content: "Please review the attached packet."
      },
      hasAttachments: true
    });
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

  it("fetches the current user profile for onboarding", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "graph_user_123",
        displayName: "Owner",
        mail: "owner@friendlymail.dev",
        userPrincipalName: "owner@friendlymail.dev"
      })
    );

    const connector = createGraphConnector({
      tokenProvider: async () => "token_123",
      fetch
    });

    const user = await connector.getCurrentUser();

    expect(String(fetch.mock.calls[0][0])).toContain("/me?%24select=id%2CdisplayName%2Cmail%2CuserPrincipalName");
    expect(user).toEqual({
      id: "graph_user_123",
      displayName: "Owner",
      mail: "owner@friendlymail.dev",
      userPrincipalName: "owner@friendlymail.dev"
    });
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
