import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeAt,
  filterEpisodes,
  memoryAt,
  preciseTime,
} from "../web/src/l4-core.ts";
import type {
  Episode,
  L4Caption,
  MemoryObservation,
} from "../web/src/l4-types.ts";

test("timeline uses half-open ranges and does not invent actions across gaps or after the end", () => {
  const ranges = [
    { start_sec: 0, end_sec: 1.1 },
    { start_sec: 1.1, end_sec: 3 },
    { start_sec: 4, end_sec: 5 },
  ];
  assert.equal(activeAt(ranges, 0), 0);
  assert.equal(activeAt(ranges, 1.1), 1);
  assert.equal(activeAt(ranges, 3.5), -1);
  assert.equal(activeAt(ranges, 5), -1);
});

test("timestamp labels survive binary floating point and minute rollover", () => {
  assert.equal(preciseTime(3.6), "00:03.6");
  assert.equal(preciseTime(14.3), "00:14.3");
  assert.equal(preciseTime(59.999), "01:00.0");
  assert.equal(preciseTime(-4), "00:00.0");
});

test("scene memory excludes future entries and later observations replace an object state", () => {
  const observation = (t_sec: number, what_en: string): MemoryObservation => ({
    t_sec,
    obj_en: "Cup",
    obj_zh: "杯",
    where_en: "Table",
    where_zh: "桌",
    what_en,
    what_zh: what_en,
  });
  const caption: L4Caption = {
    schema_version: "4.0",
    caption_level: "L4",
    video_id: "test",
    success: true,
    duration_sec: 10,
    subtasks: [],
    actions: [],
    global: {
      taxonomy: {},
      memory: [
        {
          window: 0,
          t_end_sec: 10,
          state: [observation(8, "Moved"), observation(1, "Placed")],
        },
      ],
    },
  };
  assert.equal(memoryAt(caption, 0).length, 0);
  assert.equal(memoryAt(caption, 1)[0]?.what_en, "Placed");
  assert.equal(memoryAt(caption, 7.9)[0]?.what_en, "Placed");
  assert.equal(memoryAt(caption, 8)[0]?.what_en, "Moved");
  assert.equal(memoryAt(caption, 8).length, 1);
});

test("search combines every word with category and task, across both title languages", () => {
  const sample: Episode = {
    id: "a",
    title: "Organizing blue cups",
    titleZh: "整理蓝色杯子",
    scene: "Kitchen",
    sceneZh: "厨房",
    industry: "Catering",
    industryZh: "餐饮",
    industryId: "catering",
    scenes: ["Kitchen"],
    scenesZh: ["厨房"],
    taskLabels: ["Organizing blue cups"],
    taskLabelsZh: ["整理蓝色杯子"],
    subtasks: [],
    category: "daily-life",
    categoryLabel: "Daily life",
    categoryLabelZh: "日常",
    tasks: ["tidy"],
    duration: 10,
    subtaskCount: 1,
    actionCount: 2,
    memoryCount: 1,
    featured: true,
    media: ["recording", "hand"],
    captionSha256: "",
    searchText: "Cup placed on counter",
  };
  assert.equal(
    filterEpisodes([sample], " BLUE  KITCHEN ", "daily-life", "tidy").length,
    1,
  );
  assert.equal(filterEpisodes([sample], "蓝色", "", "").length, 1);
  assert.equal(filterEpisodes([sample], "blue garden", "", "").length, 0);
  assert.equal(filterEpisodes([sample], "blue", "industry", "").length, 0);
  assert.equal(filterEpisodes([sample], "blue", "", "cook").length, 0);
});
