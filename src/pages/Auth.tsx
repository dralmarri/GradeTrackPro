import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import appIcon from "@/assets/app-icon.png";
import { Mail, Lock, LogIn, UserPlus, Loader2, Languages, Eye, EyeOff, UserCircle } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-muted/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error(t("enterEmailPass")); return; }

    if (!isLogin && password !== confirmPassword) {
      toast.error(lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    if (!isLogin && password.length < 6) {
      toast.error(lang === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    setUnconfirmedEmail(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("signInSuccess"));
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Supabase returns success (no error) for a duplicate, already-confirmed
        // email too — it comes back with no session AND an identities array
        // that's empty, to avoid leaking which emails are registered. Surface
        // that case explicitly instead of a misleading "account created".
        if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
          toast.error(
            lang === "ar"
              ? "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول، أو استخدم «نسيت كلمة المرور؟» إذا لزم"
              : "This email is already registered. Try signing in, or use “Forgot password?”",
          );
        } else if (data.user && !data.session) {
          toast.success(
            lang === "ar"
              ? "تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد. إذا لم تجد الرسالة تحقق من مجلد Spam."
              : "Account created! Check your email to confirm. If not found, check your Spam folder.",
            { duration: 10000 },
          );
        } else {
          toast.success(lang === "ar" ? "تم إنشاء الحساب وتسجيل الدخول بنجاح" : "Account created and signed in successfully");
        }
      }
    } catch (err: any) {
      // Supabase's raw messages are English-only and don't distinguish "wrong
      // password" from "never confirmed the signup email" — the single most
      // common source of "it says I'm not registered" confusion, since the
      // account genuinely does exist (which is also why signUp then correctly
      // refuses it as a duplicate). Detect that specific case and offer to
      // resend the confirmation email right from the error.
      const code = err?.code as string | undefined;
      const msg = String(err?.message || "");
      if (code === "email_not_confirmed" || /email.*not.*confirm/i.test(msg)) {
        setUnconfirmedEmail(email);
        toast.error(
          lang === "ar"
            ? "هذا الحساب موجود لكن لم يُفعَّل بعد — تحقّق من بريدك الإلكتروني لتأكيد الحساب (أو أعد الإرسال أدناه)"
            : "This account exists but hasn't been confirmed yet — check your email for the confirmation link (or resend it below)",
          { duration: 8000 },
        );
      } else if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
        toast.error(
          lang === "ar"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Incorrect email or password",
        );
      } else if (code === "user_already_exists" || /already registered|already exists/i.test(msg)) {
        toast.error(
          lang === "ar"
            ? "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول بدلاً من إنشاء حساب"
            : "This email is already registered. Try signing in instead",
        );
      } else {
        toast.error(msg || (lang === "ar" ? "حدث خطأ" : "Something went wrong"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: unconfirmedEmail });
      if (error) throw error;
      toast.success(
        lang === "ar"
          ? "أُعيد إرسال رسالة التأكيد. تحقق من بريدك (ومجلد Spam)"
          : "Confirmation email resent. Check your inbox (and Spam folder)",
      );
    } catch (err: any) {
      toast.error(err?.message || (lang === "ar" ? "تعذّر إعادة الإرسال" : "Could not resend"));
    } finally {
      setResending(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      navigate("/");
    } catch (err: any) {
      toast.error(lang === "ar" ? "تعذّر الدخول كضيف" : "Guest sign-in failed");
    } finally {
      setGuestLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setPassword("");
    setConfirmPassword("");
    setUnconfirmedEmail(null);
  };

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-muted/40"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-4 overflow-y-auto">
        {/* Language toggle */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
          >
            <Languages size={14} />
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-3 h-16 w-16 rounded-3xl shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-foreground">GradeTrack<span className="text-primary">Pro</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("appTagline")}</p>
        </div>

        {/* Login / Signup toggle */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => { if (!isLogin) switchMode(); }}
            className={
              isLogin
                ? "rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors"
                : "rounded-full py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {t("signIn")}
          </button>
          <button
            type="button"
            onClick={() => { if (isLogin) switchMode(); }}
            className={
              !isLogin
                ? "rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors"
                : "rounded-full py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {t("signUp")}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-[32px] border border-border bg-card p-6 shadow-sm">
          <p className="text-center text-sm font-semibold text-foreground">
            {isLogin ? t("signInTitle") : t("signUpTitle")}
          </p>
          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password - signup only */}
          {!isLogin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                {lang === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pr-10 pl-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-destructive">
                  {lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-sm font-bold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            {isLogin ? t("signIn") : t("signUp")}
          </button>

          {!isLogin && (
            <p className="rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-center text-[12px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {t("confirmHint")}
            </p>
          )}

          {unconfirmedEmail && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2.5 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="mb-1.5 text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
                {lang === "ar"
                  ? "لم تُفعِّل هذا الحساب بعد."
                  : "This account hasn't been confirmed yet."}
              </p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="text-[12px] font-bold text-primary hover:underline disabled:opacity-50"
              >
                {resending
                  ? (lang === "ar" ? "جارٍ الإرسال…" : "Sending…")
                  : (lang === "ar" ? "إعادة إرسال رسالة التأكيد" : "Resend confirmation email")}
              </button>
            </div>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={async () => {
                if (!email) { toast.error(t("enterEmailFirst")); return; }
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

        {/* Guest login */}
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{lang === "ar" ? "أو" : "or"}</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {guestLoading ? <Loader2 size={16} className="animate-spin" /> : <UserCircle size={16} />}
            {lang === "ar" ? "الدخول كضيف" : "Continue as Guest"}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {lang === "ar" ? "البيانات محفوظة على الجهاز فقط ولا تُزامن" : "Data stays on device only, no sync"}
          </p>
        </div>

        {/* Footer links */}
        <div className="mt-6 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground hover:underline">
            {lang === "ar" ? "الشروط" : "Terms"}
          </Link>
          <span aria-hidden>•</span>
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            {lang === "ar" ? "الخصوصية" : "Privacy"}
          </Link>
          <span aria-hidden>•</span>
          <Link to="/contact" className="hover:text-foreground hover:underline">
            {lang === "ar" ? "تواصل معنا" : "Help"}
          </Link>
        </div>
      </div>
    </div>
  );
}
