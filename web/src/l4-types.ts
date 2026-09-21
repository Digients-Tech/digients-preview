export type Language = "en" | "zh";
export type MediaMode = "recording" | "hand";
export type SubtaskSegment = Pick<
  L4Subtask,
  "subtask_id" | "start_sec" | "end_sec" | "subtask_en" | "subtask_zh"
>;
export type Episode = {
  id: string;
  title: string;
  titleZh: string;
  scene: string;
  sceneZh: string;
  industry: string;
  industryZh: string;
  industryId: string;
  scenes: string[];
  scenesZh: string[];
  taskLabels: string[];
  taskLabelsZh: string[];
  subtasks: SubtaskSegment[];
  category: string;
  categoryLabel: string;
  categoryLabelZh: string;
  tasks: string[];
  duration: number;
  subtaskCount: number;
  actionCount: number;
  memoryCount: number;
  featured: boolean;
  media: MediaMode[];
  captionSha256: string;
  searchText: string;
};
export type L4Catalog = {
  version: number;
  name: string;
  defaultEpisodeId: string;
  stats: {
    episodes: number;
    duration: number;
    subtasks: number;
    actions: number;
  };
  categories: { id: string; name: string; nameZh: string; count: number }[];
  industries: { id: string; name: string; nameZh: string; count: number }[];
  tasks: { id: string; name: string; count: number }[];
  episodes: Episode[];
};
export type L4Subtask = {
  subtask_id: string;
  start_sec: number;
  end_sec: number;
  subtask_en: string;
  subtask_zh: string;
  scene_en: string;
  scene_zh: string;
  spatial_en: string[];
  spatial_zh: string[];
  description_en: string;
  description_zh: string;
};
export type L4Action = {
  action_id: number;
  subtask_id: string;
  start_sec: number;
  end_sec: number;
  caption_en: string;
  caption_zh: string;
  purpose_en: string;
  purpose_zh: string;
  reasoning_en: string;
  reasoning_zh: string;
  body_en: string;
  body_zh: string;
  interact_objects_en: string[];
  interact_objects_zh: string[];
};
export type MemoryObservation = {
  t_sec: number;
  obj_en: string;
  obj_zh: string;
  where_en: string;
  where_zh: string;
  what_en: string;
  what_zh: string;
  note_en?: string;
  note_zh?: string;
};
export type L4Caption = {
  schema_version: string;
  caption_level: string;
  video_id: string;
  success: boolean;
  duration_sec: number;
  global: {
    taxonomy: Record<string, string | string[]>;
    memory: { window: number; t_end_sec: number; state: MemoryObservation[] }[];
  };
  subtasks: L4Subtask[];
  actions: L4Action[];
};
