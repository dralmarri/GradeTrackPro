import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import appIcon from "@/assets/app-icon.png";
import { Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
    // Check hash for recovery token
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">جارٍ التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <img src={appIcon} alt="GradeTrackPro" className="mb-4 h-16 w-16 rounded-2xl shadow-lg" />
          <h1 className="font-display text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
          <p className="mt-1 text-sm text-muted-foreground">أدخل كلمة المرور الجديدة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">كلمة المرور الجديدة</label>
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">تأكيد كلمة المرور</label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            تغيير كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
}
