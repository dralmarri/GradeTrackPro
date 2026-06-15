import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, UserCircle2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import {
  Info,
  Mail,
  Shield,
  HelpCircle,
  Award,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  UserX,
  Loader2,
  Languages,
  Moon,
  Sun,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "@/hooks/useTheme";
import ShareApp from "./ShareApp";


import {
  GradeTier,
  LetterTier,
  loadGradeTiers,
  saveGradeTiers,
  DEFAULT_TIERS,
  loadLetterTiers,
  saveLetterTiers,
  DEFAULT_LETTER_TIERS,
} from "@/lib/gradeTiers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
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

  const [letterTiers, setLetterTiers] = useState<LetterTier[]>(loadLetterTiers());
  const updateLetter = (i: number, patch: Partial<LetterTier>) => {
    const next = letterTiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    setLetterTiers(next);
    saveLetterTiers(next);
  };
  const addLetter = () => {
    const next = [...letterTiers, { letter: "?", minPercent: 50, color: "text-primary" }];
    setLetterTiers(next);
    saveLetterTiers(next);
  };
  const removeLetter = (i: number) => {
    if (letterTiers.length <= 1) return;
    const next = letterTiers.filter((_, idx) => idx !== i);
    setLetterTiers(next);
    saveLetterTiers(next);
  };
  const resetLetters = () => {
    setLetterTiers(DEFAULT_LETTER_TIERS);
    saveLetterTiers(DEFAULT_LETTER_TIERS);
    toast.success("تمت إعادة سلم الحروف إلى الافتراضي");
  };

  const [tiersOpen, setTiersOpen] = useState(false);
  const [lettersOpen, setLettersOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast.success("تم حذف حسابك وجميع بياناتك");
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "تعذّر حذف الحساب");
      setDeleting(false);
    }
  };




  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">

      {/* Language */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Languages className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">{t("languageSection")}</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{t("languageSectionDesc")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLang("ar")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              lang === "ar"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {t("arabic")}
          </button>
          <button
            onClick={() => setLang("en")}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              lang === "en"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {t("english")}
          </button>
        </div>
      </div>

      {/* Theme (Dark mode) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          {theme === "dark" ? <Moon className="text-primary" size={20} /> : <Sun className="text-primary" size={20} />}
          <h2 className="font-display text-lg font-bold">
            {lang === "ar" ? "مظهر التطبيق" : "Appearance"}
          </h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {lang === "ar"
            ? "اختر بين الوضع النهاري والوضع الليلي. يُحفظ تلقائياً."
            : "Choose between light and dark mode. Saved automatically."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTheme("light")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              theme === "light"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Sun size={16} />
            {t("lightMode")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              theme === "dark"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Moon size={16} />
            {t("darkMode")}
          </button>
        </div>
      </div>








      {/* Grade Tiers */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setTiersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-6 text-right"
        >
          <div className="flex items-center gap-2">
            <Award className="text-primary" size={20} />
            <h2 className="font-display text-lg font-bold">تقسيمات درجات المقرر</h2>
          </div>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${tiersOpen ? "rotate-180" : ""}`}
          />
        </button>
        {tiersOpen && (
        <div className="px-6 pb-6">
        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={resetTiers}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <RotateCcw size={12} />
            افتراضي
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          عدّل الإيموجي والحد الأدنى للنسبة المئوية (٠–١٠٠) لكل تقدير. يُحفظ تلقائياً.
        </p>


        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
            >
              <input
                type="text"
                value={t.emoji}
                onChange={(e) => updateTier(i, { emoji: e.target.value })}
                className="w-14 rounded-lg border border-input bg-background px-2 py-2 text-center text-xl outline-none focus:border-primary"
              />
              <input
                type="text"
                value={t.label || ""}
                placeholder="اسم التقدير"
                onChange={(e) => updateTier(i, { label: e.target.value })}
                className="w-28 flex-shrink-0 rounded-lg border border-input bg-background px-2 py-2 text-center text-xs outline-none focus:border-primary"
              />
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">من ≥</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t.minPercent}
                  onChange={(e) =>
                    updateTier(i, {
                      minPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>

              <button
                onClick={() => removeTier(i)}
                disabled={tiers.length <= 1}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addTier}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <Plus size={14} />
          إضافة تقدير
        </button>
        </div>
        )}
      </div>

      {/* Letter Grade Scale */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setLettersOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 p-6 text-right"
        >
          <div className="flex items-center gap-2">
            <Award className="text-primary" size={20} />
            <h2 className="font-display text-lg font-bold">سلم درجات الحروف</h2>
          </div>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform ${lettersOpen ? "rotate-180" : ""}`}
          />
        </button>
        {lettersOpen && (
        <div className="px-6 pb-6">
        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={resetLetters}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <RotateCcw size={12} />
            افتراضي
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          عدّل الحرف والحد الأدنى للنسبة المئوية حسب لائحة مؤسستك التعليمية (مثل A=95-100، B+=86-89...). يُحفظ تلقائياً.
        </p>


        <div className="space-y-2">
          {letterTiers.map((t, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-border bg-background p-2"
            >
              <input
                type="text"
                value={t.letter}
                onChange={(e) => updateLetter(i, { letter: e.target.value })}
                dir="ltr"
                className="w-14 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm font-bold outline-none focus:border-primary"
              />
              <div className="flex flex-1 items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">من ≥</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t.minPercent}
                  onChange={(e) =>
                    updateLetter(i, {
                      minPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm outline-none focus:border-primary"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <button
                onClick={() => removeLetter(i)}
                disabled={letterTiers.length <= 1}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addLetter}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
        >
          <Plus size={14} />
          إضافة حرف
        </button>
        </div>
        )}
      </div>




      {/* Danger zone: Delete account */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <UserX className="text-destructive" size={20} />
          <h2 className="font-display text-lg font-bold text-destructive">حذف الحساب</h2>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          سيؤدي حذف حسابك إلى إزالة جميع بياناتك نهائياً (المقررات، الطلاب، الحضور، الدرجات) من خوادمنا. لا يمكن التراجع عن هذه العملية.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition-all hover:brightness-110 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              حذف حسابي نهائياً
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف حسابك؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف حسابك وجميع بياناتك (المقررات، الطلاب، الدرجات، الحضور) بشكل دائم ولا يمكن استعادتها.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                نعم، احذف حسابي
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* About */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Info className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">حول التطبيق والخصوصية</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => navigate("/help")}
            className="flex items-center gap-2 rounded-xl border border-border bg-background p-4 text-right transition-colors hover:bg-muted"
          >
            <HelpCircle size={18} className="shrink-0 text-primary" />
            <div>
              <h3 className="font-display text-sm font-semibold">كيفية الاستخدام</h3>
              <p className="text-[11px] text-muted-foreground">دليل مختصر لميزات التطبيق</p>
            </div>
          </button>
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
              <p className="text-[11px] text-muted-foreground">أرسل اقتراحك أو ملاحظتك</p>
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

      {/* Account section (moved to bottom) */}
      <div>
        <h2 className="mb-2 px-1 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("accountSection")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <UserCircle2 className="text-primary" size={20} />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="truncate font-display text-sm font-bold text-foreground" dir="ltr">
                {user?.email || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">{t("signedInLabel")}</p>
            </div>
          </div>
          <button
            onClick={async () => { await signOut(); sonnerToast.success(t("signOut")); }}
            className="flex w-full items-center gap-3 border-t border-border p-4 text-right transition-colors hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <LogOut className="text-amber-600" size={20} />
            </div>
            <p className="font-display text-sm font-bold text-foreground">{t("signOut")}</p>
          </button>
        </div>
      </div>

    </div>
  );
}
