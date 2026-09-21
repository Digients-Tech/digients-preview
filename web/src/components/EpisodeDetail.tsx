import { useCallback, useEffect, useRef, useState } from "react";
import type { Episode, L4Caption, Language, MediaMode } from "../l4-types.ts";
import { preciseTime } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";
import { L4Player, type SeekRequest } from "./L4Player.tsx";
import { L4Annotations } from "./L4Annotations.tsx";
import type { OpenEpisode } from "./VideoCard.tsx";

export function EpisodeDetail({
  episode,
  initial,
  lang,
  onClose,
  onSessionExpired,
}: {
  episode: Episode;
  initial: OpenEpisode;
  lang: Language;
  onClose: () => void;
  onSessionExpired: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [caption, setCaption] = useState<L4Caption | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [time, setTime] = useState(Math.min(initial.time, episode.duration));
  const [mode, setMode] = useState<MediaMode>(initial.mode);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [copied, setCopied] = useState("");
  const zh = lang === "zh";
  useEffect(() => {
    const priorFocus = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = priorOverflow;
      priorFocus?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`/api/l4/captions/${encodeURIComponent(episode.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          onSessionExpired();
          return null;
        }
        if (!response.ok) throw new Error("caption");
        return response.json() as Promise<L4Caption>;
      })
      .then((data) => {
        if (data) setCaption(data);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [episode.id, retry]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(""), 4000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const requestSeek = useCallback(
    (value: number) =>
      setSeek((previous) => ({
        episodeId: episode.id,
        time: value,
        serial: (previous?.serial ?? 0) + 1,
      })),
    [episode.id],
  );
  async function copy() {
    const url = new URL(location.href);
    url.searchParams.set("t", time.toFixed(1));
    url.searchParams.set("view", mode);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopied(zh ? "已复制当前时刻链接" : "Link to this moment copied");
    } catch {
      history.replaceState(history.state, "", url);
      setCopied(
        zh ? "请复制浏览器地址栏" : "Copy the link from your address bar",
      );
    }
  }
  return (
    <dialog
      ref={dialog}
      className="episode-dialog"
      aria-labelledby="detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="detail-shell">
        <header className="detail-header">
          <button className="back-button" onClick={onClose} autoFocus>
            <Icon name="back" />
            {zh ? "返回视频集" : "Back to collection"}
          </button>
          <span>
            {zh ? "片段详情" : "Clip details"}
            <span className="detail-level">L4</span>
          </span>
          <button
            className="icon-button detail-close"
            aria-label={zh ? "关闭详情" : "Close details"}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="detail-layout">
          <div className="detail-evidence">
            <L4Player
              episode={episode}
              caption={caption}
              initial={initial}
              lang={lang}
              seek={seek}
              onSeek={requestSeek}
              onTime={setTime}
              onMode={setMode}
            />
            <div className="detail-title-row">
              <span className="industry-label">
                {zh ? episode.industryZh : episode.industry}
              </span>
              <span className="detail-counts">
                {preciseTime(episode.duration)} <span>·</span>{" "}
                {episode.subtaskCount} {zh ? "子任务" : "subtasks"}{" "}
                <span>·</span> {episode.actionCount} {zh ? "动作" : "actions"}
              </span>
            </div>
            <h1 id="detail-title">{zh ? episode.titleZh : episode.title}</h1>
            <dl className="episode-taxonomy">
              <div>
                <dt>{zh ? "场景" : "Scene"}</dt>
                <dd>{(zh ? episode.scenesZh : episode.scenes).join(" · ")}</dd>
              </div>
              <div>
                <dt>{zh ? "任务" : "Tasks"}</dt>
                <dd>
                  {(zh ? episode.taskLabelsZh : episode.taskLabels).join(" · ")}
                </dd>
              </div>
              <div>
                <dt>{zh ? "任务类别" : "Task classes"}</dt>
                <dd className="task-classes">
                  {episode.tasks.map((task) => (
                    <span key={task}>{task.replaceAll("_", " ")}</span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="detail-downloads">
              <button className="button" onClick={() => void copy()}>
                <Icon name="link" size={16} />
                {zh ? "分享当前时刻" : "Share this moment"}
              </button>
              <a
                className="button"
                href={`/api/l4/captions/${encodeURIComponent(episode.id)}?download=1`}
                download
              >
                <Icon name="download" size={16} />
                L4 JSON
              </a>
              <a
                className="button"
                href={`/api/l4/poses/${encodeURIComponent(episode.id)}`}
                download
              >
                <Icon name="download" size={16} />
                MANO
              </a>
            </div>
            {copied && (
              <p className="detail-notice" role="status">
                {copied}
              </p>
            )}
            <details className="file-details">
              <summary>{zh ? "文件信息" : "File details"}</summary>
              <dl>
                <div>
                  <dt>Video ID</dt>
                  <dd>{episode.id}</dd>
                </div>
                <div>
                  <dt>{zh ? "标注结构" : "Schema"}</dt>
                  <dd>
                    {caption?.schema_version ?? "…"} ·{" "}
                    {caption?.caption_level ?? "L4"}
                  </dd>
                </div>
                <div>
                  <dt>{zh ? "标注状态" : "Caption status"}</dt>
                  <dd>
                    {caption
                      ? caption.success
                        ? zh
                          ? "成功"
                          : "Success"
                        : zh
                          ? "失败"
                          : "Failed"
                      : "…"}
                  </dd>
                </div>
                <div>
                  <dt>Caption SHA-256</dt>
                  <dd>{episode.captionSha256}</dd>
                </div>
              </dl>
            </details>
          </div>
          {caption ? (
            <L4Annotations
              caption={caption}
              time={time}
              lang={lang}
              onSeek={requestSeek}
            />
          ) : (
            <aside
              className="annotation-loading"
              role={error ? "alert" : "status"}
            >
              <h2>
                {error
                  ? zh
                    ? "无法载入标注"
                    : "Annotations could not load"
                  : zh
                    ? "正在载入完整 L4 标注…"
                    : "Loading full L4 annotations…"}
              </h2>
              {error && (
                <button className="button" onClick={() => setRetry(retry + 1)}>
                  {zh ? "重试" : "Try again"}
                </button>
              )}
            </aside>
          )}
        </div>
      </div>
    </dialog>
  );
}
