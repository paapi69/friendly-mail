import { describe, expect, it } from "vitest";
import { getQueueEnv, getServerEnv } from "./index";

describe("getServerEnv", () => {
  it("parses the project environment contract", () => {
    const env = getServerEnv({
      NODE_ENV: "development",
      API_PORT: "4000",
      APP_BASE_URL: "http://localhost:3000",
      LOG_LEVEL: "info",
      SESSION_SECRET: "secret",
      SESSION_COOKIE_NAME: "friendly_mail_session",
      SESSION_MAX_AGE_HOURS: "12",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/friendly_mail",
      QUEUE_DRIVER: "redis",
      QUEUE_URL: "redis://localhost:6379",
      REDIS_URL: "redis://localhost:6379",
      MICROSOFT_TENANT_ID: "tenant",
      MICROSOFT_CLIENT_ID: "client",
      MICROSOFT_CLIENT_SECRET: "secret",
      MICROSOFT_WEBHOOK_BASE_URL: "https://example.ngrok-free.app",
      VITE_API_BASE_URL: "http://localhost:4000"
    });

    expect(env.API_PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.QUEUE_DRIVER).toBe("redis");
    expect(env.SESSION_COOKIE_NAME).toBe("friendly_mail_session");
    expect(env.SESSION_MAX_AGE_HOURS).toBe(12);
  });

  it("parses the queue environment contract independently", () => {
    const env = getQueueEnv({
      LOG_LEVEL: "info",
      QUEUE_DRIVER: "redis",
      REDIS_URL: "redis://localhost:6379"
    });

    expect(env.NODE_ENV).toBe("development");
    expect(env.QUEUE_URL).toBe("redis://localhost:6379");
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });
});
