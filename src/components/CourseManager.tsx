import { useState } from "react";
import { Course } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
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
  const [editMaxHomework, setEditMaxHomework] = useState(10);
  const [editMaxBonus, setEditMaxBonus] = useState(3);
  const [editLectureDays, setEditLectureDays] = useState<number[]>([]);
  const [editLectureTime, setEditLectureTime] = useState("");
  const [editSemesterStart, setEditSemesterStart] = useState("");
  const [editSemesterEnd, setEditSemesterEnd] = useState("");

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditName(course.name);
    setEditSection(course.section || "");
    setEditMaxExam1(course.maxExam1);
    setEditMaxExam2(course.maxExam2);
    setEditMaxFinal(course.maxFinal);
    setEditMaxParticipation(course.maxParticipation);
    setEditMaxHomework(course.maxHomework ?? 10);
    setEditMaxBonus(course.maxBonus);
    setEditLectureDays(course.lectureDays || []);
    setEditLectureTime(course.lectureTime || "");
    setEditSemesterStart(course.semesterStart ? course.semesterStart.slice(0, 10) : "");
    setEditSemesterEnd(course.semesterEnd ? course.semesterEnd.slice(0, 10) : "");
  };

  const toggleEditDay = (d: number) => {
    setEditLectureDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const saveEdit = (courseId: string) => {
    onUpdateCourse(courseId, {
      name: editName,
      section: editSection,
      maxExam1: editMaxExam1,
      maxExam2: editMaxExam2,
      maxFinal: editMaxFinal,
      maxParticipation: editMaxParticipation,
      maxHomework: editMaxHomework,
      maxBonus: editMaxBonus,
      lectureDays: editLectureDays,
      lectureTime: editLectureTime,
      semesterStart: editSemesterStart,
      semesterEnd: editSemesterEnd,
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
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[
                  { label: "اختبار١", value: editMaxExam1, set: setEditMaxExam1 },
                  { label: "اختبار٢", value: editMaxExam2, set: setEditMaxExam2 },
                  { label: "نهائي", value: editMaxFinal, set: setEditMaxFinal },
                  { label: "مشاركة", value: editMaxParticipation, set: setEditMaxParticipation },
                  { label: "واجب", value: editMaxHomework, set: setEditMaxHomework },
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

              {/* Schedule edit */}
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">أيام المحاضرات</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(DAYS_AR).map(([d, label]) => {
                      const day = Number(d);
                      const active = editLectureDays.includes(day);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleEditDay(day)}
                          className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">وقت المحاضرة</label>
                    <input
                      type="time"
                      value={editLectureTime}
                      onChange={(e) => setEditLectureTime(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">بداية الفصل</label>
                    <input
                      type="date"
                      value={editSemesterStart}
                      onChange={(e) => setEditSemesterStart(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">نهاية الفصل</label>
                    <input
                      type="date"
                      value={editSemesterEnd}
                      onChange={(e) => setEditSemesterEnd(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
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
                <span className="rounded-md bg-muted px-2 py-0.5">واجب: {course.maxHomework || 10}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">محاضرات: {course.lectureCount}</span>
              </div>

              {/* Schedule info */}
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {course.lectureDays && course.lectureDays.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>الأيام: {course.lectureDays.map(d => DAYS_AR[d]).join("، ")}</span>
                  </div>
                )}
                {course.lectureTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>الوقت: {course.lectureTime}</span>
                  </div>
                )}
                {course.semesterStart && course.semesterEnd && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      من {format(new Date(course.semesterStart), "yyyy/MM/dd")} إلى {format(new Date(course.semesterEnd), "yyyy/MM/dd")}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ExcelImport onImport={(names) => {
                  onAddStudents(course.id, names);
                }} />
                <ManualAddStudents
                  onAdd={(names) => onAddStudents(course.id, names)}
                />
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
