import type { CSSProperties } from "react";
import type { L4Caption, Language, L4Action, L4Subtask } from "../l4-types.ts";
import { activeAt, preciseTime } from "../l4-core.ts";

export function TemporalDetail({
  caption,
  time,
  duration,
  lang,
  onSeek,
}: {
  caption: L4Caption;
  time: number;
  duration: number;
  lang: Language;
  onSeek: (time: number) => void;
}) {
  const zh = lang === "zh";
  const subtask = caption.subtasks[activeAt(caption.subtasks, time)];
  const action = caption.actions[activeAt(caption.actions, time)];
  function lane(
    kind: "subtask" | "action",
    segments: (L4Subtask | L4Action)[],
  ) {
    const active = activeAt(segments, time);
    const current = segments[active];
    const label = (s: L4Subtask | L4Action) =>
      "subtask_en" in s
        ? zh
          ? s.subtask_zh
          : s.subtask_en
        : zh
          ? s.caption_zh
          : s.caption_en;
    return (
      <section
        className={`temporal-lane ${kind}-lane`}
        aria-label={
          kind === "subtask"
            ? zh
              ? "子任务时间轴"
              : "Subtask timeline"
            : zh
              ? "动作时间轴"
              : "Action timeline"
        }
      >
        <div className="lane-heading">
          <h3>
            {kind === "subtask"
              ? zh
                ? "子任务"
                : "Subtask"
              : zh
                ? "动作"
                : "Action"}
            <span>{segments.length}</span>
          </h3>
          <span className="clock">
            {current
              ? `${preciseTime(current.start_sec)} — ${preciseTime(current.end_sec)}`
              : "—"}
          </span>
        </div>
        <div className="temporal-track">
          {segments.map((s, i) => (
            <button
              key={i}
              className={`temporal-segment tone-${i % 4} ${active === i ? "is-active" : ""}`}
              style={
                {
                  left: `${(s.start_sec / duration) * 100}%`,
                  width: `${((Math.min(s.end_sec, duration) - s.start_sec) / duration) * 100}%`,
                } as CSSProperties
              }
              onClick={() => onSeek(s.start_sec)}
              aria-label={`${i + 1}. ${label(s)}. ${preciseTime(s.start_sec)} — ${preciseTime(s.end_sec)}`}
              aria-pressed={active === i}
              title={`${label(s)} · ${preciseTime(s.start_sec)} — ${preciseTime(s.end_sec)}`}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
            </button>
          ))}
          <span
            className="temporal-cursor"
            style={{ left: `${Math.min(1, time / duration) * 100}%` }}
            aria-hidden="true"
          />
        </div>
        <p className="lane-current">
          {current ? (
            <>
              <span>{String(active + 1).padStart(2, "0")}</span>
              {label(current)}
            </>
          ) : time >= duration ? (
            zh ? (
              "片段已结束"
            ) : (
              "End of clip"
            )
          ) : zh ? (
            "当前区间无标注"
          ) : (
            "No annotation at this moment"
          )}
        </p>
      </section>
    );
  }
  return (
    <div className="temporal-detail">
      <div className="timeline-ruler" aria-hidden="true">
        <span>00:00</span>
        <span>{preciseTime(duration / 4)}</span>
        <span>{preciseTime(duration / 2)}</span>
        <span>{preciseTime((duration * 3) / 4)}</span>
        <span>{preciseTime(duration)}</span>
      </div>
      {lane("subtask", caption.subtasks)}
      {lane("action", caption.actions)}
      <div className="aligned-context">
        <details open className="annotation-context">
          <summary>{zh ? "当前动作详情" : "Inside this action"}</summary>
          {action ? (
            <dl>
              {(
                [
                  [
                    "Purpose",
                    "目的",
                    zh ? action.purpose_zh : action.purpose_en,
                  ],
                  [
                    "Reasoning",
                    "推理",
                    zh ? action.reasoning_zh : action.reasoning_en,
                  ],
                  [
                    "Body motion",
                    "身体动作",
                    zh ? action.body_zh : action.body_en,
                  ],
                  [
                    "Objects",
                    "交互物体",
                    (zh
                      ? action.interact_objects_zh
                      : action.interact_objects_en
                    ).join(" · "),
                  ],
                ] as string[][]
              ).map(([en, cn, value]) => (
                <div key={en}>
                  <dt>{zh ? cn : en}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>
              {zh
                ? "点击动作时间条查看详情。"
                : "Select an action on the timeline to inspect its annotation."}
            </p>
          )}
        </details>
        <details className="annotation-context">
          <summary>{zh ? "当前子任务详情" : "Inside this subtask"}</summary>
          {subtask ? (
            <dl>
              {(
                [
                  [
                    "Description",
                    "描述",
                    zh ? subtask.description_zh : subtask.description_en,
                  ],
                  ["Scene", "场景", zh ? subtask.scene_zh : subtask.scene_en],
                  [
                    "Spatial context",
                    "空间关系",
                    (zh ? subtask.spatial_zh : subtask.spatial_en).join(" · "),
                  ],
                ] as string[][]
              ).map(([en, cn, value]) => (
                <div key={en}>
                  <dt>{zh ? cn : en}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>
              {zh
                ? "点击子任务时间条查看详情。"
                : "Select a subtask on the timeline to inspect its annotation."}
            </p>
          )}
        </details>
        <details className="annotation-context full-transcript">
          <summary>
            {zh ? "全部动作与子任务" : "All actions & subtasks"}
          </summary>
          <div className="transcript-columns">
            {[caption.subtasks, caption.actions].map((segments, index) => (
              <div key={index}>
                <h4>
                  {index === 0
                    ? zh
                      ? "子任务"
                      : "Subtasks"
                    : zh
                      ? "动作"
                      : "Actions"}
                </h4>
                {segments.map((s, i) => (
                  <button key={i} onClick={() => onSeek(s.start_sec)}>
                    <span className="clock">{preciseTime(s.start_sec)}</span>
                    <span>
                      {"subtask_en" in s
                        ? zh
                          ? s.subtask_zh
                          : s.subtask_en
                        : zh
                          ? s.caption_zh
                          : s.caption_en}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
