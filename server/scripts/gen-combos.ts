// Materialise the side-by-side hand|head composite video for every preview that
// declares `comboFile` in catalog.json. Reads the two source overlays next to it
// (<base>.hand.mp4 + <base>.head.mp4) and hstacks them into <base>.combo.mp4.
//
// WHY a composite: the preview shows the hand-pose overlay and the head-pose
// trajectory together. Two separate <video> elements drift apart whenever the
// (larger) hand video buffers — the head keeps playing. Baking them into ONE file
// makes playback frame-perfect by construction and lets the player use a single
// element with a fixed aspect ratio (no layout shift before load).
//
// Layout: hand is 1920x1080 (16:9), head is 960x960 (1:1). We scale the head to
// 1080 tall (1080x1080) and hstack → 3000x1080 (25:9) — exactly the equal-height
// side-by-side proportion the old two-element grid rendered.
//
// Idempotent: an existing non-empty <base>.combo.mp4 is skipped unless FORCE=1.
// Run after sync:handhead (which downloads the overlays + sets comboFile) — works
// the same locally and on the box, so the 1.6 GB of overlays never has to move:
// the box composites from the overlay files it already holds.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { allPreviewClips } from "../src/data.js";
import { VIDEOS_DIR } from "../src/videos.js";

const FORCE = /^(1|true|yes)$/i.test(process.env.FORCE ?? "");
// Keep CRF/preset overridable so the small prod box can trade speed for CPU.
const CRF = process.env.COMBO_CRF ?? "20";
const PRESET = process.env.COMBO_PRESET ?? "veryfast";

function ffmpegAvailable(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function compose(hand: string, head: string, out: string): boolean {
  const res = spawnSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error",
      "-i", hand, "-i", head,
      // Scale head to the hand's height, then place them side by side.
      "-filter_complex", "[1:v]scale=-1:1080:flags=bicubic[hd];[0:v][hd]hstack=inputs=2[v]",
      "-map", "[v]",
      "-c:v", "libx264", "-preset", PRESET, "-crf", CRF,
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
      out,
    ],
    { stdio: "ignore" }
  );
  return res.status === 0 && existsSync(out) && statSync(out).size > 0;
}

function main() {
  if (!ffmpegAvailable()) {
    console.error("[combos] ffmpeg not found on PATH — install it and retry.");
    process.exit(1);
  }

  // Dedupe combo targets across multi-preview scenarios.
  const seen = new Set<string>();
  const jobs: { combo: string; hand: string; head: string }[] = [];
  for (const clip of allPreviewClips()) {
    if (!clip.comboFile || seen.has(clip.comboFile)) continue;
    seen.add(clip.comboFile);
    const base = clip.comboFile.replace(/\.combo\.mp4$/i, "");
    jobs.push({
      combo: clip.comboFile,
      hand: `${base}.hand.mp4`,
      head: `${base}.head.mp4`,
    });
  }

  let made = 0;
  let skipped = 0;
  let missing = 0;
  const failed: string[] = [];
  for (const j of jobs) {
    const out = join(VIDEOS_DIR, j.combo);
    if (!FORCE && existsSync(out) && statSync(out).size > 0) {
      skipped++;
      continue;
    }
    const hand = join(VIDEOS_DIR, j.hand);
    const head = join(VIDEOS_DIR, j.head);
    if (!existsSync(hand) || !existsSync(head)) {
      missing++;
      console.warn(`[combos]  ⚠ missing source for ${j.combo} (need ${j.hand} + ${j.head})`);
      continue;
    }
    if (compose(hand, head, out)) {
      made++;
      console.log(`[combos]  ${j.combo}`);
    } else {
      failed.push(j.combo);
      console.error(`[combos]  ✗ FAILED ${j.combo}`);
    }
  }
  console.log(`[combos] done — ${made} built, ${skipped} skipped, ${missing} missing-source, ${failed.length} failed.`);
  if (failed.length) process.exit(1);
}

main();
