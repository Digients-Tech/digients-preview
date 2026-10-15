import { Hono } from "hono";
import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { checkPassword, clearSession, isAuthed, issueSession } from "./auth.js";

export const CUA_SAMPLE_ID = "cua-windows-20260918-30fps";

const sourceFiles = new Set([
  "index.html", "styles.css", "audio.css", "app.js", "core.js",
  "steps-core.js", "steps.js", "audio-core.js", "audio.js", "sample-loader.js",
  "session.js", "portal-tokens.css", "portal-theme.css", "favicon.svg",
]);
const publicFiles = new Set([
  "login.html", "login.js", "portal-tokens.css", "portal-login.css",
  "login.css", "favicon.svg",
]);
const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".jsonl": "application/x-ndjson", ".mp4": "video/mp4", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg",
};

// Resolve real paths as well as URL segments so symlinks cannot escape a root.
function safeFile(root: string, path: string): string | null {
  if (path.split("/").some((part) => !part || part.startsWith(".")) || /[\\\0]/.test(path)) return null;
  try {
    const base = realpathSync(root);
    const file = realpathSync(resolve(base, path));
    const rel = relative(base, file);
    if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || !statSync(file).isFile()) return null;
    return file;
  } catch { return null; }
}

export function createCuaApp(options: { publicRoot: string; dataRoot: string }) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Robots-Tag", "noindex, nofollow");
    c.header("Referrer-Policy", "same-origin");
    c.header("Cache-Control", "no-store");
    await next();
  });
  app.get("/healthz", (c) => c.text("ok"));
  app.get("/api/session", (c) => c.json({ authed: isAuthed(c) }));
  app.post("/api/login", async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const password = body && typeof body === "object" && "password" in body ? body.password : undefined;
    if (!checkPassword(password)) return c.json({ ok: false, error: "wrong_password" }, 401);
    issueSession(c);
    return c.json({ ok: true });
  });
  app.post("/api/logout", (c) => {
    clearSession(c);
    return c.json({ ok: true });
  });
  app.get("*", (c) => {
    let path: string;
    try { path = decodeURIComponent(c.req.path).replace(/^\//, ""); }
    catch { return c.notFound(); }
    if (!path) path = isAuthed(c) ? "index.html" : "login.html";
    if (path === "index.html" && !isAuthed(c)) path = "login.html";
    const isPublic = publicFiles.has(path);
    const runtime = path.startsWith(`data/${CUA_SAMPLE_ID}/`) || path.startsWith(`assets/${CUA_SAMPLE_ID}/`);
    if (!isPublic && !sourceFiles.has(path) && !runtime) return c.notFound();
    if (!isPublic && !isAuthed(c)) return c.json({ error: "unauthorized" }, 401);
    const file = safeFile(runtime ? options.dataRoot : options.publicRoot, path);
    if (!file) return c.notFound();
    const size = statSync(file).size;
    const headers: Record<string, string> = {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Content-Length": String(size), "Accept-Ranges": "bytes",
      "Cache-Control": isPublic ? "no-store" : "private, max-age=0, must-revalidate",
    };
    let start = 0, end = size - 1, status: 200 | 206 = 200;
    const range = c.req.header("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      const invalid = () => c.body(null, 416, { "Content-Range": `bytes */${size}` });
      if (!match || (!match[1] && !match[2])) return invalid();
      if (!match[1]) {
        const suffix = Number(match[2]);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return invalid();
        start = Math.max(0, size - suffix);
      } else {
        start = Number(match[1]);
        end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return invalid();
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      headers["Content-Length"] = String(end - start + 1);
    }
    const stream = c.req.method === "HEAD" || size === 0 ? null : Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status, headers });
  });
  return app;
}
