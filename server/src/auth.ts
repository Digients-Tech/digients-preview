// Shared-password gate. One or more passwords (PREVIEW_PASSWORD, comma-separated)
// let a client in; on success we set a signed, httpOnly cookie. Verification is
// stateless — the cookie value is an HMAC over a constant, so any valid cookie
// proves the holder knew *some* password. Multi-value lets us hand out a separate
// password per audience (internal vs external) and rotate one without disturbing
// the other. Upgrade to per-user auth (invite codes / OTP) later.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const COOKIE_NAME = "preview_session";
const SESSION_TTL_DAYS = 7;

const IS_PROD = process.env.NODE_ENV === "production";

const PASSWORDS =
  (process.env.PREVIEW_PASSWORD ?? (IS_PROD ? "" : "digients-demo"))
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

// Stable signing secret. A random per-boot fallback is fine for a shared-password gate
// (it just means existing sessions are invalidated on restart).
const SECRET =
  process.env.SESSION_SECRET ?? createHmac("sha256", "boot").update(String(Math.random())).digest("hex");

if (!process.env.PREVIEW_PASSWORD) {
  if (IS_PROD) console.error("[auth] FATAL: PREVIEW_PASSWORD is not set in production");
  else console.warn('[auth] PREVIEW_PASSWORD not set — using dev default "digients-demo"');
} else if (PASSWORDS.length > 1) {
  console.log(`[auth] accepting ${PASSWORDS.length} shared passwords`);
}

// The constant token we sign. Knowing the password is the only way to obtain a valid cookie.
function sessionToken(): string {
  return createHmac("sha256", SECRET).update("preview-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkPassword(input: unknown): boolean {
  if (typeof input !== "string" || PASSWORDS.length === 0) return false;
  // Walk every configured password so timing doesn't leak which one matched.
  let matched = false;
  for (const pw of PASSWORDS) {
    if (safeEqual(input, pw)) matched = true;
  }
  return matched;
}

export function issueSession(c: Context): void {
  setCookie(c, COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "Lax",
    secure: IS_PROD,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSession(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export function isAuthed(c: Context): boolean {
  const cookie = getCookie(c, COOKIE_NAME);
  return typeof cookie === "string" && safeEqual(cookie, sessionToken());
}

// Guard that returns 401 for unauthenticated API/video requests.
export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!isAuthed(c)) return c.json({ error: "unauthorized" }, 401);
  await next();
};
