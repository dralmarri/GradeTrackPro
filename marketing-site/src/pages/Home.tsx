import { CheckCircle2, Calendar } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { MarketingLayout } from "../components/MarketingLayout";
import { Icon, type IconName } from "../components/Icon";

export default function Home() {
  const { t } = useLanguage();
  const { hero, featuresGrid, howItWorks, omrSpotlight, security } = t;

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="pb-20 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-bold tracking-widest uppercase text-[var(--accent)] mb-4 block">{hero.eyebrow}</span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight mb-6">{hero.title}</h1>
          <p className="text-lg text-[var(--text-muted)] mb-8 max-w-lg">{hero.subtitle}</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-all">{hero.cta}</a>
            <a href="#" className="px-8 py-3 border border-[var(--border-color)] rounded-lg font-medium hover:bg-[var(--bg-elevated)] transition-all">{hero.appStore}</a>
          </div>
        </div>
        {/* Replace with a real app screenshot */}
        <div className="rounded-3xl shadow-2xl bg-[var(--bg-elevated)] aspect-[4/3]" role="img" aria-label={hero.imgAlt} />
      </section>

      {/* Features grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">{featuresGrid.title}</h2>
          <p className="text-[var(--text-muted)] max-w-2xl mx-auto">{featuresGrid.subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuresGrid.items.map((f) => (
            <div key={f.title} className="p-8 bg-[var(--bg-elevated)] rounded-3xl hover:bg-[var(--bg-surface)] transition-colors">
              <Icon name={f.icon as IconName} className="text-[var(--accent)] mb-6" size={28} />
              <h3 className="text-xl font-medium mb-3">{f.title}</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-10 bg-[var(--bg-elevated)] rounded-3xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-semibold mb-4">{featuresGrid.planning.title}</h3>
            <p className="text-[var(--text-muted)] leading-relaxed mb-6">{featuresGrid.planning.desc}</p>
            <a href="#" className="inline-flex items-center gap-2 font-medium text-[var(--accent)] hover-underline">{featuresGrid.planning.link}</a>
          </div>
          <div className="aspect-video bg-[var(--bg-surface)] rounded-2xl shadow-inner flex items-center justify-center">
            <Calendar size={72} className="text-[var(--border-color)]" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-16 text-center">{howItWorks.title}</h2>
          <div className="space-y-12">
            {howItWorks.steps.map((s) => (
              <div key={s.tag} className="flex flex-col md:flex-row gap-8 md:items-start">
                <div className="md:w-1/4">
                  <span className="text-sm font-bold text-[var(--accent)] tracking-widest">{s.tag}</span>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="w-3 h-3 bg-[var(--accent)] rounded-full" />
                    <div className="h-px flex-grow bg-[var(--border-color)]" />
                  </div>
                </div>
                <div className="md:w-3/4 pt-2">
                  <h3 className="text-2xl font-medium mb-4">{s.title}</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OMR Spotlight */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight mb-6">{omrSpotlight.title}</h2>
            <p className="text-[var(--text-muted)] text-lg mb-8 leading-relaxed">{omrSpotlight.desc}</p>
            <ul className="space-y-4">
              {omrSpotlight.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-[var(--accent)]" /> {b}
                </li>
              ))}
            </ul>
          </div>
          {/* Replace with the real OMR-scanning photo */}
          <div className="rounded-3xl shadow-2xl bg-[var(--bg-elevated)] aspect-square" role="img" aria-label={omrSpotlight.imgAlt} />
        </div>
      </section>

      {/* Security */}
      <section className="py-24 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 mb-20">
            <div className="md:col-span-4">
              <h2 className="text-3xl font-semibold tracking-tight">{security.title}</h2>
            </div>
            <div className="md:col-span-8">
              <p className="text-lg text-[var(--text-muted)] leading-relaxed">{security.desc}</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {security.items.map((it) => (
              <div key={it.title} className="p-8 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)]">
                <Icon name={it.icon as IconName} className="text-[var(--accent)] mb-6" size={28} />
                <h3 className="text-xl font-medium mb-3">{it.title}</h3>
                <p className="text-[var(--text-muted)] text-sm">{it.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex items-center justify-center gap-3 text-sm font-medium text-[var(--text-muted)]">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]" />
            </span>
            {security.status}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
