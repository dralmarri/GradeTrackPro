import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCourses } from "@/hooks/useCourses";
import { exportToExcel } from "@/lib/excel";
import ExcelImport from "@/components/ExcelImport";
import GradeTable from "@/components/GradeTable";
import {
  BookOpen,
  Plus,
  Download,
  Trash2,
  ChevronLeft,
  PlusCircle,
  GraduationCap,
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
  const [newLectureCount, setNewLectureCount] = useState(10);

  const activeCourse = courses.find((c) => c.id === activeCourseId);

  const handleCreateCourse = () => {
    if (!newCourseName.trim()) {
      toast.error("أدخل اسم المادة");
      return;
    }
    const id = addCourse(newCourseName.trim(), newLectureCount);
    setActiveCourseId(id);
    setShowNewCourse(false);
    setNewCourseName("");
    setNewLectureCount(10);
    toast.success("تم إنشاء المادة بنجاح");
  };

  // Course list view
  if (!activeCourse) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm"
                onClick={() => setShowNewCourse(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="mx-4 w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
                >
                  <h3 className="mb-4 font-display text-lg font-bold">إنشاء مادة جديدة</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        اسم المادة
                      </label>
                      <input
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="مثال: البرمجة المتقدمة"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreateCourse()}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-muted-foreground">
                        عدد المحاضرات
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={newLectureCount}
                        onChange={(e) => setNewLectureCount(Number(e.target.value))}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateCourse}
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110"
                      >
                        إنشاء
                      </button>
                      <button
                        onClick={() => setShowNewCourse(false)}
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
