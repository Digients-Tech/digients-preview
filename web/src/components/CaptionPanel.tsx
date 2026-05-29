import { useEffect, useRef, useState, type RefObject } from "react";
import type { Caption } from "../types.ts";
import { getCaption } from "../api.ts";

function fmtSec(s: number): string {
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

export function CaptionPanel({
  clipFile,
  videoRef,
}: {
  clipFile: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const [caption, setCaption] = useState<Caption | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);
  const stepsBoxRef = useRef<HTMLDivElement>(null);

  // Fetch caption when the selected clip changes. Resolves to null on 404 so
  // we render an explicit empty state instead of a generic error.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setCaption(null);
    setActiveIdx(-1);
    getCaption(clipFile)
      .then((c) => {
        if (mounted) setCaption(c);
      })
      .catch(() => {
        if (mounted) setCaption(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [clipFile]);

  // Subscribe to <video> playback time to drive the active step index. We hook
  // timeupdate (continuous) + seeked (jumps) and recompute on caption load.
  useEffect(() => {
    const v = videoRef.current;
    const steps = caption?.steps;
    if (!v || !steps?.length) return;

    const onTime = () => {
      const t = v.currentTime;
      let idx = steps.findIndex((s) => t >= s.start_sec && t < s.end_sec);
      // Past the end of the last step (e.g. paused at video end): keep the
      // last step highlighted instead of falling back to -1.
      if (idx < 0 && t >= steps[steps.length - 1]!.end_sec) idx = steps.length - 1;
      setActiveIdx(idx);
    };
    onTime();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
    };
  }, [caption, videoRef]);

  // Auto-scroll the active step into view inside the steps box only (not the
  // whole page). nearest+smooth feels less jumpy than center for short videos.
  useEffect(() => {
    if (activeIdx < 0) return;
    const box = stepsBoxRef.current;
    if (!box) return;
    const el = box.querySelector(`[data-step-idx="${activeIdx}"]`) as HTMLElement | null;
    if (!el) return;
    const elTop = el.offsetTop - box.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = box.scrollTop;
    const viewBottom = viewTop + box.clientHeight;
    if (elTop < viewTop || elBottom > viewBottom) {
      box.scrollTo({ top: elTop - 24, behavior: "smooth" });
    }
  }, [activeIdx]);

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    // If paused at the end, a fresh play feels expected when the user clicks a step.
    if (v.ended) void v.play();
  };

  if (loading) {
    return (
      <aside className="caption caption--loading" aria-busy="true">
        <div className="caption__placeholder">Loading caption…</div>
      </aside>
    );
  }

  if (!caption || !caption.global) {
    return (
      <aside className="caption caption--empty">
        <div className="caption__placeholder">No caption available for this clip.</div>
      </aside>
    );
  }

  const g = caption.global;
  const tags = [
    ...(g.task_categories_en ?? []).map((t) => ({ kind: "cat" as const, label: t })),
    ...(g.tasks_en ?? []).map((t) => ({ kind: "task" as const, label: t })),
  ];

  return (
    <aside className="caption">
      <div className="caption__head">
        <div className="caption__label">CAPTION</div>
        {g.summary_en ? (
          <p className="caption__summary">{g.summary_en}</p>
        ) : (
          <p className="caption__summary caption__summary--missing">No summary.</p>
        )}
        {tags.length > 0 && (
          <div className="caption__tags">
            {tags.map((t, i) => (
              <span key={`${t.kind}-${i}`} className={`tag tag--${t.kind}`}>
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {caption.steps && caption.steps.length > 0 ? (
        <div className="caption__steps" ref={stepsBoxRef}>
          {caption.steps.map((s, i) => (
            <button
              key={s.step_id}
              data-step-idx={i}
              className={`step ${i === activeIdx ? "step--active" : ""}`}
              onClick={() => seekTo(s.start_sec)}
              title={`Seek to ${fmtSec(s.start_sec)}`}
            >
              <div className="step__bar" aria-hidden="true" />
              <div className="step__body">
                <div className="step__time">
                  {fmtSec(s.start_sec)} – {fmtSec(s.end_sec)}
                </div>
                <div className="step__name">{s.name_en || s.name_zh || s.step_id}</div>
                {s.description_en && (
                  <div className="step__desc">{s.description_en}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="caption__placeholder caption__placeholder--inset">
          No step-level annotations.
        </div>
      )}
    </aside>
  );
}
