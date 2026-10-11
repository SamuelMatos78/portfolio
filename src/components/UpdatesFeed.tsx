import { useScenes } from "../runtime/useScenes";
import { useLocale } from "../i18n/useLocale";
import CommandButton from "./CommandButton";
import "./UpdatesFeed.css";

export default function UpdatesFeed({ projectId, limit }: { projectId?: string; limit?: number }) {
  const { catalog } = useScenes();
  const { locale, t, text } = useLocale();
  const updates = (catalog?.updates ?? []).filter((item) => !projectId || item.projectId === projectId).slice(0, limit);
  return <div className="updates-feed">
    {!updates.length && <p className="updates-feed__empty">{t("emptyUpdates")}</p>}
    {updates.map((update) => <article className="update" key={update.id}>
      <time dateTime={update.date}>{new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${update.date}T12:00:00Z`))}</time>
      <h3>{text(update.title)}</h3><p>{text(update.body)}</p>
      {update.command && <CommandButton command={update.command}>{t("explore")} ↗</CommandButton>}
    </article>)}
  </div>;
}
