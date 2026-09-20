import type { Episode, L4Caption, MemoryObservation } from "./l4-types.ts";

export function activeAt<T extends { start_sec: number; end_sec: number }>(
  items: T[],
  time: number,
): number {
  return items.findIndex(
    (item) => item.start_sec <= time && time < item.end_sec,
  );
}

export function filterEpisodes(
  episodes: Episode[],
  query: string,
  category: string,
  task: string,
): Episode[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return episodes.filter(
    (e) =>
      (!category || e.category === category) &&
      (!task || e.tasks.includes(task)) &&
      words.every((word) =>
        `${e.title} ${e.titleZh} ${e.scene} ${e.sceneZh} ${e.searchText}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}

export function memoryAt(
  caption: L4Caption,
  time: number,
): MemoryObservation[] {
  const latest = new Map<string, MemoryObservation>();
  const observations = caption.global.memory
    .flatMap((window) => window.state)
    .filter((item) => Number.isFinite(item.t_sec) && item.t_sec <= time)
    .sort((a, b) => a.t_sec - b.t_sec);
  for (const item of observations) latest.set(item.obj_en || item.obj_zh, item);
  return [...latest.values()];
}

export function timecode(time: number): string {
  const safe = Math.max(0, Number.isFinite(time) ? time : 0);
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(safe % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function preciseTime(time: number): string {
  const ticks = Math.round(Math.max(0, Number.isFinite(time) ? time : 0) * 10);
  return `${timecode(ticks / 10)}.${ticks % 10}`;
}

export const mediaURL = (id: string, mode: string) =>
  `/api/l4/media/${encodeURIComponent(id)}/${mode}`;
export const posterURL = (id: string) =>
  `/api/l4/posters/${encodeURIComponent(id)}`;
