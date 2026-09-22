import { Hono } from "hono";
import { existsSync, readFileSync, statSync, createReadStream } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import type { L4Caption, L4Catalog } from "../../web/src/l4-types.js";
import { buildGalleryCatalog } from "./l4-gallery.js";
import { requireAuth } from "./auth.js";
import { serveVideo, servePoster } from "./videos.js";

const DATA_DIR =
  process.env.L4_DATA_DIR ??
  resolve(fileURLToPath(new URL("../../data/l4-1x-20260921", import.meta.url)));
const CATALOG_PATH = join(DATA_DIR, "catalog.json");
let cached: { mtime: number; catalog: L4Catalog; ids: Set<string> } | undefined;

export function loadL4Catalog() {
  const mtime = statSync(CATALOG_PATH).mtimeMs;
  if (cached?.mtime === mtime) return cached;
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as L4Catalog;
  if (
    catalog.version !== 1 ||
    !Array.isArray(catalog.episodes) ||
    catalog.episodes.length === 0
  )
    throw new Error("Invalid L4 catalogue");
  const ids = new Set(catalog.episodes.map((episode) => episode.id));
  if (
    ids.size !== catalog.episodes.length ||
    !ids.has(catalog.defaultEpisodeId) ||
    [...ids].some((id) => !/^[a-zA-Z0-9_-]+$/.test(id))
  )
    throw new Error("Invalid L4 episode IDs");
  const gallery = buildGalleryCatalog(
    catalog,
    (id) =>
      JSON.parse(
        readFileSync(join(DATA_DIR, "captions", `${id}.json`), "utf8"),
      ) as L4Caption,
  );
  cached = { mtime, catalog: gallery, ids };
  return cached;
}

export const l4 = new Hono();
l4.use("*", requireAuth);
l4.use("*", async (c, next) => {
  try {
    if (!existsSync(CATALOG_PATH))
      return c.json({ error: "dataset_unavailable" }, 503);
    loadL4Catalog();
  } catch {
    return c.json({ error: "dataset_unavailable" }, 503);
  }
  c.header("Cache-Control", "private, no-cache");
  await next();
});
l4.get("/catalog", (c) => c.json(loadL4Catalog().catalog));
l4.get("/captions/:id", (c) => {
  const id = c.req.param("id");
  if (!loadL4Catalog().ids.has(id))
    return c.json({ error: "episode_not_found" }, 404);
  const path = join(DATA_DIR, "captions", `${id}.json`);
  if (!existsSync(path)) return c.json({ error: "caption_not_found" }, 404);
  const body = readFileSync(path, "utf8");
  if (c.req.query("download") === "1") {
    c.header("Content-Disposition", `attachment; filename="${id}.L4.json"`);
  }
  c.header("Content-Type", "application/json; charset=utf-8");
  return c.body(body);
});
l4.get("/media/:id/:mode", (c) => {
  const id = c.req.param("id");
  const mode = c.req.param("mode");
  if (!loadL4Catalog().ids.has(id) || !["recording", "hand"].includes(mode))
    return c.json({ error: "media_not_found" }, 404);
  return serveVideo(c, `${id}.${mode}.mp4`, join(DATA_DIR, "videos"));
});
l4.get("/posters/:id", (c) => {
  const id = c.req.param("id");
  if (!loadL4Catalog().ids.has(id))
    return c.json({ error: "episode_not_found" }, 404);
  return servePoster(c, `${id}.jpg`, join(DATA_DIR, "posters"));
});
l4.get("/spatial/:id", (c) => {
  const id = c.req.param("id");
  if (!loadL4Catalog().ids.has(id))
    return c.json({ error: "episode_not_found" }, 404);
  const file = join(DATA_DIR, "spatial", `${id}.json.gz`);
  if (!existsSync(file)) return c.json({ error: "spatial_not_found" }, 404);
  return new Response(
    Readable.toWeb(createReadStream(file)) as ReadableStream,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Encoding": "gzip",
        "Content-Length": String(statSync(file).size),
        "Cache-Control": "private, no-cache",
        Vary: "Cookie",
      },
    },
  );
});
l4.get("/poses/:id", (c) => {
  const id = c.req.param("id");
  if (!loadL4Catalog().ids.has(id))
    return c.json({ error: "episode_not_found" }, 404);
  const file = join(DATA_DIR, "poses", `${id}.mano.npz`);
  if (!existsSync(file)) return c.json({ error: "pose_not_found" }, 404);
  return new Response(
    Readable.toWeb(createReadStream(file)) as ReadableStream,
    {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(statSync(file).size),
        "Content-Disposition": `attachment; filename="${id}.mano.npz"`,
        "Cache-Control": "private, max-age=3600",
      },
    },
  );
});
