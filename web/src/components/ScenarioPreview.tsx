import { useRef, useState } from "react";
import type { Scenario } from "../types.ts";
import { posterUrl, videoUrl } from "../api.ts";
import { PlayIcon, BoltIcon } from "./Icons.tsx";
import { CaptionPanel } from "./CaptionPanel.tsx";

// Inline preview of the selected scenario.
//
// Preferred source is `comboFile` — a single video with the hand-pose overlay
// and the head-pose trajectory hstacked side by side (25:9). Baking them into
// one file makes playback frame-perfect (no drift while the larger hand view
// buffers) and lets us reserve the right height before load via a fixed
// aspect ratio, so the placeholder doesn't jump. Falls back to handFile, then
// the original clip, for any preview whose composite hasn't been built yet.
//
// The caption panel below hooks the video's timeupdate to drive step
// highlighting. Multi-pick scenarios page through clips with a ◀ / ▶ chrome;
// state resets per scenario via the parent `key={scenario.id}`.
export function ScenarioPreview({ scenario, domainName }: { scenario: Scenario; domainName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const primaryRef = useRef<HTMLVideoElement | null>(null);
  const clip = scenario.previews[activeIdx];
  const n = scenario.previews.length;
  const step = (delta: number) => {
    setActiveIdx((i) => Math.max(0, Math.min(n - 1, i + delta)));
    setErrored(false);
  };

  const primaryFile = clip?.comboFile ?? clip?.handFile ?? clip?.file;
  const isCombo = Boolean(clip?.comboFile);

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
          <div className={`preview__videos ${isCombo ? "preview__videos--combo" : "preview__videos--solo"}`}>
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
