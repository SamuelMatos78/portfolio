import { useLocale } from "../i18n/useLocale";
import { useScenes } from "../runtime/useScenes";

export default function CatalogNotice() {
  const { catalog, catalogError, reloadCatalog } = useScenes();
  const { t } = useLocale();
  if (catalogError) return <div className="notice" role="alert">
    <p>{t("catalogUnavailable")}: {catalogError}</p>
    <button type="button" onClick={() => void reloadCatalog()}>{t("retryCatalog")}</button>
  </div>;
  if (!catalog) return <p className="catalog-status" role="status">{t("discovering")}</p>;
  return null;
}
