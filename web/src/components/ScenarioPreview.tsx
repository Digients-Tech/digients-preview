import { useEffect, useRef, useState } from "react";
import type { Scenario } from "../types.ts";
import { posterUrl, videoUrl } from "../api.ts";
import { PlayIcon, BoltIcon } from "./Icons.tsx";
import { CaptionPanel } from "./CaptionPanel.tsx";

// Inline preview of the selected scenario.
//
// When the clip has `handFile`, the hand-pose visualisation REPLACES the
// original (Albert's overlay is a strict superset of the original ego frame).
// When `headFile` is also present, it renders next to the hand video in a
// 16:9 + 1:1 grid sized so both videos share the same display height. The
// caption panel always sits below the combined video row.
//
// Playback authority is the primary (hand) video — the head video mirrors its
// play / pause / seek / rate changes so the two stay in lockstep. The caption
// panel hooks the primary video's timeupdate to drive step highlighting.
//
// Multi-pick scenarios still page through clips with a ◀ / ▶ chrome; state
// resets per scenario via the parent `key={scenario.id}`.
export function ScenarioPreview({ scenario, domainName }: { scenario: Scenario; domainName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const primaryRef = useRef<HTMLVideoElement | null>(null);
  const headRef = useRef<HTMLVideoElement | null>(null);
  const clip = scenario.previews[activeIdx];
  const n = scenario.previews.length;
  const step = (delta: number) => {
    setActiveIdx((i) => Math.max(0, Math.min(n - 1, i + delta)));
    setErrored(false);
  };

  // Falls back to the original file when the hand viz hasn't been synced yet
  // (graceful degrade during partial syncs).
  const primaryFile = clip?.handFile ?? clip?.file;
  const headFile = clip?.headFile;
  const hasDuo = Boolean(clip?.handFile && clip?.headFile);

  // Mirror primary playback into the head video. Drift correction on timeupdate
  // keeps them aligned without re-seeking every frame (only when > 150 ms off).
  useEffect(() => {
    const p = primaryRef.current;
    const h = headRef.current;
    if (!p || !h) return;
    const sync = () => {
      if (Math.abs(h.currentTime - p.currentTime) > 0.15) h.currentTime = p.currentTime;
    };
    const onPlay = () => { void h.play().catch(() => {}); };
    const onPause = () => { h.pause(); };
    const onRate = () => { h.playbackRate = p.playbackRate; };
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("seeked", sync);
    p.addEventListener("timeupdate", sync);
    p.addEventListener("ratechange", onRate);
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("seeked", sync);
      p.removeEventListener("timeupdate", sync);
      p.removeEventListener("ratechange", onRate);
    };
    // headFile in deps so we rebind whenever the head element appears/disappears.
  }, [clip?.id, headFile]);

  return (
    <div className="preview">
      <div className="preview__head">
        <span className="preview__bolt"><BoltIcon className="icon" /></span>
        <div className="preview__title">
          <div className="preview__name">{scenario.name}</div>
          <div className="preview__sub">
            {domainName} · {scenario.recordingCount} recordings · {n} preview{n === 1 ? "" : "s"}
          </div>
        </div>
        {n > 1 && (
          <div className="preview__nav">
            {activeIdx > 0 && (
              <button className="preview__navbtn" onClick={() => step(-1)} aria-label="Previous clip">◀</button>
            )}
            <span className="preview__navidx">{activeIdx + 1} / {n}</span>
            {activeIdx < n - 1 && (
              <button className="preview__navbtn" onClick={() => step(+1)} aria-label="Next clip">▶</button>
            )}
          </div>
        )}
      </div>

      <div className="preview__body preview__body--stacked">
        {clip && !errored && primaryFile ? (
          <div className={`preview__videos ${hasDuo ? "preview__videos--duo" : "preview__videos--solo"}`}>
            <video
              key={`${clip.id}-primary`}
              ref={primaryRef}
              src={videoUrl(primaryFile)}
              poster={posterUrl(primaryFile)}
              controls
              playsInline
              preload="metadata"
              onError={() => setErrored(true)}
            />
            {hasDuo && headFile && (
              <video
                key={`${clip.id}-head`}
                ref={headRef}
                src={videoUrl(headFile)}
                muted
                playsInline
                preload="metadata"
                aria-label="Head-pose visualisation (synced with primary video)"
              />
            )}
          </div>
        ) : (
          <div className="player">
            <div className="player__empty">
              <PlayIcon className="player__empty-icon" />
              <p>No preview file yet{clip ? <> for <code>{clip.file}</code></> : null}.</p>
              <p className="player__empty-hint">Drop the demo clip into the videos directory to enable playback.</p>
            </div>
          </div>
        )}

        {clip && <CaptionPanel key={clip.id} clipFile={clip.file} videoRef={primaryRef} />}
      </div>
    </div>
  );
}
