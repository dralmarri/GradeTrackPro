import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, BookOpen, GraduationCap, TrendingUp, ArrowRight, ShieldAlert } from "lucide-react";

interface Stats {
  total_users: number;
  total_courses: number;
  total_students: number;
  new_users_week: number;
  new_users_today: number;
  recent_users: Array<{ email: string; created_at: string; last_sign_in_at: string | null }>;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) {
        setUnauthorized(true);
      } else {
        setStats(data as unknown as Stats);
      }
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">غير مصرّح لك بالوصول</h1>
        <p className="text-muted-foreground">هذه الصفحة مخصصة للمشرف فقط.</p>
        <Button onClick={() => navigate("/")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة للرئيسية
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "إجمالي المستخدمين", value: stats.total_users, icon: Users, color: "text-blue-600" },
    { label: "إجمالي المقررات", value: stats.total_courses, icon: BookOpen, color: "text-purple-600" },
    { label: "إجمالي الطلاب", value: stats.total_students, icon: GraduationCap, color: "text-green-600" },
    { label: "مستخدمون جدد (7 أيام)", value: stats.new_users_week, icon: TrendingUp, color: "text-orange-600" },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 pb-safe pt-safe">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">لوحة المشرف</h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            رجوع
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <s.icon className={`mb-2 h-6 w-6 ${s.color}`} />
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">آخر المستخدمين المسجّلين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recent_users.length === 0 && (
                <p className="text-sm text-muted-foreground">لا يوجد مستخدمون بعد.</p>
              )}
              {stats.recent_users.map((u, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-border pb-2 text-sm last:border-0">
                  <div className="font-medium">{u.email}</div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>سجّل: {new Date(u.created_at).toLocaleDateString("ar")}</span>
                    <span>
                      آخر دخول: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("ar") : "لم يدخل"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
