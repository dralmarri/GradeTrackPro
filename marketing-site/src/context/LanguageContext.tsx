import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import { content, type Lang } from "../data/content";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (typeof content)["en"];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Wrap the marketing site (or your whole app) with this provider.
 * Defaults to "en" — pass `initialLang="ar"` for an /ar route, or
 * wire it up to your app's existing i18n/locale state instead.
 */
export function LanguageProvider({ children, initialLang = "en" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const value = useMemo(() => ({ lang, setLang, t: content[lang] }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
