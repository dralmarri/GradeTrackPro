import { Mail } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { MarketingLayout } from "../components/MarketingLayout";

export default function Contact() {
  const { t } = useLanguage();
  const { contactPage } = t;

  return (
    <MarketingLayout>
      {/* Contact section */}
      <section className="px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-16 mb-32">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight mb-6">{contactPage.title}</h1>
          <p className="text-lg text-[var(--text-muted)] mb-12">{contactPage.subtitle}</p>
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-[var(--accent)]/10 rounded-xl flex items-center justify-center text-[var(--accent)] shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h4 className="font-semibold mb-1">{contactPage.email.title}</h4>
              <p className="text-[var(--text-muted)]">{contactPage.email.value}</p>
            </div>
          </div>
        </div>

        {/*
          Wire this form up to your actual backend/email service
          (e.g. a Supabase edge function, Formspree, or mailto fallback).
        */}
        <form
          className="p-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-sm space-y-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">{contactPage.form.firstName}</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border-none focus:ring-2 focus:ring-[var(--accent)] outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">{contactPage.form.lastName}</label>
              <input type="text" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border-none focus:ring-2 focus:ring-[var(--accent)] outline-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium block">{contactPage.form.email}</label>
            <input type="email" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border-none focus:ring-2 focus:ring-[var(--accent)] outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium block">{contactPage.form.message}</label>
            <textarea rows={4} placeholder={contactPage.form.messagePh} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border-none focus:ring-2 focus:ring-[var(--accent)] outline-none" />
          </div>
          <button type="submit" className="w-full py-4 bg-[var(--accent)] text-white rounded-xl font-bold hover:opacity-90 transition-all">
            {contactPage.form.submit}
          </button>
        </form>
      </section>

      {/* Privacy policy — official text, verbatim */}
      <section id="privacy" className="px-6 max-w-4xl mx-auto border-t border-[var(--border-color)] pt-24 pb-24">
        <h2 className="text-3xl font-semibold mb-8">{contactPage.privacy.title}</h2>
        <div className="text-[var(--text-muted)] space-y-6">
          <p>{contactPage.privacy.updated}</p>
          {contactPage.privacy.sections.map((s) => (
            <div key={s.h}>
              <h3 className="text-xl font-semibold text-[var(--text-main)] pt-4 mb-2">{s.h}</h3>
              {"p" in s && s.p && <p>{s.p}</p>}
              {"ul" in s && s.ul && (
                <ul className="list-disc ps-6 space-y-2">
                  {s.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
