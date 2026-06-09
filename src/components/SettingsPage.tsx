import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Info,
  Mail,
  Shield,
  HelpCircle,
  Award,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import AddToHomeScreen from "./AddToHomeScreen";
import {
  GradeTier,
  loadGradeTiers,
  saveGradeTiers,
  DEFAULT_TIERS,
} from "@/lib/gradeTiers";
import { toast } from "sonner";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<GradeTier[]>(loadGradeTiers());

  const updateTier = (i: number, patch: Partial<GradeTier>) => {
    const next = tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setTiers(next);
    saveGradeTiers(next);
  };
  const addTier = () => {
    const next = [...tiers, { emoji: "⭐", minPercent: 50, color: "text-primary" }];
    setTiers(next);
    saveGradeTiers(next);
  };
  const removeTier = (i: number) => {
    if (tiers.length <= 1) return;
    const next = tiers.filter((_, idx) => idx !== i);
    setTiers(next);
    saveGradeTiers(next);
  };
  const resetTiers = () => {
    setTiers(DEFAULT_TIERS);
    saveGradeTiers(DEFAULT_TIERS);
    toast.success("تمت إعادة التقسيمات إلى الافتراضي");
  };


  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* How to use */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">كيفية الاستخدام</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          دليل مختصر يشرح خطوة بخطوة كل ميزات التطبيق: إنشاء المقررات، الحضور، الاختبارات، والتصدير.
        </p>
        <button
          onClick={() => navigate("/help")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110"
        >
          فتح دليل الاستخدام
        </button>
      </div>

      {/* Add to Home Screen */}
      <AddToHomeScreen />

      {/* About */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Info className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">حول التطبيق والخصوصية</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => navigate("/privacy")}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-4 text-right transition-colors hover:bg-muted"
          >
            <Shield size={18} className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-sm font-semibold">سياسة الخصوصية</h3>
              <p className="text-[11px] text-muted-foreground">كيف نحمي بياناتك</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/terms")}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-4 text-right transition-colors hover:bg-muted"
          >
            <Info size={18} className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-sm font-semibold">شروط الاستخدام</h3>
              <p className="text-[11px] text-muted-foreground">أحكام وشروط التطبيق</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/contact")}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-4 text-right transition-colors hover:bg-muted"
          >
            <Mail size={18} className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-sm font-semibold">تواصل معنا</h3>
              <p className="text-[11px] text-muted-foreground">dralmarri@gmail.com</p>
            </div>
          </button>
        </div>

        <div className="mt-4 space-y-1 text-center">
          <p className="text-xs text-muted-foreground" dir="ltr">
            Developed by <span className="font-semibold text-foreground">Prof. Ayedh Almarri</span>
          </p>
          <p className="text-[11px] text-muted-foreground" dir="ltr">
            Version <strong>v1.0.0</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
