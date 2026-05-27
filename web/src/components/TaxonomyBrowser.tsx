import { useMemo, useRef, useState } from "react";
import type { Modality, Skill } from "../types.ts";
import { Connectors, type Edge } from "./Connectors.tsx";
import { VideoModal } from "./VideoModal.tsx";
import { BoltIcon, ChevronIcon, DomainIcon } from "./Icons.tsx";

// Level accent colors — must match the CSS custom properties.
const COLOR = {
  scenario: "#a972ff",
  task: "#d96bf0",
  skill: "#34d8a0",
};

type Props = { modality: Modality };

export function TaxonomyBrowser({ modality }: Props) {
  const firstDomain = modality.domains[0];
  const firstScenario = firstDomain?.scenarios[0];
  const firstTask = firstScenario?.tasks[0];

  const [domainId, setDomainId] = useState(firstDomain?.id ?? "");
  const [scenarioId, setScenarioId] = useState(firstScenario?.id ?? "");
  const [taskId, setTaskId] = useState(firstTask?.id ?? "");
  const [openSkill, setOpenSkill] = useState<Skill | null>(null);

  // Container is tracked via state (callback ref) so the connector overlay can measure
  // it reliably once it is attached to the DOM.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const registerCard = (id: string) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  const domain = modality.domains.find((d) => d.id === domainId) ?? firstDomain;
  const scenarios = domain?.scenarios ?? [];
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const tasks = scenario?.tasks ?? [];
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const skills = task?.skills ?? [];

  const selectDomain = (id: string) => {
    const d = modality.domains.find((x) => x.id === id);
    setDomainId(id);
    const s = d?.scenarios[0];
    setScenarioId(s?.id ?? "");
    setTaskId(s?.tasks[0]?.id ?? "");
  };
  const selectScenario = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    setScenarioId(id);
    setTaskId(s?.tasks[0]?.id ?? "");
  };

  // Connector edges: selected card in each column -> every card in the next column.
  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    if (domain) {
      for (const s of scenarios)
        e.push({ id: `d-${s.id}`, fromId: domain.id, toId: s.id, color: COLOR.scenario, active: s.id === scenario?.id });
    }
    if (scenario) {
      for (const t of tasks)
        e.push({ id: `s-${t.id}`, fromId: scenario.id, toId: t.id, color: COLOR.task, active: t.id === task?.id });
    }
    if (task) {
      for (const sk of skills)
        e.push({ id: `t-${sk.id}`, fromId: task.id, toId: sk.id, color: COLOR.skill, active: true });
    }
    return e;
  }, [domain, scenario, task, scenarios, tasks, skills]);

  return (
    <>
      <div className="browser" ref={setContainerEl}>
        <Connectors containerEl={containerEl} cardRefs={cardRefs} edges={edges} />

        {/* L1 · Domains */}
        <div className="col">
          <div className="col__chip chip--domain">L1 · DOMAINS</div>
          <div className="col__cards">
            {modality.domains.map((d) => (
              <button
                key={d.id}
                ref={registerCard(d.id)}
                className={`card card--domain ${d.id === domain?.id ? "is-selected" : ""}`}
                onClick={() => selectDomain(d.id)}
              >
                <span className="card__iconbox icon--domain"><DomainIcon className="icon" /></span>
                <span className="card__body">
                  <span className="card__name">{d.name}</span>
                </span>
                <ChevronIcon className="card__chevron" />
              </button>
            ))}
          </div>
        </div>

        {/* L2 · Scenario */}
        <div className="col">
          <div className="col__chip chip--scenario">L2 · SCENARIO</div>
          <div className="col__cards">
            {scenarios.map((s) => (
              <button
                key={s.id}
                ref={registerCard(s.id)}
                className={`card card--scenario ${s.id === scenario?.id ? "is-selected" : ""}`}
                onClick={() => selectScenario(s.id)}
              >
                <span className="card__body">
                  <span className="card__name">{s.name}</span>
                  <span className="card__sub">{s.skillCount} SKILLS</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* L3 · Task */}
        <div className="col">
          <div className="col__chip chip--task">L3 · TASK</div>
          <div className="col__cards">
            {tasks.map((t) => (
              <button
                key={t.id}
                ref={registerCard(t.id)}
                className={`card card--task ${t.id === task?.id ? "is-selected" : ""}`}
                onClick={() => setTaskId(t.id)}
              >
                <span className="card__body">
                  <span className="card__name">{t.name}</span>
                  <span className="card__sub">{t.skillCount} SKILLS</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* L4 · Skill */}
        <div className="col">
          <div className="col__chip chip--skill">L4 · SKILL</div>
          <div className="col__cards">
            {skills.map((sk) => (
              <button
                key={sk.id}
                ref={registerCard(sk.id)}
                className="card card--skill"
                onClick={() => setOpenSkill(sk)}
              >
                <span className="card__iconbox icon--skill"><BoltIcon className="icon" /></span>
                <span className="card__body">
                  <span className="card__name">{sk.name}</span>
                </span>
                <span className="card__badge">{sk.recordingCount}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {openSkill && <VideoModal skill={openSkill} onClose={() => setOpenSkill(null)} />}
    </>
  );
}
