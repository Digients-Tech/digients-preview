// Mirrors the server DTOs returned by GET /api/catalog.
// Two levels: Domain (scene_major) -> Scenario (scene_minor); scenarios hold preview clips.

export type ModalityIcon = "gripper" | "ego";

export type Clip = {
  id: string;
  label: string;
  file: string;
  durationSec: number;
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
