import { AnimatePresence, motion } from "framer-motion";
import { Users, X, RefreshCw, PlusCircle, Copy, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Course } from "@/types/student";
import { ImportedStudent, normalizeName, studentsMatch, findDuplicateGroups } from "@/lib/excel";
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
  onRemoveDuplicates: (idsToDelete: string[]) => void;
  onUpdateCourse: (updates: Partial<Omit<Course, "id" | "students">>) => void;
}

export default function CourseStudentsDialog({
  open,
  onOpenChange,
  course,
  onAddStudents,
  onSyncStudents,
  onDeleteStudent,
  onRemoveDuplicates,
}: Props) {
  const { t, dir, lang } = useLanguage();
  const [pendingNames, setPendingNames] = useState<ImportedStudent[] | null>(null);
  const [reviewingDuplicates, setReviewingDuplicates] = useState(false);
  const duplicateGroups = useMemo(() => findDuplicateGroups(course.students), [course.students]);

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
                    const existing = new Set(course.students.map((s) => normalizeName(s.name)));
                    const fresh = names.filter((n) => !existing.has(normalizeName(n)));
                    if (fresh.length) onAddStudents(fresh.map((name) => ({ name })));
                  }} />
                  <ManualDeleteStudents
                    students={course.students}
                    onDelete={(id) => onDeleteStudent(id)}
                  />
                  {duplicateGroups.length > 0 && (
                    <button
                      onClick={() => setReviewingDuplicates(true)}
                      className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2.5 font-display text-sm font-semibold text-destructive transition-all hover:bg-destructive/10"
                    >
                      <Copy size={18} />
                      {lang === "ar" ? `مراجعة التكرارات (${duplicateGroups.length})` : `Review duplicates (${duplicateGroups.length})`}
                    </button>
                  )}
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
                    const fresh = (pendingNames ?? []).filter(
                      (n) => !course.students.some((s) => studentsMatch(n, { name: s.name, civilId: s.studentNumber })),
                    );
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

      {/* Duplicate review dialog — shows exactly what would be removed
          before anything is deleted, so the matching logic can be checked
          by eye first. */}
      <AnimatePresence>
        {reviewingDuplicates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={() => setReviewingDuplicates(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              dir={dir}
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-card p-6 shadow-2xl"
            >
              <h3 className="mb-1 font-display text-base font-bold text-destructive">
                {lang === "ar" ? "مراجعة التكرارات" : "Review duplicates"}
              </h3>
              <p className="mb-4 text-xs text-muted-foreground">
                {lang === "ar"
                  ? `تم العثور على ${duplicateGroups.length} اسم مكرر (نفس الرقم المدني أو نفس الاسم تماماً). سيُحتفظ بالسجل الأكثر اكتمالاً من كل مجموعة (الذي يحمل درجات/حضور مُدخلة) ويُحذف الباقي.`
                  : `Found ${duplicateGroups.length} duplicated name(s) (same civil ID, or the exact same name). The most complete record in each group (the one with entered grades/attendance) is kept, the rest are removed.`}
              </p>
              <div className="flex-1 space-y-3 overflow-y-auto">
                {duplicateGroups.map((g) => (
                  <div key={g.key} className="rounded-xl border border-border p-3">
                    {g.students.map((s) => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between py-1 text-sm ${s.id === g.keepId ? "font-bold text-foreground" : "text-muted-foreground line-through"}`}
                      >
                        <span>{s.name}</span>
                        <span className="shrink-0 text-[10px]">
                          {s.id === g.keepId
                            ? (lang === "ar" ? "سيُحتفظ به" : "kept")
                            : (lang === "ar" ? "سيُحذف" : "removed")}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setReviewingDuplicates(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={() => {
                    const idsToDelete = duplicateGroups.flatMap((g) => g.students.filter((s) => s.id !== g.keepId).map((s) => s.id));
                    onRemoveDuplicates(idsToDelete);
                    setReviewingDuplicates(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:brightness-110"
                >
                  <Trash2 size={16} />
                  {lang === "ar" ? "حذف التكرارات" : "Remove duplicates"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
