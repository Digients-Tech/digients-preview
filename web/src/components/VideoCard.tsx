import { useEffect, useRef, useState } from "react";
import type { Episode, Language, MediaMode } from "../l4-types.ts";
import { mediaURL, posterURL, timecode } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";
import { SubtaskTimeline } from "./SubtaskTimeline.tsx";

const visibilityCallbacks = new Map<Element, (visible: boolean) => void>();
let visibilityObserver: IntersectionObserver | undefined;
function watchVisibility(
  element: Element,
  callback: (visible: boolean) => void,
) {
  visibilityObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        visibilityCallbacks.get(entry.target)?.(
          entry.isIntersecting && entry.intersectionRatio > 0.12,
        );
    },
    { threshold: [0, 0.13] },
  );
  visibilityCallbacks.set(element, callback);
  visibilityObserver.observe(element);
  return () => {
    visibilityObserver?.unobserve(element);
    visibilityCallbacks.delete(element);
    if (!visibilityCallbacks.size) {
      visibilityObserver?.disconnect();
      visibilityObserver = undefined;
    }
  };
}

export type OpenEpisode = {
  id: string;
  time: number;
  playing: boolean;
  mode: MediaMode;
};
export function VideoCard({
  episode,
  lang,
  mode,
  previews,
  suspended,
  onOpen,
}: {
  episode: Episode;
  lang: Language;
  mode: MediaMode;
  previews: boolean;
  suspended: boolean;
  onOpen: (episode: OpenEpisode) => void;
}) {
  const card = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const clock = useRef(0);
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manual, setManual] = useState<boolean | null>(null);
  const [error, setError] = useState(false);
  const shouldPlay = visible && !suspended && (manual ?? previews);
  const zh = lang === "zh";
  useEffect(
    () =>
      card.current ? watchVisibility(card.current, setVisible) : undefined,
    [],
  );
  useEffect(() => setManual(null), [previews]);
  useEffect(() => {
    setError(false);
  }, [mode, visible]);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (shouldPlay) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [shouldPlay, mode, visible]);

  const open = () =>
    onOpen({ id: episode.id, time: clock.current, playing, mode });
  function seek(next: number) {
    clock.current = next;
    setTime(next);
    if (video.current) video.current.currentTime = next;
  }
  return (
    <article
      className="video-card"
      ref={card}
      data-episode={episode.id}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button, a, input, select"))
          open();
      }}
    >
      <div className="card-picture">
        {visible ? (
          <video
            ref={video}
            src={mediaURL(episode.id, mode)}
            poster={posterURL(episode.id)}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={zh ? episode.titleZh : episode.title}
            onLoadedMetadata={(event) => {
              event.currentTarget.currentTime = Math.min(
                clock.current,
                episode.duration,
              );
              if (shouldPlay)
                void event.currentTarget.play().catch(() => setPlaying(false));
            }}
            onTimeUpdate={(event) => {
              if (event.currentTarget.readyState >= 2) {
                clock.current = event.currentTarget.currentTime;
                setTime(clock.current);
              }
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              setError(true);
              setPlaying(false);
            }}
          />
        ) : (
          <img
            src={posterURL(episode.id)}
            alt=""
            loading="lazy"
            width="854"
            height="480"
          />
        )}
        <button
          className="card-open"
          onClick={open}
          aria-label={`${zh ? "打开详情：" : "Open details: "}${zh ? episode.titleZh : episode.title}`}
        >
          <span className="card-open-hint">
            <Icon name="expand" size={17} />
            {zh ? "查看详情" : "Explore clip"}
          </span>
        </button>
        {episode.featured && (
          <span className="card-featured">{zh ? "精选" : "Featured"}</span>
        )}
        <span className="card-duration">
          {timecode(time)} <span>/ {timecode(episode.duration)}</span>
        </span>
        <button
          className="card-play"
          aria-label={
            playing
              ? zh
                ? "暂停预览"
                : "Pause preview"
              : zh
                ? "播放预览"
                : "Play preview"
          }
          onClick={() => {
            if (error) {
              setError(false);
              video.current?.load();
            }
            setManual(!playing);
          }}
        >
          <Icon
            name={error ? "refresh" : playing ? "pause" : "play"}
            size={16}
          />
        </button>
        {error && (
          <span className="card-media-error">
            {zh ? "预览加载失败，可重试" : "Preview unavailable · Retry"}
          </span>
        )}
      </div>
      <SubtaskTimeline
        subtasks={episode.subtasks}
        duration={episode.duration}
        time={time}
        lang={lang}
        onSeek={seek}
        compact
      />
      <dl className="card-taxonomy">
        <div>
          <dt>{zh ? "行业" : "Industry"}</dt>
          <dd>
            <span className="industry-label">
              {zh ? episode.industryZh : episode.industry}
            </span>
          </dd>
        </div>
        <div>
          <dt>{zh ? "场景" : "Scene"}</dt>
          <dd title={(zh ? episode.scenesZh : episode.scenes).join(" · ")}>
            {(zh ? episode.scenesZh : episode.scenes).join(" · ")}
          </dd>
        </div>
        <div>
          <dt>{zh ? "任务" : "Task"}</dt>
          <dd>
            <button
              className="card-title"
              onClick={open}
              title={(zh ? episode.taskLabelsZh : episode.taskLabels).join(
                " · ",
              )}
            >
              {(zh ? episode.taskLabelsZh : episode.taskLabels).join(" · ")}
            </button>
          </dd>
        </div>
      </dl>
    </article>
  );
}
