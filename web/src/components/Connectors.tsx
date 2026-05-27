import { useLayoutEffect, useState, type RefObject } from "react";

export type Edge = {
  id: string;
  fromId: string;
  toId: string;
  color: string;
  active: boolean;
};

type Props = {
  // The element is passed via state (callback ref) rather than a ref object, so this
  // effect re-runs once the parent container is actually attached to the DOM.
  containerEl: HTMLElement | null;
  cardRefs: RefObject<Map<string, HTMLElement>>;
  edges: Edge[];
};

type DrawnPath = { id: string; d: string; color: string; active: boolean };

// SVG overlay drawing glowing bezier connectors between a selected card and the cards
// in the next column. Positions are measured from the DOM and recomputed on layout/resize.
export function Connectors({ containerEl, cardRefs, edges }: Props) {
  const [paths, setPaths] = useState<DrawnPath[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Recompute whenever the container appears or the set of edges (selection) changes.
  const signature = edges.map((e) => `${e.id}:${e.active ? 1 : 0}`).join("|");

  useLayoutEffect(() => {
    if (!containerEl) return;

    const compute = () => {
      const cb = containerEl.getBoundingClientRect();
      setSize({ w: cb.width, h: cb.height });
      const next: DrawnPath[] = [];
      for (const e of edges) {
        const a = cardRefs.current?.get(e.fromId);
        const b = cardRefs.current?.get(e.toId);
        if (!a || !b) continue;
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        const x1 = ar.right - cb.left;
        const y1 = ar.top + ar.height / 2 - cb.top;
        const x2 = br.left - cb.left;
        const y2 = br.top + br.height / 2 - cb.top;
        const dx = Math.max(36, (x2 - x1) * 0.55);
        next.push({
          id: e.id,
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          color: e.color,
          active: e.active,
        });
      }
      setPaths(next);
    };

    // Immediate pass plus a post-paint pass (card refs may attach after this effect).
    compute();
    const raf = requestAnimationFrame(compute);
    const ro = new ResizeObserver(compute);
    ro.observe(containerEl);
    window.addEventListener("resize", compute);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerEl, signature]);

  return (
    <svg className="connectors" width={size.w} height={size.h} aria-hidden="true">
      <defs>
        <filter id="conn-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          className={`conn ${p.active ? "conn--active" : ""}`}
          filter={p.active ? "url(#conn-glow)" : undefined}
        />
      ))}
    </svg>
  );
}
