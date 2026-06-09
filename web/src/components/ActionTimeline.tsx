import { useEffect, useRef, useState, type RefObject } from "react";
import { HAND_ORDER, packRows, type NormAction, type NormStep, type HandSide } from "../caption.ts";

// Two decoupled tracks on one shared time axis:
//   - Step track: the sequential segmentation (one lane).
//   - Action track: fine-grained per-hand actions, grouped into Left / Right /
//     Both lanes. Actions overlap (across hands, and occasionally within a
//     hand), so each lane greedily packs its bars into sub-rows.
// A playhead synced to the <video> sweeps every lane, so vertical alignment
// reveals which actions co-occur at any instant. Click anywhere on a track (or
// a bar) to seek.

const HAND_LABEL: Record<HandSide, string> = {
  left: "L · Left hand",
  right: "R · Right hand",
  both: "Both hands",
  none: "Unassigned",
};

function fmtSec(s: number): string {
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
}

function pct(n: number, total: number): number {
  return total > 0 ? (n / total) * 100 : 0;
}

function Track({
  duration,
  onSeek,
  playPct,
  height,
  children,
}: {
  duration: number;
  onSeek: (t: number) => void;
  playPct: number;
  height: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seekFromEvent = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = (clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, p * duration)));
  };
  return (
    <div
      className="tl-track"
      ref={ref}
      style={{ height }}
      onClick={(e) => seekFromEvent(e.clientX)}
    >
      {children}
      <div className="tl-playhead" style={{ left: `${playPct}%` }} aria-hidden="true" />
    </div>
  );
}

export function ActionTimeline({
  steps,
  actions,
  duration,
  activeStepIdx,
  videoRef,
  onSeek,
}: {
  steps: NormStep[];
  actions: NormAction[];
  duration: number;
  activeStepIdx: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onSeek: (t: number) => void;
}) {
  const [now, setNow] = useState(0);

  // Track the <video> clock for the playhead + "happening now" bar highlight.
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

  if (duration <= 0 || (steps.length === 0 && actions.length === 0)) return null;

  // The per-hand action lanes (Left / Right / Both) read as too much at a glance,
  // so they're hidden for now — the Steps overview + playhead stay. Flip this to
  // re-enable the action gantt (or replace with a dedicated action panel later).
  const SHOW_ACTION_LANES = false;

  const playPct = Math.max(0, Math.min(100, pct(now, duration)));
  const BAR_H = 18;
  const ROW_GAP = 3;
  // Below this width a bar can't hold a readable label without clipping mid-word,
  // so we drop the inline text and let the hover tooltip carry the detail.
  const MIN_TEXT_PCT = 7;

  // Group actions by hand and pack each lane into sub-rows.
  const lanes = HAND_ORDER.map((hand) => {
    const items = actions.filter((a) => a.hand === hand);
    if (items.length === 0) return null;
    const packed = packRows(items);
    const rowCount = packed.reduce((m, p) => Math.max(m, p.row + 1), 1);
    return { hand, packed, rowCount };
  }).filter(Boolean) as { hand: HandSide; packed: { item: NormAction; row: number }[]; rowCount: number }[];

  // A few evenly spaced axis ticks.
  const tickCount = Math.min(6, Math.max(2, Math.round(duration / 5)));
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (duration * i) / tickCount);

  return (
    <div className="tl">
      <div className="tl-row tl-row--axis">
        <div className="tl-label" />
        <div className="tl-axis">
          {ticks.map((t, i) => (
            <span key={i} className="tl-tick" style={{ left: `${pct(t, duration)}%` }}>
              {fmtSec(t)}
            </span>
          ))}
        </div>
      </div>

      <div className="tl-row">
        <div className="tl-label">Steps</div>
        <Track duration={duration} onSeek={onSeek} playPct={playPct} height={BAR_H + 4}>
          {steps.map((s, i) => {
            const isNow = now >= s.start && now < s.end;
            const w = pct(s.end - s.start, duration);
            return (
              <div
                key={s.id}
                className={`tl-bar tl-bar--step${i === activeStepIdx || isNow ? " is-now" : ""}`}
                style={{ left: `${pct(s.start, duration)}%`, width: `${w}%`, top: 2, height: BAR_H }}
                title={`${s.name} · ${fmtSec(s.start)}–${fmtSec(s.end)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(s.start);
                }}
              >
                {w >= MIN_TEXT_PCT && <span className="tl-bar__txt">{s.name}</span>}
              </div>
            );
          })}
        </Track>
      </div>

      {SHOW_ACTION_LANES && lanes.map(({ hand, packed, rowCount }) => (
        <div className="tl-row" key={hand}>
          <div className={`tl-label tl-label--${hand}`}>{HAND_LABEL[hand]}</div>
          <Track
            duration={duration}
            onSeek={onSeek}
            playPct={playPct}
            height={rowCount * BAR_H + (rowCount - 1) * ROW_GAP + 4}
          >
            {packed.map(({ item, row }, i) => {
              const isNow = now >= item.start && now < item.end;
              const w = pct(item.end - item.start, duration);
              const tip = [item.verb, item.object, item.handPose && `✋ ${item.handPose}`, item.effect && `→ ${item.effect}`]
                .filter(Boolean)
                .join(" · ");
              return (
                <div
                  key={i}
                  className={`tl-bar tl-bar--act tl-bar--${hand}${isNow ? " is-now" : ""}`}
                  style={{
                    left: `${pct(item.start, duration)}%`,
                    width: `${w}%`,
                    top: 2 + row * (BAR_H + ROW_GAP),
                    height: BAR_H,
                  }}
                  title={`${tip} · ${fmtSec(item.start)}–${fmtSec(item.end)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(item.start);
                  }}
                >
                  {w >= MIN_TEXT_PCT && (
                    <span className="tl-bar__txt">{item.verb}{item.object ? ` ${item.object}` : ""}</span>
                  )}
                </div>
              );
            })}
          </Track>
        </div>
      ))}
    </div>
  );
}
