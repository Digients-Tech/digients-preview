// Fold either caption schema generation (legacy or current) into one
// single-language view model the panel renders directly. Keeping this mapping
// in one place means the components never branch on schema shape or language.

import type { Caption, CaptionAction } from "./types.ts";

export type Lang = "en" | "zh";
export type HandSide = "left" | "right" | "both" | "none";

export type NormStep = {
  id: string;
  start: number;
  end: number;
  name: string;
  subtask?: string;
  visualContext?: string;
  description?: string;
  reasoning?: { current?: string; action?: string; expected?: string };
  objects: { label: string; stateChange?: string }[];
};

export type NormAction = {
  start: number;
  end: number;
  hand: HandSide;
  verb: string;
  object?: string;
  handPose?: string;
  effect?: string;
};

export type NormCaption = {
  taskGoal?: string;
  summary?: string;
  scene?: string;
  cameraMotion?: string;
  taxonomy: { industry?: string; scene?: string; taskCategory?: string };
  rubrics: string[];
  steps: NormStep[];
  actions: NormAction[];
  duration: number;
};

// Hand lanes render top-to-bottom in this order; "none" is rare (≈1 action in
// the whole sample set) and only appears when present.
export const HAND_ORDER: HandSide[] = ["left", "right", "both", "none"];

const txt = (lang: Lang, en?: string, zh?: string): string | undefined => {
  const primary = lang === "zh" ? zh : en;
  return (primary ?? en ?? zh) || undefined;
};

const arr = (lang: Lang, en?: string[], zh?: string[]): string[] => {
  const primary = lang === "zh" ? zh : en;
  return (primary ?? en ?? zh ?? []).filter(Boolean);
};

const hasCJK = (s?: string): boolean => !!s && /[一-鿿]/.test(s);

// `state_change` is single-language in the source (no _en/_zh sibling) and
// inconsistent across files — some English, some Chinese. Only surface it when
// it matches the selected UI language, so EN mode never leaks Chinese.
const stateForLang = (sc: string | undefined, lang: Lang): string | undefined => {
  const v = sc || undefined;
  if (!v) return undefined;
  return hasCJK(v) === (lang === "zh") ? v : undefined;
};

function normAction(lang: Lang, a: CaptionAction): NormAction {
  const hand = (a.hand_side ?? "none") as HandSide;
  return {
    start: a.start_sec,
    end: a.end_sec,
    hand: HAND_ORDER.includes(hand) ? hand : "none",
    verb: txt(lang, a.verb_en, a.verb_zh) ?? "—",
    object: txt(lang, a.object_en, a.object_zh),
    handPose: txt(lang, a.hand_pose_en, a.hand_pose_zh),
    effect: txt(lang, a.effect_en, a.effect_zh),
  };
}

export function normalizeCaption(raw: Caption, lang: Lang): NormCaption {
  const g = raw.global ?? {};
  const tx = g.taxonomy;

  const steps: NormStep[] = (raw.steps ?? []).map((s) => {
    const r = s.reasoning;
    const reasoning = r
      ? {
          current: txt(lang, r.current_state_en, r.current_state_zh),
          action: txt(lang, r.action_now_en, r.action_now_zh),
          expected: txt(lang, r.expected_state_en, r.expected_state_zh),
        }
      : undefined;
    return {
      id: s.step_id,
      start: s.start_sec,
      end: s.end_sec,
      name: txt(lang, s.name_en, s.name_zh) ?? s.step_id,
      subtask: txt(lang, s.subtask_en, s.subtask_zh),
      visualContext: txt(lang, s.visual_context_en, s.visual_context_zh),
      description: txt(lang, s.description_en, s.description_zh),
      reasoning: reasoning && (reasoning.current || reasoning.action || reasoning.expected) ? reasoning : undefined,
      objects: (s.primary_objects ?? []).map((o) => ({
        label: txt(lang, o.label_en, o.label_zh) ?? `#${o.object_id ?? "?"}`,
        stateChange: stateForLang(o.state_change, lang),
      })),
    };
  });

  // Action source of truth: top-level `actions[]` (current schema). Fall back to
  // flattening per-step nested actions for legacy caption files.
  const rawActions: CaptionAction[] =
    raw.actions && raw.actions.length > 0
      ? raw.actions
      : (raw.steps ?? []).flatMap((s) => s.actions ?? []);
  const actions = rawActions.map((a) => normAction(lang, a));

  const ends = [
    ...steps.map((s) => s.end),
    ...actions.map((a) => a.end),
  ];
  const duration = ends.length ? Math.max(...ends) : 0;

  return {
    taskGoal: txt(lang, g.task_goal_en, g.task_goal_zh),
    summary: txt(lang, g.summary_en, g.summary_zh),
    scene: txt(lang, g.scene_en, g.scene_zh),
    cameraMotion: txt(lang, g.camera_motion_en, g.camera_motion_zh),
    taxonomy: {
      industry: txt(lang, tx?.industry_en, tx?.industry_zh),
      // current schema: taxonomy.scene; legacy: scene_label[] array
      scene: txt(lang, tx?.scene_en, tx?.scene_zh) ?? arr(lang, g.scene_label_en, g.scene_label_zh)[0],
      // current schema: taxonomy.task_category; legacy: task_categories[] array
      taskCategory:
        txt(lang, tx?.task_category_en, tx?.task_category_zh) ??
        arr(lang, g.task_categories_en, g.task_categories_zh)[0],
    },
    rubrics: arr(lang, g.rubrics_en, g.rubrics),
    steps,
    actions,
    duration,
  };
}

// Greedy interval packing: assign each item to the first sub-row whose last bar
// ends at/before this item's start. Resolves the (few) same-hand overlapping
// actions and any >1 concurrency within a lane without bars colliding.
export function packRows<T extends { start: number; end: number }>(items: T[]): { item: T; row: number }[] {
  const rowEnds: number[] = [];
  const ordered = items.map((item, i) => ({ item, i })).sort((a, b) => a.item.start - b.item.start || a.i - b.i);
  const out: { item: T; row: number }[] = [];
  for (const { item } of ordered) {
    let row = rowEnds.findIndex((end) => end <= item.start + 1e-6);
    if (row < 0) {
      row = rowEnds.length;
      rowEnds.push(item.end);
    } else {
      rowEnds[row] = item.end;
    }
    out.push({ item, row });
  }
  return out;
}
