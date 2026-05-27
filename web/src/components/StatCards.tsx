import type { ModalityStats } from "../types.ts";

const ITEMS: { key: keyof ModalityStats; label: string; level: string }[] = [
  { key: "domains", label: "L1 · Domains", level: "domain" },
  { key: "scenarios", label: "L2 · Scenario", level: "scenario" },
  { key: "tasks", label: "L3 · Task", level: "task" },
  { key: "skills", label: "L4 · Skills", level: "skill" },
];

export function StatCards({ stats }: { stats: ModalityStats }) {
  return (
    <div className="stats">
      {ITEMS.map((it) => (
        <div key={it.key} className="stat" data-level={it.level}>
          <div className="stat__num">{stats[it.key]}</div>
          <div className="stat__label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
