import { useEffect, useMemo, useRef, useState } from "react";
import type { L4Caption, Language } from "../l4-types.ts";
import { memoryAt, preciseTime } from "../l4-core.ts";

export function SceneMemory({
  caption,
  time,
  lang,
  onSeek,
}: {
  caption: L4Caption;
  time: number;
  lang: Language;
  onSeek: (time: number) => void;
}) {
  const zh = lang === "zh";
  const [scope, setScope] = useState<"current" | "all">("current");
  const [pulse, setPulse] = useState<number[]>([]);
  const previous = useRef(time);
  const observations = useMemo(
    () =>
      caption.global.memory
        .flatMap((w) => w.state)
        .filter((o) => Number.isFinite(o.t_sec))
        .sort((a, b) => a.t_sec - b.t_sec),
    [caption],
  );
  const latest = observations.filter((o) => o.t_sec <= time).at(-1)?.t_sec;
  const entries =
    scope === "current"
      ? memoryAt(caption, time).sort((a, b) => b.t_sec - a.t_sec)
      : observations;
  useEffect(() => {
    const from = previous.current;
    previous.current = time;
    // Only a forward clock step across a real observation timestamp pulses.
    if (time <= from || time - from > 0.6) {
      setPulse([]);
      return;
    }
    const updates = observations
      .filter((o) => o.t_sec > from && o.t_sec <= time)
      .map((o) => o.t_sec);
    if (updates.length) setPulse(updates);
  }, [time, observations]);
  useEffect(() => {
    if (!pulse.length) return;
    const timer = setTimeout(() => setPulse([]), 1200);
    return () => clearTimeout(timer);
  }, [pulse]);
  return (
    <aside
      className="scene-memory"
      aria-label={zh ? "场景记忆" : "Scene memory"}
    >
      <div className="memory-top">
        <h2>{zh ? "场景记忆" : "Scene memory"}</h2>
        <span
          role="img"
          className={`memory-live-dot ${pulse.length ? "is-updating" : ""}`}
          aria-label={
            pulse.length
              ? zh
                ? "记忆更新"
                : "Memory updated"
              : zh
                ? "跟随时间戳"
                : "Following timestamps"
          }
        />
      </div>
      <p className="memory-intro">
        {zh
          ? "物体、位置与状态，随时间展开。"
          : "Objects, places and states as the scene unfolds."}
      </p>
      <div
        className="memory-scope segmented"
        role="group"
        aria-label={zh ? "记忆范围" : "Memory scope"}
      >
        <button
          aria-pressed={scope === "current"}
          onClick={() => setScope("current")}
        >
          {zh ? "当前时刻" : "At playhead"}
        </button>
        <button aria-pressed={scope === "all"} onClick={() => setScope("all")}>
          {zh ? "全部记录" : "All events"}
          <span>{observations.length}</span>
        </button>
      </div>
      <div className="memory-clock">
        <span>
          {scope === "current"
            ? zh
              ? "当前物体"
              : "Objects in memory"
            : zh
              ? "全部观察"
              : "Source observations"}
          <b>{entries.length}</b>
        </span>
        <span className="clock">{preciseTime(time)}</span>
      </div>
      <div
        className="memory-stream"
        tabIndex={0}
        aria-label={zh ? "记忆条目" : "Memory observations"}
      >
        {entries.length === 0 ? (
          <div className="memory-empty">
            <p>
              {zh
                ? "这一刻尚无记忆记录。"
                : "No memory recorded at this moment."}
            </p>
            {observations[0] && (
              <button
                className="text-button"
                onClick={() => onSeek(observations[0]!.t_sec)}
              >
                {zh ? "跳转至首条记录" : "Jump to the first observation"} ·{" "}
                {preciseTime(observations[0].t_sec)}
              </button>
            )}
          </div>
        ) : (
          entries.map((entry, index) => (
            <article
              key={`${entry.obj_en}-${entry.t_sec}-${index}`}
              className={`memory-event ${pulse.includes(entry.t_sec) ? "is-updating" : ""} ${entry.t_sec > time ? "is-future" : ""}`}
            >
              <div className="memory-event-title">
                <span
                  className={`memory-event-dot ${entry.t_sec === latest ? "is-latest" : ""}`}
                  aria-hidden="true"
                />
                <h3>{zh ? entry.obj_zh : entry.obj_en}</h3>
                <button
                  className="memory-time clock"
                  aria-label={`${zh ? "播放" : "Play"} ${preciseTime(entry.t_sec)}`}
                  onClick={() => onSeek(entry.t_sec)}
                >
                  {preciseTime(entry.t_sec)}
                </button>
              </div>
              <p className="memory-location">
                {zh ? entry.where_zh : entry.where_en}
              </p>
              <p>{zh ? entry.what_zh : entry.what_en}</p>
              {(entry.note_en || entry.note_zh) && (
                <details className="memory-note">
                  <summary>{zh ? "观察备注" : "Observation note"}</summary>
                  <p>{zh ? entry.note_zh : entry.note_en}</p>
                </details>
              )}
            </article>
          ))
        )}
      </div>
      <p className="memory-footnote">
        {zh
          ? "按源标注时间戳对齐；描述可能涵盖更长区间。"
          : "Aligned to source timestamps. Descriptions may span a wider interval."}
      </p>
    </aside>
  );
}
