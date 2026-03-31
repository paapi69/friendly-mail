import crypto from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

export type LogEntry = LogContext & {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
};

export type ErrorResponse = {
  statusCode: number;
  body: {
    error: {
      code: string;
      message: string;
      correlationId: string;
      retryable: boolean;
    };
  };
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly details?: LogContext;

  constructor(
    code: string,
    message: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      details?: LogContext;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = options.statusCode ?? 500;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }
}

type LoggerOptions = {
  service: string;
  sink?: (entry: LogEntry) => void;
  now?: () => string;
  context?: LogContext;
};

type Logger = {
  child: (context: LogContext) => Logger;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

function serializeError(error: Error) {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError
      ? {
          code: error.code,
          statusCode: error.statusCode,
          retryable: error.retryable,
          details: error.details
        }
      : {})
  };
}

function normalizeContext(context: LogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      isErrorLike(value) ? serializeError(value) : value
    ])
  );
}

function createSink() {
  return (entry: LogEntry) => {
    const line = JSON.stringify(entry);

    switch (entry.level) {
      case "debug":
      case "info":
        console.log(line);
        break;
      case "warn":
        console.warn(line);
        break;
      case "error":
        console.error(line);
        break;
    }
  };
}

export function createLogger(options: LoggerOptions): Logger {
  const sink = options.sink ?? createSink();
  const now = options.now ?? (() => new Date().toISOString());
  const baseContext = options.context ?? {};

  function log(level: LogLevel, message: string, context: LogContext = {}) {
    sink({
      timestamp: now(),
      level,
      service: options.service,
      message,
      ...normalizeContext(baseContext),
      ...normalizeContext(context)
    });
  }

  return {
    child(context: LogContext) {
      return createLogger({
        ...options,
        sink,
        now,
        context: {
          ...baseContext,
          ...context
        }
      });
    },
    debug(message: string, context?: LogContext) {
      log("debug", message, context);
    },
    info(message: string, context?: LogContext) {
      log("info", message, context);
    },
    warn(message: string, context?: LogContext) {
      log("warn", message, context);
    },
    error(message: string, context?: LogContext) {
      log("error", message, context);
    }
  };
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function toErrorResponse(
  error: unknown,
  correlationId: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          correlationId,
          retryable: error.retryable
        }
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Something went wrong.",
        correlationId,
        retryable: false
      }
    }
  };
}
