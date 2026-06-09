import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Course, ComponentLabels, DEFAULT_COMPONENT_LABELS } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
import ManualDeleteStudents from "@/components/ManualDeleteStudents";

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
  onUpdateCourse,
}: Props) {
  const [maxExam1, setMaxExam1] = useState(course.maxExam1);
  const [maxExam2, setMaxExam2] = useState(course.maxExam2);
  const [maxFinal, setMaxFinal] = useState(course.maxFinal);
  const [maxParticipation, setMaxParticipation] = useState(course.maxParticipation);
  const [maxHomework, setMaxHomework] = useState(course.maxHomework ?? 10);
  const [maxBonus, setMaxBonus] = useState(course.maxBonus);
  const [labels, setLabels] = useState<Required<ComponentLabels>>({
    ...DEFAULT_COMPONENT_LABELS,
    ...(course.componentLabels || {}),
  });

  useEffect(() => {
    if (!open) return;
    setMaxExam1(course.maxExam1);
    setMaxExam2(course.maxExam2);
    setMaxFinal(course.maxFinal);
    setMaxParticipation(course.maxParticipation);
    setMaxHomework(course.maxHomework ?? 10);
    setMaxBonus(course.maxBonus);
    setLabels({ ...DEFAULT_COMPONENT_LABELS, ...(course.componentLabels || {}) });
  }, [open, course]);

  const saveWeights = () => {
    onUpdateCourse({
      maxExam1,
      maxExam2,
      maxFinal,
      maxParticipation,
      maxHomework,
      maxBonus,
      componentLabels: labels,
    } as any);
    toast.success("تم حفظ الدرجات القصوى");
  };

  const fields = [
    { key: "exam1" as const, value: maxExam1, set: setMaxExam1 },
    { key: "exam2" as const, value: maxExam2, set: setMaxExam2 },
    { key: "finalExam" as const, value: maxFinal, set: setMaxFinal },
    { key: "participation" as const, value: maxParticipation, set: setMaxParticipation },
    { key: "homework" as const, value: maxHomework, set: setMaxHomework },
    { key: "bonus" as const, value: maxBonus, set: setMaxBonus },
  ];

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
            dir="rtl"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">إدارة الطلبة والدرجات</h3>
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
              {/* Students section */}
              <section className="rounded-xl border border-border bg-background/40 p-4">
                <h4 className="mb-1 font-display text-sm font-bold">إضافة / حذف الطلبة</h4>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  عدد الطلبة الحاليين: {course.students.length}
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

              {/* Max marks section */}
              <section className="rounded-xl border border-border bg-background/40 p-4">
                <h4 className="mb-1 font-display text-sm font-bold">
                  الدرجات القصوى (أوزان الاختبارات والواجبات)
                </h4>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  يمكنك تعديل اسم كل مكوّن والدرجة القصوى الخاصة به
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {fields.map((f) => (
                    <div key={f.key} className="rounded-lg border border-border bg-card p-2">
                      <input
                        type="text"
                        value={labels[f.key]}
                        onChange={(e) =>
                          setLabels((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={DEFAULT_COMPONENT_LABELS[f.key]}
                        className="mb-1 w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={f.value}
                        onChange={(e) => f.set(Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-center text-sm font-bold outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={saveWeights}
                  className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
                >
                  <Save size={14} />
                  حفظ الدرجات القصوى
                </button>
              </section>
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
