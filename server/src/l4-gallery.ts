import type { L4Caption, L4Catalog } from "../../web/src/l4-types.js";

function values(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : [value ?? ""]).filter(Boolean);
}

/** Captions are immutable within a dataset version. Build the small gallery
 * index once per catalog mtime; return the original JSON only on detail reads. */
export function buildGalleryCatalog(
  source: L4Catalog,
  readCaption: (id: string) => L4Caption,
): L4Catalog {
  const industries = new Map<string, L4Catalog["industries"][number]>();
  const taskCounts = new Map<string, number>();
  const episodes = source.episodes.map((episode) => {
    const caption = readCaption(episode.id);
    if (
      caption.video_id !== episode.id ||
      caption.caption_level !== "L4" ||
      !caption.success ||
      Math.abs(caption.duration_sec - episode.duration) > 0.1
    )
      throw new Error(`L4 gallery source mismatch: ${episode.id}`);
    const taxonomy = caption.global.taxonomy;
    const industry = values(taxonomy.industry_en)[0] ?? "Unspecified";
    const industryZh = values(taxonomy.industry_zh)[0] ?? industry;
    const industryId = industry.trim().toLocaleLowerCase();
    const bucket = industries.get(industryId);
    if (bucket) bucket.count++;
    else
      industries.set(industryId, {
        id: industryId,
        name: industry,
        nameZh: industryZh,
        count: 1,
      });
    const scenes = values(taxonomy.scene_en);
    const scenesZh = values(taxonomy.scene_zh);
    const taskLabels = values(taxonomy.task_category_en);
    const taskLabelsZh = values(taxonomy.task_category_zh);
    const tasks = values(taxonomy.task);
    for (const task of new Set(tasks))
      taskCounts.set(task, (taskCounts.get(task) ?? 0) + 1);
    return {
      ...episode,
      industry,
      industryZh,
      industryId,
      scenes,
      scenesZh,
      taskLabels,
      taskLabelsZh,
      tasks,
      subtasks: caption.subtasks.map(
        ({ subtask_id, start_sec, end_sec, subtask_en, subtask_zh }) => ({
          subtask_id,
          start_sec,
          end_sec,
          subtask_en,
          subtask_zh,
        }),
      ),
      searchText: [
        episode.searchText,
        industry,
        industryZh,
        ...scenes,
        ...scenesZh,
        ...taskLabels,
        ...taskLabelsZh,
        ...tasks,
      ].join(" "),
    };
  });
  return {
    ...source,
    episodes,
    tasks: [...taskCounts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id, count]) => ({
        id,
        name: id
          .replaceAll("_", " ")
          .replace(/^./, (letter) => letter.toUpperCase()),
        count,
      })),
    industries: [...industries.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    ),
  };
}
