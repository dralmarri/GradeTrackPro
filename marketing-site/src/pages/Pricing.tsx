import { Globe, Apple } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { MarketingLayout } from "../components/MarketingLayout";

export default function Pricing() {
  const { t } = useLanguage();
  const { pricingPage } = t;

  return (
    <MarketingLayout>
      <header className="pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6">{pricingPage.title}</h1>
        <p className="text-lg text-[var(--text-muted)] mb-12">{pricingPage.subtitle}</p>

        <div className="max-w-2xl mx-auto">
          <div className="p-10 bg-[var(--bg-surface)] border border-[var(--accent)]/20 rounded-3xl text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-inline-end-0 px-6 py-2 bg-[var(--accent)] text-white text-xs font-bold uppercase tracking-widest rounded-bl-2xl">
              {pricingPage.badge}
            </div>
            <h3 className="text-2xl font-bold mb-4">{pricingPage.cardTitle}</h3>
            <p className="text-[var(--text-muted)] mb-8">{pricingPage.cardDesc}</p>
            <a href="#" className="inline-block px-8 py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all">
              {pricingPage.cardCta}
            </a>
          </div>
        </div>
      </header>

      <section className="py-24 bg-[var(--bg-elevated)] px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-4">{pricingPage.downloadTitle}</h2>
          <p className="text-[var(--text-muted)] mb-12">{pricingPage.downloadSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="p-8 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] w-full max-w-sm">
              <Globe className="text-[var(--accent)] mb-6 mx-auto" size={36} />
              <h4 className="text-xl font-semibold mb-2">{pricingPage.web.title}</h4>
              <p className="text-sm text-[var(--text-muted)] mb-8">{pricingPage.web.desc}</p>
              <a href="#" className="inline-block px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-bold">{pricingPage.web.cta}</a>
            </div>
            <div className="p-8 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] w-full max-w-sm">
              <Apple className="text-[var(--accent)] mb-6 mx-auto" size={36} />
              <h4 className="text-xl font-semibold mb-2">{pricingPage.ios.title}</h4>
              <p className="text-sm text-[var(--text-muted)] mb-8">{pricingPage.ios.desc}</p>
              <a href="#" className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg font-bold">
                <Apple size={18} /> {pricingPage.ios.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold mb-12 text-center">{pricingPage.faqTitle}</h2>
        <div className="space-y-6">
          {pricingPage.faq.map((f) => (
            <div key={f.q} className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl">
              <h4 className="font-semibold mb-2">{f.q}</h4>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
