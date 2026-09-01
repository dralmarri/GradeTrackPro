import { Link } from "react-router-dom";
import { Twitter, Linkedin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border-color)] pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link to="/" className="text-xl font-semibold tracking-tight text-[var(--text-main)]">
              GradeTrack<span className="text-[var(--accent)]">Pro</span>
            </Link>
            <p className="text-[var(--text-muted)] mt-4 text-sm">{t.footer.tagline}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-6">{t.footer.product}</h4>
            <ul className="space-y-4 text-sm text-[var(--text-muted)]">
              <li><Link to="/features" className="hover-underline">{t.nav.features}</Link></li>
              <li><Link to="/pricing" className="hover-underline">{t.nav.pricing}</Link></li>
              <li><Link to="/contact#privacy" className="hover-underline">{t.footer.privacyPolicy}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6">{t.footer.support}</h4>
            <ul className="space-y-4 text-sm text-[var(--text-muted)]">
              <li><Link to="/contact" className="hover-underline">{t.footer.contactUs}</Link></li>
              <li><a href="#" className="hover-underline">{t.footer.documentation}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-6">{t.footer.connect}</h4>
            <div className="flex gap-4">
              <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-white transition-all">
                <Twitter size={16} />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--accent)] hover:text-white transition-all">
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] pt-10 flex flex-col md:flex-row justify-between items-center text-sm text-[var(--text-muted)]">
          <p>{t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
