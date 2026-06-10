import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { translations, Lang, TKey } from "@/lib/translations";

interface LanguageContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "gtp-lang";

function applyToDocument(lang: Lang) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    return stored === "ar" || stored === "en" ? stored : "ar";
  });

  useEffect(() => {
    applyToDocument(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === "ar" ? "en" : "ar")), []);
  const t = useCallback((key: TKey) => translations[lang][key] ?? translations.ar[key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
