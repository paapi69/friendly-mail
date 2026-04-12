import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookieHeader,
  readSessionTokenFromHeaders,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  verifyPassword
} from "./index";

describe("auth utilities", () => {
  it("hashes and verifies local passwords", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");

    await expect(
      verifyPassword("correct horse battery staple", passwordHash)
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong password", passwordHash)).resolves.toBe(false);
  });

  it("creates opaque session tokens and hashes them with the session secret", () => {
    const token = createSessionToken();

    expect(token).not.toHaveLength(0);
    expect(hashSessionToken(token, "session-secret")).toHaveLength(64);
    expect(hashSessionToken(token, "session-secret")).not.toBe(
      hashSessionToken(token, "different-secret")
    );
  });

  it("serializes and clears httpOnly session cookies", () => {
    const cookie = serializeSessionCookie({
      token: "opaque-token",
      secure: false,
      maxAgeSeconds: 60 * 60
    });
    const clearedCookie = serializeClearedSessionCookie({
      secure: false
    });

    expect(cookie).toContain("friendly_mail_session=opaque-token");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(clearedCookie).toContain("friendly_mail_session=");
    expect(clearedCookie).toContain("Max-Age=0");
  });

  it("reads session tokens from bearer headers before cookies", () => {
    const headers = new Headers({
      Authorization: "Bearer bearer-token",
      Cookie: "friendly_mail_session=cookie-token; theme=dark"
    });

    expect(readSessionTokenFromHeaders(headers)).toBe("bearer-token");
    expect(parseCookieHeader(headers.get("cookie") ?? undefined)).toEqual({
      friendly_mail_session: "cookie-token",
      theme: "dark"
    });
  });
});
