import { useEffect, useMemo, useRef, useState } from "react";
import type { L4Caption, Language, MemoryObservation } from "../l4-types.ts";
import { activeAt, memoryAt, preciseTime } from "../l4-core.ts";
import { Icon } from "./ExplorerIcons.tsx";

type Tab = "actions" | "subtasks" | "memory";
const tabs: Tab[] = ["actions", "subtasks", "memory"];

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
  const [tab, setTab] = useState<Tab>("actions");
  const [follow, setFollow] = useState(true);
  const [memoryScope, setMemoryScope] = useState<"all" | "current">("all");
  const panel = useRef<HTMLDivElement>(null);
  const zh = lang === "zh";
  const actionIndex = activeAt(caption.actions, time);
  const subtaskIndex = activeAt(caption.subtasks, time);
  const observations = useMemo(
    () =>
      caption.global.memory
        .flatMap((window) =>
          window.state.map((entry) => ({
            ...entry,
            window: window.window,
            windowEnd: window.t_end_sec,
          })),
        )
        .sort((a, b) => a.t_sec - b.t_sec),
    [caption],
  );
  const currentMemory = useMemo(() => memoryAt(caption, time), [caption, time]);
  const memory: (MemoryObservation & {
    window?: number;
    windowEnd?: number;
  })[] = memoryScope === "all" ? observations : currentMemory;
  const counts = {
    actions: caption.actions.length,
    subtasks: caption.subtasks.length,
    memory: observations.length,
  };
  const labels = {
    actions: zh ? "动作" : "Actions",
    subtasks: zh ? "子任务" : "Subtasks",
    memory: zh ? "记忆" : "Memory",
  };
  function choose(next: Tab) {
    setTab(next);
    panel.current?.scrollTo({ top: 0 });
  }
  useEffect(() => {
    const container = panel.current;
    if (
      !follow ||
      tab === "memory" ||
      !container ||
      container.scrollHeight <= container.clientHeight
    )
      return;
    const current = container.querySelector<HTMLElement>(
      ".annotation-entry.is-current",
    );
    if (current)
      container.scrollTo({
        top:
          current.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop,
      });
  }, [tab, actionIndex, subtaskIndex, follow]);
  return (
    <aside
      className="annotations"
      aria-label={zh ? "完整 L4 标注" : "Full L4 annotations"}
    >
      <div
        className="annotation-tabs"
        role="tablist"
        aria-label={zh ? "标注视图" : "Annotation view"}
      >
        {tabs.map((name, index) => (
          <button
            key={name}
            id={`${name}-tab`}
            role="tab"
            aria-selected={tab === name}
            aria-controls="annotation-panel"
            tabIndex={tab === name ? 0 : -1}
            onClick={() => choose(name)}
            onKeyDown={(event) => {
              let next: Tab | undefined;
              if (event.key === "ArrowRight")
                next = tabs[(index + 1) % tabs.length];
              if (event.key === "ArrowLeft")
                next = tabs[(index + tabs.length - 1) % tabs.length];
              if (event.key === "Home") next = tabs[0];
              if (event.key === "End") next = tabs[tabs.length - 1];
              if (next) {
                event.preventDefault();
                choose(next);
                document.getElementById(`${next}-tab`)?.focus();
              }
            }}
          >
            {labels[name]}
            <span>{counts[name]}</span>
          </button>
        ))}
      </div>
      {tab !== "memory" && (
        <div className="annotation-status">
          <button
            className="annotation-follow"
            aria-pressed={follow}
            onClick={() => setFollow(!follow)}
          >
            <span className="toggle-indicator">
              <Icon name="check" size={11} />
            </span>
            {zh ? "跟随播放" : "Follow playback"}
          </button>
          <span className="clock">{preciseTime(time)}</span>
        </div>
      )}
      <div
        ref={panel}
        id="annotation-panel"
        className="annotation-panel"
        role="tabpanel"
        aria-labelledby={`${tab}-tab`}
        tabIndex={0}
      >
        {tab === "actions" && (
          <div className="action-sequence">
            {caption.actions.map((action, index) => (
              <details
                key={action.action_id}
                className={`annotation-entry${index === actionIndex ? " is-current" : ""}`}
                open={index === actionIndex}
              >
                <summary>
                  <span className="entry-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{zh ? action.caption_zh : action.caption_en}</span>
                  <Icon name="chevron" size={16} />
                </summary>
                <div className="annotation-entry-body">
                  <button
                    className="timestamp-link"
                    onClick={() => onSeek(action.start_sec)}
                  >
                    <Icon name="play" size={13} />
                    {preciseTime(action.start_sec)} –{" "}
                    {preciseTime(action.end_sec)}
                  </button>
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
                        ).map((object, i) => (
                          <span key={`${object}-${i}`}>{object}</span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt>{zh ? "所属子任务" : "Subtask"}</dt>
                      <dd>
                        {(() => {
                          const item = caption.subtasks.find(
                            (entry) => entry.subtask_id === action.subtask_id,
                          );
                          return item
                            ? zh
                              ? item.subtask_zh
                              : item.subtask_en
                            : action.subtask_id;
                        })()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </details>
            ))}
          </div>
        )}
        {tab === "subtasks" && (
          <div className="subtask-sequence">
            {caption.subtasks.map((subtask, index) => (
              <details
                key={subtask.subtask_id}
                className={`annotation-entry${index === subtaskIndex ? " is-current" : ""}`}
                open={index === subtaskIndex}
              >
                <summary>
                  <span className="entry-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{zh ? subtask.subtask_zh : subtask.subtask_en}</span>
                  <Icon name="chevron" size={16} />
                </summary>
                <div className="annotation-entry-body">
                  <button
                    className="timestamp-link"
                    onClick={() => onSeek(subtask.start_sec)}
                  >
                    <Icon name="play" size={13} />
                    {preciseTime(subtask.start_sec)} –{" "}
                    {preciseTime(subtask.end_sec)}
                  </button>
                  <dl className="insight-list">
                    <div>
                      <dt>{zh ? "描述" : "Description"}</dt>
                      <dd>
                        {zh ? subtask.description_zh : subtask.description_en}
                      </dd>
                    </div>
                    <div>
                      <dt>{zh ? "场景" : "Scene"}</dt>
                      <dd>{zh ? subtask.scene_zh : subtask.scene_en}</dd>
                    </div>
                    <div>
                      <dt>{zh ? "空间关系" : "Spatial relationships"}</dt>
                      <dd>
                        <ul>
                          {(zh ? subtask.spatial_zh : subtask.spatial_en).map(
                            (item, i) => (
                              <li key={i}>{item}</li>
                            ),
                          )}
                        </ul>
                      </dd>
                    </div>
                  </dl>
                </div>
              </details>
            ))}
          </div>
        )}
        {tab === "memory" && (
          <div className="memory-content">
            <div className="memory-heading">
              <div className="memory-heading-row">
                <h2>{zh ? "场景记忆" : "Scene memory"}</h2>
                <span className="clock">{preciseTime(time)}</span>
              </div>
              <p>
                {zh
                  ? "带时间戳的对象、位置与状态记录。"
                  : "Timestamped observations of objects, locations and state."}
              </p>
            </div>
            <div
              className="memory-scope"
              role="group"
              aria-label={zh ? "记忆范围" : "Memory scope"}
            >
              <button
                aria-pressed={memoryScope === "all"}
                onClick={() => setMemoryScope("all")}
              >
                {zh ? "全部记录" : "All observations"}
                <span>{observations.length}</span>
              </button>
              <button
                aria-pressed={memoryScope === "current"}
                onClick={() => setMemoryScope("current")}
              >
                {zh ? "截至当前" : "At playhead"}
                <span>{currentMemory.length}</span>
              </button>
            </div>
            <p className="memory-scope-note">
              {memoryScope === "all"
                ? zh
                  ? `完整片段 · ${caption.global.memory.length} 个记忆窗口`
                  : `Full clip · ${caption.global.memory.length} memory ${caption.global.memory.length === 1 ? "window" : "windows"}`
                : zh
                  ? `每个对象截至 ${preciseTime(time)} 的最新条目`
                  : `Latest entry per object through ${preciseTime(time)}`}
            </p>
            <div className="memory-list">
              {memory.map((item, index) => (
                <article
                  key={`${item.obj_en}-${item.t_sec}-${index}`}
                  className="memory-entry"
                  data-time={item.t_sec}
                >
                  <div className="memory-title">
                    <h3>{zh ? item.obj_zh : item.obj_en}</h3>
                    <button
                      className="timestamp-link"
                      aria-label={`${zh ? "跳转到" : "Seek to"} ${preciseTime(item.t_sec)}`}
                      onClick={() => onSeek(item.t_sec)}
                    >
                      {preciseTime(item.t_sec)}
                    </button>
                  </div>
                  <dl className="memory-fields">
                    <div>
                      <dt>{zh ? "状态" : "State"}</dt>
                      <dd>{zh ? item.what_zh : item.what_en}</dd>
                    </div>
                    <div>
                      <dt>{zh ? "位置" : "Location"}</dt>
                      <dd>{zh ? item.where_zh : item.where_en}</dd>
                    </div>
                    {(zh ? item.note_zh : item.note_en) && (
                      <div>
                        <dt>{zh ? "备注" : "Note"}</dt>
                        <dd>{zh ? item.note_zh : item.note_en}</dd>
                      </div>
                    )}
                  </dl>
                  {item.window !== undefined &&
                    item.windowEnd !== undefined && (
                      <p className="memory-window">
                        {zh ? "窗口" : "Window"} {Number(item.window) + 1} ·{" "}
                        {zh ? "结束于" : "ends at"}{" "}
                        {preciseTime(Number(item.windowEnd))}
                      </p>
                    )}
                </article>
              ))}
            </div>
            {!memory.length && (
              <p className="empty-copy">
                {zh
                  ? "当前时刻之前还没有记忆条目。播放视频或切换到全部记录。"
                  : "No observations at this time. Play the video or switch to all observations."}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
