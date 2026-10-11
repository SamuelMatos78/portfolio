import { useLocale } from "../i18n/useLocale";
import type { CSSProperties } from "react";
import { useScenes } from "../runtime/useScenes";
import CommandButton from "../components/CommandButton";
import CatalogNotice from "../components/CatalogNotice";
import Icon from "../components/Icon";
import { projectPresentation } from "../projects/presentation";

export default function Projects() {
  const { catalog } = useScenes();
  const { t, text } = useLocale();
  return <main className="hall region tone--neutral">
    <header className="hall__heading"><p className="eyebrow">{t("domain")} / {t("projects")}</p><h1>{t("projectsTitle")}</h1><p>{t("projectsDescription")}</p></header>
    <CatalogNotice />
    <div className="category-grid">
      {catalog?.categories.map((category) => <CommandButton key={category.id} command={category.command} className={`category-card tone--${category.visual.tone}`} aria-label={`${t("enterHall")} ${text(category.label)}`} style={{ "--card-accent": category.visual.accent } as CSSProperties}>
        <span className="category-card__symbol" aria-hidden="true"><Icon name={category.visual.icon ?? projectPresentation(category.visual.tone).icon} /><span>{category.visual.symbol}</span></span>
        <span className="category-card__title">{text(category.label)}</span>
        <span className="category-card__description">{text(category.description)}</span>
        <span className="category-card__enter">{t("enterHall")} <Icon name="arrow-up-right" /></span>
      </CommandButton>)}
    </div>
  </main>;
}
