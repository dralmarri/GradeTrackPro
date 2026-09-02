import { Home, BarChart3, Settings, ScanLine, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

// "home" always means the course list; "attendance" is its own tab now
// (previously overloaded onto "home" while inside a course).
export type BottomNavKey = "home" | "attendance" | "assess" | "status" | "settings";

interface BottomNavProps {
  active: BottomNavKey;
  hasActiveCourse: boolean;
  onHome: () => void;
  onCourseTab: (tab: "attendance" | "assess" | "status") => void;
  onSettings: () => void;
}

export default function BottomNav({
  active,
  hasActiveCourse,
  onHome,
  onCourseTab,
  onSettings,
}: BottomNavProps) {
  const { t, lang } = useLanguage();

  const requireCourse = (tab: "attendance" | "assess" | "status") => {
    if (!hasActiveCourse) {
      toast.error(lang === "ar" ? "اختر مادة أولاً" : "Open a course first");
      return;
    }
    onCourseTab(tab);
  };

  const items: { key: BottomNavKey; label: string; icon: typeof Home; onClick: () => void }[] = [
    { key: "home", label: lang === "ar" ? "الرئيسية" : "Home", icon: Home, onClick: onHome },
    { key: "attendance", label: lang === "ar" ? "الحضور" : "Attendance", icon: UserCheck, onClick: () => requireCourse("attendance") },
    { key: "assess", label: lang === "ar" ? "التقييم" : "Assessment", icon: ScanLine, onClick: () => requireCourse("assess") },
    { key: "status", label: t("tabStatus"), icon: BarChart3, onClick: () => requireCourse("status") },
    { key: "settings", label: t("settings"), icon: Settings, onClick: onSettings },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-200 dark:border-sky-800 bg-sky-100/95 dark:bg-sky-950/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl items-stretch justify-between px-1">
        {items.map((it) => {
          const isActive = active === it.key;
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={20} className={cn(isActive && "scale-110 transition-transform")} />
              <span className="leading-none">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
