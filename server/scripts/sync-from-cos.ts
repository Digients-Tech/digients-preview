// Sync `PER_SCENE` representative clip(s) per (scene_major, scene_minor) from the
// Tencent COS bucket into VIDEOS_DIR, then emit catalog.json from the bucket's real
// structure (true recordingCount, real names from Dylan's taxonomy).
//
// Idempotent: existing files are skipped, so re-running with a larger PER_SCENE just
// adds the missing clips. Picks are deterministic (sorted by uuid) so the first clip
// stays the first preview across runs.
//
// Credentials (from <repo>/.env, loaded via `pnpm sync:cos`):
//   TENCENT_SECRET_ID  -> AWS_ACCESS_KEY_ID
//   TENCENT_SECRET_KEY -> AWS_SECRET_ACCESS_KEY
// Tencent COS is S3-compatible but rejects path-style addressing for this bucket,
// so we write a temp AWS config forcing `addressing_style = virtual`.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// --- Config ---
const BUCKET = process.env.COS_BUCKET ?? "smaller-sample-1302052962";
const REGION = process.env.COS_REGION ?? "ap-beijing";
const ENDPOINT = process.env.COS_ENDPOINT ?? `https://cos.${REGION}.myqcloud.com`;
// PER_SCENE controls how many clips to keep per (scene_major, scene_minor).
// Accepts "all" / "max" / positive integer; defaults to 1.
const perSceneRaw = (process.env.PER_SCENE ?? "1").trim().toLowerCase();
const PER_SCENE = perSceneRaw === "all" || perSceneRaw === "max"
  ? Number.POSITIVE_INFINITY
  : Math.max(1, parseInt(perSceneRaw, 10) || 1);

const REPO = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const VIDEOS_DIR = process.env.VIDEOS_DIR ?? resolve(REPO, "videos");
const CAPTIONS_DIR = process.env.CAPTIONS_DIR ?? resolve(REPO, "captions");
// CURATED_PATH / CATALOG_PATH are overridable so we can do dry-runs that
// generate a side catalog (e.g. for local UI preview) without disturbing the
// repo's checked-in catalog.json or the live curated.json.
const CATALOG_PATH = process.env.CATALOG_PATH ?? resolve(REPO, "catalog.json");
const CURATED_PATH = process.env.CURATED_PATH ?? resolve(REPO, "curated.json");

// Per-scenario override map. States for a given scenario_id:
//   * uuid string      -> single preview, use that clip
//   * uuid string[]    -> multiple previews in given order (frontend renders ◀ / ▶)
//   * null             -> drop this scenario entirely from catalog.json
//   * absent           -> auto-pick (lowest-uuid clip)
type CuratedEntry = string | string[] | null;
type CuratedMap = Record<string, CuratedEntry>;
function loadCurated(): CuratedMap {
  if (!existsSync(CURATED_PATH)) return {};
  try {
    const raw = JSON.parse(readFileSync(CURATED_PATH, "utf8"));
    const out: CuratedMap = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("_")) continue;
      if (v === null || typeof v === "string") {
        out[k] = v as CuratedEntry;
      } else if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
        out[k] = v as string[];
      }
    }
    return out;
  } catch (e) {
    console.warn(`[sync] failed to parse ${CURATED_PATH}: ${e}`);
    return {};
  }
}

const SID = process.env.TENCENT_SECRET_ID ?? process.env.AWS_ACCESS_KEY_ID;
const SKEY = process.env.TENCENT_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
if (!SID || !SKEY) {
  console.error("[sync] missing TENCENT_SECRET_ID / TENCENT_SECRET_KEY (or AWS_* equivalents)");
  process.exit(1);
}

// Temp AWS config to force virtual-hosted addressing for the custom COS endpoint.
const CFG_PATH = "/tmp/awsconfig-cos";
writeFileSync(CFG_PATH, `[default]\ns3 =\n    addressing_style = virtual\n`);

const awsEnv: NodeJS.ProcessEnv = {
  ...process.env,
  AWS_ACCESS_KEY_ID: SID,
  AWS_SECRET_ACCESS_KEY: SKEY,
  AWS_CONFIG_FILE: CFG_PATH,
  AWS_DEFAULT_REGION: REGION,
};

function aws(args: string[]): string {
  return execFileSync(
    "aws",
    [...args, "--endpoint-url", ENDPOINT, "--region", REGION],
    { env: awsEnv, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
}

// --- Bucket listing -> recordings grouped by (major, minor) ---
type Recording = { major: string; minor: string; uuid: string; cosPath: string };

function listAll(): Recording[] {
  console.log(`[sync] listing s3://${BUCKET}/ ...`);
  const out = aws(["s3", "ls", `s3://${BUCKET}/`, "--recursive"]);
  const recs: Recording[] = [];
  for (const line of out.split("\n")) {
    // "2026-05-28 13:03:33   8989 Counter/Bookkeeping & Cashiering/<uuid>/<uuid>.mp4"
    const m = /^\S+\s+\S+\s+\d+\s+(.+)$/.exec(line);
    const path = m?.[1];
    if (!path || !path.endsWith(".mp4")) continue;
    const segs = path.split("/");
    const [major, minor, uuid] = segs;
    if (segs.length < 4 || !major || !minor || !uuid) continue;
    recs.push({ major, minor, uuid, cosPath: path });
  }
  return recs;
}

function groupByScene(recs: Recording[]): Map<string, Recording[]> {
  const m = new Map<string, Recording[]>();
  for (const r of recs) {
    const key = `${r.major}/${r.minor}`;
    let g = m.get(key);
    if (!g) m.set(key, (g = []));
    g.push(r);
  }
  for (const g of m.values()) g.sort((a, b) => a.uuid.localeCompare(b.uuid));
  return m;
}

// --- Naming + helpers ---
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function localFilename(r: Recording): string {
  return `${slug(r.major)}__${slug(r.minor)}__${r.uuid}.mp4`;
}

// Per-clip caption sidecar lives next to the mp4 in COS under the same uuid
// directory, with a .json extension. We mirror that here as captions/<flat>.json.
function localCaptionFilename(r: Recording): string {
  return `${slug(r.major)}__${slug(r.minor)}__${r.uuid}.json`;
}
function captionCosPath(r: Recording): string {
  return r.cosPath.replace(/\.mp4$/i, ".json");
}

function durationSec(path: string): number {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
      { encoding: "utf8" }
    );
    const n = parseFloat(out.trim());
    return Number.isFinite(n) ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

function sleep(ms: number): void {
  execFileSync("sleep", [String(ms / 1000)]);
}

// Download a single file. Returns ok=true if file already present or fetched successfully.
// `--only-show-errors` keeps stderr useful (vs `--quiet`, which hides everything).
function awsCp(srcPath: string, dst: string): { ok: boolean; err?: string } {
  const res = spawnSync(
    "aws",
    [
      "s3", "cp", `s3://${BUCKET}/${srcPath}`, dst,
      "--endpoint-url", ENDPOINT, "--region", REGION,
      "--only-show-errors",
    ],
    { env: awsEnv, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  if (res.status === 0) return { ok: true };
  const err = (res.stderr || res.stdout || `aws exit ${res.status}`).trim();
  return { ok: false, err };
}

function download(srcPath: string, dst: string): { ok: boolean; err?: string } {
  if (existsSync(dst) && statSync(dst).size > 0) return { ok: true };
  const attempts = 3;
  for (let i = 1; i <= attempts; i++) {
    const res = awsCp(srcPath, dst);
    if (res.ok) return res;
    if (i < attempts) {
      const wait = i * 5;
      console.warn(`[sync]    retry ${i}/${attempts - 1} after ${wait}s: ${(res.err ?? "").split("\n")[0]?.slice(0, 160)}`);
      sleep(wait * 1000);
    } else {
      return { ok: false, err: res.err };
    }
  }
  return { ok: false, err: "unreachable" };
}

// --- Main ---
function main() {
  if (!existsSync(VIDEOS_DIR)) mkdirSync(VIDEOS_DIR, { recursive: true });
  if (!existsSync(CAPTIONS_DIR)) mkdirSync(CAPTIONS_DIR, { recursive: true });

  const curated = loadCurated();
  const curatedCount = Object.keys(curated).length;
  if (curatedCount > 0) console.log(`[sync] curated overrides: ${curatedCount}`);

  const groups = groupByScene(listAll());
  const sceneKeys = Array.from(groups.keys()).sort();
  const totalToFetch = sceneKeys.reduce((n, k) => n + Math.min(PER_SCENE, groups.get(k)!.length), 0);
  console.log(`[sync] ${groups.size} (major, minor) groups; fetching up to ${PER_SCENE}/scene = ${totalToFetch} clips`);

  // Build domain -> scenarios catalog as we go.
  type ScenarioOut = { id: string; name: string; recordingCount: number; previews: { id: string; label: string; file: string; durationSec: number }[] };
  const byMajor = new Map<string, ScenarioOut[]>();

  let fetched = 0;
  let skipped = 0;
  const failures: { cosPath: string; err: string }[] = [];
  for (const key of sceneKeys) {
    const all = groups.get(key)!;
    const [major, minor] = key.split("/") as [string, string];
    const scenarioId = `${slug(major)}-${slug(minor)}`;

    // Explicit drop: skip download + don't emit a catalog entry.
    if (scenarioId in curated && curated[scenarioId] === null) {
      console.log(`[sync]  [dropped] ${major}/${minor}`);
      continue;
    }

    // Resolve curated uuid(s) into Recording(s). Curated override wins; absent
    // falls back to the lowest-uuid auto-pick (deterministic across syncs).
    // When a curated uuid is not in the bucket but a matching file exists on
    // disk (out-of-band package), trust the uuid as a local-only pick.
    const resolveUuid = (uuid: string): Recording => {
      const found = all.find((r) => r.uuid === uuid);
      if (found) return found;
      const localPath = join(VIDEOS_DIR, `${slug(major)}__${slug(minor)}__${uuid}.mp4`);
      if (existsSync(localPath)) {
        console.log(`[sync]  local-only ${scenarioId} -> ${uuid}`);
      } else {
        // Still emit the entry — the player UI shows a clear "no preview file
        // yet" placeholder, which is more honest than silently substituting
        // the wrong clip when a curator typo'd a uuid.
        console.warn(`[sync]  ⚠ curated uuid ${uuid} for ${scenarioId} — not in bucket, not on disk; catalog will emit, playback will be empty`);
      }
      return { major, minor, uuid, cosPath: "" };
    };

    const cur = curated[scenarioId];
    let chosenList: Recording[];
    if (Array.isArray(cur)) {
      chosenList = cur.map(resolveUuid);
    } else if (typeof cur === "string") {
      chosenList = [resolveUuid(cur)];
    } else {
      chosenList = [all[0]!];
    }

    // Always download chosen clips so the catalog points at files really on
    // disk, even when PER_SCENE=1 happens to skip them. Skip-if-exists.
    const picks = all.slice(0, PER_SCENE);
    for (const c of chosenList) {
      if (c.cosPath && !picks.some((p) => p.uuid === c.uuid)) picks.push(c);
    }

    for (let i = 0; i < picks.length; i++) {
      const r = picks[i]!;
      const file = localFilename(r);
      const dst = join(VIDEOS_DIR, file);
      const wasPresent = existsSync(dst) && statSync(dst).size > 0;
      const res = download(r.cosPath, dst);
      if (wasPresent) {
        skipped++;
      } else if (res.ok) {
        fetched++;
        console.log(`[sync]  ${fetched}/${totalToFetch}  ${major}/${minor}  -> ${file}`);
      } else {
        failures.push({ cosPath: r.cosPath, err: res.err ?? "" });
        console.error(`[sync]  ✗ FAILED  ${major}/${minor}  -> ${file}\n         ${(res.err ?? "").split("\n")[0]?.slice(0, 200)}`);
      }

      // Fetch the per-clip caption sidecar (.json next to .mp4 in COS).
      // Non-fatal: a missing caption just means the right-panel renders empty.
      const captionFile = localCaptionFilename(r);
      const captionDst = join(CAPTIONS_DIR, captionFile);
      const captionWasPresent = existsSync(captionDst) && statSync(captionDst).size > 0;
      if (!captionWasPresent) {
        const cres = download(captionCosPath(r), captionDst);
        if (!cres.ok) {
          console.warn(`[sync]  ⚠ caption missing ${major}/${minor} -> ${captionFile}\n         ${(cres.err ?? "").split("\n")[0]?.slice(0, 200)}`);
        }
      }
    }

    // One preview per chosen clip; frontend pages between them with ◀ / ▶.
    const previews: ScenarioOut["previews"] = chosenList.map((c, i) => {
      const file = localFilename(c);
      const dst = join(VIDEOS_DIR, file);
      return {
        id: `${scenarioId}-${i + 1}`,
        label: minor,
        file,
        durationSec: existsSync(dst) ? durationSec(dst) : 0,
      };
    });

    let arr = byMajor.get(major);
    if (!arr) byMajor.set(major, (arr = []));
    arr.push({
      id: scenarioId,
      name: minor,
      recordingCount: all.length, // real bucket count
      previews,
    });
  }

  const domains = Array.from(byMajor.keys())
    .sort()
    .map((m) => ({ id: slug(m), name: m, scenarios: byMajor.get(m)! }));

  const catalog = {
    _comment:
      "Generated by server/scripts/sync-from-cos.ts from the Tencent COS bucket. Do not hand-edit between syncs; re-run with PER_SCENE=N to (idempotently) add more clips. Source of truth = the bucket.",
    modalities: [{ id: "ego", name: "Ego", icon: "ego", domains }],
  };

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(
    `[sync] wrote ${CATALOG_PATH}: ${domains.length} domains, ${domains.reduce((n, d) => n + d.scenarios.length, 0)} scenarios, ${fetched} fetched, ${skipped} skipped, ${failures.length} failed`
  );
  if (failures.length) {
    console.error(`\n[sync] ${failures.length} file(s) failed after retries — re-run pnpm sync:cos to pick them up:`);
    for (const f of failures) console.error(`  ${f.cosPath}`);
    process.exit(1);
  }
}

main();
