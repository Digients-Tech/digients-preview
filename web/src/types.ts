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
  recordingCount: number;
  previews: Clip[];
};

export type Domain = { id: string; name: string; scenarioCount: number; scenarios: Scenario[] };
export type ModalityStats = { domains: number; scenarios: number; recordings: number };
export type Modality = {
  id: string;
  name: string;
  icon: ModalityIcon;
  stats: ModalityStats;
  domains: Domain[];
};
export type Catalog = { modalities: Modality[] };

// --- Caption sidecar (per-clip JSON from Dylan's bucket) ---
// We render a structured slice of this in the right panel; the bucket file has
// more fields (objects, hand_pose, etc.) but the panel ships with summary +
// tasks + step timeline for v1.

export type CaptionStep = {
  step_id: string;
  start_sec: number;
  end_sec: number;
  name_en?: string;
  name_zh?: string;
  description_en?: string;
  description_zh?: string;
};

export type CaptionGlobal = {
  summary_en?: string;
  summary_zh?: string;
  scene_en?: string;
  scene_zh?: string;
  camera_motion_en?: string;
  camera_motion_zh?: string;
  tasks_en?: string[];
  tasks_zh?: string[];
  task_categories_en?: string[];
  task_categories_zh?: string[];
};

export type Caption = {
  global: CaptionGlobal;
  steps: CaptionStep[];
};
