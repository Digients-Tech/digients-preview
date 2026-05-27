// Catalog seed + counting helpers for the data-preview portal.
//
// The taxonomy is a curated presentation layer modelled after the reference mock:
//   Modality (Gripper | Ego) -> L1 Domain -> L2 Scenario -> L3 Task -> L4 Skill
// Each skill carries a recording count (the green badge) and a few short, viewable
// preview clips. This is hand-authored demo data; swap it for submission-derived
// data once the real catalog exists.

export type ModalityIcon = "gripper" | "ego";

export type Clip = {
  id: string;
  label: string;
  file: string; // file name inside the videos directory
  durationSec: number;
};

type SkillSeed = {
  id: string;
  name: string;
  recordingCount: number; // total recordings in the dataset (illustrative)
  previews: Clip[]; // short clips actually viewable in the portal
};

type TaskSeed = { id: string; name: string; skills: SkillSeed[] };
type ScenarioSeed = { id: string; name: string; tasks: TaskSeed[] };
type DomainSeed = { id: string; name: string; scenarios: ScenarioSeed[] };
type ModalitySeed = {
  id: string;
  name: string;
  icon: ModalityIcon;
  domains: DomainSeed[];
};

// --- DTOs returned to the client (seed + computed skillCount / stats) ---

export type SkillDTO = SkillSeed;
export type TaskDTO = { id: string; name: string; skillCount: number; skills: SkillDTO[] };
export type ScenarioDTO = { id: string; name: string; skillCount: number; tasks: TaskDTO[] };
export type DomainDTO = { id: string; name: string; skillCount: number; scenarios: ScenarioDTO[] };
export type ModalityStats = { domains: number; scenarios: number; tasks: number; skills: number };
export type ModalityDTO = {
  id: string;
  name: string;
  icon: ModalityIcon;
  stats: ModalityStats;
  domains: DomainDTO[];
};
export type CatalogDTO = { modalities: ModalityDTO[] };

// Build N preview clips for a skill. The sample generator creates matching files;
// any missing file degrades gracefully in the UI.
function previews(skillId: string, labels: string[]): Clip[] {
  return labels.map((label, i) => ({
    id: `${skillId}-${i + 1}`,
    label,
    file: `${skillId}-${i + 1}.mp4`,
    durationSec: 4,
  }));
}

const SEED: ModalitySeed[] = [
  {
    id: "ego",
    name: "Ego",
    icon: "ego",
    domains: [
      {
        id: "domestic-services",
        name: "Domestic Services",
        scenarios: [
          {
            id: "study",
            name: "Study",
            tasks: [
              {
                id: "organization",
                name: "Organization",
                skills: [
                  { id: "organize-desk", name: "Organize Desk", recordingCount: 9, previews: previews("organize-desk", ["Clear the desktop", "Sort stationery"]) },
                  { id: "organize-books", name: "Organize Books", recordingCount: 11, previews: previews("organize-books", ["Shelve by height", "Group by topic"]) },
                ],
              },
            ],
          },
          {
            id: "bedroom",
            name: "Bedroom",
            tasks: [
              {
                id: "tidying",
                name: "Tidying",
                skills: [
                  { id: "make-bed", name: "Make Bed", recordingCount: 7, previews: previews("make-bed", ["Smooth the duvet"]) },
                  { id: "fold-clothes", name: "Fold Clothes", recordingCount: 5, previews: previews("fold-clothes", ["Fold a t-shirt"]) },
                ],
              },
            ],
          },
          {
            id: "living-room",
            name: "Living Room",
            tasks: [
              {
                id: "cleaning",
                name: "Cleaning",
                skills: [
                  { id: "wipe-table", name: "Wipe Coffee Table", recordingCount: 6, previews: previews("wipe-table", ["Wipe down the surface"]) },
                  { id: "vacuum-rug", name: "Vacuum Rug", recordingCount: 4, previews: previews("vacuum-rug", ["Vacuum the rug"]) },
                ],
              },
            ],
          },
          {
            id: "kitchen",
            name: "Kitchen",
            tasks: [
              {
                id: "dishwashing",
                name: "Dishwashing",
                skills: [
                  { id: "load-dishwasher", name: "Load Dishwasher", recordingCount: 8, previews: previews("load-dishwasher", ["Load the plates"]) },
                  { id: "unload-dishwasher", name: "Unload Dishwasher", recordingCount: 5, previews: previews("unload-dishwasher", ["Put away cups"]) },
                ],
              },
              {
                id: "food-prep",
                name: "Food Prep",
                skills: [
                  { id: "chop-vegetables", name: "Chop Vegetables", recordingCount: 10, previews: previews("chop-vegetables", ["Chop a carrot"]) },
                  { id: "wash-produce", name: "Wash Produce", recordingCount: 3, previews: previews("wash-produce", ["Rinse vegetables"]) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "gripper",
    name: "Gripper",
    icon: "gripper",
    domains: [
      {
        id: "tabletop-manipulation",
        name: "Tabletop Manipulation",
        scenarios: [
          {
            id: "pick-and-place",
            name: "Pick & Place",
            tasks: [
              {
                id: "sorting",
                name: "Sorting",
                skills: [
                  { id: "sort-color", name: "Sort by Color", recordingCount: 8, previews: previews("sort-color", ["Sort red and blue blocks"]) },
                  { id: "sort-size", name: "Sort by Size", recordingCount: 6, previews: previews("sort-size", ["Stack by size"]) },
                ],
              },
            ],
          },
          {
            id: "assembly",
            name: "Assembly",
            tasks: [
              {
                id: "insertion",
                name: "Insertion",
                skills: [
                  { id: "peg-in-hole", name: "Peg in Hole", recordingCount: 12, previews: previews("peg-in-hole", ["Insert the peg"]) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

function annotateModality(m: ModalitySeed): ModalityDTO {
  let scenarioCount = 0;
  let taskCount = 0;
  let skillTotal = 0;

  const domains: DomainDTO[] = m.domains.map((d) => {
    let domainSkills = 0;
    const scenarios: ScenarioDTO[] = d.scenarios.map((s) => {
      scenarioCount += 1;
      let scenarioSkills = 0;
      const tasks: TaskDTO[] = s.tasks.map((t) => {
        taskCount += 1;
        const skillCount = t.skills.length;
        scenarioSkills += skillCount;
        skillTotal += skillCount;
        return { id: t.id, name: t.name, skillCount, skills: t.skills };
      });
      domainSkills += scenarioSkills;
      return { id: s.id, name: s.name, skillCount: scenarioSkills, tasks };
    });
    return { id: d.id, name: d.name, skillCount: domainSkills, scenarios };
  });

  return {
    id: m.id,
    name: m.name,
    icon: m.icon,
    stats: {
      domains: m.domains.length,
      scenarios: scenarioCount,
      tasks: taskCount,
      skills: skillTotal,
    },
    domains,
  };
}

export function buildCatalog(): CatalogDTO {
  return { modalities: SEED.map(annotateModality) };
}

// Flat list of every preview clip — used by the sample-video generator.
export function allPreviewClips(): Clip[] {
  const clips: Clip[] = [];
  for (const m of SEED)
    for (const d of m.domains)
      for (const s of d.scenarios)
        for (const t of s.tasks)
          for (const sk of t.skills) clips.push(...sk.previews);
  return clips;
}
