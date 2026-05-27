// Mirrors the server DTOs returned by GET /api/catalog.

export type ModalityIcon = "gripper" | "ego";

export type Clip = {
  id: string;
  label: string;
  file: string;
  durationSec: number;
};

export type Skill = {
  id: string;
  name: string;
  recordingCount: number;
  previews: Clip[];
};

export type Task = { id: string; name: string; skillCount: number; skills: Skill[] };
export type Scenario = { id: string; name: string; skillCount: number; tasks: Task[] };
export type Domain = { id: string; name: string; skillCount: number; scenarios: Scenario[] };
export type ModalityStats = { domains: number; scenarios: number; tasks: number; skills: number };
export type Modality = {
  id: string;
  name: string;
  icon: ModalityIcon;
  stats: ModalityStats;
  domains: Domain[];
};
export type Catalog = { modalities: Modality[] };
