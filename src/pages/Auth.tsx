import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import appIcon from "@/assets/app-icon.png";
import { Mail, Lock, LogIn, UserPlus, Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      toast.error("أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب! تحقق من بريدك الإلكتروني للتأكيد");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-4 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-foreground">GradeTrackPro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "سجّل دخولك للوصول لبياناتك" : "أنشئ حساباً جديداً"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">البريد الإلكتروني</label>
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
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">كلمة المرور</label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-input bg-background py-2.5 pr-10 pl-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
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
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isLogin ? "ليس لديك حساب؟" : "لديك حساب؟"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? "إنشاء حساب" : "تسجيل الدخول"}
          </button>
        </p>
      </div>
    </div>
  );
}
