import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import appIcon from "@/assets/app-icon.png";
import { Mail, Lock, LogIn, UserPlus, Loader2, Languages, Eye, EyeOff } from "lucide-react";
import AppStoreBanner from "@/components/AppStoreBanner";


export default function Auth() {
  const { user, loading } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t("enterEmailPass"));
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("Login error:", error.message, error.status, error);
          throw error;
        }
        toast.success(t("signInSuccess"));
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          console.error("Signup error:", error.message, error.status, error);
          throw error;
        }
        console.log("Signup result:", data);
        if (data.user && !data.session) {
          toast.success(
            "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد. إذا لم تجد الرسالة في صندوق الوارد فابحث عنها في مجلد الرسائل غير المرغوب فيها (Junk / Spam).",
            { duration: 10000 },
          );
        } else {
          toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح");
        }
      }
    } catch (err: any) {
      console.error("Auth error details:", JSON.stringify(err));
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-4 flex justify-end">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            <Languages size={14} />
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>
        <div className="mb-8 flex flex-col items-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-4 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-foreground">GradeTrackPro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? t("signInTitle") : t("signUpTitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("email")}</label>
            <div className="relative">
              <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-input bg-background py-2.5 pr-10 pl-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("password")}</label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background py-2.5 pr-10 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isLogin ? (
              <LogIn size={16} />
            ) : (
              <UserPlus size={16} />
            )}
            {isLogin ? t("signIn") : t("signUp")}
          </button>

          {!isLogin && (
            <p className="rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-center text-[12px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {t("confirmHint")}
            </p>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={async () => {
                if (!email) {
                  toast.error(t("enterEmailFirst"));
                  return;
                }
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) throw error;
                  toast.success(t("resetSent"));
                } catch (err: any) {
                  toast.error(err.message || "Error");
                }
              }}
              className="w-full text-center text-sm text-primary hover:underline"
            >
              {t("forgotPassword")}
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? t("noAccount") : t("haveAccount")}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? t("signUp") : t("signIn")}
          </button>
        </p>
      </div>
    </div>
  );
}
