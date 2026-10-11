import { useLocale } from "../i18n/useLocale";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useScenes } from "../runtime/useScenes";
import type { ProjectManifest } from "../types/project";
import { loadProject } from "./loader";
import SectionRenderer from "./SectionRenderer";
import CatalogNotice from "../components/CatalogNotice";
import UpdatesFeed from "../components/UpdatesFeed";
import CommandButton from "../components/CommandButton";
import "./ProjectExperience.css";
import regionThemes from "../data/region-themes.json";
import Icon from "../components/Icon";
import { projectPresentation, presentationStyle } from "./presentation";
import { useSectionReveal } from "./useSectionReveal";

export default function ProjectExperience({ projectId }: { projectId: string }) {
  const { catalog } = useScenes();
  const { t, text } = useLocale();
  const project = catalog?.projects.find((item) => item.id === projectId);
  const categoryTone = catalog?.categories.find((item) => item.id === project?.category)?.visual.tone;
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sectionsRef = useSectionReveal(manifest);
  useEffect(() => {
    if (!project) return;
    let active = true;
    void loadProject(project).then((result) => { if (active) setManifest(result); })
      .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Experience unavailable."); });
    return () => { active = false; };
  }, [project, attempt]);

  const identity = manifest?.identity ?? project?.identity;
  const tone = project?.presentation?.tone ?? manifest?.visual.tone ?? categoryTone ?? "neutral";
  const theme = regionThemes[tone];
  const presentation = projectPresentation(tone, project?.presentation);
  const accent = project?.hall.accent ?? manifest?.visual.accent ?? theme.accent;
  const style = {
    ...presentationStyle(accent, presentation),
    "--experience-bg": manifest?.visual.background ?? theme.background,
    "--experience-fg": manifest?.visual.foreground ?? theme.foreground,
    "--experience-accent": accent,
    "--experience-font": manifest?.visual.font ?? theme.font,
    "--entrance-duration": `${manifest?.entrance.durationMs ?? 260}ms`,
    "--background-overlay": manifest?.visual.overlay ?? 0.3,
    "--background-opacity": manifest?.visual.backgroundOpacity ?? 1,
  } as CSSProperties;

  return <main className={`experience tone--${tone} atmosphere--${manifest?.visual.atmosphere ?? theme.atmosphere} ${manifest?.visual.vignette ? "experience--vignette" : ""}`} style={style}>
    {manifest?.visual.backgroundImage && <div className="experience__backdrop" aria-hidden="true">
      <img src={manifest.visual.backgroundImage} alt="" decoding="async" fetchPriority="high" style={{ objectFit: manifest.visual.backgroundSize, objectPosition: manifest.visual.backgroundPosition }} />
    </div>}
    <div className="experience__content">
      <header className="experience__identity"><div className="experience__crest"><span className="project-emblem"><Icon name={presentation.icon} /></span><p className="eyebrow">{t("domain")} / {project?.id ?? t("experience")}</p></div>
        <h1>{identity?.name ?? t("experience")}</h1><p>{text(identity?.subtitle)}</p>
        <span className="experience__status">{t("status")} / {identity ? text(identity.status) : t("unavailable")}</span>
        <div className="experience__routes"><CommandButton command="tp updates"><Icon name="scroll-text" /> {t("updates")} <Icon name="arrow-up-right" /></CommandButton><CommandButton command="back"><Icon name="arrow-left" /> {t("back")}</CommandButton></div>
      </header>
      <CatalogNotice />
      {error && <div className="notice" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(null); setAttempt((value) => value + 1); }}>{t("retryExperience")}</button></div>}
      {!manifest && !error && project && <p className="catalog-status" role="status">{t("arriving")}</p>}
      {manifest && <div ref={sectionsRef} className={`experience__sections scene-entry--${manifest.entrance.transition}`}>
        {manifest.sections.map((section, index) => <div className="experience__section-reveal" data-reveal="" key={index}><SectionRenderer section={section} /></div>)}
        <section className="experience-section experience__section-reveal" data-reveal=""><h2>{t("updates")}</h2><UpdatesFeed projectId={projectId} /></section>
      </div>}
    </div>
  </main>;
}
