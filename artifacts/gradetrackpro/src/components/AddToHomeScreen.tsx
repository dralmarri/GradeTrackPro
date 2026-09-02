import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, ChevronDown, AlertTriangle, Share2, MoreVertical } from "lucide-react";
import { isNativeApp } from "@/lib/platform";

type Platform = "ios" | "android";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  return "ios";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </div>
      <div className="flex-1 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function PlatformSection({
  open,
  onToggle,
  title,
  icon,
  isUserDevice,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  icon: string;
  isUserDevice: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-4 text-right"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-display text-base font-bold">{title}</span>
          {isUserDevice && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
              جهازك
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-2 divide-y divide-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AddToHomeScreen() {
  const [device, setDevice] = useState<Platform>("ios");
  const [open, setOpen] = useState<Platform | null>(null);

  useEffect(() => {
    const d = detectPlatform();
    setDevice(d);
    setOpen(d);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Smartphone className="text-primary" size={20} />
        <h2 className="font-display text-lg font-bold">إضافة إلى الشاشة الرئيسية</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        استخدم GradeTrackPro كتطبيق أصلي — بدون الحاجة إلى متجر التطبيقات.
      </p>

      <div className="space-y-3">
        <PlatformSection
          open={open === "ios"}
          onToggle={() => setOpen(open === "ios" ? null : "ios")}
          title="iOS / iPhone"
          icon="📱"
          isUserDevice={device === "ios"}
        >
          <Step n={1}>
            افتح التطبيق في متصفح <strong>Safari</strong>
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-yellow-500/10 p-2 text-[12px] text-yellow-700 dark:text-yellow-400">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>يجب استخدام Safari — المتصفحات الأخرى لا تدعم تثبيت التطبيقات على iOS</span>
            </div>
          </Step>
          <Step n={2}>
            اضغط زر <strong>المشاركة</strong>{" "}
            <span className="mx-1 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 align-middle text-xs">
              <Share2 size={12} /> مشاركة
            </span>{" "}
            في أسفل Safari
          </Step>
          <Step n={3}>
            مرّر القائمة واضغط <strong>إضافة إلى الشاشة الرئيسية</strong>
          </Step>
          <Step n={4}>
            اضغط <strong>إضافة</strong> في الزاوية العلوية — تم!
          </Step>
          <div className="mt-3 rounded-lg bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
            سيظهر التطبيق على شاشتك الرئيسية ويفتح بملء الشاشة كتطبيق أصلي.
          </div>
        </PlatformSection>

        {!isNativeApp() && (
          <PlatformSection
            open={open === "android"}
            onToggle={() => setOpen(open === "android" ? null : "android")}
            title="Android"
            icon="🤖"
            isUserDevice={device === "android"}
          >
            <Step n={1}>
              افتح التطبيق في متصفح <strong>Chrome</strong>
            </Step>
            <Step n={2}>
              اضغط زر القائمة{" "}
              <span className="mx-1 inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 align-middle">
                <MoreVertical size={12} />
              </span>{" "}
              في الزاوية العلوية من Chrome
            </Step>
            <Step n={3}>
              اضغط <strong>إضافة إلى الشاشة الرئيسية</strong> من القائمة
            </Step>
            <Step n={4}>
              اضغط <strong>إضافة</strong> للتأكيد — تم!
            </Step>
            <div className="mt-3 rounded-lg bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
              سيظهر التطبيق على شاشتك الرئيسية ويفتح بملء الشاشة كتطبيق أصلي.
            </div>
          </PlatformSection>
        )}
      </div>
    </div>
  );
}
