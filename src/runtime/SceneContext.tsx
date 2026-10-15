import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import homeData from "../data/home.json";
import { loadCatalog, prefetchProject } from "../projects/loader";
import type { ProjectCatalog } from "../types/project";
import { commandCompletions, createCommandBus, interpretCommand } from "./commands";
import type { NavigationMode } from "./commands";
import { initialSceneState, sceneKey, scenePath, sceneReducer } from "./scenes";
import type { SceneAction } from "./scenes";
import { destinationFromURL, sceneURL } from "./links";
import { SceneContext } from "./context";
import { baseDestinations, destinationLabels, destinationRegistry, resolveRegisteredDestination } from "./destinations";
import { useLocale } from "../i18n/useLocale";

const staticDestinations = baseDestinations(homeData.information.map((item) => item.id));
const staticLabels = destinationLabels(null, homeData.information);

export function SceneProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [state, reducerDispatch] = useReducer(sceneReducer, initialSceneState);
  const stateRef = useRef(initialSceneState);
  const handledURL = useRef<string | undefined>(undefined);
  const localeRef = useRef(locale);
  useEffect(() => { localeRef.current = locale; }, [locale]);
  const dispatch = useCallback((action: SceneAction, mode: NavigationMode = "push") => {
    const next = sceneReducer(stateRef.current, action);
    if (sceneKey(next.currentScene) !== sceneKey(stateRef.current.currentScene) || (action.type === "navigate" && mode === "replace")) {
      const url = sceneURL(window.location.href, next.currentScene);
      if (url.href !== window.location.href) window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", url);
      handledURL.current = window.location.href;
    }
    stateRef.current = next;
    reducerDispatch(action);
  }, []);
  const path = scenePath(state.currentScene);
  const [catalog, setCatalog] = useState<ProjectCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const getCatalog = useCallback(async () => {
    const result = await loadCatalog();
    destinationRegistry(result, staticDestinations);
    setCatalog(result);
    setCatalogError(null);
    return result;
  }, []);
  const reloadCatalog = useCallback(async () => {
    try {
      await getCatalog();
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Catalog unavailable.");
    }
  }, [getCatalog]);
  useEffect(() => {
    let active = true;
    void loadCatalog().then((result) => {
      if (!active) return;
      destinationRegistry(result, staticDestinations);
      setCatalog(result);
    }).catch((error: unknown) => {
      if (active) setCatalogError(error instanceof Error ? error.message : "Catalog unavailable.");
    });
    return () => { active = false; };
  }, []);

  // The factory only stores callbacks; dispatch reads refs later, inside execute().
  // oxlint-disable-next-line react/refs
  const bus = useMemo(() => createCommandBus({
    dispatch: (action, mode) => dispatch(action, mode),
    resolveDestination: async (id) => {
      const fixed = resolveRegisteredDestination(id, staticDestinations, staticLabels);
      if (fixed) return fixed;
      const catalog = await getCatalog();
      return resolveRegisteredDestination(id, destinationRegistry(catalog, staticDestinations), destinationLabels(catalog, homeData.information));
    },
    listDestinations: async () => [...destinationRegistry(await getCatalog(), staticDestinations).keys()],
  }), [getCatalog, dispatch]);

  useEffect(() => {
    const followURL = () => {
      if (handledURL.current === window.location.href) return;
      handledURL.current = window.location.href;
      const destination = destinationFromURL(window.location);
      if (destination !== undefined) void bus.execute(`tp ${destination}`, localeRef.current, undefined, { history: "replace" }).then((result) => { if (result.kind === "error") setFeedback(result.message); });
    };
    followURL();
    window.addEventListener("popstate", followURL);
    window.addEventListener("hashchange", followURL);
    return () => { window.removeEventListener("popstate", followURL); window.removeEventListener("hashchange", followURL); };
  }, [bus]);

  const executeCommand = useCallback(async (input: string) => {
    const result = await bus.execute(input, locale, path);
    setFeedback(result.message);
    return result;
  }, [bus, locale, path]);

  const prefetchCommand = useCallback((input: string) => {
    // Prefetch is best effort; an unavailable asset must never block navigation.
    void (async () => {
      const command = interpretCommand(input);
      if (command.type !== "tp" || staticDestinations.has(command.destination)) return;
      const catalog = await getCatalog();
      const project = catalog.projects.find((item) => item.id === command.destination);
      if (project) await prefetchProject(project);
    })().catch(() => {});
  }, [getCatalog]);

  const completions = useMemo(() => commandCompletions([
    ...(catalog ? destinationRegistry(catalog, staticDestinations).keys() : staticDestinations.keys()),
    ...destinationLabels(catalog, homeData.information).keys(),
  ]), [catalog]);

  return <SceneContext.Provider value={{ state, catalog, catalogError, reloadCatalog, executeCommand, prefetchCommand, completions, feedback }}>
    {children}
  </SceneContext.Provider>;
}

