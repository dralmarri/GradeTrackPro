import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Course } from "@/types/student";
import {
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Info,
  Mail,
  Shield,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsPageProps {
  courses: Course[];
  onExportAll: () => void;
  onImportAll: (file: File) => Promise<void>;
  onDeleteAll: () => void;
}

export default function SettingsPage({
  courses,
  onExportAll,
  onImportAll,
  onDeleteAll,
}: SettingsPageProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await onImportAll(file);
      toast.success("تم استيراد البيانات بنجاح");
    } catch {
      toast.error("فشل في استيراد البيانات");
    }
    if (importRef.current) importRef.current.value = "";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      {/* Data Management */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Cloud className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">إدارة البيانات والنسخ الاحتياطي</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Export */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Upload size={16} />
              <h3 className="font-display text-sm font-semibold">تصدير البيانات</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              حفظ نسخة من جميع المقررات والطلاب والدرجات في ملف خارجي للتحميل.
            </p>
            <button
              onClick={() => {
                onExportAll();
                toast.success("تم تصدير النسخة الاحتياطية");
              }}
              disabled={courses.length === 0}
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50"
            >
              تنزيل النسخة (.json)
            </button>
          </div>

          {/* Import */}
          <div className="rounded-xl border border-dashed border-warning/50 bg-warning/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-warning">
              <Download size={16} />
              <h3 className="font-display text-sm font-semibold">استيراد البيانات</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              رفع ملف نسخة احتياطية سابقة. <strong className="text-destructive">سيتم استبدال البيانات الحالية بالكامل.</strong>
            </p>
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => importRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-warning/50 bg-background px-3 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/10"
            >
              انقر لرفع الملف
            </button>
          </div>

          {/* Google Drive */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Cloud size={16} />
              <h3 className="font-display text-sm font-semibold">Google Drive</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              مزامنة بياناتك عبر السحاب للوصول إليها من جميع أجهزتك. يتم الرفع تلقائياً عند التغيير.
            </p>
            <button
              disabled
              className="w-full rounded-lg bg-primary/80 px-3 py-2 text-sm font-semibold text-primary-foreground opacity-60"
            >
              ربط Google Drive (قريباً)
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <AlertTriangle size={16} />
            <h3 className="font-display text-sm font-semibold">منطقة الخطر</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            حذف جميع البيانات نهائياً من هذا الجهاز. <strong className="text-destructive">لا يمكن التراجع عن هذا الإجراء أبداً</strong>
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

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" />
              <h3 className="font-display text-sm font-semibold">سياسة الخصوصية والشروط</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              نحن نلتزم بحماية بياناتك. جميع البيانات تُخزن محلياً على جهازك ولا يتم مشاركتها مع أي طرف ثالث.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              <h3 className="font-display text-sm font-semibold">الدعم والتواصل</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              لأي استفسارات أو اقتراحات، يمكنك التواصل معنا عبر البريد الإلكتروني.
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          إصدار التطبيق: <strong>v1.0.0</strong>
        </p>
      </div>
    </div>
  );
}
