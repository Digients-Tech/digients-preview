import { useEffect, useRef, useState, type RefObject } from "react";
import { HAND_ORDER, type HandSide, type NormAction } from "../caption.ts";

// Standalone, decoupled view of the fine-grained `actions` track — separate from
// the step list. A time-ordered table (not overlapping bars) shows every action's
// real fields (hand · verb · object · grasp pose), so the granularity of the
// annotation is the point. Simultaneous left/right actions land on adjacent rows.
// Rows highlight at the current playback time and seek on click, but the table
// stands on its own (no playback dependency).

const HAND_BADGE: Record<HandSide, string> = { left: "L", right: "R", both: "L·R", none: "–" };

function fmtSec(s: number): string {
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

export function ActionTable({
  actions,
  videoRef,
  onSeek,
  lang,
}: {
  actions: NormAction[];
  videoRef: RefObject<HTMLVideoElement | null>;
  onSeek: (t: number) => void;
  lang: "en" | "zh";
}) {
  const [now, setNow] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setNow(v.currentTime);
    onTime();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onTime);
    };
  }, [videoRef]);

  if (!actions.length) return null;

  // Time order; ties (same instant) ordered Left → Right → Both so a simultaneous
  // two-hand grab reads as adjacent rows.
  const rows = [...actions].sort(
    (a, b) => a.start - b.start || HAND_ORDER.indexOf(a.hand) - HAND_ORDER.indexOf(b.hand)
  );

  return (
    <div className="actions">
      <div className="caption__label caption__label--sub">
        {lang === "zh" ? "动作" : "ACTIONS"} · {actions.length} {lang === "zh" ? "个精细标注" : "fine-grained"}
      </div>
      <div className="act-table" ref={boxRef}>
        {rows.map((a, i) => {
          const isNow = now >= a.start && now < a.end;
          return (
            <button
              key={i}
              className={`act-row${isNow ? " is-now" : ""}`}
              onClick={() => onSeek(a.start)}
              title={a.effect ? `→ ${a.effect}` : undefined}
            >
              <span className={`act-hand act-hand--${a.hand}`}>{HAND_BADGE[a.hand]}</span>
              <span className="act-time">{fmtSec(a.start)}</span>
              <span className="act-main">
                <span className="act-verb">{a.verb}</span>
                {a.object && <span className="act-obj"> {a.object}</span>}
                {a.handPose && <span className="act-pose"> · {a.handPose}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
