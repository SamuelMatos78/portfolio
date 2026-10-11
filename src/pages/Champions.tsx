import { useLocale } from "../i18n/useLocale";
import { useScenes } from "../runtime/useScenes";
import ChampionCard from "../components/ChampionCard/ChampionCard";
import CatalogNotice from "../components/CatalogNotice";

export default function Champions({ categoryId = "champions" }: { categoryId?: string }) {
  const { catalog } = useScenes();
  const { t, text } = useLocale();
  const category = catalog?.categories.find((item) => item.id === categoryId);
  const projects = catalog?.projects.filter((item) => item.category === categoryId) ?? [];
  return <main className={`hall region tone--${category?.visual.tone ?? "neutral"}`}>
    <header className="hall__heading"><p className="eyebrow">{t("domain")} / {category ? text(category.label) : t("champions")}</p>
      <h1>{categoryId === "champions" ? t("championHall") : category ? text(category.label) : t("hall")}</h1>
      <p>{category ? text(category.description) : t("hallDescription")}</p>
      <span className="region__seal">{t(category?.visual.tone === "intimidating" ? "restrictedRegion" : category?.visual.tone === "humanitarian" ? "welcomeRegion" : "openRegion")}</span>
    </header>
    <CatalogNotice />
    <div className="champion-grid">{projects.map((champion) => <ChampionCard key={champion.id} champion={champion} />)}</div>
    {catalog && !projects.length && <p className="notice">{t("emptyHall")}</p>}
  </main>;
}
