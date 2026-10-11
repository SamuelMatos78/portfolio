import { useLocale } from "../i18n/useLocale";
import UpdatesFeed from "../components/UpdatesFeed";
import CatalogNotice from "../components/CatalogNotice";

export default function Updates() {
  const { t } = useLocale();
  return <main className="hall region tone--neutral"><header className="hall__heading"><p className="eyebrow">{t("domain")} / {t("updates")}</p>
    <h1>{t("updatesTitle")}</h1><p>{t("updatesDescription")}</p></header><CatalogNotice /><UpdatesFeed /></main>;
}
