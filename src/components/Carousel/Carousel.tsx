import { useLocale } from "../../i18n/useLocale";
import { useEffect, useId, useState } from "react";
import type { FeaturedItem } from "../../types/content";
import CommandButton from "../CommandButton";
import Visual from "../Visual";
import "./Carousel.css";
import { useScenes } from "../../runtime/useScenes";
import Icon from "../Icon";
import { presentationStyle, projectPresentation } from "../../projects/presentation";

export default function Carousel({ items }: { items: FeaturedItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  const { state } = useScenes();
  const contentId = useId();
  const { t } = useLocale();
  const running = items.length > 1 && !paused && !hovered && !focused && !hidden && !state.terminalOpen;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotion = (event: MediaQueryListEvent) => setPaused(event.matches);
    const handleVisibility = () => setHidden(document.hidden);
    media.addEventListener("change", handleMotion);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { media.removeEventListener("change", handleMotion); document.removeEventListener("visibilitychange", handleVisibility); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((index) => (index + 1) % items.length), 5000);
    return () => window.clearTimeout(timer);
  }, [running, items.length, index]);
  if (!items.length) return <div className="carousel carousel--empty"><p>{t("emptyFeatured")}</p></div>;
  const current = items[index % items.length];
  const presentation = projectPresentation(current.tone ?? "neutral", current.presentation);
  return <section className="carousel" aria-roledescription={t("carousel")} aria-label={t("featured")}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <button className="carousel__arrow" type="button" onClick={() => setIndex((index) => (index - 1 + items.length) % items.length)} disabled={items.length < 2} aria-label={t("previousFeatured")}><Icon name="arrow-left" /></button>
    <article id={contentId} className={`carousel__item tone--${current.tone ?? "neutral"}`} style={presentationStyle(current.accent, presentation)} aria-live={running ? "off" : "polite"} aria-atomic="true">
      <div className="carousel__portrait" key={current.id}><Visual src={current.image} label={current.name} className="carousel__image" /><span className="project-emblem"><Icon name={presentation.icon} /></span></div>
      <div className="carousel__copy">
        <p className="eyebrow">{current.type}</p>
        <h2>{current.name}</h2><p>{current.description}</p>
        <CommandButton command={current.command} aria-label={`${t("explore")} ${current.name}`}>{t("explore")} <Icon name="arrow-up-right" /></CommandButton>
        <small className="carousel__position">{String(index % items.length + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</small>
      </div>
    </article>
    <button className="carousel__arrow" type="button" onClick={() => setIndex((index) => (index + 1) % items.length)} disabled={items.length < 2} aria-label={t("nextFeatured")}><Icon name="arrow-right" /></button>
    {items.length > 1 && <div className="carousel__controls"><span>{t(running ? "carouselAuto" : "carouselPaused")}</span>
      <button type="button" onClick={() => setPaused((paused) => !paused)} aria-controls={contentId} aria-label={t(paused ? "resumeCarousel" : "pauseCarousel")}>
        <Icon name={paused ? "play" : "pause"} /> {t(paused ? "resumeCarousel" : "pauseCarousel")}
      </button>
    </div>}
  </section>;
}
