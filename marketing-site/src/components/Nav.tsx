import { useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

/**
 * Swap the <Link> `to` paths below for your app's actual marketing routes
 * if they differ from /, /features, /pricing, /contact.
 */
export function Nav() {
  const { t, lang, setLang } = useLanguage();
  const [dark, setDark] = useState(false);

  const toggleDark = () => {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
          GradeTrack<span className="text-[var(--accent)]">Pro</span>
        </Link>
        <div className="hidden lg:flex gap-6 text-sm font-medium text-[var(--text-muted)]">
          <Link to="/features" className="hover-underline hover:text-[var(--text-main)] transition-colors">{t.nav.features}</Link>
          <Link to="/pricing" className="hover-underline hover:text-[var(--text-main)] transition-colors">{t.nav.pricing}</Link>
          <Link to="/contact" className="hover-underline hover:text-[var(--text-main)] transition-colors">{t.nav.contact}</Link>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          aria-label="Switch language"
        >
          {lang === "en" ? "العربية" : "English"}
        </button>
        <button
          onClick={toggleDark}
          className="p-2 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Link
          to="/pricing"
          className="hidden sm:block px-5 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-all"
        >
          {t.nav.getStarted}
        </Link>
      </div>
    </nav>
  );
}
