import { AnimatePresence, motion } from "framer-motion";
import { Users, X } from "lucide-react";
import { Course } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
import ManualDeleteStudents from "@/components/ManualDeleteStudents";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onAddStudents: (names: string[]) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateCourse: (updates: Partial<Omit<Course, "id" | "students">>) => void;
}

export default function CourseStudentsDialog({
  open,
  onOpenChange,
  course,
  onAddStudents,
  onDeleteStudent,
}: Props) {
  const { t, dir, lang } = useLanguage();

  return (
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
                  <ExcelImport onImport={(names) => onAddStudents(names)} />
                  <ManualAddStudents onAdd={(names) => onAddStudents(names)} />
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
  );
}
