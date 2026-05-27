// Generate small placeholder preview clips (one per seeded preview) so the portal
// works out of the box. Replace these with real demo recordings by dropping mp4s
// of the same name into the videos directory. Requires ffmpeg on PATH.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { allPreviewClips } from "../src/data.js";
import { VIDEOS_DIR } from "../src/videos.js";

// A few mac font candidates for the burned-in label; drawtext is skipped if none exist.
const FONT = [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/Library/Fonts/Arial.ttf",
].find(existsSync);

const PALETTE = ["1a2b4a", "3a1a4a", "1a4a3a", "4a3a1a", "4a1a2a", "1a3a4a"];

function ffmpegAvailable(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function esc(text: string): string {
  // Escape ffmpeg drawtext special chars.
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function main() {
  if (!ffmpegAvailable()) {
    console.error("[gen] ffmpeg not found on PATH — install it (brew install ffmpeg) and retry.");
    process.exit(1);
  }
  if (!existsSync(VIDEOS_DIR)) mkdirSync(VIDEOS_DIR, { recursive: true });

  const clips = allPreviewClips();
  console.log(`[gen] generating ${clips.length} placeholder clips into ${VIDEOS_DIR}`);

  clips.forEach((clip, i) => {
    const out = `${VIDEOS_DIR}/${clip.file}`;
    const color = PALETTE[i % PALETTE.length];
    const filters: string[] = [];
    if (FONT) {
      filters.push(
        `drawtext=fontfile=${FONT}:text='${esc(clip.label)}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=(h-text_h)/2-20`,
        `drawtext=fontfile=${FONT}:text='${esc("DEMO PREVIEW")}':fontcolor=0x8a8fa3:fontsize=16:x=(w-text_w)/2:y=(h-text_h)/2+24`
      );
    }
    const args = [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=0x${color}:s=640x360:d=${clip.durationSec}:r=30`,
      ...(filters.length ? ["-vf", filters.join(",")] : []),
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      out,
    ];
    execFileSync("ffmpeg", args, { stdio: "ignore" });
    console.log(`[gen]  ${i + 1}/${clips.length}  ${clip.file}  (${clip.label})`);
  });

  console.log("[gen] done.");
}

main();
