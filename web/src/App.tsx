import { useEffect, useState } from "react";
import type { Catalog } from "./types.ts";
import { getCatalog, getSession, logout } from "./api.ts";
import { Login } from "./components/Login.tsx";
import { ModalityTabs } from "./components/ModalityTabs.tsx";
import { TaxonomyBrowser } from "./components/TaxonomyBrowser.tsx";
import { StatCards } from "./components/StatCards.tsx";
import { CameraIcon, CubeIcon } from "./components/Icons.tsx";

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(setAuthed).catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    getCatalog()
      .then((c) => {
        setCatalog(c);
        setActiveId(c.modalities[0]?.id ?? "");
      })
      .catch((e) => setError(String(e)));
  }, [authed]);

  if (authed === null) return <div className="boot" />;
  if (!authed) return <Login onAuthed={() => setAuthed(true)} />;
  if (error) return <div className="boot boot--error">Failed to load catalog: {error}</div>;
  if (!catalog) return <div className="boot" />;

  const active = catalog.modalities.find((m) => m.id === activeId) ?? catalog.modalities[0];

  const doLogout = async () => {
    await logout();
    setAuthed(false);
    setCatalog(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo">D</span>
          <span>Digients · Data Preview</span>
        </div>
        <ModalityTabs
          modalities={catalog.modalities}
          activeId={active?.id ?? ""}
          onSelect={setActiveId}
        />
        <button className="topbar__logout" onClick={doLogout}>Sign out</button>
      </header>

      {active && (
        <main className="content">
          <div className={`crumb crumb--${active.icon}`}>
            {active.icon === "ego" ? <CameraIcon className="icon" /> : <CubeIcon className="icon" />}
            <span>{active.name}</span>
          </div>

          <TaxonomyBrowser key={active.id} modality={active} />

          <StatCards stats={active.stats} />
        </main>
      )}
    </div>
  );
}
