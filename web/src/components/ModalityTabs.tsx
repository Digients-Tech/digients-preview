import type { Modality } from "../types.ts";
import { CameraIcon, CubeIcon } from "./Icons.tsx";

type Props = {
  modalities: Modality[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function ModalityTabs({ modalities, activeId, onSelect }: Props) {
  return (
    <div className="tabs">
      {modalities.map((m) => {
        const active = m.id === activeId;
        const Icon = m.icon === "ego" ? CameraIcon : CubeIcon;
        return (
          <button
            key={m.id}
            className={`tab ${active ? "tab--active" : ""}`}
            onClick={() => onSelect(m.id)}
          >
            <Icon className="tab__icon" />
            <span>{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
