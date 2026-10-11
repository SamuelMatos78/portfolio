import { useContext } from "react";
import { SceneContext } from "./context";

export function useScenes() {
  const context = useContext(SceneContext);
  if (!context) throw new Error("useScenes must be used inside SceneProvider.");
  return context;
}
