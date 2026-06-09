import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Caption } from "../types.ts";
import { normalizeCaption } from "../caption.ts";
import { useLang } from "../lang.ts";
import { getCaption } from "../api.ts";
import { ActionTimeline } from "./ActionTimeline.tsx";
import { ActionTable } from "./ActionTable.tsx";

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
  const lang = useLang();
  const stepsBoxRef = useRef<HTMLDivElement>(null);

  // Fetch caption when the selected clip changes. Resolves to null on 404 so
  // we render an explicit empty state instead of a generic error.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setCaption(null);
    setActiveIdx(-1);
    getCaption(clipFile)
      .then((c) => mounted && setCaption(c))
      .catch(() => mounted && setCaption(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [clipFile]);

  // Fold whichever schema generation this file uses into one view model in the
  // chosen language. Re-runs only when the source or language changes.
  const norm = useMemo(() => (caption ? normalizeCaption(caption, lang) : null), [caption, lang]);

  // Drive the active step index off the <video> clock (timeupdate + seeked).
  useEffect(() => {
    const v = videoRef.current;
    const steps = norm?.steps;
    if (!v || !steps?.length) return;
    const onTime = () => {
      const t = v.currentTime;
      let idx = steps.findIndex((s) => t >= s.start && t < s.end);
      if (idx < 0 && t >= steps[steps.length - 1]!.end) idx = steps.length - 1;
      setActiveIdx(idx);
    };
    onTime();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
    };
  }, [norm, videoRef]);

  // Auto-scroll the active step into view inside the steps box only.
  useEffect(() => {
    if (activeIdx < 0) return;
    const box = stepsBoxRef.current;
    if (!box) return;
    const el = box.querySelector(`[data-step-idx="${activeIdx}"]`) as HTMLElement | null;
    if (!el) return;
    const elTop = el.offsetTop - box.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    if (elTop < box.scrollTop || elBottom > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: elTop - 24, behavior: "smooth" });
    }
  }, [activeIdx]);

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    if (v.ended) void v.play();
  };

  if (loading) {
    return (
      <aside className="caption caption--loading" aria-busy="true">
        <div className="caption__placeholder">Loading caption…</div>
      </aside>
    );
  }

  if (!norm) {
    return (
      <aside className="caption caption--empty">
        <div className="caption__placeholder">No caption available for this clip.</div>
      </aside>
    );
  }

  const tx = norm.taxonomy;
  const crumbs = [tx.industry, tx.scene, tx.taskCategory].filter(Boolean) as string[];

  return (
    <aside className="caption">
      <div className="caption__head">
        <div className="caption__headrow">
          <div className="caption__label">CAPTION</div>
        </div>

        {crumbs.length > 0 && (
          <div className="caption__crumbs">
            {crumbs.map((c, i) => (
              <span key={i} className="crumb">
                {c}
                {i < crumbs.length - 1 && <span className="crumb__sep">›</span>}
              </span>
            ))}
          </div>
        )}

        {norm.taskGoal && (
          <p className="caption__goal">
            <span className="caption__goal-tag">{lang === "zh" ? "目标" : "Goal"}</span>
            {norm.taskGoal}
          </p>
        )}

        {norm.summary ? (
          <p className="caption__summary">{norm.summary}</p>
        ) : (
          <p className="caption__summary caption__summary--missing">No summary.</p>
        )}

        {norm.rubrics.length > 0 && (
          <div className="caption__rubrics">
            {norm.rubrics.map((r, i) => (
              <span key={i} className="rubric">
                <span className="rubric__check" aria-hidden="true">✓</span>
                {r}
              </span>
            ))}
          </div>
        )}

        {(norm.scene || norm.cameraMotion) && (
          <details className="caption__more">
            <summary>{lang === "zh" ? "场景 & 镜头" : "Scene & camera"}</summary>
            {norm.scene && (
              <p className="caption__more-row">
                <span className="caption__more-key">{lang === "zh" ? "场景" : "Scene"}</span>
                {norm.scene}
              </p>
            )}
            {norm.cameraMotion && (
              <p className="caption__more-row">
                <span className="caption__more-key">{lang === "zh" ? "镜头" : "Camera"}</span>
                {norm.cameraMotion}
              </p>
            )}
          </details>
        )}
      </div>

      {(norm.steps.length > 0 || norm.actions.length > 0) && (
        <div className="caption__timeline">
          <div className="caption__label caption__label--sub">TIMELINE</div>
          <ActionTimeline
            steps={norm.steps}
            actions={norm.actions}
            duration={norm.duration}
            activeStepIdx={activeIdx}
            videoRef={videoRef}
            onSeek={seekTo}
          />
        </div>
      )}

      {norm.steps.length > 0 ? (
        <div className="caption__steps" ref={stepsBoxRef}>
          {norm.steps.map((s, i) => {
            // Accordion: only the playing step expands its detail; the rest stay
            // a one-line time+name. The active step auto-scrolls into view, so the
            // detail rolls with playback instead of expanding the whole panel.
            const isActive = i === activeIdx;
            return (
            <div key={s.id} data-step-idx={i} className={`step ${isActive ? "step--active" : ""}`}>
              <button className="step__head" onClick={() => seekTo(s.start)} title={`Seek to ${fmtSec(s.start)}`}>
                <div className="step__bar" aria-hidden="true" />
                <div className="step__body">
                  <div className="step__time">
                    {fmtSec(s.start)} – {fmtSec(s.end)}
                    {isActive && s.subtask && <span className="step__subtask">{s.subtask}</span>}
                  </div>
                  <div className="step__name">{s.name}</div>
                  {isActive && s.visualContext && <div className="step__ctx">{s.visualContext}</div>}
                  {isActive && s.description && <div className="step__desc">{s.description}</div>}
                </div>
              </button>

              {isActive && s.objects.length > 0 && (
                <div className="step__objs">
                  {s.objects.map((o, j) => (
                    <span key={j} className="obj" title={o.stateChange}>
                      {o.label}
                      {o.stateChange && <span className="obj__sc">{o.stateChange}</span>}
                    </span>
                  ))}
                </div>
              )}

              {isActive && s.reasoning && (
                <details className="step__reasoning">
                  <summary>{lang === "zh" ? "推理" : "Reasoning"}</summary>
                  {s.reasoning.current && (
                    <div className="reason-row">
                      <span className="reason-key">{lang === "zh" ? "当前" : "State"}</span>
                      {s.reasoning.current}
                    </div>
                  )}
                  {s.reasoning.action && (
                    <div className="reason-row">
                      <span className="reason-key">{lang === "zh" ? "动作" : "Action"}</span>
                      {s.reasoning.action}
                    </div>
                  )}
                  {s.reasoning.expected && (
                    <div className="reason-row">
                      <span className="reason-key">{lang === "zh" ? "预期" : "Expected"}</span>
                      {s.reasoning.expected}
                    </div>
                  )}
                </details>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <div className="caption__placeholder caption__placeholder--inset">No step-level annotations.</div>
      )}

      {norm.actions.length > 0 && (
        <ActionTable actions={norm.actions} videoRef={videoRef} onSeek={seekTo} lang={lang} />
      )}
    </aside>
  );
}
