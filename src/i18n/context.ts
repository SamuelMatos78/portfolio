import { createContext } from "react";
import type { Locale, LocalizedText } from "./types";
import type { MessageKey } from "./messages";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string>) => string;
  text: (value: LocalizedText | undefined) => string;
}
export const LocaleContext = createContext<LocaleContextValue | null>(null);
