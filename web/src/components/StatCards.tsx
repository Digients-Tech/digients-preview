import type { ModalityStats } from "../types.ts";

const ITEMS: { key: keyof ModalityStats; label: string; level: string }[] = [
  { key: "domains", label: "L1 · Domains", level: "domain" },
  { key: "scenarios", label: "L2 · Scenarios", level: "scenario" },
  { key: "recordings", label: "Recordings", level: "skill" },
];

export function StatCards({ stats }: { stats: ModalityStats }) {
  return (
    <div className="stats stats--3">
      {ITEMS.map((it) => (
        <div key={it.key} className="stat" data-level={it.level}>
          <div className="stat__num">{stats[it.key]}</div>
          <div className="stat__label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
