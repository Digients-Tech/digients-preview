import { useRef, useState } from "react";
import type { Clip, Scenario } from "../types.ts";
import { posterUrl, videoUrl } from "../api.ts";
import { PlayIcon, BoltIcon } from "./Icons.tsx";
import { CaptionPanel } from "./CaptionPanel.tsx";

// 16:9 poster thumbnail for a clip row; falls back to a play icon if the poster is missing.
function Thumb({ clip }: { clip: Clip }) {
  const [ok, setOk] = useState(true);
  if (!ok) {
    return (
      <span className="cliprow__thumb cliprow__thumb--empty">
        <PlayIcon className="cliprow__play" />
      </span>
    );
  }
  return (
    <span className="cliprow__thumb">
      <img src={posterUrl(clip.file)} alt="" loading="lazy" onError={() => setOk(false)} />
      <PlayIcon className="cliprow__play" />
    </span>
  );
}

// Inline preview of the selected scenario: poster-first video player + (if several) a
// clickable thumbnail list. Mounted with a key on scenario.id so state resets per scenario.
export function ScenarioPreview({ scenario, domainName }: { scenario: Scenario; domainName: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clip = scenario.previews[activeIdx];
  const n = scenario.previews.length;

  return (
    <div className="preview">
      <div className="preview__head">
        <span className="preview__bolt"><BoltIcon className="icon" /></span>
        <div>
          <div className="preview__name">{scenario.name}</div>
          <div className="preview__sub">
            {domainName} · {scenario.recordingCount} recordings · {n} preview{n === 1 ? "" : "s"}
          </div>
        </div>
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

          {n > 1 && (
            <div className="cliplist">
              {scenario.previews.map((p, i) => (
                <button
                  key={p.id}
                  className={`cliprow ${i === activeIdx ? "cliprow--active" : ""}`}
                  onClick={() => {
                    setActiveIdx(i);
                    setErrored(false);
                  }}
                >
                  <Thumb clip={p} />
                  <span className="cliprow__label">{p.label}</span>
                  <span className="cliprow__dur">{p.durationSec}s</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {clip && <CaptionPanel key={clip.id} clipFile={clip.file} videoRef={videoRef} />}
      </div>
    </div>
  );
}
