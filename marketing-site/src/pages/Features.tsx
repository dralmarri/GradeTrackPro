import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { MarketingLayout } from "../components/MarketingLayout";
import { Icon, type IconName } from "../components/Icon";

export default function Features() {
  const { t } = useLanguage();
  const { featuresPage } = t;

  return (
    <MarketingLayout>
      <header className="pb-16 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">{featuresPage.title}</h1>
        <p className="text-lg text-[var(--text-muted)]">{featuresPage.subtitle}</p>
      </header>

      <div className="space-y-32 pb-32">
        {featuresPage.sections.map((s, i) => {
          const imageFirst = i % 2 === 0; // alternate image/text sides like the design
          return (
            <section key={s.title} className="px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
              <div className={imageFirst ? "md:order-2" : "md:order-1"}>
                <div className="w-12 h-12 bg-[var(--accent)]/10 text-[var(--accent)] rounded-xl flex items-center justify-center mb-6">
                  <Icon name={s.icon as IconName} size={24} />
                </div>
                <h2 className="text-3xl font-semibold mb-6">{s.title}</h2>
                <p className="text-[var(--text-muted)] leading-relaxed mb-6 text-lg">{s.desc}</p>

                {"flagship" in s && s.flagship && (
                  <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--accent)]/20 mb-8">
                    <p className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-2">{s.flagship.label}</p>
                    <p className="text-[var(--text-muted)] text-sm">{s.flagship.desc}</p>
                  </div>
                )}

                <ul className="space-y-3 text-[var(--text-muted)]">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[var(--accent)] mt-1 shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`${imageFirst ? "md:order-1" : "md:order-2"} bg-[var(--bg-elevated)] rounded-[2rem] p-8 aspect-[4/3] flex items-center justify-center`}>
                {/* Replace this block with a real product screenshot for this feature */}
                <div className="w-full h-full bg-[var(--bg-surface)] rounded-xl shadow-lg border border-[var(--border-color)]" />
              </div>
            </section>
          );
        })}
      </div>

      <section className="py-24 bg-[var(--accent)] text-white text-center px-6 -mx-6">
        <h2 className="text-4xl font-semibold mb-8">{featuresPage.cta.title}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/pricing" className="px-10 py-4 bg-white text-[var(--accent)] rounded-lg font-bold hover:opacity-90 transition-all">
            {featuresPage.cta.primary}
          </Link>
          <Link to="/contact" className="px-10 py-4 border border-white/30 rounded-lg font-bold hover:bg-white/10 transition-all">
            {featuresPage.cta.secondary}
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
