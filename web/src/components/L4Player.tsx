import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Episode, L4Caption, Language, MediaMode } from "../l4-types.ts";
import { mediaURL, posterURL, preciseTime, timecode } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";
import { SubtaskTimeline } from "./SubtaskTimeline.tsx";
import type { OpenEpisode } from "./VideoCard.tsx";

export type SeekRequest = { episodeId: string; time: number; serial: number };
type Props = {
  episode: Episode;
  caption: L4Caption | null;
  lang: Language;
  seek: SeekRequest | null;
  onTime: (time: number) => void;
  onSeek: (time: number) => void;
  initial: OpenEpisode;
  onMode: (mode: MediaMode) => void;
};

export function L4Player({
  episode,
  caption,
  lang,
  seek,
  onTime,
  onSeek,
  initial,
  onMode,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const resume = useRef({ time: initial.time, playing: initial.playing });
  const [mode, setMode] = useState<MediaMode>(initial.mode);
  const [time, setTime] = useState(initial.time);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);
  const zh = lang === "zh";
  const subtasks = caption?.subtasks ?? episode.subtasks;

  useEffect(() => {
    if (!seek || seek.episodeId !== episode.id || !video.current) return;
    const next = Math.min(Math.max(seek.time, 0), episode.duration);
    resume.current.time = next;
    video.current.currentTime = next;
    setTime(next);
    onTime(next);
  }, [seek, episode.id, episode.duration, onTime]);

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
    setTime(el.currentTime);
    onTime(el.currentTime);
    el.playbackRate = speed;
    setReady(true);
    if (resume.current.playing) void el.play().catch(() => setPlaying(false));
  }

  function keydown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (["INPUT", "SELECT", "BUTTON", "A"].includes(target.tagName)) return;
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
      className="evidence"
      aria-label={zh ? "视频与时间轴" : "Video and timeline"}
    >
      <div className="evidence-toolbar">
        <div
          className="segmented"
          role="group"
          aria-label={zh ? "视频视图" : "Video view"}
        >
          <button
            aria-pressed={mode === "recording"}
            onClick={() => switchMode("recording")}
          >
            {zh ? "原始视角" : "Original view"}
          </button>
          <button
            aria-pressed={mode === "hand"}
            onClick={() => switchMode("hand")}
          >
            <span className="pose-dot" />
            {zh ? "手部位姿" : "Hand pose"}
          </button>
        </div>
        <span className="media-note">
          {mode === "hand" ? "MANO" : zh ? "第一人称" : "Egocentric"}
        </span>
      </div>
      <div
        ref={frame}
        className="player"
        tabIndex={0}
        onKeyDown={keydown}
        aria-label={
          zh
            ? "播放器，空格播放，左右方向键跳转"
            : "Player. Space to play, arrow keys to seek."
        }
      >
        <div className="player-picture">
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
              if (e.currentTarget.readyState < 2) return;
              const t = e.currentTarget.currentTime;
              setTime(t);
              onTime(t);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />
          {!playing && !error && ready && (
            <button
              className="picture-play"
              aria-label={zh ? "播放视频" : "Play video"}
              onClick={togglePlay}
            >
              <Icon name="play" size={26} />
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
              <p>
                {zh
                  ? "请检查网络连接后重试。"
                  : "Check your connection and try again."}
              </p>
              <button
                className="button button-light"
                onClick={() => {
                  setError(false);
                  setReady(false);
                  video.current?.load();
                }}
              >
                <Icon name="refresh" />
                {zh ? "重试" : "Try again"}
              </button>
            </div>
          )}
          <span className="picture-label">
            {mode === "hand"
              ? zh
                ? "手部重建"
                : "Hand skeleton"
              : zh
                ? "原始视频"
                : "Original video"}
          </span>
        </div>
        <div className="player-controls">
          <button
            className="icon-button"
            onClick={togglePlay}
            disabled={!ready || error}
            aria-label={
              playing ? (zh ? "暂停" : "Pause") : zh ? "播放" : "Play"
            }
          >
            <Icon name={playing ? "pause" : "play"} size={20} />
          </button>
          <span className="clock">
            {timecode(time)}
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
      </div>
      <SubtaskTimeline
        subtasks={subtasks}
        duration={episode.duration}
        time={time}
        lang={lang}
        onSeek={onSeek}
      />
    </section>
  );
}
