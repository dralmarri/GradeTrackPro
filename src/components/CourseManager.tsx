import { useState } from "react";
import { Course } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import { format } from "date-fns";
import {
  BookOpen,
  Trash2,
  Edit3,
  Calendar,
  Users,
  Check,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

const DAYS_AR: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
  4: "الخميس", 5: "الجمعة", 6: "السبت",
};

interface CourseManagerProps {
  courses: Course[];
  onDeleteCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => void;
  onAddStudents: (courseId: string, names: string[]) => void;
  onSelectCourse: (courseId: string) => void;
}

export default function CourseManager({
  courses,
  onDeleteCourse,
  onUpdateCourse,
  onAddStudents,
  onSelectCourse,
}: CourseManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editMaxExam1, setEditMaxExam1] = useState(20);
  const [editMaxExam2, setEditMaxExam2] = useState(20);
  const [editMaxFinal, setEditMaxFinal] = useState(40);
  const [editMaxParticipation, setEditMaxParticipation] = useState(10);
  const [editMaxBonus, setEditMaxBonus] = useState(3);

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditName(course.name);
    setEditSection(course.section || "");
    setEditMaxExam1(course.maxExam1);
    setEditMaxExam2(course.maxExam2);
    setEditMaxFinal(course.maxFinal);
    setEditMaxParticipation(course.maxParticipation);
    setEditMaxBonus(course.maxBonus);
  };

  const saveEdit = (courseId: string) => {
    onUpdateCourse(courseId, {
      name: editName,
      section: editSection,
      maxExam1: editMaxExam1,
      maxExam2: editMaxExam2,
      maxFinal: editMaxFinal,
      maxParticipation: editMaxParticipation,
      maxBonus: editMaxBonus,
    });
    setEditingId(null);
    toast.success("تم تحديث بيانات المقرر");
  };

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen size={32} className="mb-3" />
        <p className="font-display text-lg">لا توجد مقررات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <div
          key={course.id}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          {editingId === course.id ? (
            // Edit mode
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">اسم المقرر</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">الشعبة</label>
                  <input
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    placeholder="مثال: الساعة 11"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "اختبار١", value: editMaxExam1, set: setEditMaxExam1 },
                  { label: "اختبار٢", value: editMaxExam2, set: setEditMaxExam2 },
                  { label: "نهائي", value: editMaxFinal, set: setEditMaxFinal },
                  { label: "مشاركة", value: editMaxParticipation, set: setEditMaxParticipation },
                  { label: "بونص", value: editMaxBonus, set: setEditMaxBonus },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{field.label}</label>
                    <input
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.set(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-center text-sm outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(course.id)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Check size={14} />
                  حفظ
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <X size={14} />
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            // View mode
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">{course.name}</h3>
                  {course.section && (
                    <p className="text-xs text-muted-foreground">الشعبة: {course.section}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5">اختبار١: {course.maxExam1}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">اختبار٢: {course.maxExam2}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">نهائي: {course.maxFinal}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">مشاركة: {course.maxParticipation}</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ExcelImport onImport={(names) => {
                  onAddStudents(course.id, names);
                }} />
                <button
                  onClick={() => startEdit(course)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Edit3 size={13} />
                  تعديل البيانات
                </button>
                <button
                  onClick={() => onSelectCourse(course.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Calendar size={13} />
                  إدارة المحاضرات
                </button>
                <button
                  onClick={() => {
                    onDeleteCourse(course.id);
                    toast.success("تم حذف المقرر");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 size={13} />
                  حذف المقرر
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
