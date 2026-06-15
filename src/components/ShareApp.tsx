import { useState } from "react";
import { Share2, Apple, Link2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

// ⚠️ حدّث هذا الرابط بعد ظهور التطبيق في App Store برابطه المباشر
// مثال: https://apps.apple.com/app/idXXXXXXXXXX
const APP_STORE_URL = "https://apps.apple.com/app/gradetrackpro";
const WEB_URL = "https://gradetrackpro.com";

export default function ShareApp() {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);
  const [copiedWeb, setCopiedWeb] = useState(false);

  const isAr = lang === "ar";

  const shareText = isAr
    ? "جرّب تطبيق GradeTrackPro لإدارة درجات وحضور الطلاب بسهولة"
    : "Try GradeTrackPro to manage students' grades and attendance easily";

  const handleShare = async (url: string, kind: "store" | "web") => {
    const data = { title: "GradeTrackPro", text: shareText, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      /* user canceled */
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      if (kind === "store") {
        setCopiedStore(true);
        setTimeout(() => setCopiedStore(false), 2000);
      } else {
        setCopiedWeb(true);
        setTimeout(() => setCopiedWeb(false), 2000);
      }
      toast.success(isAr ? "تم نسخ الرابط" : "Link copied");
    } catch {
      toast.error(isAr ? "تعذّر النسخ" : "Copy failed");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="text-primary" size={20} />
        <h2 className="font-display text-lg font-bold">
          {isAr ? "مشاركة التطبيق" : "Share the app"}
        </h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        {isAr
          ? "شارك التطبيق مع زملائك بإحدى طريقتين: رابط متجر آبل لمستخدمي الآيفون، أو رابط الموقع الذي يعمل على أي جهاز."
          : "Share the app with colleagues in two ways: the Apple App Store link for iPhone users, or the website link that works on any device."}
      </p>

      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <Share2 size={16} />
        {isAr ? "مشاركة التطبيق" : "Share app"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir={isAr ? "rtl" : "ltr"}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">
                {isAr ? "اختر طريقة المشاركة" : "Choose how to share"}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="close"
              >
                <X size={18} />
              </button>
            </div>

            {/* App Store option */}
            <button
              onClick={() => handleShare(APP_STORE_URL, "store")}
              className="mb-3 flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-start transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                {copiedStore ? (
                  <Check size={20} className="text-success" />
                ) : (
                  <Apple size={20} className="text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display text-sm font-bold">
                  {isAr ? "مشاركة من متجر آبل" : "Share via App Store"}
                </h4>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {isAr
                    ? "يفتح صفحة التطبيق على App Store لتثبيته على iPhone وiPad."
                    : "Opens the app page on the App Store to install on iPhone & iPad."}
                </p>
                <p
                  className="mt-1 truncate text-[11px] text-primary"
                  dir="ltr"
                >
                  {APP_STORE_URL}
                </p>
              </div>
              <Copy size={14} className="mt-1 shrink-0 text-muted-foreground" />
            </button>

            {/* Web option */}
            <button
              onClick={() => handleShare(WEB_URL, "web")}
              className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-4 text-start transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                {copiedWeb ? (
                  <Check size={20} className="text-success" />
                ) : (
                  <Link2 size={20} className="text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display text-sm font-bold">
                  {isAr ? "مشاركة رابط الموقع" : "Share website link"}
                </h4>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {isAr
                    ? "يعمل على جميع الأجهزة (Android، ويندوز، ماك) عبر المتصفح."
                    : "Works on any device (Android, Windows, Mac) in the browser."}
                </p>
                <p
                  className="mt-1 truncate text-[11px] text-accent"
                  dir="ltr"
                >
                  {WEB_URL}
                </p>
              </div>
              <Copy size={14} className="mt-1 shrink-0 text-muted-foreground" />
            </button>

            <p className="mt-4 text-center text-[10px] text-muted-foreground">
              {isAr
                ? "سيتم استخدام نافذة المشاركة الأصلية في جهازك، وإلا سيُنسخ الرابط تلقائياً."
                : "Your device's native share sheet will be used, otherwise the link is copied automatically."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
