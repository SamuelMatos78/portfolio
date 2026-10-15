import { useId } from "react";
import { useLocale } from "../i18n/useLocale";
import Icon from "../components/Icon";
import rawStats from "../data/github-stats.json";
import { languageShares, validateGitHubStats } from "./stats";
import "./GitStats.css";

const colors = ["#d5b66f", "#77b9a1", "#88acd9", "#c58d73", "#b8a2d7", "#b5c5cf", "#d3cf80", "#a5c788", "#9fa9c9"];

export default function GitStats() {
  const { t, locale } = useLocale();
  const id = useId();
  let stats;
  try { stats = validateGitHubStats(rawStats); }
  catch { return <p className="notice" role="status">{t("gitStatsUnavailable")}</p>; }
  const languages = languageShares(stats);
  const number = new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en", { maximumFractionDigits: 1 });
  const date = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(stats.fetchedAt));
  return <section className="git-stats" aria-labelledby={id}>
    <header><div><p className="eyebrow">GITHUB / @{stats.username}</p><h2 id={id}>{t("gitStatsTitle")}</h2></div><a href={`https://github.com/${stats.username}`} target="_blank" rel="noopener noreferrer">{t("gitStatsSource")} <Icon name="arrow-up-right" /></a></header>
    <dl className="git-stats__metrics"><div><dt>{t(stats.excludesForks ? "gitStatsRepositories" : "gitStatsPublicRepositories")}</dt><dd>{number.format(stats.repositories)}</dd></div><div><dt>{t("gitStatsStars")}</dt><dd>{number.format(stats.stars)}</dd></div><div><dt>{t("gitStatsFollowers")}</dt><dd>{number.format(stats.followers)}</dd></div></dl>
    <h3>{t("gitStatsLanguages")}</h3>
    {languages.length ? <><div className="git-stats__bar" aria-hidden="true">{languages.map((item, index) => <span key={item.name} style={{ flexGrow: item.bytes, backgroundColor: colors[index % colors.length] }} />)}</div><ul className="git-stats__languages">{languages.map((item, index) => <li key={item.name}><span><i aria-hidden="true" style={{ backgroundColor: colors[index % colors.length] }} />{item.name}</span><strong>{number.format(item.percentage)}%</strong></li>)}</ul></> : <p>{t("gitStatsNoLanguages")}</p>}
    <footer><p>{t(stats.excludesForks ? "gitStatsScope" : "gitStatsScopeWithForks")}</p><span>{t("gitStatsUpdated")} <time dateTime={stats.fetchedAt}>{date}</time></span></footer>
  </section>;
}
