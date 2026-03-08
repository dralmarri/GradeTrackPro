import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useCourses } from "@/hooks/useCourses";
import { exportToExcel } from "@/lib/excel";
import { generateLectureDates, WEEKDAYS } from "@/lib/lectures";
import { LectureInfo } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import GradeTable from "@/components/GradeTable";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  ChevronLeft,
  PlusCircle,
  GraduationCap,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function Index() {
  const {
    courses,
    addCourse,
    addStudentsToCourse,
    updateStudent,
    updateLectureBonus,
    deleteCourse,
    deleteStudent,
    addLecture,
  } = useCourses();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [semesterStart, setSemesterStart] = useState<Date | undefined>();
  const [semesterEnd, setSemesterEnd] = useState<Date | undefined>();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const previewLectures =
    semesterStart && semesterEnd && selectedDays.length > 0
      ? generateLectureDates(semesterStart, semesterEnd, selectedDays)
      : [];

  const handleCreateCourse = () => {
    if (!newCourseName.trim()) {
      toast.error("أدخل اسم المادة");
      return;
    }
    if (!semesterStart || !semesterEnd) {
      toast.error("حدد تاريخ بداية ونهاية الفصل");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("اختر أيام المحاضرات");
      return;
    }
    if (previewLectures.length === 0) {
      toast.error("لا توجد محاضرات في الفترة المحددة");
      return;
    }

    const lectures: LectureInfo[] = previewLectures.map((l) => ({
      date: l.date.toISOString(),
      label: l.label,
    }));

    const id = addCourse(newCourseName.trim(), lectures);
    setActiveCourseId(id);
    setShowNewCourse(false);
    setNewCourseName("");
    setSemesterStart(undefined);
    setSemesterEnd(undefined);
    setSelectedDays([]);
    toast.success(`تم إنشاء المادة بـ ${lectures.length} محاضرة`);
  };

  const resetModal = () => {
    setShowNewCourse(false);
    setNewCourseName("");
    setSemesterStart(undefined);
    setSemesterEnd(undefined);
    setSelectedDays([]);
  };

  // Course list view
  if (!activeCourse) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
              <GraduationCap className="text-primary-foreground" size={22} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                متابعة درجات الطلبة
              </h1>
              <p className="text-xs text-muted-foreground">إدارة الدرجات والكشوفات</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">المواد الدراسية</h2>
            <button
              onClick={() => setShowNewCourse(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={18} />
              مادة جديدة
            </button>
          </div>

          {/* New Course Modal */}
          <AnimatePresence>
            {showNewCourse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm"
                onClick={resetModal}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="my-8 w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl"
                >
                  <h3 className="mb-5 font-display text-lg font-bold">إنشاء مادة جديدة</h3>
                  <div className="space-y-5">
                    {/* Course Name */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                        اسم المادة
                      </label>
                      <input
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="مثال: البرمجة المتقدمة"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    </div>

                    {/* Date Pickers */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                          بداية الفصل
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                                !semesterStart && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon size={14} />
                              {semesterStart
                                ? format(semesterStart, "yyyy/MM/dd")
                                : "اختر التاريخ"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={semesterStart}
                              onSelect={setSemesterStart}
                              initialFocus
                              className="pointer-events-auto p-3"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                          نهاية الفصل
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted",
                                !semesterEnd && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon size={14} />
                              {semesterEnd
                                ? format(semesterEnd, "yyyy/MM/dd")
                                : "اختر التاريخ"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={semesterEnd}
                              onSelect={setSemesterEnd}
                              disabled={(date) =>
                                semesterStart ? date < semesterStart : false
                              }
                              initialFocus
                              className="pointer-events-auto p-3"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Day Selector */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        أيام المحاضرات
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day) => (
                          <button
                            key={day.value}
                            onClick={() => toggleDay(day.value)}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                              selectedDays.includes(day.value)
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {previewLectures.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/50 p-3">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          عدد المحاضرات: {previewLectures.length} محاضرة
                        </p>
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                          {previewLectures.slice(0, 20).map((l, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                            >
                              {l.label}
                            </span>
                          ))}
                          {previewLectures.length > 20 && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              +{previewLectures.length - 20} أخرى
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={handleCreateCourse}
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
                      >
                        إنشاء ({previewLectures.length} محاضرة)
                      </button>
                      <button
                        onClick={resetModal}
                        className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Course Cards */}
          {courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <BookOpen className="text-muted-foreground" size={28} />
              </div>
              <p className="font-display text-lg font-semibold text-foreground">لا توجد مواد بعد</p>
              <p className="mt-1 text-sm text-muted-foreground">أنشئ مادة جديدة للبدء</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                  onClick={() => setActiveCourseId(course.id)}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <BookOpen className="text-primary" size={18} />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCourse(course.id);
                        toast.success("تم حذف المادة");
                      }}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">{course.name}</h3>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{course.students.length} طالب</span>
                    <span>{course.lectureCount} محاضرة</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Course detail view
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => setActiveCourseId(null)}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold">{activeCourse.name}</h1>
            <p className="text-xs text-muted-foreground">
              {activeCourse.students.length} طالب • {activeCourse.lectureCount} محاضرة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addLecture(activeCourse.id)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <PlusCircle size={14} />
              محاضرة
            </button>
            <ExcelImport onImport={(names) => addStudentsToCourse(activeCourse.id, names)} />
            <button
              onClick={() => {
                exportToExcel(activeCourse);
                toast.success("تم تصدير الملف بنجاح");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              disabled={activeCourse.students.length === 0}
            >
              <Download size={14} />
              تصدير
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <GradeTable
          students={activeCourse.students}
          lectureCount={activeCourse.lectureCount}
          lectures={activeCourse.lectures}
          maxBonus={activeCourse.maxBonus}
          maxExam1={activeCourse.maxExam1}
          maxExam2={activeCourse.maxExam2}
          maxFinal={activeCourse.maxFinal}
          maxParticipation={activeCourse.maxParticipation}
          onUpdateBonus={(sid, li, v) => updateLectureBonus(activeCourse.id, sid, li, v)}
          onUpdateStudent={(sid, updates) => updateStudent(activeCourse.id, sid, updates)}
          onDeleteStudent={(sid) => deleteStudent(activeCourse.id, sid)}
        />
      </main>
    </div>
  );
}
