import { describe, expect, it, vi } from "vitest";
import {
  AppError,
  createCorrelationId,
  createLogger,
  toErrorResponse
} from "./index";

describe("observability baseline", () => {
  it("emits structured log entries with inherited context", () => {
    const sink = vi.fn();
    const logger = createLogger({
      service: "friendly-mail-api",
      sink,
      now: () => "2026-03-31T10:00:00.000Z"
    }).child({ correlationId: "corr-123" });

    logger.info("Healthcheck passed", {
      route: "/health"
    });

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: "2026-03-31T10:00:00.000Z",
        level: "info",
        service: "friendly-mail-api",
        message: "Healthcheck passed",
        correlationId: "corr-123",
        route: "/health"
      })
    );
  });

  it("serializes app errors into safe client responses", () => {
    const error = new AppError("MAILBOX_NOT_FOUND", "Mailbox not found", {
      statusCode: 404,
      retryable: false,
      details: {
        mailboxId: "mbx_123"
      }
    });

    expect(toErrorResponse(error, "corr-456")).toEqual({
      statusCode: 404,
      body: {
        error: {
          code: "MAILBOX_NOT_FOUND",
          message: "Mailbox not found",
          correlationId: "corr-456",
          retryable: false
        }
      }
    });
  });

  it("creates non-empty correlation ids", () => {
    expect(createCorrelationId()).toMatch(/\S+/);
  });
});
