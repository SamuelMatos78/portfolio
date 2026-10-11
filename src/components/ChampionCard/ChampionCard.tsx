import { useLocale } from "../../i18n/useLocale";
import { useRef } from "react";
import type { ProjectSummary } from "../../types/project";
import { useScenes } from "../../runtime/useScenes";
import CommandButton from "../CommandButton";
import Visual from "../Visual";
import Icon from "../Icon";
import { projectPresentation, presentationStyle } from "../../projects/presentation";
import { useCardMotion } from "./useCardMotion";
import "./ChampionCard.css";

export default function ChampionCard({ champion }: { champion: ProjectSummary }) {
  const { prefetchCommand, catalog } = useScenes();
  const tone = champion.presentation?.tone ?? catalog?.categories.find((category) => category.id === champion.category)?.visual.tone ?? "neutral";
  const { t, text } = useLocale();
  const presentation = projectPresentation(tone, champion.presentation);
  const cardRef = useRef<HTMLElement>(null);
  const motion = useCardMotion(cardRef, champion.hall.hoverEffect !== "none");
  return <article className={`champion-card champion-card--${champion.hall.hoverEffect} tone--${tone}`}
    ref={cardRef} onPointerMove={motion.move} onPointerLeave={motion.reset}
    style={presentationStyle(champion.hall.accent, presentation)}
    onPointerEnter={() => prefetchCommand(champion.command)} onFocus={() => prefetchCommand(champion.command)}>
    <div className="champion-card__visual">
      <Visual src={champion.hall.image} label={champion.identity.name} />
      <span className="project-emblem champion-card__emblem"><Icon name={presentation.icon} /></span>
      <span className="champion-card__coordinates" aria-hidden="true">{champion.id}</span>
      <span className="champion-card__signal">{text(champion.hall.hoverText)}</span>
      <span className="champion-card__scan" aria-hidden="true" />
    </div>
    <div className="champion-card__body">
      <p className="eyebrow champion-card__status"><span aria-hidden="true" />{text(champion.identity.status)}</p>
      <h2>{champion.identity.name}</h2><p>{text(champion.identity.subtitle)}</p>
      <CommandButton command={champion.command} aria-label={`${t("explore")} ${champion.identity.name}`}>{t("explore")} <Icon name="arrow-up-right" /></CommandButton>
    </div>
  </article>;
}
