import { useMemo, useRef, useState } from "react";
import type { Domain, Modality, Scenario } from "../types.ts";
import { useLang } from "../lang.ts";
import { Connectors, type Edge } from "./Connectors.tsx";
import { ScenarioPreview } from "./ScenarioPreview.tsx";
import { ChevronIcon, DomainIcon } from "./Icons.tsx";

// Level accent colors — must match the CSS custom properties.
const COLOR = { scenario: "#a972ff", preview: "#34d8a0" };
const PREVIEW_NODE = "__preview__";

// Localized display name — falls back to English when a zh name is absent.
const dispName = (x: Domain | Scenario, lang: "en" | "zh") =>
  lang === "zh" && x.nameZh ? x.nameZh : x.name;

export function TaxonomyBrowser({ modality }: { modality: Modality }) {
  const lang = useLang();
  const firstDomain = modality.domains[0];
  const firstScenario = firstDomain?.scenarios[0];

  const [domainId, setDomainId] = useState(firstDomain?.id ?? "");
  const [scenarioId, setScenarioId] = useState(firstScenario?.id ?? "");

  // Container tracked via state (callback ref) so the connector overlay can measure it.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const registerCard = (id: string) => (el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  };

  const domain = modality.domains.find((d) => d.id === domainId) ?? firstDomain;
  const scenarios = domain?.scenarios ?? [];
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];

  const selectDomain = (id: string) => {
    const d = modality.domains.find((x) => x.id === id);
    setDomainId(id);
    setScenarioId(d?.scenarios[0]?.id ?? "");
  };

  // Connectors: selected domain -> every scenario; selected scenario -> preview panel.
  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    if (domain) {
      for (const s of scenarios)
        e.push({ id: `d-${s.id}`, fromId: domain.id, toId: s.id, color: COLOR.scenario, active: s.id === scenario?.id });
    }
    if (scenario) {
      e.push({ id: "s-preview", fromId: scenario.id, toId: PREVIEW_NODE, color: COLOR.preview, active: true });
    }
    return e;
  }, [domain, scenario, scenarios]);

  return (
    <div className="browser browser--2col" ref={setContainerEl}>
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
                <span className="card__name">{dispName(d, lang)}</span>
                <span className="card__sub">{d.scenarioCount} SCENARIOS</span>
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
              onClick={() => setScenarioId(s.id)}
            >
              <span className="card__body">
                <span className="card__name">{dispName(s, lang)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview panel */}
      <div className="col col--preview">
        <div className="col__chip chip--skill">PREVIEW</div>
        <div ref={registerCard(PREVIEW_NODE)} className="previewpanel">
          {scenario ? (
            <ScenarioPreview key={scenario.id} scenario={scenario} domainName={domain ? dispName(domain, lang) : ""} />
          ) : (
            <div className="previewpanel__empty">Select a scenario to preview</div>
          )}
        </div>
      </div>
    </div>
  );
}
