// Serve preview videos (ranged) and their poster frames from on-disk directories.
// Videos stream with HTTP Range support so the browser <video> can seek; posters are
// small images returned whole.

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import type { Context } from "hono";

function dirFromEnv(envVar: string, fallbackRelative: string): string {
  const v = process.env[envVar];
  if (v) return isAbsolute(v) ? v : resolve(v);
  // <repo>/<fallback>  (this file is at <repo>/server/src/videos.ts)
  return resolve(fileURLToPath(new URL(`../../${fallbackRelative}`, import.meta.url)));
}

export const VIDEOS_DIR = dirFromEnv("VIDEOS_DIR", "videos");
export const POSTERS_DIR = dirFromEnv("POSTERS_DIR", "posters");
export const CAPTIONS_DIR = dirFromEnv("CAPTIONS_DIR", "captions");

// Resolve a request file name to a safe absolute path inside baseDir (no traversal).
function safePath(baseDir: string, name: string): string | null {
  const clean = normalize(name).replace(/^(\.\.[/\\])+/, "");
  if (clean.includes("..") || clean.startsWith("/") || clean.startsWith("\\")) return null;
  const full = join(baseDir, clean);
  if (!full.startsWith(baseDir)) return null;
  return full;
}

export function serveVideo(c: Context, name: string, directory = VIDEOS_DIR): Response {
  const path = safePath(directory, name);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    return c.json({ error: "not_found", file: name }, 404);
  }

  const size = statSync(path).size;
  const range = c.req.header("range");
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  // Full-file response when no Range header.
  if (!range) {
    headers["Content-Length"] = String(size);
    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
    return new Response(stream, { status: 200, headers });
  }

  // Parse "bytes=start-end".
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return c.body(null, 416, { "Content-Range": `bytes */${size}` });

  const suffix = !match[1] && match[2] ? parseInt(match[2], 10) : null;
  const start = suffix !== null ? Math.max(0, size - suffix) : Number(match[1] || 0);
  const end = suffix !== null ? size - 1 : Math.min(size - 1, match[2] ? Number(match[2]) : size - 1);
  if ((!match[1] && !match[2]) || suffix === 0 || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    return c.body(null, 416, { "Content-Range": `bytes */${size}` });
  }

  headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  headers["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
  return new Response(stream, { status: 206, headers });
}

export function servePoster(c: Context, name: string, directory = POSTERS_DIR): Response {
  const path = safePath(directory, name);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    return c.json({ error: "not_found", file: name }, 404);
  }
  const body = readFileSync(path);
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}

export function serveCaption(c: Context, name: string): Response {
  const path = safePath(CAPTIONS_DIR, name);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    return c.json({ error: "not_found", file: name }, 404);
  }
  const body = readFileSync(path);
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=3600" },
  });
}
