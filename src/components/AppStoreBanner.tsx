import { useState, useEffect } from "react";
import { Apple, X } from "lucide-react";
import { isNativeApp } from "@/lib/platform";
import { useLanguage } from "@/hooks/useLanguage";

const APP_STORE_URL = "https://apps.apple.com/kw/app/gradetrackpro/id6778925716";
const DISMISS_KEY = "gtp-appstore-banner-dismissed";

export default function AppStoreBanner() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isNativeApp()) return;
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (isNativeApp() || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
    APP_STORE_URL,
  )}`;

  return (
    <div className="relative mx-auto mb-4 max-w-3xl rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm">
      <button
        onClick={handleDismiss}
        aria-label={ar ? "إغلاق" : "Dismiss"}
        className="absolute end-2 top-2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 pe-6">
          <div className="mb-1.5 flex items-center gap-2">
            <Apple size={20} className="shrink-0 text-foreground" />
            <h3 className="font-display text-sm font-bold text-foreground sm:text-base">
              {ar ? "متوفر الآن على App Store 🎉" : "Now available on the App Store 🎉"}
            </h3>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            {ar
              ? "حمّل GradeTrackPro كتطبيق أصلي على iPhone و iPad. امسح الكود من جوالك للانتقال مباشرة إلى المتجر."
              : "Get GradeTrackPro as a native app on iPhone and iPad. Scan the QR with your phone to open the App Store."}
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Apple size={14} />
            {ar ? "افتح App Store" : "Open App Store"}
          </a>
        </div>

        <div className="shrink-0 rounded-xl border border-border bg-white p-1.5 shadow-sm">
          <img
            src={qrUrl}
            alt={ar ? "رمز QR للتطبيق على App Store" : "App Store QR code"}
            width={96}
            height={96}
            loading="lazy"
            className="h-20 w-20 sm:h-24 sm:w-24"
          />
          <p className="mt-0.5 text-center text-[9px] font-semibold text-neutral-600">
            {ar ? "امسح بالموبايل" : "Scan with phone"}
          </p>
        </div>
      </div>
    </div>
  );
}
