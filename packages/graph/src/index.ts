import { AppError, createLogger, type Logger } from "@friendly-mail/observability";

const DEFAULT_BASE_URL = "https://graph.microsoft.com/v1.0";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 750;
const IMMUTABLE_ID_HEADER = 'IdType="ImmutableId"';
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const DEFAULT_MESSAGE_SELECT = [
  "id",
  "parentFolderId",
  "changeKey",
  "conversationId",
  "internetMessageId",
  "subject",
  "from",
  "sender",
  "receivedDateTime",
  "lastModifiedDateTime",
  "isRead",
  "hasAttachments",
  "bodyPreview",
  "categories",
  "webLink"
] as const;
const DEFAULT_FOLDER_SELECT = [
  "id",
  "displayName",
  "parentFolderId",
  "childFolderCount",
  "unreadItemCount",
  "totalItemCount",
  "isHidden"
] as const;

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type SleepLike = (ms: number) => Promise<void>;
export type GraphTokenProvider = () => Promise<string>;
export type GraphChangeType = "created" | "updated" | "deleted";

export type GraphMailFolder = {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden: boolean;
};

export type GraphMessage = {
  id: string;
  parentFolderId?: string;
  changeKey?: string;
  conversationId?: string;
  internetMessageId?: string;
  subject: string;
  fromAddress?: string;
  senderAddress?: string;
  receivedDateTime?: string;
  lastModifiedDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  bodyPreview?: string;
  categories: string[];
  webLink?: string;
};

export type GraphSubscription = {
  id: string;
  resource: string;
  changeTypes: GraphChangeType[];
  expirationDateTime: string;
  notificationUrl: string;
  lifecycleNotificationUrl?: string;
  clientState?: string;
};

export type GraphPage<T> = {
  items: T[];
  nextLink?: string;
  deltaLink?: string;
};

export type CreateGraphConnectorOptions = {
  tokenProvider: GraphTokenProvider;
  fetch?: FetchLike;
  logger?: Logger;
  baseUrl?: string;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  sleep?: SleepLike;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path?: string;
  absoluteUrl?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  immutableId?: boolean;
};

export function createGraphConnector(options: CreateGraphConnectorOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new AppError("GRAPH_FETCH_UNAVAILABLE", "Global fetch is not available.", {
      statusCode: 500
    });
  }

  const logger = options.logger ?? createLogger({ service: "graph-connector" });
  const baseUrl = trimTrailingSlash(options.baseUrl ?? DEFAULT_BASE_URL);
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  async function requestJson<T>(request: RequestOptions): Promise<T> {
    let attempt = 0;

    while (true) {
      const accessToken = await options.tokenProvider();
      const response = await fetchImpl(buildRequestUrl(baseUrl, request), {
        method: request.method ?? "GET",
        headers: buildHeaders(accessToken, request),
        body: serializeBody(request.body)
      });

      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }

        return (await response.json()) as T;
      }

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxRetries) {
        const delayMs = getRetryDelayMs(response, retryBaseDelayMs, attempt);

        logger.warn("Retrying Microsoft Graph request", {
          statusCode: response.status,
          attempt: attempt + 1,
          delayMs,
          url: buildLogUrl(request)
        });

        attempt += 1;
        await sleep(delayMs);
        continue;
      }

      throw await toGraphError(response, request);
    }
  }

  async function requestPage<T>(
    request: RequestOptions,
    mapper: (value: Record<string, unknown>) => T
  ): Promise<GraphPage<T>> {
    const payload = await requestJson<Record<string, unknown>>(request);
    return mapPage(payload, mapper);
  }

  return {
    listMailFolders(input: {
      userId?: string;
      pageUrl?: string;
      includeHiddenFolders?: boolean;
      top?: number;
    } = {}) {
      return requestPage<GraphMailFolder>(
        {
          absoluteUrl: input.pageUrl,
          path: input.pageUrl ? undefined : `${getUserRoot(input.userId)}/mailFolders`,
          query: input.pageUrl
            ? undefined
            : {
                includeHiddenFolders: input.includeHiddenFolders,
                $top: input.top,
                $select: DEFAULT_FOLDER_SELECT.join(",")
              }
        },
        mapFolder
      );
    },

    listChildMailFolders(input: {
      folderId: string;
      userId?: string;
      pageUrl?: string;
      includeHiddenFolders?: boolean;
      top?: number;
    }) {
      return requestPage<GraphMailFolder>(
        {
          absoluteUrl: input.pageUrl,
          path: input.pageUrl
            ? undefined
            : `${getUserRoot(input.userId)}/mailFolders/${encodeURIComponent(input.folderId)}/childFolders`,
          query: input.pageUrl
            ? undefined
            : {
                includeHiddenFolders: input.includeHiddenFolders,
                $top: input.top,
                $select: DEFAULT_FOLDER_SELECT.join(",")
              }
        },
        mapFolder
      );
    },

    listFolderMessages(input: {
      folderId: string;
      userId?: string;
      pageUrl?: string;
      select?: string[];
      top?: number;
    }) {
      return requestPage<GraphMessage>(
        {
          absoluteUrl: input.pageUrl,
          path: input.pageUrl
            ? undefined
            : `${getUserRoot(input.userId)}/mailFolders/${encodeURIComponent(input.folderId)}/messages`,
          query: input.pageUrl
            ? undefined
            : {
                $top: input.top,
                $select: normalizeFieldSelection(input.select, DEFAULT_MESSAGE_SELECT)
              },
          immutableId: true
        },
        mapMessage
      );
    },

    deltaFolderMessages(input: {
      folderId: string;
      userId?: string;
      pageUrl?: string;
      select?: string[];
      top?: number;
      changeType?: GraphChangeType;
    }) {
      return requestPage<GraphMessage>(
        {
          absoluteUrl: input.pageUrl,
          path: input.pageUrl
            ? undefined
            : `${getUserRoot(input.userId)}/mailFolders/${encodeURIComponent(input.folderId)}/messages/delta`,
          query: input.pageUrl
            ? undefined
            : {
                $top: input.top,
                $select: normalizeFieldSelection(input.select, DEFAULT_MESSAGE_SELECT),
                changeType: input.changeType
              },
          immutableId: true
        },
        mapMessage
      );
    },

    async getMessage(input: {
      messageId: string;
      userId?: string;
      select?: string[];
    }) {
      const payload = await requestJson<Record<string, unknown>>({
        path: `${getUserRoot(input.userId)}/messages/${encodeURIComponent(input.messageId)}`,
        query: {
          $select: normalizeFieldSelection(input.select, DEFAULT_MESSAGE_SELECT)
        },
        immutableId: true
      });

      return mapMessage(payload);
    },

    async createMessageSubscription(input: {
      userId?: string;
      folderId?: string;
      changeTypes: GraphChangeType[];
      notificationUrl: string;
      lifecycleNotificationUrl?: string;
      expirationDateTime: string;
      clientState?: string;
    }) {
      const payload = await requestJson<Record<string, unknown>>({
        method: "POST",
        path: "/subscriptions",
        body: {
          changeType: normalizeChangeTypes(input.changeTypes).join(","),
          notificationUrl: input.notificationUrl,
          lifecycleNotificationUrl: input.lifecycleNotificationUrl,
          resource: buildSubscriptionResource(input.userId, input.folderId),
          expirationDateTime: input.expirationDateTime,
          clientState: input.clientState
        },
        immutableId: true
      });

      return mapSubscription(payload);
    },

    async renewSubscription(input: {
      subscriptionId: string;
      expirationDateTime: string;
    }) {
      const payload = await requestJson<Record<string, unknown>>({
        method: "PATCH",
        path: `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
        body: {
          expirationDateTime: input.expirationDateTime
        }
      });

      return mapSubscription(payload);
    },

    async deleteSubscription(input: { subscriptionId: string }) {
      await requestJson<void>({
        method: "DELETE",
        path: `/subscriptions/${encodeURIComponent(input.subscriptionId)}`
      });
    }
  };
}

function buildHeaders(accessToken: string, request: RequestOptions) {
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`
  });

  if (request.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (request.immutableId) {
    headers.set("Prefer", IMMUTABLE_ID_HEADER);
  }

  return headers;
}

function buildRequestUrl(baseUrl: string, request: RequestOptions) {
  if (request.absoluteUrl) {
    return request.absoluteUrl;
  }

  const url = new URL(`${baseUrl}${ensureLeadingSlash(request.path ?? "")}`);

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function buildLogUrl(request: RequestOptions) {
  return request.absoluteUrl ?? request.path ?? "/";
}

function serializeBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  return JSON.stringify(body);
}

function getUserRoot(userId?: string) {
  return userId ? `/users/${encodeURIComponent(userId)}` : "/me";
}

function buildSubscriptionResource(userId?: string, folderId?: string) {
  if (folderId) {
    return `${getUserRoot(userId)}/mailFolders/${encodeURIComponent(folderId)}/messages`;
  }

  return `${getUserRoot(userId)}/messages`;
}

function normalizeFieldSelection(select: string[] | undefined, defaults: readonly string[]) {
  const selection = select?.length ? select : [...defaults];
  return [...new Set(selection.map((field) => field.trim()).filter(Boolean))].join(",");
}

function normalizeChangeTypes(changeTypes: GraphChangeType[]) {
  return [...new Set(changeTypes)].sort() as GraphChangeType[];
}

function mapPage<T>(
  payload: Record<string, unknown>,
  mapper: (value: Record<string, unknown>) => T
): GraphPage<T> {
  const value = Array.isArray(payload.value) ? payload.value : [];

  return {
    items: value.map((item) => mapper(asRecord(item))),
    nextLink: asOptionalString(payload["@odata.nextLink"]),
    deltaLink: asOptionalString(payload["@odata.deltaLink"])
  };
}

function mapFolder(value: Record<string, unknown>): GraphMailFolder {
  return {
    id: asRequiredString(value.id, "mail folder id"),
    displayName: asRequiredString(value.displayName, "mail folder displayName"),
    parentFolderId: asOptionalString(value.parentFolderId),
    childFolderCount: asNumber(value.childFolderCount),
    unreadItemCount: asNumber(value.unreadItemCount),
    totalItemCount: asNumber(value.totalItemCount),
    isHidden: asBoolean(value.isHidden)
  };
}

function mapMessage(value: Record<string, unknown>): GraphMessage {
  return {
    id: asRequiredString(value.id, "message id"),
    parentFolderId: asOptionalString(value.parentFolderId),
    changeKey: asOptionalString(value.changeKey),
    conversationId: asOptionalString(value.conversationId),
    internetMessageId: asOptionalString(value.internetMessageId),
    subject: asOptionalString(value.subject) ?? "",
    fromAddress: readEmailAddress(value.from),
    senderAddress: readEmailAddress(value.sender),
    receivedDateTime: asOptionalString(value.receivedDateTime),
    lastModifiedDateTime: asOptionalString(value.lastModifiedDateTime),
    isRead: asBoolean(value.isRead),
    hasAttachments: asBoolean(value.hasAttachments),
    bodyPreview: asOptionalString(value.bodyPreview),
    categories: Array.isArray(value.categories)
      ? value.categories.map((category) => String(category))
      : [],
    webLink: asOptionalString(value.webLink)
  };
}

function mapSubscription(value: Record<string, unknown>): GraphSubscription {
  return {
    id: asRequiredString(value.id, "subscription id"),
    resource: asRequiredString(value.resource, "subscription resource"),
    changeTypes: splitChangeTypes(asRequiredString(value.changeType, "subscription changeType")),
    expirationDateTime: asRequiredString(
      value.expirationDateTime,
      "subscription expirationDateTime"
    ),
    notificationUrl: asRequiredString(value.notificationUrl, "subscription notificationUrl"),
    lifecycleNotificationUrl: asOptionalString(value.lifecycleNotificationUrl),
    clientState: asOptionalString(value.clientState)
  };
}

function splitChangeTypes(changeType: string) {
  return changeType
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .sort() as GraphChangeType[];
}

async function toGraphError(response: Response, request: RequestOptions) {
  const payload = await safeParseJson(response);
  const graphError = asRecord(payload?.error);
  const graphCode = asOptionalString(graphError.code);
  const graphMessage = asOptionalString(graphError.message);
  const requestId =
    response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? undefined;
  const statusCode = response.status === 429 || response.status === 503 ? 503 : 502;

  return new AppError(
    graphCode === "InvalidAuthenticationToken"
      ? "GRAPH_UNAUTHORIZED"
      : response.status === 429
        ? "GRAPH_RATE_LIMITED"
        : response.status === 503
          ? "GRAPH_UNAVAILABLE"
          : "GRAPH_REQUEST_FAILED",
    graphMessage ?? `Microsoft Graph request failed with status ${response.status}.`,
    {
      statusCode,
      retryable: RETRYABLE_STATUS_CODES.has(response.status),
      details: {
        graphCode,
        requestId,
        requestUrl: buildLogUrl(request),
        statusCode: response.status
      }
    }
  );
}

async function safeParseJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function getRetryDelayMs(response: Response, baseDelayMs: number, attempt: number) {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const numericValue = Number(retryAfter);
    if (!Number.isNaN(numericValue)) {
      return Math.max(0, numericValue * 1000);
    }

    const absoluteDelay = Date.parse(retryAfter) - Date.now();
    if (!Number.isNaN(absoluteDelay)) {
      return Math.max(0, absoluteDelay);
    }
  }

  return baseDelayMs * 2 ** attempt;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asRequiredString(value: unknown, fieldName: string) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new AppError("GRAPH_PAYLOAD_INVALID", `Missing required Graph field: ${fieldName}.`, {
    statusCode: 502
  });
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function readEmailAddress(value: unknown) {
  const emailAddress = asRecord(asRecord(value).emailAddress);
  return asOptionalString(emailAddress.address);
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function ensureLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
