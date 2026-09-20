import { useCallback, useEffect, useMemo, useState } from "react";
import type { L4Catalog, L4Caption, Language } from "../l4-types.ts";
import {
  activeAt,
  filterEpisodes,
  posterURL,
  preciseTime,
  timecode,
} from "../l4-core.ts";
import { Icon, Mark } from "./ExplorerIcons.tsx";
import { L4Player } from "./L4Player.tsx";
import type { SeekRequest } from "./L4Player.tsx";
import { L4Annotations } from "./L4Annotations.tsx";

const readLanguage = (): Language => {
  try {
    return localStorage.getItem("digients-language") === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
};

export function L4Explorer({
  onLogout,
  onSessionExpired,
}: {
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const [catalog, setCatalog] = useState<L4Catalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [caption, setCaption] = useState<L4Caption | null>(null);
  const [captionError, setCaptionError] = useState(false);
  const [captionRetry, setCaptionRetry] = useState(0);
  const [lang, setLang] = useState<Language>(readLanguage);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [task, setTask] = useState("");
  const [shown, setShown] = useState(30);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [seek, setSeek] = useState<SeekRequest | null>(null);
  const [notice, setNotice] = useState("");
  const zh = lang === "zh";

  useEffect(() => {
    const controller = new AbortController();
    setCatalogError(false);
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
        const requested = new URLSearchParams(location.search).get("episode");
        setSelectedId(
          data.episodes.some((e) => e.id === requested)
            ? requested!
            : data.defaultEpisodeId,
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCatalogError(true);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    try {
      localStorage.setItem("digients-language", lang);
    } catch {
      /* Storage is optional. */
    }
  }, [lang]);

  const filtered = useMemo(
    () => filterEpisodes(catalog?.episodes ?? [], query, category, task),
    [catalog, query, category, task],
  );
  const selected = catalog?.episodes.find((e) => e.id === selectedId);
  const currentCaption = caption?.video_id === selectedId ? caption : null;
  const activeAction = activeAt(currentCaption?.actions ?? [], time);

  useEffect(() => {
    setShown(30);
  }, [query, category, task]);
  useEffect(() => {
    if (filtered.length && !filtered.some((e) => e.id === selectedId))
      setSelectedId(filtered[0]!.id);
  }, [filtered, selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setCaption(null);
    setCaptionError(false);
    setTime(0);
    setSeek(null);
    const url = new URL(location.href);
    url.searchParams.set("episode", selectedId);
    history.replaceState(null, "", url);
    fetch(`/api/l4/captions/${encodeURIComponent(selectedId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          onSessionExpired();
          return null;
        }
        if (!response.ok) throw new Error("caption");
        return response.json() as Promise<L4Caption>;
      })
      .then((data) => {
        if (data) setCaption(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCaptionError(true);
      });
    return () => controller.abort();
  }, [selectedId, captionRetry]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const requestSeek = useCallback(
    (value: number) =>
      setSeek((previous) => ({
        episodeId: selectedId,
        time: value,
        serial: (previous?.serial ?? 0) + 1,
      })),
    [selectedId],
  );
  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setTask("");
  };
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice(zh ? "片段链接已复制" : "Episode link copied");
    } catch {
      setNotice(
        zh
          ? "请复制浏览器地址栏中的链接"
          : "Copy the link from your address bar",
      );
    }
  }
  const selectedIndex = filtered.findIndex((e) => e.id === selectedId);

  return (
    <div className="explorer">
      <a className="skip-link" href="#episode-workspace">
        {zh ? "跳至视频" : "Skip to video"}
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Digients collection">
          <Mark />
          <span>digients</span>
        </a>
        <div className="header-divider" />
        <span className="header-section">
          {zh ? "数据探索" : "Data explorer"}
        </span>
        <div className="header-actions">
          <span className="private-label">
            {zh ? "样例集" : "Sample collection"}
          </span>
          <div className="language-switch" role="group" aria-label="Language">
            <button aria-pressed={!zh} onClick={() => setLang("en")}>
              EN
            </button>
            <button aria-pressed={zh} onClick={() => setLang("zh")}>
              中文
            </button>
          </div>
          <button
            className="text-button signout"
            onClick={() => {
              void onLogout().catch(() =>
                setNotice(
                  zh ? "退出失败，请重试" : "Could not sign out. Try again.",
                ),
              );
            }}
          >
            {zh ? "退出" : "Sign out"}
          </button>
        </div>
      </header>
      <div className="collection-intro">
        <div>
          <div className="overline intro-eyebrow">
            {zh ? "具身智能" : "EMBODIED INTELLIGENCE"}
            <span>/</span>
            <span className="accent">L4</span>
          </div>
          <h1>{zh ? "看见动作，理解意图。" : "Human skill, in context."}</h1>
          <p>
            {zh
              ? "从第一人称视频，深入每一个动作的目的、推理与身体细节。"
              : "First-person video. Fine-grained actions. The intent behind every move."}
          </p>
        </div>
        {catalog && (
          <div className="collection-facts">
            <div>
              <strong>{catalog.stats.episodes}</strong>
              <span>{zh ? "片段" : "episodes"}</span>
            </div>
            <div>
              <strong>
                {(catalog.stats.duration / 3600).toFixed(2)}
                <small>h</small>
              </strong>
              <span>{zh ? "真实视频" : "of human activity"}</span>
            </div>
            <div>
              <strong>{catalog.stats.actions.toLocaleString()}</strong>
              <span>{zh ? "L4 动作" : "L4 actions"}</span>
            </div>
          </div>
        )}
      </div>
      {!catalog ? (
        <main
          className="dataset-loading"
          role={catalogError ? "alert" : "status"}
        >
          <h2>
            {catalogError
              ? zh
                ? "暂时无法载入数据集"
                : "The collection could not load"
              : zh
                ? "正在准备数据集…"
                : "Preparing the collection…"}
          </h2>
          {catalogError && (
            <button className="button" onClick={() => setRetry((n) => n + 1)}>
              {zh ? "重试" : "Try again"}
            </button>
          )}
        </main>
      ) : (
        <main className="workspace-layout">
          <button
            className="mobile-collection-button button"
            aria-expanded={collectionOpen}
            aria-controls="collection-browser"
            onClick={() => setCollectionOpen((v) => !v)}
          >
            <Icon name="grid" />
            {zh ? "浏览样例集" : "Browse collection"}
            <span>{filtered.length}</span>
            <Icon name={collectionOpen ? "close" : "chevron"} />
          </button>
          <aside
            className={`collection-rail ${collectionOpen ? "is-open" : ""}`}
            id="collection-browser"
            aria-label={zh ? "筛选样例" : "Filter episodes"}
          >
            <div className="collection-rail-heading">
              <h2>{zh ? "样例集" : "Collection"}</h2>
              <span className="count">{catalog.stats.episodes}</span>
            </div>
            <label className="search-field">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder={
                  zh ? "搜索动作、物体、场景…" : "Search actions, objects…"
                }
                aria-label={zh ? "搜索样例" : "Search episodes"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div
              className="category-filters"
              role="group"
              aria-label={zh ? "场景类别" : "Category"}
            >
              <button aria-pressed={!category} onClick={() => setCategory("")}>
                {zh ? "全部场景" : "All settings"}
              </button>
              {catalog.categories.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {zh ? c.nameZh : c.name}
                </button>
              ))}
            </div>
            <label className="task-filter">
              <span className="sr-only">{zh ? "任务类型" : "Task type"}</span>
              <select
                aria-label={zh ? "任务类型" : "Task type"}
                value={task}
                onChange={(e) => setTask(e.target.value)}
              >
                <option value="">
                  {zh ? "全部任务类型" : "All task types"}
                </option>
                {catalog.tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.count}
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={16} />
            </label>
            <div className="results-heading">
              <span role="status">
                {filtered.length} {zh ? "条结果" : "episodes"}
              </span>
              {query || category || task ? (
                <button className="text-button" onClick={clearFilters}>
                  {zh ? "重置" : "Reset"}
                </button>
              ) : (
                <span>{zh ? "精选优先" : "Curated first"}</span>
              )}
            </div>
            <div className="episode-results">
              {filtered.length === 0 ? (
                <div className="collection-empty">
                  <h3>{zh ? "没有找到匹配片段" : "No matching episodes"}</h3>
                  <p>
                    {zh
                      ? "尝试其他搜索词或清除筛选条件。"
                      : "Try a different search or clear your filters."}
                  </p>
                  <button className="button" onClick={clearFilters}>
                    {zh ? "清除筛选" : "Clear filters"}
                  </button>
                </div>
              ) : (
                filtered.slice(0, shown).map((e) => (
                  <button
                    className={`episode-row ${e.id === selectedId ? "is-selected" : ""}`}
                    key={e.id}
                    aria-current={e.id === selectedId ? "true" : undefined}
                    onClick={() => {
                      setSelectedId(e.id);
                      setCollectionOpen(false);
                    }}
                  >
                    <span className="episode-thumb">
                      <img src={posterURL(e.id)} alt="" loading="lazy" />
                      <span>{timecode(e.duration)}</span>
                    </span>
                    <span className="episode-row-copy">
                      <span className="episode-row-title">
                        {zh ? e.titleZh : e.title}
                      </span>
                      <span className="episode-row-meta">
                        {e.featured && (
                          <span className="featured-label">
                            {zh ? "精选" : "Featured"}
                          </span>
                        )}
                        {e.actionCount} {zh ? "个动作" : "actions"}
                      </span>
                    </span>
                  </button>
                ))
              )}
              {shown < filtered.length && (
                <button
                  className="load-more"
                  onClick={() => setShown((n) => n + 30)}
                >
                  {zh ? "显示更多" : "Show more episodes"}
                  <span>+{Math.min(30, filtered.length - shown)}</span>
                </button>
              )}
            </div>
            <div className="collection-rail-footer">
              <span className="live-dot" />
              {zh ? "原始视频 + 手部位姿" : "Video + hand pose"}
            </div>
          </aside>
          <div
            id="episode-workspace"
            className="episode-workspace"
            tabIndex={-1}
          >
            {selected && (
              <>
                <div className="episode-heading">
                  <div>
                    <div className="episode-eyebrow">
                      <span>
                        {zh ? selected.categoryLabelZh : selected.categoryLabel}
                      </span>
                      <span>/</span>
                      <span>{zh ? selected.sceneZh : selected.scene}</span>
                      {selected.featured && (
                        <span className="featured-badge">
                          {zh ? "精选片段" : "Featured episode"}
                        </span>
                      )}
                    </div>
                    <h2>{zh ? selected.titleZh : selected.title}</h2>
                    <div className="episode-meta">
                      <span>{timecode(selected.duration)}</span>
                      <span>
                        {selected.subtaskCount} {zh ? "个子任务" : "subtasks"}
                      </span>
                      <span>
                        {selected.actionCount} {zh ? "个动作" : "actions"}
                      </span>
                      <span>EN / 中文</span>
                    </div>
                  </div>
                  <div className="episode-navigation">
                    <button
                      className="icon-button"
                      aria-label={zh ? "上一个片段" : "Previous episode"}
                      disabled={selectedIndex <= 0}
                      onClick={() =>
                        setSelectedId(filtered[selectedIndex - 1]!.id)
                      }
                    >
                      <Icon name="back" />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={zh ? "下一个片段" : "Next episode"}
                      disabled={
                        selectedIndex < 0 ||
                        selectedIndex >= filtered.length - 1
                      }
                      onClick={() =>
                        setSelectedId(filtered[selectedIndex + 1]!.id)
                      }
                    >
                      <Icon name="arrow" />
                    </button>
                  </div>
                </div>
                <div className="evidence-layout">
                  <div className="evidence-column">
                    <L4Player
                      key={selected.id}
                      episode={selected}
                      caption={currentCaption}
                      lang={lang}
                      seek={seek}
                      onTime={setTime}
                      onSeek={requestSeek}
                    />
                    <section
                      className="sequence"
                      aria-label={zh ? "动作序列" : "Action sequence"}
                    >
                      <div className="sequence-heading">
                        <h3>{zh ? "动作序列" : "Action sequence"}</h3>
                        <span>
                          {zh ? "选择动作以跳转" : "Select an action to seek"}
                        </span>
                      </div>
                      <div className="action-sequence">
                        {currentCaption?.actions.map((a, i) => (
                          <button
                            key={a.action_id}
                            className={`sequence-row ${activeAction === i ? "is-current" : ""}`}
                            aria-current={
                              activeAction === i ? "true" : undefined
                            }
                            onClick={() => requestSeek(a.start_sec)}
                          >
                            <span className="sequence-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="clock">
                              {preciseTime(a.start_sec)}
                            </span>
                            <span>{zh ? a.caption_zh : a.caption_en}</span>
                            <Icon name="play" size={14} />
                          </button>
                        ))}
                        {!currentCaption && (
                          <p className="empty-copy">
                            {captionError
                              ? zh
                                ? "标注暂时不可用。"
                                : "Annotations are temporarily unavailable."
                              : zh
                                ? "载入动作序列…"
                                : "Loading the action sequence…"}
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                  {currentCaption ? (
                    <L4Annotations
                      key={selected.id}
                      caption={currentCaption}
                      time={time}
                      lang={lang}
                      onSeek={requestSeek}
                    />
                  ) : (
                    <aside
                      className="annotations annotation-loading"
                      role={captionError ? "alert" : "status"}
                    >
                      <span className="overline">L4 ANNOTATIONS</span>
                      <h3>
                        {captionError
                          ? zh
                            ? "无法载入标注"
                            : "Annotations could not load"
                          : zh
                            ? "正在载入标注…"
                            : "Loading annotations…"}
                      </h3>
                      {captionError && (
                        <button
                          className="button"
                          onClick={() => setCaptionRetry((n) => n + 1)}
                        >
                          {zh ? "重试" : "Try again"}
                        </button>
                      )}
                    </aside>
                  )}
                </div>
                <footer className="episode-footer">
                  <details>
                    <summary>
                      {zh ? "片段信息" : "Episode details"}
                      <Icon name="chevron" size={14} />
                    </summary>
                    <dl>
                      <dt>Clip ID</dt>
                      <dd>{selected.id}</dd>
                      <dt>{zh ? "标注格式" : "Annotation format"}</dt>
                      <dd>
                        L4 · Schema {currentCaption?.schema_version ?? "4.0"}
                      </dd>
                      <dt>{zh ? "位姿格式" : "Pose format"}</dt>
                      <dd>MANO · NPZ</dd>
                    </dl>
                  </details>
                  <div className="episode-downloads">
                    <button
                      className="text-button"
                      onClick={() => {
                        void copyLink();
                      }}
                    >
                      <Icon name="link" size={15} />
                      {zh ? "复制链接" : "Copy link"}
                    </button>
                    <a
                      href={`/api/l4/captions/${encodeURIComponent(selected.id)}?download=1`}
                      download
                    >
                      <Icon name="download" size={15} />
                      L4 JSON
                    </a>
                    <a
                      href={`/api/l4/poses/${encodeURIComponent(selected.id)}`}
                      download
                    >
                      <Icon name="download" size={15} />
                      {zh ? "手部位姿" : "Hand pose"}
                    </a>
                  </div>
                </footer>
              </>
            )}
          </div>
        </main>
      )}
      <div className={`toast ${notice ? "is-visible" : ""}`} role="status">
        {notice && (
          <>
            <Icon name="check" size={16} />
            {notice}
          </>
        )}
      </div>
    </div>
  );
}
