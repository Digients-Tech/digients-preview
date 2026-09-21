import type { Language, SubtaskSegment } from "../l4-types.ts";
import { activeAt, preciseTime } from "../l4-core.ts";

export function SubtaskTimeline({
  subtasks,
  duration,
  time,
  lang,
  onSeek,
  compact = false,
}: {
  subtasks: SubtaskSegment[];
  duration: number;
  time: number;
  lang: Language;
  onSeek: (time: number) => void;
  compact?: boolean;
}) {
  const current = activeAt(subtasks, time);
  const subtask = subtasks[current];
  const zh = lang === "zh";
  return (
    <div className={`subtask-timeline${compact ? " is-compact" : ""}`}>
      <div
        className="subtask-rail"
        role="group"
        aria-label={zh ? "子任务时间轴" : "Subtask timeline"}
      >
        {subtasks.map((item, i) => (
          <button
            key={item.subtask_id}
            className={`subtask-segment${i === current ? " is-current" : ""}`}
            style={{
              left: `${(item.start_sec / duration) * 100}%`,
              width: `${((item.end_sec - item.start_sec) / duration) * 100}%`,
            }}
            title={`${preciseTime(item.start_sec)} – ${preciseTime(item.end_sec)} · ${zh ? item.subtask_zh : item.subtask_en}`}
            aria-label={`${zh ? "跳转到子任务" : "Seek to subtask"} ${i + 1}: ${zh ? item.subtask_zh : item.subtask_en}`}
            aria-pressed={i === current}
            onClick={() => onSeek(item.start_sec)}
          >
            <span />
          </button>
        ))}
        <span
          className="timeline-cursor"
          style={{ left: `${Math.min((time / duration) * 100, 100)}%` }}
        />
      </div>
      <div className="subtask-now">
        <span className="subtask-index">
          {current >= 0
            ? `${String(current + 1).padStart(2, "0")} / ${String(subtasks.length).padStart(2, "0")}`
            : "—"}
        </span>
        <span
          className="subtask-label"
          title={
            subtask ? (zh ? subtask.subtask_zh : subtask.subtask_en) : undefined
          }
        >
          {subtask
            ? zh
              ? subtask.subtask_zh
              : subtask.subtask_en
            : time >= duration
              ? zh
                ? "片段结束"
                : "End of clip"
              : zh
                ? "子任务之间"
                : "Between subtasks"}
        </span>
      </div>
    </div>
  );
}
