// Digients preview portal — single Node (Hono) process that serves:
//   - POST /api/login, /api/logout, GET /api/session   (shared-password gate)
//   - GET  /api/catalog                                (taxonomy + stats, auth required)
//   - GET  /videos/:file                               (ranged video, auth required)
//   - the built frontend (production only; in dev Vite serves it)

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  checkPassword,
  clearSession,
  getLoginStats,
  issueSession,
  isAuthed,
  requireAuth,
} from "./auth.js";
import { buildCatalog } from "./data.js";
import { serveVideo, servePoster, serveCaption, VIDEOS_DIR } from "./videos.js";

const app = new Hono();

// In dev the frontend runs on the Vite origin and proxies here, so same-origin cookies
// work; CORS with credentials is enabled defensively for local cross-port calls.
app.use(
  "/api/*",
  cors({ origin: (o) => o ?? "*", credentials: true })
);

// --- Health (no auth) ---
app.get("/healthz", (c) => c.text("ok"));

// --- Auth ---
app.post("/api/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (!checkPassword((body as { password?: unknown }).password)) {
    return c.json({ ok: false, error: "wrong_password" }, 401);
  }
  issueSession(c);
  return c.json({ ok: true });
});

app.post("/api/logout", (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

app.get("/api/session", (c) => c.json({ authed: isAuthed(c) }));

// Login-count stats per password slot. Slot index matches PREVIEW_PASSWORD order
// in the env. Behind requireAuth so the tally isn't a public guestbook.
app.get("/api/stats", requireAuth, (c) => c.json(getLoginStats()));

// --- Catalog (protected) ---
app.get("/api/catalog", requireAuth, (c) => c.json(buildCatalog()));

// --- Videos + poster frames + caption sidecars (protected) ---
app.get("/videos/:file", requireAuth, (c) => serveVideo(c, c.req.param("file")));
app.get("/posters/:file", requireAuth, (c) => servePoster(c, c.req.param("file")));
app.get("/captions/:file", requireAuth, (c) => serveCaption(c, c.req.param("file")));

// --- Static frontend (production only) ---
const STATIC_ROOT = process.env.STATIC_ROOT ?? "../web/dist";
const hasBuild = existsSync(resolve(process.cwd(), STATIC_ROOT, "index.html"));
if (hasBuild) {
  app.use("*", serveStatic({ root: STATIC_ROOT }));
  // SPA fallback: any unmatched GET returns index.html.
  app.get("*", serveStatic({ path: `${STATIC_ROOT}/index.html` }));
} else {
  console.warn(`[static] no build at ${STATIC_ROOT} — frontend served by Vite in dev`);
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`);
  console.log(`[server] videos dir: ${VIDEOS_DIR}`);
  console.log(`[server] static frontend: ${hasBuild ? "yes" : "no (dev mode)"}`);
});
