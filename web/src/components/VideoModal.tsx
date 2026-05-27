import { useEffect, useState } from "react";
import type { Skill } from "../types.ts";
import { videoUrl } from "../api.ts";
import { CloseIcon, PlayIcon, BoltIcon } from "./Icons.tsx";

type Props = { skill: Skill; onClose: () => void };

export function VideoModal({ skill, onClose }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const clip = skill.previews[activeIdx];

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => setErrored(false), [activeIdx]);

  return (
    <div className="modal__backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">
            <span className="modal__bolt"><BoltIcon className="icon" /></span>
            <div>
              <div className="modal__name">{skill.name}</div>
              <div className="modal__sub">{skill.recordingCount} recordings · {skill.previews.length} previews</div>
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <CloseIcon className="icon" />
          </button>
        </div>

        <div className="modal__body">
          <div className="player">
            {clip && !errored ? (
              <video
                key={clip.id}
                src={videoUrl(clip.file)}
                controls
                autoPlay
                playsInline
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

          {skill.previews.length > 1 && (
            <div className="cliplist">
              {skill.previews.map((p, i) => (
                <button
                  key={p.id}
                  className={`cliprow ${i === activeIdx ? "cliprow--active" : ""}`}
                  onClick={() => setActiveIdx(i)}
                >
                  <PlayIcon className="cliprow__icon" />
                  <span className="cliprow__label">{p.label}</span>
                  <span className="cliprow__dur">{p.durationSec}s</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
