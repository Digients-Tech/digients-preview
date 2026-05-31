// Sync the curated demo-set assets that now live on AWS S3 — Albert's hand+head
// pose-reconstruction overlays AND the per-clip caption sidecars — into VIDEOS_DIR
// / CAPTIONS_DIR, and patch catalog.json so each preview gains handFile / headFile.
//
// WHY A SEPARATE SCRIPT (vs sync-from-cos.ts):
//   sync-from-cos.ts builds the taxonomy from Dylan's Tencent COS bucket
//   (smaller-sample-1302052962, ap-beijing). But the curated demo CLIPS the team
//   actually shows (Alex's Wave-2 picks in curated.json) are NOT all in that small
//   COS bucket — they live in the larger AWS S3 demo set. As of 2026-05-31 Albert
//   also re-ran his pose pipeline (white background, H.264 + faststart) onto AWS S3.
//   The two clouds use different credentials/endpoints, so all the AWS S3 pulls are
//   split out here on the machine's *default* AWS profile — no Tencent creds, no
//   custom endpoint.
//
// Two AWS S3 sources, both flat and keyed by the original clip's uuid:
//   overlays:  s3://<BUCKET>/<OVERLAY_PREFIX>/<uuid>/vis_hand.mp4  (1920x1080 ego + MANO)
//              s3://<BUCKET>/<OVERLAY_PREFIX>/<uuid>/vis_head.mp4  (960x960 head trajectory)
//              (+ npz/json pose data we don't surface in the preview UI)
//   captions:  s3://<BUCKET>/<CAPTION_PREFIX>/<uuid>/<uuid>.json   (the task-step sidecar
//              the right-hand CaptionPanel renders; same schema COS shipped)
//
// This script is catalog-driven, NOT bucket-driven: it walks the existing
// catalog.json previews, extracts each uuid from the `file` field, and pulls the
// matching overlay pair + caption when S3 has them. So it never needs COS and never
// touches the taxonomy structure — run sync-from-cos.ts for that, this for the
// AWS-S3-hosted assets.
//
// Naming mirrors sync-from-cos.ts: <base>.hand.mp4 / <base>.head.mp4 sit next to
// the original <base>.mp4 in VIDEOS_DIR; the caption is <base>.json in CAPTIONS_DIR
// (so /captions/:file resolves it from clip.file). Idempotent: existing non-empty
// files are skipped unless FORCE=1.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --- Config ---
const BUCKET = process.env.HANDHEAD_S3_BUCKET ?? "digients-recordings-sg";
const PREFIX = (process.env.HANDHEAD_S3_PREFIX ?? "uploads/client-sample-data-hand-head/demo_videos")
  .replace(/\/+$/, "");
// Caption sidecars live in the sibling "plain" demo set (flat <uuid>/<uuid>.json).
const CAPTION_PREFIX = (process.env.CAPTION_S3_PREFIX ?? "uploads/client-data-sample-plain")
  .replace(/\/+$/, "");
const REGION = process.env.HANDHEAD_S3_REGION ?? "ap-southeast-1";
const FORCE = /^(1|true|yes)$/i.test(process.env.FORCE ?? "");

const REPO = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const VIDEOS_DIR = process.env.VIDEOS_DIR ?? resolve(REPO, "videos");
const CAPTIONS_DIR = process.env.CAPTIONS_DIR ?? resolve(REPO, "captions");
const CATALOG_PATH = process.env.CATALOG_PATH ?? resolve(REPO, "catalog.json");

// Default AWS profile (jasonwang) — standard endpoint, no COS plumbing.
const awsEnv: NodeJS.ProcessEnv = { ...process.env, AWS_DEFAULT_REGION: REGION };

// --- S3 helpers ---
// Discover which uuids have which artefacts. One recursive list, then group by the
// uuid path segment immediately under PREFIX.
type Presence = { hasHand: boolean; hasHead: boolean };
function listHandHead(): Map<string, Presence> {
  console.log(`[handhead] listing s3://${BUCKET}/${PREFIX}/ ...`);
  const out = execFileSync(
    "aws",
    ["s3", "ls", `s3://${BUCKET}/${PREFIX}/`, "--recursive", "--region", REGION],
    { env: awsEnv, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const m = new Map<string, Presence>();
  for (const line of out.split("\n")) {
    const match = /^\S+\s+\S+\s+\d+\s+(.+)$/.exec(line);
    const path = match?.[1];
    if (!path) continue;
    // path = "<PREFIX>/<uuid>/vis_hand.mp4" -> take the segment after PREFIX.
    const rel = path.slice(PREFIX.length + 1);
    const uuid = rel.split("/")[0];
    if (!uuid) continue;
    let e = m.get(uuid);
    if (!e) m.set(uuid, (e = { hasHand: false, hasHead: false }));
    if (path.endsWith("/vis_hand.mp4")) e.hasHand = true;
    if (path.endsWith("/vis_head.mp4")) e.hasHead = true;
  }
  return m;
}

function download(srcKey: string, dst: string): { ok: boolean; err?: string } {
  if (!FORCE && existsSync(dst) && statSync(dst).size > 0) return { ok: true };
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    const res = spawnSync(
      "aws",
      ["s3", "cp", `s3://${BUCKET}/${srcKey}`, dst, "--region", REGION, "--only-show-errors"],
      { env: awsEnv, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
    if (res.status === 0) return { ok: true };
    const err = (res.stderr || res.stdout || `aws exit ${res.status}`).trim();
    if (i < attempts) {
      console.warn(`[handhead]   retry ${i}/${attempts - 1}: ${err.split("\n")[0]?.slice(0, 160)}`);
      execFileSync("sleep", [String(i * 3)]);
    } else {
      return { ok: false, err };
    }
  }
  return { ok: false, err: "unreachable" };
}

// Caption sidecars: one recursive list of CAPTION_PREFIX, collecting uuids that
// have a <uuid>/<uuid>.json. Empty set if the prefix is unreachable (captions then
// just stay absent — the panel renders "no caption" rather than breaking).
function listCaptions(): Set<string> {
  console.log(`[handhead] listing s3://${BUCKET}/${CAPTION_PREFIX}/ (captions) ...`);
  let out: string;
  try {
    out = execFileSync(
      "aws",
      ["s3", "ls", `s3://${BUCKET}/${CAPTION_PREFIX}/`, "--recursive", "--region", REGION],
      { env: awsEnv, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
    );
  } catch (e) {
    console.warn(`[handhead] caption prefix list failed; captions skipped: ${(e as Error).message}`);
    return new Set();
  }
  const s = new Set<string>();
  for (const line of out.split("\n")) {
    const m = /\/([0-9a-fA-F-]{36})\/\1\.json$/.exec(line);
    if (m?.[1]) s.add(m[1]);
  }
  return s;
}

// --- Catalog walk + patch ---
// Extract the trailing uuid from a preview filename: "<major>__<minor>__<uuid>.mp4".
function uuidOf(file: string): string | null {
  const m = /__([0-9a-fA-F-]{36})\.mp4$/.exec(file);
  return m?.[1] ?? null;
}

function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error(`[handhead] catalog not found: ${CATALOG_PATH} — run pnpm sync:cos first`);
    process.exit(1);
  }
  if (!existsSync(VIDEOS_DIR)) mkdirSync(VIDEOS_DIR, { recursive: true });
  if (!existsSync(CAPTIONS_DIR)) mkdirSync(CAPTIONS_DIR, { recursive: true });

  const presence = listHandHead();
  const handCnt = [...presence.values()].filter((v) => v.hasHand).length;
  const headCnt = [...presence.values()].filter((v) => v.hasHead).length;
  console.log(`[handhead] S3: ${presence.size} uuid(s), ${handCnt} vis_hand, ${headCnt} vis_head`);
  const captions = listCaptions();
  console.log(`[handhead] S3: ${captions.size} caption sidecar(s)`);

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  let patched = 0;
  let fetched = 0;
  let skipped = 0;
  let capFetched = 0;
  const missing: string[] = [];
  const capMissing: string[] = [];
  const failures: string[] = [];

  for (const mod of catalog.modalities ?? []) {
    for (const dom of mod.domains ?? []) {
      for (const scn of dom.scenarios ?? []) {
        for (const prev of scn.previews ?? []) {
          const uuid = uuidOf(prev.file);
          if (!uuid) continue;
          const hh = presence.get(uuid);
          const base = prev.file.replace(/\.mp4$/i, "");

          // Caption sidecar (independent of overlays). The frontend resolves it
          // from clip.file, so it lands as <base>.json in CAPTIONS_DIR.
          if (captions.has(uuid)) {
            const capDst = join(CAPTIONS_DIR, `${base}.json`);
            const capHad = existsSync(capDst) && statSync(capDst).size > 0;
            const cres = download(`${CAPTION_PREFIX}/${uuid}/${uuid}.json`, capDst);
            if (cres.ok) {
              if (!capHad || FORCE) { capFetched++; console.log(`[handhead]  + ${base}.json`); }
            } else {
              failures.push(`${uuid}/${uuid}.json: ${cres.err}`);
            }
          } else {
            capMissing.push(`${scn.id} -> ${uuid}`);
          }

          // Clear any stale fields first; re-add only what S3 actually has so a
          // removed-upstream overlay doesn't linger as a dangling reference.
          delete prev.handFile;
          delete prev.headFile;
          delete prev.comboFile;

          if (!hh) {
            missing.push(`${scn.id} -> ${uuid}`);
            continue;
          }

          if (hh.hasHand) {
            const handFile = `${base}.hand.mp4`;
            const dst = join(VIDEOS_DIR, handFile);
            const had = existsSync(dst) && statSync(dst).size > 0;
            const res = download(`${PREFIX}/${uuid}/vis_hand.mp4`, dst);
            if (res.ok) {
              prev.handFile = handFile;
              if (had && !FORCE) skipped++; else { fetched++; console.log(`[handhead]  + ${handFile}`); }
            } else {
              failures.push(`${uuid}/vis_hand.mp4: ${res.err}`);
            }
          }
          if (hh.hasHead) {
            const headFile = `${base}.head.mp4`;
            const dst = join(VIDEOS_DIR, headFile);
            const had = existsSync(dst) && statSync(dst).size > 0;
            const res = download(`${PREFIX}/${uuid}/vis_head.mp4`, dst);
            if (res.ok) {
              prev.headFile = headFile;
              if (had && !FORCE) skipped++; else { fetched++; console.log(`[handhead]  + ${headFile}`); }
            } else {
              failures.push(`${uuid}/vis_head.mp4: ${res.err}`);
            }
          }
          // When both overlays exist we serve a single hstacked composite
          // (hand | head) for frame-perfect sync — see scripts/gen-combos.ts,
          // which materialises <base>.combo.mp4 from the two files. The frontend
          // prefers comboFile; handFile/headFile stay as provenance + fallback.
          if (prev.handFile && prev.headFile) prev.comboFile = `${base}.combo.mp4`;

          if (prev.handFile || prev.headFile) patched++;
        }
      }
    }
  }

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + "\n");
  console.log(
    `[handhead] catalog patched: ${patched} preview(s) gained overlays; ` +
    `${fetched} overlay file(s) + ${capFetched} caption(s) fetched, ${skipped} overlay skipped`
  );
  if (missing.length) {
    console.log(`[handhead] ${missing.length} preview uuid(s) had no S3 overlay (left as original-only):`);
    for (const m of missing) console.log(`           ${m}`);
  }
  if (capMissing.length) {
    console.log(`[handhead] ${capMissing.length} preview uuid(s) had no S3 caption:`);
    for (const m of capMissing) console.log(`           ${m}`);
  }
  if (failures.length) {
    console.error(`\n[handhead] ${failures.length} download(s) failed — re-run to retry:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
}

main();
