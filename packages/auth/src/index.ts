import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const defaultSessionCookieName = "friendly_mail_session";

type SameSite = "Strict" | "Lax" | "None";

export type SerializeSessionCookieInput = {
  token: string;
  name?: string;
  maxAgeSeconds: number;
  secure: boolean;
  sameSite?: SameSite;
  path?: string;
};

export type SerializeClearedSessionCookieInput = {
  name?: string;
  secure: boolean;
  sameSite?: SameSite;
  path?: string;
};

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string, secret: string) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, saltValue, hashValue] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedHash = Buffer.from(hashValue, "base64url");
  const actualHash = (await scrypt(password, salt, expectedHash.length)) as Buffer;

  return timingSafeEqual(actualHash, expectedHash);
}

export function serializeSessionCookie(input: SerializeSessionCookieInput) {
  return serializeCookie({
    name: input.name ?? defaultSessionCookieName,
    value: input.token,
    maxAgeSeconds: input.maxAgeSeconds,
    secure: input.secure,
    sameSite: input.sameSite ?? "Lax",
    path: input.path ?? "/"
  });
}

export function serializeClearedSessionCookie(input: SerializeClearedSessionCookieInput) {
  return serializeCookie({
    name: input.name ?? defaultSessionCookieName,
    value: "",
    maxAgeSeconds: 0,
    secure: input.secure,
    sameSite: input.sameSite ?? "Lax",
    path: input.path ?? "/"
  });
}

export function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();

      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
}

export function readSessionTokenFromHeaders(
  headers: Headers | IncomingHttpHeaders,
  cookieName = defaultSessionCookieName
) {
  const authorizationHeader = getHeader(headers, "authorization");

  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim();
  }

  const cookies = parseCookieHeader(getHeader(headers, "cookie"));
  return cookies[cookieName];
}

function serializeCookie(input: {
  name: string;
  value: string;
  maxAgeSeconds: number;
  secure: boolean;
  sameSite: SameSite;
  path: string;
}) {
  const parts = [
    `${input.name}=${encodeURIComponent(input.value)}`,
    `Max-Age=${input.maxAgeSeconds}`,
    `Path=${input.path}`,
    `SameSite=${input.sameSite}`,
    "HttpOnly"
  ];

  if (input.maxAgeSeconds === 0) {
    parts.push(`Expires=${new Date(0).toUTCString()}`);
  }

  if (input.secure || input.sameSite === "None") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function getHeader(headers: Headers | IncomingHttpHeaders, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const value = headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value ?? undefined;
}
