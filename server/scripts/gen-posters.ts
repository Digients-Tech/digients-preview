// Generate a poster frame (still image) for each preview clip that has a video file.
// Works for both the placeholder clips and real uploaded mp4s. Re-run after adding or
// replacing videos. Requires ffmpeg on PATH.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { allPreviewClips } from "../src/data.js";
import { VIDEOS_DIR, POSTERS_DIR } from "../src/videos.js";

function ffmpegAvailable(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Extract one frame ~1s in (falling back to the first frame for very short clips),
// scaled to 640px wide, as a JPEG.
function extractFrame(input: string, output: string): boolean {
  const base = (seek: string) => [
    "-y", "-ss", seek, "-i", input,
    "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3",
    output,
  ];
  try {
    execFileSync("ffmpeg", base("1"), { stdio: "ignore" });
    return true;
  } catch {
    try {
      execFileSync("ffmpeg", base("0"), { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}

function main() {
  if (!ffmpegAvailable()) {
    console.error("[posters] ffmpeg not found on PATH — install it and retry.");
    process.exit(1);
  }
  if (!existsSync(POSTERS_DIR)) mkdirSync(POSTERS_DIR, { recursive: true });

  const clips = allPreviewClips();
  // The player requests a poster for whichever file it actually renders: the hand
  // overlay when present (it replaces the original), the head overlay, and the
  // original. Generate one for every file that exists on disk so none 404.
  const files = new Set<string>();
  for (const clip of clips) {
    files.add(clip.file);
    if (clip.handFile) files.add(clip.handFile);
    if (clip.headFile) files.add(clip.headFile);
    if (clip.comboFile) files.add(clip.comboFile);
  }
  let made = 0;
  let skipped = 0;
  for (const file of files) {
    const video = `${VIDEOS_DIR}/${file}`;
    if (!existsSync(video)) {
      skipped += 1;
      continue;
    }
    const poster = `${POSTERS_DIR}/${file.replace(/\.[^.]+$/, ".jpg")}`;
    if (extractFrame(video, poster)) {
      made += 1;
      console.log(`[posters]  ${file} -> ${poster.split("/").pop()}`);
    } else {
      console.warn(`[posters]  FAILED ${file}`);
    }
  }
  console.log(`[posters] done — ${made} generated, ${skipped} skipped (no video file).`);
}

main();
