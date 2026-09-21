import { useEffect, useMemo, useState } from "react";
import type { L4Catalog, Language, MediaMode } from "../l4-types.ts";
import { filterGallery } from "../l4-core.ts";
import { Icon, Mark } from "./ExplorerIcons.tsx";
import { VideoCard, type OpenEpisode } from "./VideoCard.tsx";
import { EpisodeDetail } from "./EpisodeDetail.tsx";

const readLanguage = (): Language => {
  try {
    return localStorage.getItem("digients-language") === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
};
function readEpisode(): OpenEpisode | null {
  const params = new URLSearchParams(location.search);
  const id = params.get("episode");
  if (!id) return null;
  const t = Number(params.get("t"));
  return {
    id,
    time: Number.isFinite(t) ? Math.max(t, 0) : 0,
    playing: false,
    mode: params.get("view") === "recording" ? "recording" : "hand",
  };
}

export function L4Explorer({
  onLogout,
  onSessionExpired,
}: {
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const [catalog, setCatalog] = useState<L4Catalog | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [lang, setLang] = useState<Language>(readLanguage);
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [scene, setScene] = useState("");
  const [task, setTask] = useState("");
  const [mode, setMode] = useState<MediaMode>("hand");
  const [previews, setPreviews] = useState(
    () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [hidden, setHidden] = useState(document.hidden);
  const [selected, setSelected] = useState<OpenEpisode | null>(readEpisode);
  const [notice, setNotice] = useState("");
  const zh = lang === "zh";

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch("/api/l4/catalog", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          onSessionExpired();
          return null;
        }
        if (!response.ok) throw new Error("catalog");
        return response.json() as Promise<L4Catalog>;
      })
      .then((data) => {
        if (!data) return;
        setCatalog(data);
        const requested = readEpisode();
        if (
          requested &&
          !data.episodes.some((episode) => episode.id === requested.id)
        ) {
          setSelected(null);
          const url = new URL(location.href);
          ["episode", "t", "view"].forEach((key) =>
            url.searchParams.delete(key),
          );
          history.replaceState(null, "", url);
          setNotice(
            zh
              ? "未找到该片段，请从下方选择。"
              : "That clip was not found. Choose a clip below.",
          );
        }
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    document.documentElement.lang = zh ? "zh-CN" : "en";
    try {
      localStorage.setItem("digients-language", lang);
    } catch {
      /* Optional preference. */
    }
  }, [lang, zh]);
  useEffect(() => {
    const onPop = () => setSelected(readEpisode());
    const onVisibility = () => setHidden(document.hidden);
    window.addEventListener("popstate", onPop);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(
    () => filterGallery(catalog?.episodes ?? [], query, industry, scene, task),
    [catalog, query, industry, scene, task],
  );
  const scenes = useMemo(() => {
    const labels = new Map<string, string>();
    for (const episode of catalog?.episodes ?? []) {
      if (industry && episode.industryId !== industry) continue;
      episode.scenes.forEach((value, index) =>
        labels.set(value, zh ? (episode.scenesZh[index] ?? value) : value),
      );
    }
    return [...labels].sort((a, b) =>
      a[1].localeCompare(b[1], zh ? "zh" : "en"),
    );
  }, [catalog, industry, zh]);
  const episode = catalog?.episodes.find((entry) => entry.id === selected?.id);
  function open(selection: OpenEpisode) {
    const url = new URL(location.href);
    url.searchParams.set("episode", selection.id);
    url.searchParams.set("t", selection.time.toFixed(1));
    url.searchParams.set("view", selection.mode);
    history.pushState({ digientsDetail: true }, "", url);
    setSelected(selection);
  }
  function close() {
    if (history.state?.digientsDetail) history.back();
    else {
      const url = new URL(location.href);
      ["episode", "t", "view"].forEach((key) => url.searchParams.delete(key));
      history.replaceState(null, "", url);
      setSelected(null);
    }
  }
  function reset() {
    setQuery("");
    setIndustry("");
    setScene("");
    setTask("");
  }

  return (
    <div className="explorer">
      <a className="skip-link" href="#collection">
        {zh ? "跳到视频" : "Skip to videos"}
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Digients">
          <Mark />
          <span>digients</span>
        </a>
        <span className="header-section">{zh ? "数据集" : "Datasets"}</span>
        <div className="header-actions">
          <div className="language-switch" role="group" aria-label="Language">
            <button aria-pressed={!zh} onClick={() => setLang("en")}>
              EN
            </button>
            <button aria-pressed={zh} onClick={() => setLang("zh")}>
              中文
            </button>
          </div>
          <button
            className="text-button"
            onClick={() =>
              void onLogout().catch(() =>
                setNotice(
                  zh ? "退出失败，请重试。" : "Could not sign out. Try again.",
                ),
              )
            }
          >
            {zh ? "退出" : "Sign out"}
          </button>
        </div>
      </header>
      <main className="collection-main" id="collection">
        <div className="collection-heading">
          <div>
            <h1>
              {zh ? "真实动作，完整语境。" : "Human action. In full context."}
            </h1>
            <p>
              {zh ? "1x 具身数据集" : "1x embodied collection"}
              <span>·</span>
              {catalog
                ? `${catalog.stats.episodes} ${zh ? "条视频" : "clips"}`
                : "…"}
              <span>·</span>
              {zh ? "3 小时" : "3 hours"}
              <span>·</span>
              {zh ? "L4 语义标注" : "L4 annotations"}
            </p>
          </div>
          <span className="collection-format">
            {zh ? "第一人称视频 + 手部位姿" : "Egocentric video + hand pose"}
          </span>
        </div>
        <section
          className="collection-tools"
          aria-label={zh ? "筛选与预览" : "Filters and previews"}
        >
          <div className="filter-row">
            <label className="search-field">
              <Icon name="search" />
              <span className="sr-only">
                {zh ? "搜索视频" : "Search clips"}
              </span>
              <input
                type="search"
                placeholder={
                  zh
                    ? "搜索任务、物体或场景…"
                    : "Search tasks, objects, scenes…"
                }
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="filter-select">
              <span className="sr-only">{zh ? "行业" : "Industry"}</span>
              <select
                aria-label={zh ? "行业" : "Industry"}
                value={industry}
                onChange={(event) => {
                  setIndustry(event.target.value);
                  setScene("");
                }}
              >
                <option value="">{zh ? "所有行业" : "All industries"}</option>
                {catalog?.industries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {zh ? item.nameZh : item.name} ({item.count})
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={14} />
            </label>
            <label className="filter-select">
              <span className="sr-only">{zh ? "场景" : "Scene"}</span>
              <select
                aria-label={zh ? "场景" : "Scene"}
                value={scene}
                onChange={(event) => setScene(event.target.value)}
              >
                <option value="">{zh ? "所有场景" : "All scenes"}</option>
                {scenes.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={14} />
            </label>
            <label className="filter-select">
              <span className="sr-only">{zh ? "任务" : "Task"}</span>
              <select
                aria-label={zh ? "任务" : "Task"}
                value={task}
                onChange={(event) => setTask(event.target.value)}
              >
                <option value="">{zh ? "所有任务" : "All tasks"}</option>
                {catalog?.tasks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.count})
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={14} />
            </label>
          </div>
          <div className="collection-view-options">
            <p className="result-count" role="status">
              {catalog ? (
                <>
                  <strong>{filtered.length}</strong> {zh ? "条视频" : "clips"}
                  <span>·</span>
                  {query || industry || scene || task ? (
                    <button className="text-button" onClick={reset}>
                      {zh ? "清除筛选" : "Clear filters"}
                    </button>
                  ) : (
                    <span>{zh ? "精选优先" : "Featured first"}</span>
                  )}
                </>
              ) : zh ? (
                "正在载入…"
              ) : (
                "Loading collection…"
              )}
            </p>
            <div className="preview-options">
              <button
                className="toggle-button"
                aria-pressed={mode === "hand"}
                onClick={() => setMode(mode === "hand" ? "recording" : "hand")}
              >
                <span className="toggle-indicator">
                  <Icon name="check" size={12} />
                </span>
                {zh ? "手部骨骼" : "Hand skeleton"}
              </button>
              <button
                className="text-button previews-toggle"
                aria-pressed={previews}
                onClick={() => setPreviews(!previews)}
              >
                <Icon name={previews ? "pause" : "play"} size={15} />
                {previews
                  ? zh
                    ? "暂停预览"
                    : "Pause previews"
                  : zh
                    ? "播放预览"
                    : "Play previews"}
              </button>
            </div>
          </div>
        </section>
        {error ? (
          <div className="collection-empty" role="alert">
            <h2>
              {zh ? "暂时无法载入数据集" : "The collection could not load"}
            </h2>
            <p>
              {zh
                ? "请检查网络后重试。"
                : "Check your connection and try again."}
            </p>
            <button className="button" onClick={() => setRetry(retry + 1)}>
              <Icon name="refresh" />
              {zh ? "重试" : "Try again"}
            </button>
          </div>
        ) : !catalog ? (
          <div className="video-grid" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="card-skeleton" key={index}>
                <div />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="video-grid">
            {filtered.map((entry) => (
              <VideoCard
                key={entry.id}
                episode={entry}
                lang={lang}
                mode={mode}
                previews={previews}
                suspended={!!selected || hidden}
                onOpen={open}
              />
            ))}
          </div>
        ) : (
          <div className="collection-empty">
            <h2>{zh ? "没有匹配的视频" : "No clips match these filters"}</h2>
            <p>
              {zh
                ? "尝试其他关键词，或清除筛选继续浏览。"
                : "Try another keyword, or clear your filters to keep exploring."}
            </p>
            <button className="button" onClick={reset}>
              {zh ? "清除筛选" : "Clear filters"}
            </button>
          </div>
        )}
        <footer className="collection-footer">
          <span>
            Digients · {zh ? "具身智能数据" : "Data for embodied intelligence"}
          </span>
          <span>
            {zh
              ? "L4 · 动作、意图、空间与记忆"
              : "L4 · Action, intent, space & memory"}
          </span>
        </footer>
      </main>
      {selected && episode && (
        <EpisodeDetail
          key={episode.id}
          episode={episode}
          initial={selected}
          lang={lang}
          onClose={close}
          onSessionExpired={onSessionExpired}
        />
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
