// Shared-password gate. One or more passwords (PREVIEW_PASSWORD, comma-separated)
// let a client in; on success we set a signed, httpOnly cookie. Verification is
// stateless — the cookie value is an HMAC over a constant, so any valid cookie
// proves the holder knew *some* password. Multi-value lets us hand out a separate
// password per audience (internal vs external) and rotate one without disturbing
// the other. Upgrade to per-user auth (invite codes / OTP) later.

import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

// --- Login counts per password slot ---------------------------------------
// Slot index matches the position of the password in PREVIEW_PASSWORD (env).
// Persisted to disk so a service restart doesn't reset the tally. File path
// can be overridden via STATS_PATH; default is <repo>/.stats/login-counts.json.

const STATS_PATH =
  process.env.STATS_PATH ?? resolve(fileURLToPath(new URL("../../.stats/login-counts.json", import.meta.url)));

type StatsFile = { loginCounts: number[]; since: string };

function loadStats(): StatsFile {
  if (existsSync(STATS_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(STATS_PATH, "utf8")) as Partial<StatsFile>;
      const counts = Array.isArray(parsed.loginCounts)
        ? parsed.loginCounts.map((n) => (Number.isFinite(n) ? Number(n) : 0))
        : [];
      // Resize to current PASSWORDS length so a slot added/removed in env stays consistent.
      while (counts.length < PASSWORDS.length) counts.push(0);
      counts.length = PASSWORDS.length;
      return { loginCounts: counts, since: parsed.since ?? new Date().toISOString() };
    } catch (e) {
      console.warn(`[auth] failed to read ${STATS_PATH}: ${(e as Error).message} — starting fresh`);
    }
  }
  return { loginCounts: PASSWORDS.map(() => 0), since: new Date().toISOString() };
}

const stats = loadStats();

function persistStats(): void {
  try {
    mkdirSync(dirname(STATS_PATH), { recursive: true });
    const tmp = STATS_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(stats, null, 2));
    renameSync(tmp, STATS_PATH);
  } catch (e) {
    console.warn(`[auth] failed to persist ${STATS_PATH}: ${(e as Error).message}`);
  }
}

export function getLoginStats(): {
  slots: { index: number; count: number }[];
  total: number;
  since: string;
} {
  return {
    slots: stats.loginCounts.map((count, index) => ({ index, count })),
    total: stats.loginCounts.reduce((a, b) => a + b, 0),
    since: stats.since,
  };
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
  let matchedSlot = -1;
  for (let i = 0; i < PASSWORDS.length; i++) {
    if (safeEqual(input, PASSWORDS[i]!)) matchedSlot = i;
  }
  if (matchedSlot < 0) return false;
  stats.loginCounts[matchedSlot]! += 1;
  persistStats();
  console.log(`[auth] login OK via slot ${matchedSlot} (count=${stats.loginCounts[matchedSlot]})`);
  return true;
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
