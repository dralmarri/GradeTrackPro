import { useState } from "react";
import { Course, ComponentLabels, DEFAULT_COMPONENT_LABELS, getLabel } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
import ManualDeleteStudents from "@/components/ManualDeleteStudents";
import ConfirmDialog from "@/components/ConfirmDialog";
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
import { useLanguage } from "@/hooks/useLanguage";
import { tf } from "@/lib/translations";

const DAYS_AR: Record<number, string> = {
  0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
  4: "الخميس", 5: "الجمعة", 6: "السبت",
};

interface CourseManagerProps {
  courses: Course[];
  onDeleteCourse: (courseId: string) => void;
  onUpdateCourse: (courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => void;
  onAddStudents: (courseId: string, names: string[]) => void;
  onDeleteStudent: (courseId: string, studentId: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export default function CourseManager({
  courses,
  onDeleteCourse,
  onUpdateCourse,
  onAddStudents,
  onDeleteStudent,
  onSelectCourse,
}: CourseManagerProps) {
  const { t } = useLanguage();
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
  const [editLabels, setEditLabels] = useState<Required<ComponentLabels>>({ ...DEFAULT_COMPONENT_LABELS });
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

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
    setEditLabels({ ...DEFAULT_COMPONENT_LABELS, ...(course.componentLabels || {}) });
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
      componentLabels: editLabels,
    } as any);
    setEditingId(null);
    toast.success(t("courseUpdated"));
  };

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen size={32} className="mb-3" />
        <p className="font-display text-lg">{t("noCoursesManage")}</p>
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
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("courseNameLabel")}</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("sectionLabel")}</label>
                  <input
                    value={editSection}
                    onChange={(e) => setEditSection(e.target.value)}
                    placeholder={t("sectionPh")}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                  {t("componentsHint")}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    { key: "exam1", value: editMaxExam1, set: setEditMaxExam1 },
                    { key: "exam2", value: editMaxExam2, set: setEditMaxExam2 },
                    { key: "finalExam", value: editMaxFinal, set: setEditMaxFinal },
                    { key: "participation", value: editMaxParticipation, set: setEditMaxParticipation },
                    { key: "homework", value: editMaxHomework, set: setEditMaxHomework },
                    { key: "bonus", value: editMaxBonus, set: setEditMaxBonus },
                  ] as const).map((field) => (
                    <div key={field.key} className="rounded-lg border border-border bg-background/50 p-2">
                      <input
                        type="text"
                        value={editLabels[field.key]}
                        onChange={(e) =>
                          setEditLabels((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={DEFAULT_COMPONENT_LABELS[field.key]}
                        className="mb-1 w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(e) => field.set(Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-center text-sm outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>


              {/* Schedule edit */}
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("lectureDays")}</label>
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
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("lectureTime")}</label>
                    <input
                      type="time"
                      value={editLectureTime}
                      onChange={(e) => setEditLectureTime(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("semesterStart")}</label>
                    <input
                      type="date"
                      value={editSemesterStart}
                      onChange={(e) => setEditSemesterStart(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("semesterEnd")}</label>
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
                  {t("save")}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <X size={14} />
                  {t("cancel")}
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
                    <p className="text-xs text-muted-foreground">{t("sectionLabel")}: {course.section}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "exam1")}: {course.maxExam1}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "exam2")}: {course.maxExam2}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "finalExam")}: {course.maxFinal}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "participation")}: {course.maxParticipation}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "homework")}: {course.maxHomework ?? 10}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{getLabel(course, "bonus")}: {course.maxBonus}</span>
                <span className="rounded-md bg-muted px-2 py-0.5">{t("lectures")}: {course.lectureCount}</span>
              </div>

              {/* Schedule info */}
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {course.lectureDays && course.lectureDays.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>{t("daysLabel")}: {course.lectureDays.map(d => DAYS_AR[d]).join("، ")}</span>
                  </div>
                )}
                {course.lectureTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{t("timeLabel")}: {course.lectureTime}</span>
                  </div>
                )}
                {course.semesterStart && course.semesterEnd && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>
                      {tf(t("fromTo"), { start: format(new Date(course.semesterStart), "yyyy/MM/dd"), end: format(new Date(course.semesterEnd), "yyyy/MM/dd") })}
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
                <ManualDeleteStudents
                  students={course.students}
                  onDelete={(studentId) => onDeleteStudent(course.id, studentId)}
                />
                <button
                  onClick={() => startEdit(course)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Edit3 size={13} />
                  {t("editData")}
                </button>
                <button
                  onClick={() => onSelectCourse(course.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Calendar size={13} />
                  {t("manageLectures")}
                </button>
                <button
                  onClick={() => {
                    onDeleteCourse(course.id);
                    toast.success(t("courseDeletedToast"));
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 size={13} />
                  {t("deleteCourse")}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
