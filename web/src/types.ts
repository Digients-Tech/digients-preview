// Mirrors the server DTOs returned by GET /api/catalog.
// Two levels: Domain (scene_major) -> Scenario (scene_minor); scenarios hold preview clips.

export type ModalityIcon = "gripper" | "ego";

export type Clip = {
  id: string;
  label: string;
  file: string;
  durationSec: number;
  // Optional pose-reconstruction visualisations. The hand viz is the ego frame
  // with hand-skeleton overlay (a strict superset of the original clip's info);
  // the head viz is a 3D head-pose panel. When `comboFile` is present (a single
  // hstacked hand|head video) the player renders just that for frame-perfect
  // sync; handFile/headFile are kept as provenance + graceful fallback.
  handFile?: string;
  headFile?: string;
  comboFile?: string;
};

export type Scenario = {
  id: string;
  name: string;
  nameZh?: string;
  recordingCount: number;
  previews: Clip[];
};

export type Domain = { id: string; name: string; nameZh?: string; scenarioCount: number; scenarios: Scenario[] };
export type ModalityStats = { domains: number; scenarios: number; recordings: number };
export type Modality = {
  id: string;
  name: string;
  icon: ModalityIcon;
  stats: ModalityStats;
  domains: Domain[];
};
export type Catalog = { modalities: Modality[] };

// --- Caption sidecar (per-clip JSON from the annotation pipeline) ---
// The right panel renders the full structured annotation: task goal, taxonomy,
// rubrics, a per-step timeline (with reasoning + objects), and a decoupled
// fine-grained action track. Two schema generations coexist on disk:
//   - legacy: global.{tasks,task_categories,scene_label}, step.actions (nested), step.confidence
//   - current: global.{task_goal,taxonomy}, step.{reasoning,visual_context,subtask}, top-level actions[]
// All fields are optional so `normalizeCaption` (caption.ts) can fold either
// shape into one bilingual view model.

export type CaptionObject = {
  object_id?: number;
  label_en?: string;
  label_zh?: string;
  attrs?: string[];
  attrs_en?: string[];
  state_change?: string;
};

export type CaptionReasoning = {
  current_state_en?: string;
  current_state_zh?: string;
  action_now_en?: string;
  action_now_zh?: string;
  expected_state_en?: string;
  expected_state_zh?: string;
};

// Fine-grained per-hand action. Actions are DECOUPLED from steps (their own
// timeline) and may overlap — both across hands and, occasionally, within one
// hand — so the renderer packs them into sub-rows per hand lane.
export type CaptionAction = {
  action_id?: number;
  start_sec: number;
  end_sec: number;
  hand_side?: "left" | "right" | "both" | "none";
  verb_en?: string;
  verb_zh?: string;
  object_en?: string;
  object_zh?: string;
  hand_pose_en?: string;
  hand_pose_zh?: string;
  effect_en?: string;
  effect_zh?: string;
};

export type CaptionStep = {
  step_id: string;
  start_sec: number;
  end_sec: number;
  name_en?: string;
  name_zh?: string;
  subtask_en?: string;
  subtask_zh?: string;
  visual_context_en?: string;
  visual_context_zh?: string;
  description_en?: string;
  description_zh?: string;
  reasoning?: CaptionReasoning;
  primary_objects?: CaptionObject[];
  // legacy schema only: per-step nested actions (flattened into the global track)
  actions?: CaptionAction[];
};

export type CaptionTaxonomy = {
  industry_en?: string;
  industry_zh?: string;
  scene_en?: string;
  scene_zh?: string;
  task_category_en?: string;
  task_category_zh?: string;
};

export type CaptionGlobal = {
  summary_en?: string;
  summary_zh?: string;
  task_goal_en?: string;
  task_goal_zh?: string;
  scene_en?: string;
  scene_zh?: string;
  camera_motion_en?: string;
  camera_motion_zh?: string;
  rubrics?: string[];
  rubrics_en?: string[];
  taxonomy?: CaptionTaxonomy;
  // legacy taxonomy fields (superseded by `taxonomy`)
  tasks_en?: string[];
  tasks_zh?: string[];
  task_categories_en?: string[];
  task_categories_zh?: string[];
  scene_label_en?: string[];
  scene_label_zh?: string[];
};

export type Caption = {
  global: CaptionGlobal;
  steps: CaptionStep[];
  actions?: CaptionAction[];
};
