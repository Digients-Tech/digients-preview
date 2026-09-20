import { useMemo, useState } from "react";
import type { L4Caption, Language } from "../l4-types.ts";
import { activeAt, memoryAt, preciseTime } from "../l4-core.ts";

export function L4Annotations({
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
  const [tab, setTab] = useState<"action" | "memory">("action");
  const zh = lang === "zh";
  const index = activeAt(caption.actions, time);
  const action = caption.actions[index];
  const subtask = caption.subtasks.find(
    (s) => s.subtask_id === action?.subtask_id,
  );
  const memory = useMemo(() => memoryAt(caption, time), [caption, time]);
  return (
    <aside
      className="annotations"
      aria-label={zh ? "L4 标注" : "L4 annotations"}
    >
      <div
        className="annotation-tabs"
        role="tablist"
        aria-label={zh ? "标注视图" : "Annotation view"}
      >
        <button
          id="action-tab"
          role="tab"
          aria-selected={tab === "action"}
          aria-controls="annotation-panel"
          tabIndex={tab === "action" ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              setTab("memory");
              document.getElementById("memory-tab")?.focus();
            }
          }}
          onClick={() => setTab("action")}
        >
          {zh ? "动作解读" : "Action insight"}
        </button>
        <button
          id="memory-tab"
          role="tab"
          aria-selected={tab === "memory"}
          aria-controls="annotation-panel"
          tabIndex={tab === "memory" ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              setTab("action");
              document.getElementById("action-tab")?.focus();
            }
          }}
          onClick={() => setTab("memory")}
        >
          {zh ? "场景记忆" : "Scene memory"}
          <span>{memory.length}</span>
        </button>
      </div>
      <div
        id="annotation-panel"
        className="annotation-panel"
        role="tabpanel"
        aria-labelledby={`${tab}-tab`}
        tabIndex={0}
      >
        {tab === "action" ? (
          action ? (
            <>
              <div className="action-kicker">
                <span className="overline">
                  {zh ? "动作" : "Action"} {String(index + 1).padStart(2, "0")}
                  <span className="muted"> / {caption.actions.length}</span>
                </span>
                <span className="clock">
                  {preciseTime(action.start_sec)} –{" "}
                  {preciseTime(action.end_sec)}
                </span>
              </div>
              <h2 className="action-caption">
                {zh ? action.caption_zh : action.caption_en}
              </h2>
              <dl className="insight-list">
                <div>
                  <dt>{zh ? "目的" : "Purpose"}</dt>
                  <dd>{zh ? action.purpose_zh : action.purpose_en}</dd>
                </div>
                <div>
                  <dt>{zh ? "推理" : "Reasoning"}</dt>
                  <dd>{zh ? action.reasoning_zh : action.reasoning_en}</dd>
                </div>
                <div>
                  <dt>{zh ? "身体运动" : "Body motion"}</dt>
                  <dd>{zh ? action.body_zh : action.body_en}</dd>
                </div>
                <div>
                  <dt>{zh ? "交互对象" : "Interacting objects"}</dt>
                  <dd className="object-list">
                    {(zh
                      ? action.interact_objects_zh
                      : action.interact_objects_en
                    ).map((object) => (
                      <span key={object}>{object}</span>
                    ))}
                  </dd>
                </div>
              </dl>
              {subtask && (
                <details className="scene-detail">
                  <summary>
                    {zh ? "场景与空间关系" : "Scene & spatial context"}
                  </summary>
                  <p>{zh ? subtask.scene_zh : subtask.scene_en}</p>
                  <ul>
                    {(zh ? subtask.spatial_zh : subtask.spatial_en).map(
                      (item) => (
                        <li key={item}>{item}</li>
                      ),
                    )}
                  </ul>
                  <p>{zh ? subtask.description_zh : subtask.description_en}</p>
                </details>
              )}
            </>
          ) : (
            <div className="annotation-empty">
              <span className="overline">
                {zh ? "动作解读" : "Action insight"}
              </span>
              <h2>{zh ? "此刻没有动作标注" : "Between annotated actions"}</h2>
              <p>
                {zh
                  ? "继续播放或在动作序列中选择一个片段。"
                  : "Continue playing, or choose an action from the sequence."}
              </p>
            </div>
          )
        ) : (
          <>
            <div className="memory-intro">
              <span className="overline">
                {zh ? "场景中的对象" : "Objects in the scene"}
              </span>
              <p>
                {zh ? "展示标注时间不晚于" : "Entries timestamped through"}{" "}
                <span className="clock">{preciseTime(time)}</span>
                {zh ? " 的记忆条目。" : "."}
              </p>
            </div>
            {memory.length ? (
              <div className="memory-list">
                {memory.map((item) => (
                  <article key={item.obj_en || item.obj_zh}>
                    <div className="memory-title">
                      <h3>{zh ? item.obj_zh : item.obj_en}</h3>
                      <button
                        className="timestamp-link"
                        onClick={() => onSeek(item.t_sec)}
                        aria-label={`${zh ? "跳转到" : "Seek to"} ${preciseTime(item.t_sec)}`}
                      >
                        {preciseTime(item.t_sec)}
                      </button>
                    </div>
                    <p>{zh ? item.what_zh : item.what_en}</p>
                    <p className="memory-where">
                      {zh ? item.where_zh : item.where_en}
                    </p>
                    {(zh ? item.note_zh : item.note_en) && (
                      <p className="memory-note">
                        {zh ? item.note_zh : item.note_en}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy">
                {zh
                  ? "播放视频，探索逐步出现的场景记忆。"
                  : "Play the video to reveal the first scene observations."}
              </p>
            )}
          </>
        )}
      </div>
      <div className="annotation-footnote">
        <span className="live-dot" />
        {zh ? "L4 标注 · 跟随播放位置" : "L4 annotations · Linked to playback"}
      </div>
    </aside>
  );
}
