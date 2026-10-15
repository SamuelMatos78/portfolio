import { useLocale } from "../i18n/useLocale";
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import Home from "../pages/Home";
import Projects from "../pages/Projects";
import Champions from "../pages/Champions";
import Information from "../pages/Information";
import ProjectExperience from "../projects/ProjectExperience";
import Updates from "../pages/Updates";
import CommandButton from "../components/CommandButton";
import LanguageSwitch from "../components/LanguageSwitch";
import PowerTerminal from "../components/PowerTerminal/PowerTerminal";
import { useScenes } from "./useScenes";
import { sceneKey, sceneTransition } from "./scenes";
import type { SceneLocation } from "./scenes";
import Icon from "../components/Icon";
import TerminalInvitation from "../components/TerminalInvitation";
import CommandLink from "../components/CommandLink";

function Scene({ location }: { location: SceneLocation }) {
  switch (location.id) {
    case "home": return <Home />;
    case "projects": return <Projects />;
    case "champions": return <Champions />;
    case "updates": return <Updates />;
    case "project-experience": return <ProjectExperience projectId={location.projectId} />;
    case "category": return <Champions categoryId={location.categoryId} />;
    case "information": return <Information id={location.informationId} />;
  }
}

export default function SceneManager() {
  const { state, feedback } = useScenes();
  const { t } = useLocale();
  const { currentScene, previousScene, terminalOpen } = state;
  const key = sceneKey(currentScene);
  const transition = sceneTransition(previousScene, currentScene);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lastScene = useRef(key);
  useEffect(() => {
    if (lastScene.current === key) return;
    lastScene.current = key;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!terminalOpen) sceneRef.current?.focus({ preventScroll: true });
  }, [key, terminalOpen]);

  return <>
    <div className={`domain-shell ${currentScene.id === "home" ? "domain-shell--home" : ""}`} inert={terminalOpen}>
      <header className="domain-header">
        <CommandLink command="tp home" className="domain-brand" aria-label={t("brandHome")}>Samuel Matos<span>/domain</span></CommandLink>
        <span className="domain-header__location">{t(currentScene.id)}</span>
        <nav aria-label={t("sceneControls")}><CommandButton command="back" disabled={!state.history.length}><Icon name="arrow-left" /> {t("back")}</CommandButton>
          {currentScene.id !== "home" && <CommandLink command="tp projects">{t("projects")}</CommandLink>}
        </nav>
        <LanguageSwitch />
      </header>
      <div key={key} ref={sceneRef} tabIndex={-1} className={`scene scene-entry--${transition.name}`} data-scene={currentScene.id}
        style={{ "--entrance-duration": `${transition.durationMs}ms` } as CSSProperties}>
        <Scene location={currentScene} />
      </div>
      <div className="terminal-dock">
      {currentScene.id === "home" && !terminalOpen && <TerminalInvitation />}
      <CommandButton id="terminal-trigger" className="terminal-trigger" command="open terminal" aria-label={t("openTerminal")} aria-haspopup="dialog" aria-expanded={terminalOpen} aria-controls={terminalOpen ? "power-terminal" : undefined}>
        <Icon name="terminal" /><span>{t("terminal")}</span><span aria-hidden="true">↓</span>
      </CommandButton>
      </div>
      <p className="domain-feedback" role="status" aria-live="polite">{feedback}</p>
    </div>
    <PowerTerminal />
  </>;
}
