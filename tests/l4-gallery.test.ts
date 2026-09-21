import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGalleryCatalog } from "../server/src/l4-gallery.ts";
import { filterGallery } from "../web/src/l4-core.ts";
import type { L4Caption, L4Catalog } from "../web/src/l4-types.ts";

// Synthetic legacy catalog: gallery fields intentionally absent, as on the
// deployed v1 dataset. Industry and task filtering must follow the L4 source.
const source = {
  version: 1,
  episodes: [
    {
      id: "synthetic-clip",
      duration: 10,
      title: "Assembly",
      titleZh: "组装",
      scene: "Desk",
      sceneZh: "桌面",
      category: "daily-life",
      categoryLabel: "Daily life",
      tasks: ["legacy-task"],
      searchText: "assembly",
    },
  ],
} as L4Catalog;
const caption: L4Caption = {
  schema_version: "4.0",
  caption_level: "L4",
  video_id: "synthetic-clip",
  success: true,
  duration_sec: 10,
  global: {
    taxonomy: {
      industry_en: "Precision assembly",
      industry_zh: "精密组装",
      scene_en: ["Workbench", "Packing desk"],
      scene_zh: ["工作台", "包装台"],
      task_category_en: ["Fit a hinge"],
      task_category_zh: ["安装铰链"],
      task: ["assemble"],
    },
    memory: [],
  },
  actions: [],
  subtasks: [
    {
      subtask_id: "s1",
      start_sec: 2,
      end_sec: 8,
      subtask_en: "Fit a hinge",
      subtask_zh: "安装铰链",
      scene_en: "Workbench",
      scene_zh: "工作台",
      spatial_en: [],
      spatial_zh: [],
      description_en: "Synthetic fixture",
      description_zh: "合成测试数据",
    },
  ],
};

test("gallery uses L4 taxonomy and exact subtask boundaries without changing the source catalog", () => {
  const before = JSON.stringify(source);
  const gallery = buildGalleryCatalog(source, () => caption);
  assert.equal(gallery.episodes[0]?.industry, "Precision assembly");
  assert.deepEqual(gallery.episodes[0]?.tasks, ["assemble"]);
  assert.equal(gallery.tasks[0]?.count, 1);
  assert.deepEqual(gallery.episodes[0]?.subtasks[0], {
    subtask_id: "s1",
    start_sec: 2,
    end_sec: 8,
    subtask_en: "Fit a hinge",
    subtask_zh: "安装铰链",
  });
  assert.equal(JSON.stringify(source), before);
  assert.equal(
    filterGallery(
      gallery.episodes,
      "精密",
      "precision assembly",
      "Packing desk",
      "assemble",
    ).length,
    1,
  );
  assert.equal(
    filterGallery(
      gallery.episodes,
      "精密",
      "precision assembly",
      "Kitchen",
      "assemble",
    ).length,
    0,
  );
  assert.equal(
    filterGallery(gallery.episodes, "", "", "", "legacy-task").length,
    0,
  );
});

test("gallery rejects a caption joined to the wrong video or duration", () => {
  assert.throws(
    () =>
      buildGalleryCatalog(source, () => ({
        ...caption,
        video_id: "different-clip",
      })),
    /source mismatch/,
  );
  assert.throws(
    () => buildGalleryCatalog(source, () => ({ ...caption, duration_sec: 20 })),
    /source mismatch/,
  );
});
