import { ChevronLeft, Mail, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ContactUs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">تواصل معنا</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8" dir="rtl">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle size={24} className="text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">نسعد بتواصلكم</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              إذا كان لديك أي استفسار أو اقتراح أو ملاحظة حول تطبيق GradeTrackPro، لا تتردد في التواصل معنا. نحرص على الرد في أقرب وقت ممكن.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Mail size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">البريد الإلكتروني</h3>
                <p className="text-xs text-muted-foreground">للاستفسارات والدعم الفني</p>
              </div>
            </div>
            <a
              href="mailto:dralmarri@gmail.com"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <Mail size={16} />
              dralmarri@gmail.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
