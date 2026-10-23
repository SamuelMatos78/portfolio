import homeData from "../data/home.json";
import type { HomeData } from "../types/content";
import Carousel from "../components/Carousel/Carousel";
import CommandButton from "../components/CommandButton";
import CatalogNotice from "../components/CatalogNotice";
import UpdatesFeed from "../components/UpdatesFeed";
import { useScenes } from "../runtime/useScenes";
import { useLocale } from "../i18n/useLocale";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./Home.css";
import Profile from "../profile/Profile";
import Icon from "../components/Icon";
import CommandLink from "../components/CommandLink";
import type { ProjectSummary } from "../types/project";

const data: HomeData = homeData;
const regionColors = { intimidating: "#6f1420", neutral: "#a6c4d4", humanitarian: "#a6bc86" } as const;

type Point = { x: number; y: number };

function fracturePath(start: Point, angle: number, length: number, seed: number) {
  const points = [start];
  const bends = 8;
  const sideways = Math.min(22, Math.max(8, length * 0.025));

  for (let step = 1; step <= bends; step += 1) {
    const distance = length * step / bends;
    const jitter = step === bends ? 0 : Math.sin((step + seed * 1.7) * 2.35) * sideways;
    points.push({
      x: start.x + Math.cos(angle) * distance - Math.sin(angle) * jitter,
      y: start.y + Math.sin(angle) * distance + Math.cos(angle) * jitter,
    });
  }

  return {
    d: points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" "),
    points,
  };
}

function buildFractures(origin: Point, width: number, height: number) {
  const count = 9;
  const diagonal = Math.hypot(width, height);

  return Array.from({ length: count }, (_, index) => {
    const angle = index * Math.PI * 2 / count + 0.12;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const edgeX = dx > 0 ? (width - origin.x) / dx : dx < 0 ? -origin.x / dx : Infinity;
    const edgeY = dy > 0 ? (height - origin.y) / dy : dy < 0 ? -origin.y / dy : Infinity;
    const main = fracturePath(origin, angle, Math.min(edgeX, edgeY) + 60, index + 1);
    const branchStart = main.points[3 + index % 3];
    const branch = fracturePath(branchStart, angle + (index % 2 ? -0.78 : 0.78), diagonal * 0.18, index + 11);

    return { main: main.d, branch: branch.d, delay: index * 55 };
  });
}

export default function Home() {
  const { catalog } = useScenes();
  const { t, text } = useLocale();
  const [activeRegion, setActiveRegion] = useState<HomeData["paths"][number] | null>(null);
  const [regionOrigin, setRegionOrigin] = useState({ x: 0, y: 0 });
  const [observer, setObserver] = useState<ProjectSummary | null>(null);
  const observerIndex = useRef(0);
  const featured = catalog?.projects.filter((project) => project.featured).map((project) => ({
    id: project.id, name: project.identity.name,
    type: text(catalog.categories.find((category) => category.id === project.category)?.label) || project.category,
    description: text(project.identity.subtitle), image: project.hall.image,
    accent: project.hall.accent, command: project.command,
    tone: project.presentation?.tone ?? catalog.categories.find((category) => category.id === project.category)?.visual.tone,
    presentation: project.presentation,
  })) ?? [];

  function activateRegion(path: HomeData["paths"][number], element: HTMLButtonElement) {
    const bounds = element.getBoundingClientRect();
    setRegionOrigin({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
    setActiveRegion(path);

    if (path.category === "champions") {
      const generals = catalog?.projects.filter((project) => project.category === path.category && project.hall.image) ?? [];
      if (generals.length) {
        setObserver(generals[observerIndex.current % generals.length]);
        observerIndex.current += 1;
      }
    }
  }

  const themeStyle = {
    "--region-glow": activeRegion ? regionColors[activeRegion.tone as keyof typeof regionColors] ?? regionColors.neutral : regionColors.neutral,
    "--region-x": `${regionOrigin.x}px`,
    "--region-y": `${regionOrigin.y}px`,
  } as CSSProperties;
  const generalIsFree = activeRegion?.category === "champions";
  const fractureWidth = window.innerWidth;
  const fractureHeight = window.innerHeight;
  const fractures = generalIsFree ? buildFractures(regionOrigin, fractureWidth, fractureHeight) : [];

  return <main className={`home world-lobby${activeRegion ? " world-lobby--atmosphere" : ""}${generalIsFree ? " world-lobby--intimidating" : ""}${generalIsFree && observer ? " world-lobby--observed" : ""}`} style={themeStyle}>
    {generalIsFree && <svg key={`${regionOrigin.x}:${regionOrigin.y}`} className="home-fractures" viewBox={`0 0 ${fractureWidth} ${fractureHeight}`} preserveAspectRatio="none" aria-hidden="true">
      {fractures.map((fracture) => <g key={fracture.delay} style={{ "--fracture-delay": `${fracture.delay}ms` } as CSSProperties}>
        <path className="home-fractures__line home-fractures__line--glow" d={fracture.main} pathLength="1" />
        <path className="home-fractures__line" d={fracture.main} pathLength="1" />
        <path className="home-fractures__line home-fractures__line--branch home-fractures__line--glow" d={fracture.branch} pathLength="1" />
        <path className="home-fractures__line home-fractures__line--branch" d={fracture.branch} pathLength="1" />
      </g>)}
    </svg>}
    <div className="home-observer" aria-hidden="true">{observer?.hall.image && <img src={observer.hall.image} alt="" />}</div>
    <nav className="hero__navigation" aria-label={t("homeNav")}>
      {data.navigation.map((item) => <CommandLink key={item.command} command={item.command}>{text(item.label)}</CommandLink>)}
    </nav>
    <section className="hero" aria-labelledby="home-title">
      <section className="home-featured" aria-label={t("featured")}>
        <p className="eyebrow">{t("quickExplore")}</p><CatalogNotice /><Carousel items={featured} />
      </section>
      <div className="hero__copy">
        <p className="eyebrow">{text(data.intro.eyebrow)}</p>
        <h1 id="home-title" className="hero__title">{text(data.intro.title)}</h1>
        <p className="hero__role">{text(data.intro.role)}</p>
        <p className="hero__description">{text(data.intro.description)}</p>
        <div className="hero__actions"><CommandLink command="tp champions" className="home-primary">{t("champions")} ↗</CommandLink><CommandLink command="tp updates">{t("updates")} →</CommandLink></div>
      </div>
    </section>
    <section className="home-paths" aria-labelledby="paths-title">
      <div className="home-section-intro"><h2 id="paths-title">{t("worldRegions")}</h2><p>{t("worldRegionsDescription")}</p></div>
      <div className="home-paths__grid">{data.paths.map((path) => {
        const residents = catalog?.projects.filter((project) => !path.category || project.category === path.category) ?? [];
        return <CommandButton key={path.command} command={path.command} className={`home-path tone--${path.tone ?? "neutral"}`} aria-label={text(path.label)}
          onPointerEnter={(event) => activateRegion(path, event.currentTarget)} onPointerLeave={() => setActiveRegion(null)}
          onFocus={(event) => activateRegion(path, event.currentTarget)} onBlur={() => setActiveRegion(null)}>
          <span className="home-path__symbol" aria-hidden="true">{path.icon ? <Icon name={path.icon} /> : path.symbol}</span><span className="home-path__title">{text(path.label)}</span><span className="home-path__description">{text(path.description)}</span>
          <span className="home-path__residents">{residents.map((item) => item.identity.name).join(" · ") || "—"}</span><Icon name="arrow-up-right" className="home-path__arrow" />
        </CommandButton>;
      })}</div>
    </section>
    <Profile />
    <section className="home-updates" aria-labelledby="updates-title">
      <div className="section-heading"><div><p className="eyebrow">{t("domain")}</p><h2 id="updates-title">{t("updatesTitle")}</h2></div><CommandButton command="tp updates">{t("updates")} ↗</CommandButton></div>
      <UpdatesFeed limit={3} />
    </section>
    <p className="home__hint">{t("homeHint")} <code>{t("commandExample")}</code>.</p>
  </main>;
}
