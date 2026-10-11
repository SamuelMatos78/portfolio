import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import type { ReactNode } from "react";
import homeData from "../data/home.json";
import { loadCatalog, prefetchProject } from "../projects/loader";
import type { ProjectCatalog } from "../types/project";
import { commandCompletions, createCommandBus, interpretCommand } from "./commands";
import { initialSceneState, scenePath, sceneReducer } from "./scenes";
import { SceneContext } from "./context";
import { baseDestinations, destinationLabels, destinationRegistry, resolveRegisteredDestination } from "./destinations";
import { useLocale } from "../i18n/useLocale";

const staticDestinations = baseDestinations(homeData.information.map((item) => item.id));
const staticLabels = destinationLabels(null, homeData.information);

export function SceneProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [state, dispatch] = useReducer(sceneReducer, initialSceneState);
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

  const bus = useMemo(() => createCommandBus({
    dispatch,
    resolveDestination: async (id) => {
      const fixed = resolveRegisteredDestination(id, staticDestinations, staticLabels);
      if (fixed) return fixed;
      const catalog = await getCatalog();
      return resolveRegisteredDestination(id, destinationRegistry(catalog, staticDestinations), destinationLabels(catalog, homeData.information));
    },
    listDestinations: async () => [...destinationRegistry(await getCatalog(), staticDestinations).keys()],
  }), [getCatalog]);

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

