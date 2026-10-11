import { createContext } from "react";
import type { ProjectCatalog } from "../types/project";
import type { CommandResult } from "./commands";
import type { SceneState } from "./scenes";

export interface SceneContextValue {
  state: SceneState;
  catalog: ProjectCatalog | null;
  catalogError: string | null;
  reloadCatalog: () => Promise<void>;
  executeCommand: (input: string) => Promise<CommandResult>;
  prefetchCommand: (input: string) => void;
  completions: string[];
  feedback: string;
}

export const SceneContext = createContext<SceneContextValue | null>(null);
