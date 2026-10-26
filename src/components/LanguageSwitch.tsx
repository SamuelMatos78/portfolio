import { useLocale } from "../i18n/useLocale";

export default function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale();
  return <div className="language-switch" role="group" aria-label={t("language")}>
    <button className="pixel-font" type="button" lang="pt-BR" aria-label="Português" aria-pressed={locale === "pt"} onClick={() => setLocale("pt")}>PT</button>
    <button className="pixel-font" type="button" lang="en" aria-label="English" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
  </div>;
}
