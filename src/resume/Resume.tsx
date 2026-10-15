import { useMemo } from "react";
import { useLocale } from "../i18n/useLocale";
import { useScenes } from "../runtime/useScenes";
import { readProfile } from "../profile/data";
import ProfilePortrait from "../profile/ProfilePortrait";
import CommandButton from "../components/CommandButton";
import Icon from "../components/Icon";
import CatalogNotice from "../components/CatalogNotice";
import GitStats from "../github/GitStats";
import SectionRenderer from "../projects/SectionRenderer";
import type { ProjectSection } from "../types/project";
import type { ProfileCard } from "../profile/types";
import type { LocalizedText } from "../i18n/types";
import resumeData from "../data/resume.json";
import information from "../data/information.json";
import home from "../data/home.json";
import { validateInformation } from "../runtime/information";
import { validateResume } from "./validation";
import "./Resume.css";

function ResumeSection({ section, index }: { section: ProjectSection; index: number }) {
  const { text } = useLocale();
  if (section.type !== "text" && section.type !== "stats") return <div className="resume-section content-sections"><SectionRenderer section={section} /></div>;
  return <section className={`resume-section resume-section--${section.type}`}>
    <header className="resume-section__heading"><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h2>{text(section.title)}</h2></header>
    {section.type === "text" ? <p className="resume-section__text">{text(section.body)}</p> : <ol className="resume-timeline">
      {section.items.map((item, index) => <li key={index}><span className="resume-timeline__mark" aria-hidden="true" /><div className="resume-timeline__entry"><div><h3>{text(item.label)}</h3><span className="resume-timeline__period">{text(item.value)}</span></div>{item.note && <p>{text(item.note)}</p>}</div></li>)}
    </ol>}
  </section>;
}

export default function Resume({ title, id }: { title: LocalizedText; id: string }) {
  const { locale, text, t } = useLocale();
  const { catalog } = useScenes();
  const result = useMemo(() => {
    try {
      const { profile, error } = readProfile();
      if (!profile) throw new Error(error ?? "Invalid profile.");
      return { profile, resume: validateResume(resumeData), sections: validateInformation(information, home.information.map((item) => item.id))[id] ?? [], error: null };
    } catch (error) { return { error: error instanceof Error ? error.message : "Invalid résumé data." }; }
  }, [id]);
  if (!result.profile || !result.resume || !result.sections) return <main className="hall"><p role="alert" className="notice">{t("resumeUnavailable")}: {result.error}</p></main>;
  const { profile, resume, sections } = result;
  const contacts = profile.cards.filter((card): card is Extract<ProfileCard, { type: "link" }> => card.type === "link" && card.published && !!card.href && resume.contactCards.includes(card.id));
  const projects = resume.selectedProjects.map((id) => catalog?.projects.find((project) => project.id === id)).filter((project) => !!project);
  const filename = resume.documents[locale];
  const firstName = profile.name.split(" ")[0];
  const remainingName = profile.name.slice(firstName.length).trim();
  return <main className="resume-page" aria-labelledby="resume-title">
    <div className="resume-topline"><p className="eyebrow">{t("domain")} / {text(title)}</p><span>{text(resume.eyebrow)}</span></div>
    <header className="resume-hero">
      <div className="resume-hero__copy"><p className="resume-role">{text(resume.role)}</p><h1 id="resume-title"><span>{firstName}</span><span>{remainingName}</span></h1>
        <p className="resume-statement">{text(resume.statement)}</p><p className="resume-summary">{text(profile.summary)}</p>
        <ul className="resume-focus" aria-label={t("resumeDetails")}>{resume.focus.map((focus, index) => <li key={index}>{text(focus)}</li>)}</ul>
        <div className="resume-actions"><a className="resume-download" href={`${import.meta.env.BASE_URL}resume/${filename}`} download={filename}><Icon name="scroll-text" /><span>{t("downloadResume")}<small>{t("resumeFormat")}</small></span><span aria-hidden="true">↓</span></a><CommandButton command="tp home">{t("resumeBack")} <Icon name="arrow-up-right" /></CommandButton></div>
      </div>
      {profile.photo && <div className="resume-hero__portrait"><ProfilePortrait photo={profile.photo} name={profile.name} /><span className="resume-hero__signature" aria-hidden="true">Samuel Matos<span>/domain</span></span></div>}
    </header>
    <div className="resume-layout"><div className="resume-main">{sections.map((section, index) => <ResumeSection section={section} index={index} key={index} />)}
      <GitStats />
      {!!resume.selectedProjects.length && <section className="resume-section resume-projects"><header className="resume-section__heading"><Icon name="layers" /><h2>{t("resumeProjects")}</h2></header><p>{t("resumeProjectsDescription")}</p><CatalogNotice /><div className="resume-projects__grid">{projects.map((project) => <CommandButton key={project.id} command={project.command} className="resume-project" aria-label={`${t("resumeExplore")}: ${project.identity.name}`}><span>{project.identity.name}</span><small>{text(project.identity.subtitle)}</small><Icon name="arrow-up-right" /></CommandButton>)}</div></section>}
    </div><aside className="resume-sidebar" aria-label={t("resumeDetails")}><p className="eyebrow">{t("resumeDetails")}</p><dl>{profile.details.map((detail, index) => <div key={index}><dt>{text(detail.label)}</dt><dd>{text(detail.value)}</dd></div>)}</dl><div className="resume-contacts">{contacts.map((contact) => <a href={contact.href} key={contact.id} target="_blank" rel="noopener noreferrer">{text(contact.title)} <Icon name="arrow-up-right" /></a>)}</div><a className="resume-sidebar__download" href={`${import.meta.env.BASE_URL}resume/${filename}`} download={filename}>{t("downloadResume")} <Icon name="scroll-text" /></a></aside></div>
  </main>;
}
