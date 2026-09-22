import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Episode, L4Caption, Language, MediaMode } from "../l4-types.ts";
import { preciseTime } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";
import { L4Player, type SeekRequest } from "./L4Player.tsx";
import { TemporalDetail } from "./TemporalDetail.tsx";
import { SceneMemory } from "./SceneMemory.tsx";
import type { OpenEpisode } from "./VideoCard.tsx";
const PoseScene = lazy(() => import("./PoseScene.tsx"));

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
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [episode.id, retry]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(""), 4000);
    return () => clearTimeout(t);
  }, [copied]);
  const requestSeek = useCallback(
    (value: number, play = false) =>
      setSeek((previous) => ({
        episodeId: episode.id,
        time: value,
        serial: (previous?.serial ?? 0) + 1,
        play,
      })),
    [episode.id],
  );
  const playSegment = useCallback(
    (value: number) => requestSeek(value, true),
    [requestSeek],
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
      className="episode-dialog spatial-dialog"
      aria-labelledby="detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="detail-shell spatial-shell">
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
        <div className="spatial-detail-layout">
          <main className="spatial-evidence">
            <div className="spatial-title">
              <h1 id="detail-title">{zh ? episode.titleZh : episode.title}</h1>
              <span className="clip-duration clock">
                {preciseTime(episode.duration)}
              </span>
            </div>
            <div className="spatial-taxonomy">
              <span className="industry-label">
                {zh ? episode.industryZh : episode.industry}
              </span>
              <span>
                {(zh ? episode.scenesZh : episode.scenes).join(" · ")}
              </span>
            </div>
            <L4Player
              episode={episode}
              initial={initial}
              lang={lang}
              seek={seek}
              onSeek={requestSeek}
              onTime={setTime}
              onMode={setMode}
              spatial={
                <Suspense
                  fallback={
                    <div className="spatial-loading" role="status">
                      {zh ? "正在载入 3D 视图…" : "Loading 3D view…"}
                    </div>
                  }
                >
                  <PoseScene
                    episodeId={episode.id}
                    time={time}
                    lang={lang}
                    onSessionExpired={onSessionExpired}
                  />
                </Suspense>
              }
            />
            {caption ? (
              <TemporalDetail
                caption={caption}
                time={time}
                duration={episode.duration}
                lang={lang}
                onSeek={playSegment}
              />
            ) : (
              <div
                className="detail-data-status"
                role={error ? "alert" : "status"}
              >
                <p>
                  {error
                    ? zh
                      ? "标注未能载入"
                      : "Annotations could not load"
                    : zh
                      ? "正在载入时间轴和记忆…"
                      : "Loading timelines and memory…"}
                </p>
                {error && (
                  <button
                    className="button"
                    onClick={() => setRetry(retry + 1)}
                  >
                    {zh ? "重试" : "Try again"}
                  </button>
                )}
              </div>
            )}
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
              <summary>{zh ? "数据与文件信息" : "Data & file details"}</summary>
              <dl>
                <div>
                  <dt>{zh ? "任务" : "Tasks"}</dt>
                  <dd>
                    {(zh ? episode.taskLabelsZh : episode.taskLabels).join(
                      " · ",
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{zh ? "任务类别" : "Task classes"}</dt>
                  <dd>
                    {episode.tasks
                      .map((t) => t.replaceAll("_", " "))
                      .join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt>{zh ? "位姿来源" : "Pose source"}</dt>
                  <dd>
                    {zh
                      ? "MANO 手部关节 + SLAM 相机位姿；头部朝向由相机表示。片段内局部坐标，尺度为估计值。"
                      : "MANO hand joints + SLAM camera pose. Camera orientation represents the head. Clip-local coordinates; scale is estimated."}
                  </dd>
                </div>
                <div>
                  <dt>Video ID</dt>
                  <dd>{episode.id}</dd>
                </div>
                <div>
                  <dt>{zh ? "标注结构" : "Schema"}</dt>
                  <dd>{caption?.schema_version ?? "…"} · L4</dd>
                </div>
                <div>
                  <dt>Caption SHA-256</dt>
                  <dd>{episode.captionSha256}</dd>
                </div>
              </dl>
            </details>
          </main>
          {caption ? (
            <SceneMemory
              caption={caption}
              time={time}
              lang={lang}
              onSeek={playSegment}
            />
          ) : (
            <aside className="scene-memory">
              <h2>{zh ? "场景记忆" : "Scene memory"}</h2>
              <p>
                {error
                  ? zh
                    ? "等待标注重试"
                    : "Retry annotations to load memory"
                  : zh
                    ? "正在载入…"
                    : "Loading…"}
              </p>
            </aside>
          )}
        </div>
      </div>
    </dialog>
  );
}
