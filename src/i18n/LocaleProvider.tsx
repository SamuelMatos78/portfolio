import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LocaleContext } from "./context";
import { localize, preferredLocale, translate } from "./messages";
import type { Locale } from "./types";

function initialLocale(): Locale {
  let saved: string | null = null;
  try { saved = localStorage.getItem("portfolio.locale"); } catch { /* Storage may be disabled. */ }
  return preferredLocale(saved, navigator.languages);
}

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
    document.title = `Samuel Matos | ${translate(locale, "domain")}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "metaDescription"));
    try { localStorage.setItem("portfolio.locale", locale); } catch { /* Switching still works without persistence. */ }
  }, [locale]);
  const value = useMemo(() => ({
    locale, setLocale,
    t: (key: Parameters<typeof translate>[1], params?: Record<string, string>) => translate(locale, key, params),
    text: (value: Parameters<typeof localize>[0]) => localize(value, locale),
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
