import { createContext, useContext } from "react";
import type { Lang } from "./caption.ts";

// App-level language selection. The EN/中 toggle lives in the top bar (App);
// consumers (CaptionPanel, ActionTable) read the current language from here so
// it doesn't have to thread through TaxonomyBrowser → ScenarioPreview.
export const LangContext = createContext<Lang>("en");
export const useLang = () => useContext(LangContext);
