export type SceneLocation =
  | { id: "home" | "projects" | "champions" | "updates" }
  | { id: "project-experience"; projectId: string }
  | { id: "category"; categoryId: string }
  | { id: "information"; informationId: string };

export interface SceneState {
  currentScene: SceneLocation;
  previousScene: SceneLocation | null;
  selectedProject: string | null;
  terminalOpen: boolean;
  history: SceneLocation[];
}

export type SceneAction =
  | { type: "navigate"; destination: SceneLocation }
  | { type: "back" }
  | { type: "terminal"; open: boolean };

export const initialSceneState: SceneState = {
  currentScene: { id: "home" },
  previousScene: null,
  selectedProject: null,
  terminalOpen: false,
  history: [],
};

export function sceneKey(scene: SceneLocation): string {
  switch (scene.id) {
    case "project-experience": return `project:${scene.projectId}`;
    case "category": return `category:${scene.categoryId}`;
    case "information": return `information:${scene.informationId}`;
    default: return scene.id;
  }
}

export function scenePath(scene: SceneLocation): string {
  switch (scene.id) {
    case "project-experience": return `~/${scene.projectId}`;
    case "category": return `~/${scene.categoryId}`;
    case "information": return `~/${scene.informationId}`;
    default: return `~/${scene.id}`;
  }
}

export function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  if (action.type === "terminal") return { ...state, terminalOpen: action.open };
  const destination = action.type === "back" ? state.history.at(-1) : action.destination;
  if (!destination || sceneKey(destination) === sceneKey(state.currentScene)) return state;
  return {
    ...state,
    currentScene: destination,
    previousScene: state.currentScene,
    selectedProject: destination.id === "project-experience" ? destination.projectId : null,
    history: action.type === "back"
      ? state.history.slice(0, -1)
      : [...state.history, state.currentScene].slice(-100),
  };
}

// Origin/destination-specific policies can be added here without changing scenes.
export function sceneTransition(origin: SceneLocation | null, destination: SceneLocation) {
  return {
    name: origin?.id === "project-experience" || destination.id === "project-experience" ? "rise" : "fade",
    durationMs: 260,
  };
}
