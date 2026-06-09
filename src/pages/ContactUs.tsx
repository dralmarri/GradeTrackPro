import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Formspree endpoint — replace YOUR_FORM_ID after creating the form
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mbdeyvrp";

export default function ContactUs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("الرجاء كتابة رسالتك");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, message }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("تم إرسال اقتراحك بنجاح، شكراً لك!");
      setMessage("");
    } catch {
      toast.error("تعذر الإرسال، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

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
              شاركنا اقتراحاتك أو ملاحظاتك حول تطبيق GradeTrackPro. نقرأ كل رسالة ونحرص على الرد في أقرب وقت.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="font-display text-sm font-semibold text-foreground">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="font-display text-sm font-semibold text-foreground">
                اقتراحك أو ملاحظتك
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? "جاري الإرسال..." : "إرسال"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
