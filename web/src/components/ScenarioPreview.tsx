import { useRef, useState } from "react";
import type { Scenario } from "../types.ts";
import { posterUrl, videoUrl } from "../api.ts";
import { PlayIcon, BoltIcon } from "./Icons.tsx";
import { CaptionPanel } from "./CaptionPanel.tsx";

// Inline preview of the selected scenario: poster-first video player + caption panel.
// When the scenario carries several preview clips, a ◀ / ▶ pager in the head chrome
// lets the viewer step through them; with a single clip the arrows are absent.
// Mounted with a key on scenario.id so state resets per scenario.
export function ScenarioPreview({ scenario, domainName }: { scenario: Scenario; domainName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clip = scenario.previews[activeIdx];
  const n = scenario.previews.length;
  const step = (delta: number) => {
    setActiveIdx((i) => Math.max(0, Math.min(n - 1, i + delta)));
    setErrored(false);
  };

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

      <div className="preview__body">
        <div className="preview__main">
          <div className="player">
            {clip && !errored ? (
              // No autoplay: the poster frame shows first, the client presses play.
              <video
                key={clip.id}
                ref={videoRef}
                src={videoUrl(clip.file)}
                poster={posterUrl(clip.file)}
                controls
                playsInline
                preload="metadata"
                onError={() => setErrored(true)}
              />
            ) : (
              <div className="player__empty">
                <PlayIcon className="player__empty-icon" />
                <p>No preview file yet{clip ? <> for <code>{clip.file}</code></> : null}.</p>
                <p className="player__empty-hint">Drop the demo clip into the videos directory to enable playback.</p>
              </div>
            )}
          </div>
        </div>

        {clip && <CaptionPanel key={clip.id} clipFile={clip.file} videoRef={videoRef} />}
      </div>
    </div>
  );
}
