import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { Episode, L4Caption, Language, MediaMode } from "../l4-types.ts";
import {
  activeAt,
  mediaURL,
  posterURL,
  preciseTime,
  timecode,
} from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";

export type SeekRequest = { episodeId: string; time: number; serial: number };
type Props = {
  episode: Episode;
  caption: L4Caption | null;
  lang: Language;
  seek: SeekRequest | null;
  onTime: (time: number) => void;
  onSeek: (time: number) => void;
};

export function L4Player({
  episode,
  caption,
  lang,
  seek,
  onTime,
  onSeek,
}: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const resume = useRef({ time: 0, playing: false });
  const [mode, setMode] = useState<MediaMode>("recording");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState(1);
  const zh = lang === "zh";
  const subtasks = caption?.subtasks ?? [];
  const activeSubtask = activeAt(subtasks, time);

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
  }

  function loaded() {
    const el = video.current;
    if (!el) return;
    el.currentTime = Math.min(resume.current.time, el.duration);
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
          {mode === "hand" ? "MANO" : zh ? "第一人称" : "EGOCENTRIC"}
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
            aria-label={zh ? episode.titleZh : episode.title}
            onLoadedMetadata={loaded}
            onCanPlay={() => setReady(true)}
            onError={() => {
              setError(true);
              setPlaying(false);
            }}
            onTimeUpdate={(e) => {
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
                : "HAND RECONSTRUCTION"
              : zh
                ? "原始视频"
                : "SOURCE VIDEO"}
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
      <div className="subtask-heading">
        <span className="overline">
          {zh ? "子任务时间轴" : "Subtask timeline"}
        </span>
        <span>
          {subtasks.length} {zh ? "个阶段" : "phases"}
        </span>
      </div>
      <div
        className="subtask-track"
        role="group"
        aria-label={zh ? "按子任务跳转" : "Seek to subtask"}
      >
        {subtasks.map((s, i) => (
          <button
            key={s.subtask_id}
            className={i === activeSubtask ? "is-current" : ""}
            style={{
              left: `${(s.start_sec / episode.duration) * 100}%`,
              width: `${((s.end_sec - s.start_sec) / episode.duration) * 100}%`,
            }}
            title={`${preciseTime(s.start_sec)} · ${zh ? s.subtask_zh : s.subtask_en}`}
            aria-label={`${zh ? "子任务" : "Subtask"} ${i + 1}: ${zh ? s.subtask_zh : s.subtask_en}`}
            aria-pressed={i === activeSubtask}
            onClick={() => onSeek(s.start_sec)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
        <span
          className="timeline-cursor"
          style={{ left: `${Math.min((time / episode.duration) * 100, 100)}%` }}
        />
      </div>
      <div className="subtask-current">
        <span className="phase-number">
          {activeSubtask >= 0
            ? String(activeSubtask + 1).padStart(2, "0")
            : "—"}
        </span>
        <span>
          {subtasks[activeSubtask]
            ? zh
              ? subtasks[activeSubtask]!.subtask_zh
              : subtasks[activeSubtask]!.subtask_en
            : zh
              ? "选择一个阶段以探索"
              : "Select a phase to explore"}
        </span>
      </div>
    </section>
  );
}
