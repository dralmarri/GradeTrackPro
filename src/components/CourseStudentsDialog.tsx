import { AnimatePresence, motion } from "framer-motion";
import { Users, X, RefreshCw, PlusCircle } from "lucide-react";
import { useState } from "react";
import { Course } from "@/types/student";
import { ImportedStudent } from "@/lib/excel";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
import ManualDeleteStudents from "@/components/ManualDeleteStudents";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onAddStudents: (students: ImportedStudent[]) => void;
  onSyncStudents: (students: ImportedStudent[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateCourse: (updates: Partial<Omit<Course, "id" | "students">>) => void;
}

export default function CourseStudentsDialog({
  open,
  onOpenChange,
  course,
  onAddStudents,
  onSyncStudents,
  onDeleteStudent,
}: Props) {
  const { t, dir, lang } = useLanguage();
  const [pendingNames, setPendingNames] = useState<ImportedStudent[] | null>(null);

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/30 p-2 sm:p-4 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            dir={dir}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">{t("manageStudents")}</h3>
                  <p className="text-[11px] text-muted-foreground">{course.name}</p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <section className="rounded-xl border border-border bg-background/40 p-4">
                <h4 className="mb-1 font-display text-sm font-bold">{t("addRemoveStudents")}</h4>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  {t("currentStudentsCount")}: {course.students.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ExcelImport onImport={(students) => setPendingNames(students)} />
                  <ManualAddStudents onAdd={(names) => {
                    const existing = new Set(course.students.map((s) => s.name.trim()));
                    const fresh = names.filter((n) => !existing.has(n.trim()));
                    if (fresh.length) onAddStudents(fresh.map((name) => ({ name })));
                  }} />
                  <ManualDeleteStudents
                    students={course.students}
                    onDelete={(id) => onDeleteStudent(id)}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "إعدادات الدرجات القصوى، أوزان المكونات، تفعيل البونص، والمكونات المخصصة انتقلت إلى صفحة الإعدادات → \"إعدادات المقررات\"."
                  : "Max grades, component weights, bonus toggle, and custom components have moved to Settings → \"Course settings\"."}
              </section>
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                {t("close")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Import mode dialog */}
      <AnimatePresence>
        {pendingNames && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={() => setPendingNames(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              dir={dir}
              className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
            >
              <h3 className="mb-1 font-display text-base font-bold">
                {lang === "ar" ? "طريقة الاستيراد" : "Import mode"}
              </h3>
              <p className="mb-5 text-xs text-muted-foreground">
                {lang === "ar"
                  ? `تم العثور على ${pendingNames.length} اسم. كيف تريد المتابعة؟`
                  : `Found ${pendingNames.length} names. How do you want to proceed?`}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    const existing = new Set(course.students.map((s) => s.name.trim()));
                    const fresh = (pendingNames ?? []).filter((n) => !existing.has(n.name.trim()));
                    if (fresh.length) onAddStudents(fresh);
                    setPendingNames(null);
                  }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <PlusCircle size={18} className="shrink-0 text-primary" />
                  <div className="text-start">
                    <p className="font-semibold">{lang === "ar" ? "إضافة الجدد فقط" : "Add new only"}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "يضيف الأسماء الجديدة ويحتفظ بالموجودين" : "Adds new names, keeps existing students"}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onSyncStudents(pendingNames ?? []);
                    setPendingNames(null);
                  }}
                  className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium transition-colors hover:bg-destructive/10"
                >
                  <RefreshCw size={18} className="shrink-0 text-destructive" />
                  <div className="text-start">
                    <p className="font-semibold text-destructive">{lang === "ar" ? "تحديث القائمة" : "Sync roster"}</p>
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "يحذف من سحب المقرر ويضيف المستجدين" : "Removes dropped students, adds new ones"}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => setPendingNames(null)}
                  className="rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
