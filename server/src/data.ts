// Loads the data-preview taxonomy from catalog.json at runtime (not hardcoded), so
// content can change without touching code or rebuilding. Two levels:
//   Modality (Ego | Gripper) -> Domain (scene_major) -> Scenario (scene_minor)
// Each scenario carries a recording count + a few viewable preview clips.
//
// The file is validated on load and cached by mtime — edit catalog.json and the next
// request picks it up. A bad file throws a clear error rather than serving garbage.

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ModalityIcon = "gripper" | "ego";

export type Clip = {
  id: string;
  label: string;
  file: string;
  durationSec: number;
  // Optional pose-reconstruction visualisations; either may be absent per uuid.
  handFile?: string;
  headFile?: string;
  // Single hstacked hand|head composite (frame-perfect sync). When present the
  // player renders just this; handFile/headFile remain as provenance/fallback.
  comboFile?: string;
};
export type ScenarioDTO = { id: string; name: string; recordingCount: number; previews: Clip[] };
export type DomainDTO = { id: string; name: string; scenarioCount: number; scenarios: ScenarioDTO[] };
export type ModalityStats = { domains: number; scenarios: number; recordings: number };
export type ModalityDTO = {
  id: string;
  name: string;
  icon: ModalityIcon;
  stats: ModalityStats;
  domains: DomainDTO[];
};
export type CatalogDTO = { modalities: ModalityDTO[] };

const CATALOG_FILE = process.env.CATALOG_FILE
  ? isAbsolute(process.env.CATALOG_FILE)
    ? process.env.CATALOG_FILE
    : resolve(process.env.CATALOG_FILE)
  : resolve(fileURLToPath(new URL("../../catalog.json", import.meta.url)));

// --- tiny validators (no schema dependency) ---
function fail(msg: string): never {
  throw new Error(`[catalog] ${msg} (in ${CATALOG_FILE})`);
}
function obj(v: unknown, path: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) fail(`${path} must be an object`);
  return v as Record<string, unknown>;
}
function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(`${path} must be an array`);
  return v;
}
function str(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) fail(`${path} must be a non-empty string`);
  return v;
}
function num(v: unknown, path: string, fallback: number): number {
  if (v === undefined) return fallback;
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${path} must be a number`);
  return v;
}

function parseClip(raw: unknown, path: string): Clip {
  const c = obj(raw, path);
  return {
    id: str(c.id, `${path}.id`),
    label: typeof c.label === "string" ? c.label : "",
    file: str(c.file, `${path}.file`),
    durationSec: num(c.durationSec, `${path}.durationSec`, 0),
    ...(typeof c.handFile === "string" && c.handFile.length > 0 ? { handFile: c.handFile } : {}),
    ...(typeof c.headFile === "string" && c.headFile.length > 0 ? { headFile: c.headFile } : {}),
    ...(typeof c.comboFile === "string" && c.comboFile.length > 0 ? { comboFile: c.comboFile } : {}),
  };
}

function parseScenario(raw: unknown, path: string): ScenarioDTO {
  const s = obj(raw, path);
  return {
    id: str(s.id, `${path}.id`),
    name: str(s.name, `${path}.name`),
    recordingCount: num(s.recordingCount, `${path}.recordingCount`, 0),
    previews: arr(s.previews ?? [], `${path}.previews`).map((p, i) => parseClip(p, `${path}.previews[${i}]`)),
  };
}

function parseDomain(raw: unknown, path: string): DomainDTO {
  const d = obj(raw, path);
  const scenarios = arr(d.scenarios, `${path}.scenarios`).map((s, i) => parseScenario(s, `${path}.scenarios[${i}]`));
  return { id: str(d.id, `${path}.id`), name: str(d.name, `${path}.name`), scenarioCount: scenarios.length, scenarios };
}

function parseModality(raw: unknown, path: string): ModalityDTO {
  const m = obj(raw, path);
  const icon = str(m.icon, `${path}.icon`);
  if (icon !== "ego" && icon !== "gripper") fail(`${path}.icon must be "ego" or "gripper"`);
  const domains = arr(m.domains, `${path}.domains`).map((d, i) => parseDomain(d, `${path}.domains[${i}]`));
  const scenarios = domains.reduce((n, d) => n + d.scenarios.length, 0);
  const recordings = domains.reduce((n, d) => n + d.scenarios.reduce((k, s) => k + s.recordingCount, 0), 0);
  return {
    id: str(m.id, `${path}.id`),
    name: str(m.name, `${path}.name`),
    icon,
    stats: { domains: domains.length, scenarios, recordings },
    domains,
  };
}

function parseCatalog(raw: unknown): CatalogDTO {
  const root = obj(raw, "root");
  return { modalities: arr(root.modalities, "modalities").map((m, i) => parseModality(m, `modalities[${i}]`)) };
}

// mtime cache: reload only when the file changes.
let cache: { mtimeMs: number; catalog: CatalogDTO } | null = null;

export function buildCatalog(): CatalogDTO {
  if (!existsSync(CATALOG_FILE)) fail("catalog file not found");
  const mtimeMs = statSync(CATALOG_FILE).mtimeMs;
  if (cache && cache.mtimeMs === mtimeMs) return cache.catalog;
  const catalog = parseCatalog(JSON.parse(readFileSync(CATALOG_FILE, "utf8")));
  cache = { mtimeMs, catalog };
  return catalog;
}

// Flat list of every preview clip — used by the sample-video + poster generators.
export function allPreviewClips(): Clip[] {
  const clips: Clip[] = [];
  for (const m of buildCatalog().modalities)
    for (const d of m.domains) for (const s of d.scenarios) clips.push(...s.previews);
  return clips;
}
