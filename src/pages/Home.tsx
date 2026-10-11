import homeData from "../data/home.json";
import type { HomeData } from "../types/content";
import Carousel from "../components/Carousel/Carousel";
import CommandButton from "../components/CommandButton";
import CatalogNotice from "../components/CatalogNotice";
import UpdatesFeed from "../components/UpdatesFeed";
import { useScenes } from "../runtime/useScenes";
import { useLocale } from "../i18n/useLocale";
import "./Home.css";
import Profile from "../profile/Profile";
import Icon from "../components/Icon";

const data: HomeData = homeData;

export default function Home() {
  const { catalog } = useScenes();
  const { t, text } = useLocale();
  const featured = catalog?.projects.filter((project) => project.featured).map((project) => ({
    id: project.id, name: project.identity.name,
    type: text(catalog.categories.find((category) => category.id === project.category)?.label) || project.category,
    description: text(project.identity.subtitle), image: project.hall.image,
    accent: project.hall.accent, command: project.command,
    tone: project.presentation?.tone ?? catalog.categories.find((category) => category.id === project.category)?.visual.tone,
    presentation: project.presentation,
  })) ?? [];

  return <main className="home world-lobby">
    <nav className="hero__navigation" aria-label={t("homeNav")}>
      {data.navigation.map((item) => <CommandButton key={item.command} command={item.command}>{text(item.label)}</CommandButton>)}
    </nav>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero__copy">
        <p className="eyebrow">{text(data.intro.eyebrow)}</p>
        <h1 id="home-title" className="hero__title">{text(data.intro.title)}</h1>
        <p className="hero__role">{text(data.intro.role)}</p>
        <p className="hero__description">{text(data.intro.description)}</p>
        <div className="hero__actions"><CommandButton command="tp champions" className="home-primary">{t("champions")} ↗</CommandButton><CommandButton command="tp updates">{t("updates")} →</CommandButton></div>
      </div>
      <section className="home-featured" aria-label={t("featured")}>
        <p className="eyebrow">{t("quickExplore")}</p><CatalogNotice /><Carousel items={featured} />
      </section>
    </section>
    <section className="home-paths" aria-labelledby="paths-title">
      <div className="home-section-intro"><h2 id="paths-title">{t("worldRegions")}</h2><p>{t("worldRegionsDescription")}</p></div>
      <div className="home-paths__grid">{data.paths.map((path) => {
        const residents = catalog?.projects.filter((project) => !path.category || project.category === path.category) ?? [];
        return <CommandButton key={path.command} command={path.command} className={`home-path tone--${path.tone ?? "neutral"}`} aria-label={text(path.label)}>
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
