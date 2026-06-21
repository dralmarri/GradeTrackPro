import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mbdeyvrp";

export default function ContactUs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tx = {
    title: lang === "ar" ? "تواصل معنا" : "Contact us",
    heading: lang === "ar" ? "نسعد بتواصلكم" : "We're glad to hear from you",
    intro:
      lang === "ar"
        ? "شاركنا اقتراحاتك أو ملاحظاتك حول تطبيق GradeTrackPro. نقرأ كل رسالة ونحرص على الرد في أقرب وقت."
        : "Share your suggestions or feedback about GradeTrackPro. We read every message and reply as soon as possible.",
    emailLabel: lang === "ar" ? "البريد الإلكتروني" : "Email",
    msgLabel: lang === "ar" ? "اقتراحك أو ملاحظتك" : "Your suggestion or note",
    msgPh: lang === "ar" ? "اكتب رسالتك هنا..." : "Write your message here...",
    send: lang === "ar" ? "إرسال" : "Send",
    sending: lang === "ar" ? "جاري الإرسال..." : "Sending...",
    needMsg: lang === "ar" ? "الرجاء كتابة رسالتك" : "Please write your message",
    success: lang === "ar" ? "تم إرسال اقتراحك بنجاح، شكراً لك!" : "Your message was sent. Thank you!",
    failed: lang === "ar" ? "تعذر الإرسال، حاول مرة أخرى" : "Failed to send. Please try again",
  };

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(tx.needMsg);
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
      toast.success(tx.success);
      setMessage("");
    } catch {
      toast.error(tx.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sky-200 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/90 backdrop-blur-sm safe-top">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <button
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className={dir === "rtl" ? "rotate-180" : ""} />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">{tx.title}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MessageCircle size={24} className="text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">{tx.heading}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{tx.intro}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="font-display text-sm font-semibold text-foreground">
                {tx.emailLabel}
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
                {tx.msgLabel}
              </label>
              <textarea
                id="message"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={tx.msgPh}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? tx.sending : tx.send}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
