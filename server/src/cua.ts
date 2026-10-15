import { serve } from "@hono/node-server";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const publicRoot = resolve(repo, "cua");
const dataRoot = resolve(process.env.CUA_DATA_DIR ?? resolve(repo, ".local/cua-data"));
if (process.env.NODE_ENV === "production" && (!process.env.PREVIEW_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || process.env.SESSION_SECRET.startsWith("replace-"))) {
  throw new Error("CUA production requires PREVIEW_PASSWORD and a dedicated SESSION_SECRET.");
}
if (!existsSync(resolve(dataRoot, "data/cua-windows-20260918-30fps/sample-data.js"))) {
  throw new Error("CUA_DATA_DIR does not contain the ZBrush sample. See cua/README.md.");
}
process.env.STATS_PATH ??= resolve(repo, ".stats/cua-login-counts.json");
const { createCuaApp } = await import("./cua-app.js");
const app = createCuaApp({ publicRoot, dataRoot });
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 8789), hostname: "127.0.0.1" }, (info) => {
  console.log(`[cua] listening on http://127.0.0.1:${info.port}`);
});
