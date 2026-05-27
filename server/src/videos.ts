// Serve preview videos from the on-disk videos directory with HTTP Range support,
// so the browser <video> element can seek without downloading the whole file.

import { createReadStream, existsSync, statSync } from "node:fs";
import { join, normalize, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import type { Context } from "hono";

// Default: <repo>/videos  (this file is at <repo>/server/src/videos.ts)
const DEFAULT_DIR = resolve(fileURLToPath(new URL("../../videos", import.meta.url)));
export const VIDEOS_DIR = process.env.VIDEOS_DIR
  ? (isAbsolute(process.env.VIDEOS_DIR) ? process.env.VIDEOS_DIR : resolve(process.env.VIDEOS_DIR))
  : DEFAULT_DIR;

// Resolve a request file name to a safe absolute path inside VIDEOS_DIR (no traversal).
function safePath(name: string): string | null {
  const clean = normalize(name).replace(/^(\.\.[/\\])+/, "");
  if (clean.includes("..") || clean.startsWith("/") || clean.startsWith("\\")) return null;
  const full = join(VIDEOS_DIR, clean);
  if (!full.startsWith(VIDEOS_DIR)) return null;
  return full;
}

export function serveVideo(c: Context, name: string): Response {
  const path = safePath(name);
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

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
    return c.body(null, 416, { "Content-Range": `bytes */${size}` });
  }

  headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  headers["Content-Length"] = String(end - start + 1);
  const stream = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
  return new Response(stream, { status: 206, headers });
}
