import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const tmp = mkdtempSync(resolve(tmpdir(), "cua-auth-test-"));
process.env.PREVIEW_PASSWORD = "fixture-password";
process.env.SESSION_SECRET = "fixture-session-secret";
process.env.STATS_PATH = resolve(tmp, "stats.json");
const { createCuaApp, CUA_SAMPLE_ID } = await import("../src/cua-app.js");
const publicRoot = resolve(tmp, "public"), dataRoot = resolve(tmp, "data");
mkdirSync(publicRoot);
mkdirSync(resolve(dataRoot, "assets", CUA_SAMPLE_ID), { recursive: true });
mkdirSync(resolve(dataRoot, "data", CUA_SAMPLE_ID), { recursive: true });
writeFileSync(resolve(publicRoot, "index.html"), "authenticated CUA page");
writeFileSync(resolve(publicRoot, "login.html"), "CUA login");
writeFileSync(resolve(publicRoot, "portal-tokens.css"), ":root{}");
writeFileSync(resolve(dataRoot, "assets", CUA_SAMPLE_ID, "workflow.mp4"), "0123456789");
writeFileSync(resolve(dataRoot, "assets", CUA_SAMPLE_ID, "frame.png"), "fixture-frame");
writeFileSync(resolve(dataRoot, "data", CUA_SAMPLE_ID, "sample-data.js"), "window.CUA_SAMPLE={};");
writeFileSync(resolve(tmp, "outside.json"), "must not be served");
symlinkSync(resolve(tmp, "outside.json"), resolve(dataRoot, "data", CUA_SAMPLE_ID, "escape.json"));
const app = createCuaApp({ publicRoot, dataRoot });
const video = `/assets/${CUA_SAMPLE_ID}/workflow.mp4`;
try {
  assert.equal(await (await app.request("/")).text(), "CUA login");
  assert.equal((await app.request("/portal-tokens.css")).status, 200);
  for (const path of [video, `/assets/${CUA_SAMPLE_ID}/frame.png`, `/data/${CUA_SAMPLE_ID}/sample-data.js`]) {
    assert.equal((await app.request(path)).status, 401);
    assert.equal((await app.request(path, { method: "HEAD" })).status, 401);
  }
  assert.equal((await app.request("/api/login", { method: "POST", body: "null" })).status, 401);
  assert.equal((await app.request("/api/login", { method: "POST", body: JSON.stringify({ password: "wrong" }) })).status, 401);
  const login = await app.request("/api/login", { method: "POST", body: JSON.stringify({ password: "fixture-password" }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
  assert.match(login.headers.get("set-cookie")!, /HttpOnly/i);
  const headers = { cookie };
  assert.deepEqual(await (await app.request("/api/session", { headers })).json(), { authed: true });
  assert.equal(await (await app.request("/", { headers })).text(), "authenticated CUA page");
  assert.equal((await app.request("/index.html", { headers: { cookie: "preview_session=forged" } })).status, 200);
  assert.equal(await (await app.request("/index.html", { headers: { cookie: "preview_session=forged" } })).text(), "CUA login");
  for (const [range, expected] of [["bytes=2-5", "2345"], ["bytes=-3", "789"], ["bytes=8-999", "89"], ["bytes=4-", "456789"]]) {
    const response = await app.request(video, { headers: { ...headers, range: range! } });
    assert.equal(response.status, 206);
    assert.equal(await response.text(), expected);
  }
  for (const range of ["bytes=999-", "bytes=-0", "bytes=5-2", "bytes=-", "bytes=0-1,3-4", "bytes=9007199254740992-"]) {
    assert.equal((await app.request(video, { headers: { ...headers, range } })).status, 416);
  }
  const head = await app.request(video, { method: "HEAD", headers });
  assert.equal(head.headers.get("content-length"), "10");
  assert.equal(await head.text(), "");
  for (const path of ["/.env", "/README.md", "/scripts/dev.mjs", "/data/old-markov/sample-data.js", `/data/${CUA_SAMPLE_ID}/escape.json`, `/data/${CUA_SAMPLE_ID}/%2e%2e%2foutside.json`]) {
    assert.equal((await app.request(path, { headers })).status, 404, path);
  }
  const logout = await app.request("/api/logout", { method: "POST", headers });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie")!, /Max-Age=0/i);
  assert.equal((await app.request(video)).status, 401);
  console.log("CUA authentication, direct-link protection, traversal isolation, HEAD, byte ranges and logout checks passed.");
} finally { rmSync(tmp, { recursive: true, force: true }); }
