import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Info,
  Mail,
  Shield,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import AddToHomeScreen from "./AddToHomeScreen";

interface SettingsPageProps {
  onDeleteAll: () => void;
}

export default function SettingsPage({ onDeleteAll }: SettingsPageProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

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


      {/* Danger Zone */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="text-destructive" size={20} />
          <h2 className="font-display text-lg font-bold">إدارة البيانات</h2>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <AlertTriangle size={16} />
            <h3 className="font-display text-sm font-semibold">منطقة الخطر</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            حذف جميع البيانات نهائياً. <strong className="text-destructive">لا يمكن التراجع عن هذا الإجراء أبداً</strong>
          </p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-destructive/30 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              حذف الكل نهائياً
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onDeleteAll();
                  setConfirmDelete(false);
                  toast.success("تم حذف جميع البيانات");
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>
      </div>

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