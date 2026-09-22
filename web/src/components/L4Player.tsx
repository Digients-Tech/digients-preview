import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Episode, Language, MediaMode } from "../l4-types.ts";
import { mediaURL, posterURL, preciseTime, timecode } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";
import type { OpenEpisode } from "./VideoCard.tsx";

export type SeekRequest = {
  episodeId: string;
  time: number;
  serial: number;
  play?: boolean;
};
export function L4Player({
  episode,
  lang,
  seek,
  onTime,
  onSeek,
  initial,
  onMode,
  spatial,
}: {
  episode: Episode;
  lang: Language;
  seek: SeekRequest | null;
  onTime: (time: number) => void;
  onSeek: (time: number, play?: boolean) => void;
  initial: OpenEpisode;
  onMode: (mode: MediaMode) => void;
  spatial: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLElement>(null);
  const resume = useRef({ time: initial.time, playing: initial.playing });
  const [mode, setMode] = useState<MediaMode>(initial.mode);
  const [time, setTime] = useState(initial.time);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);
  const zh = lang === "zh";
  function clock(t: number) {
    setTime(t);
    onTime(t);
  }
  // A single presented video frame drives the spatial scene and annotations.
  // timeupdate/seeked cover paused seeks and browsers without frame callbacks.
  useEffect(() => {
    const el = video.current;
    if (!el?.requestVideoFrameCallback) return;
    let id = 0,
      active = true;
    const tick: VideoFrameRequestCallback = (_now, metadata) => {
      if (!active) return;
      setTime(metadata.mediaTime);
      onTime(metadata.mediaTime);
      id = el.requestVideoFrameCallback(tick);
    };
    id = el.requestVideoFrameCallback(tick);
    return () => {
      active = false;
      el.cancelVideoFrameCallback(id);
    };
  }, [onTime]);
  useEffect(() => {
    const el = video.current;
    if (!seek || seek.episodeId !== episode.id || !el) return;
    const next = Math.min(Math.max(seek.time, 0), episode.duration);
    resume.current = { time: next, playing: seek.play || !el.paused };
    if (el.readyState >= 1) el.currentTime = next;
    clock(next);
    if (seek.play && el.readyState >= 1)
      void el.play().catch(() => setPlaying(false));
  }, [seek, episode.id, episode.duration]);
  function togglePlay() {
    const el = video.current;
    if (!el || !ready || error) return;
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }
  function switchMode(next: MediaMode) {
    if (next === mode) return;
    resume.current = {
      time: video.current?.currentTime ?? time,
      playing: !video.current?.paused,
    };
    setReady(false);
    setError(false);
    setMode(next);
    onMode(next);
  }
  function loaded() {
    const el = video.current;
    if (!el) return;
    el.currentTime = Math.min(resume.current.time, el.duration);
    clock(el.currentTime);
    el.playbackRate = speed;
    setReady(true);
    if (resume.current.playing) void el.play().catch(() => setPlaying(false));
  }
  function keydown(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (
      ["INPUT", "SELECT", "BUTTON", "A"].includes(target.tagName) ||
      target.closest(".pose-canvas")
    )
      return;
    if (e.key === " " || e.key.toLowerCase() === "k") {
      e.preventDefault();
      togglePlay();
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      onSeek(time + (e.key === "ArrowRight" ? 5 : -5));
    }
  }
  return (
    <section
      ref={frame}
      className="synchronized-player"
      aria-label={
        zh
          ? "同步视频与空间重建"
          : "Synchronized video and spatial reconstruction"
      }
      onKeyDown={keydown}
    >
      <div className="media-pair">
        <div className="recording-view">
          <div className="spatial-label">
            <h2>{zh ? "原视频 + 手部" : "Original + hands"}</h2>
            <button
              className="text-button"
              aria-pressed={mode === "hand"}
              onClick={() => switchMode(mode === "hand" ? "recording" : "hand")}
            >
              {zh
                ? mode === "hand"
                  ? "隐藏骨骼"
                  : "显示骨骼"
                : mode === "hand"
                  ? "Hide skeleton"
                  : "Show skeleton"}
            </button>
          </div>
          <div
            className="player-picture spatial-original"
            tabIndex={0}
            aria-label={
              zh
                ? "视频，空格播放，方向键跳转"
                : "Video. Space to play, arrow keys to seek"
            }
          >
            <video
              ref={video}
              src={mediaURL(episode.id, mode)}
              poster={posterURL(episode.id)}
              preload="metadata"
              playsInline
              muted
              aria-label={zh ? episode.titleZh : episode.title}
              onLoadedMetadata={loaded}
              onCanPlay={() => setReady(true)}
              onError={() => {
                setError(true);
                setPlaying(false);
              }}
              onTimeUpdate={(e) => {
                if (
                  e.currentTarget.readyState >= 2 &&
                  (e.currentTarget.paused ||
                    !e.currentTarget.requestVideoFrameCallback)
                )
                  clock(e.currentTarget.currentTime);
              }}
              onSeeked={(e) => clock(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={(e) => {
                setPlaying(false);
                clock(e.currentTarget.duration);
              }}
              onClick={togglePlay}
            />
            {!playing && !error && ready && (
              <button
                className="picture-play"
                aria-label={zh ? "播放视频" : "Play video"}
                onClick={togglePlay}
              >
                <Icon name="play" size={24} />
              </button>
            )}
            {!ready && !error && (
              <div className="media-status" role="status">
                {zh ? "正在载入视频…" : "Loading video…"}
              </div>
            )}
            {error && (
              <div className="media-failure" role="alert">
                <strong>
                  {zh ? "视频暂时无法播放" : "This video could not load"}
                </strong>
                <button
                  className="button"
                  onClick={() => {
                    setError(false);
                    setReady(false);
                    video.current?.load();
                  }}
                >
                  {zh ? "重试" : "Try again"}
                </button>
              </div>
            )}
          </div>
        </div>
        {spatial}
      </div>
      <div className="player-controls shared-controls">
        <button
          className="icon-button"
          onClick={togglePlay}
          disabled={!ready || error}
          aria-label={playing ? (zh ? "暂停" : "Pause") : zh ? "播放" : "Play"}
        >
          <Icon name={playing ? "pause" : "play"} size={20} />
        </button>
        <span className="clock">
          {preciseTime(time)}
          <span> / {timecode(episode.duration)}</span>
        </span>
        <input
          className="scrubber"
          aria-label={zh ? "播放位置" : "Playback position"}
          aria-valuetext={`${preciseTime(time)} / ${preciseTime(episode.duration)}`}
          type="range"
          min="0"
          max={episode.duration}
          step="0.05"
          value={Math.min(time, episode.duration)}
          onChange={(e) => onSeek(Number(e.target.value))}
          style={
            {
              "--progress": `${(time / episode.duration) * 100}%`,
            } as CSSProperties
          }
        />
        <span className="shared-clock-note">
          {zh ? "双视图同步" : "Views in sync"}
        </span>
        <select
          className="speed-select"
          aria-label={zh ? "播放速度" : "Playback speed"}
          value={speed}
          onChange={(e) => {
            const rate = Number(e.target.value);
            setSpeed(rate);
            if (video.current) video.current.playbackRate = rate;
          }}
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
        <button
          className="icon-button fullscreen-button"
          aria-label={zh ? "全屏" : "Fullscreen"}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void frame.current?.requestFullscreen?.().catch(() => {});
          }}
        >
          <Icon name="expand" />
        </button>
      </div>
    </section>
  );
}
