import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useCourses } from "@/hooks/useCourses";
import { exportToExcel } from "@/lib/excel";
import { generateLectureDates, WEEKDAYS } from "@/lib/lectures";
import { LectureInfo } from "@/types/student";
import ExcelImport from "@/components/ExcelImport";
import ManualAddStudents from "@/components/ManualAddStudents";
import ExamsPage from "@/components/ExamsPage";
import OmrExamsPage from "@/components/OmrExamsPage";
import StudentStatus from "@/components/StudentStatus";
import AttendanceSummary from "@/components/AttendanceSummary";
import AttendancePerLecture from "@/components/AttendancePerLecture";
import SettingsPage from "@/components/SettingsPage";
import CourseManager from "@/components/CourseManager";
import CourseStudentsDialog from "@/components/CourseStudentsDialog";
import BottomNav, { type BottomNavKey } from "@/components/BottomNav";

import ConfirmDialog from "@/components/ConfirmDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import appIcon from "@/assets/app-icon.png";
import {
  BookOpen,
  Plus,
  Upload,
  Trash2,
  ChevronLeft,
  CalendarIcon,
  Users,
  ChevronDown,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

import { tf } from "@/lib/translations";
import AppStoreBanner from "@/components/AppStoreBanner";


type CourseTab = "attendance" | "exams" | "omr" | "status";
type MainView = "courses" | "settings";

export default function Index() {
  
  const { t, lang } = useLanguage();
  const {
    courses,
    loading,
    addCourse,
    updateCourse,
    addStudentsToCourse,
    syncStudentsToCourse,
    updateStudent,
    updateAttendance,
    importPaaetAttendance,
    deleteCourse,
    deleteStudent,
  } = useCourses();

  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newSection, setNewSection] = useState("");
  const [semesterStart, setSemesterStart] = useState<Date | undefined>();
  const [semesterEnd, setSemesterEnd] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [lectureTime, setLectureTime] = useState("");
  const [pendingStudentNames, setPendingStudentNames] = useState<string[]>([]);
  const [courseTab, setCourseTab] = useState<CourseTab>("attendance");
  const [mainView, setMainView] = useState<MainView>("courses");
  const [pendingDeleteCourse, setPendingDeleteCourse] = useState<{ id: string; name: string } | null>(null);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [coursesManageOpen, setCoursesManageOpen] = useState(false);


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

  const handleCreateCourse = async () => {
    if (!newCourseName.trim()) { toast.error(t("enterCourseName")); return; }
    if (!semesterStart || !semesterEnd) { toast.error(t("setDates")); return; }
    if (selectedDays.length === 0) { toast.error(t("pickDays")); return; }
    if (previewLectures.length === 0) { toast.error(t("noLecturesInRange")); return; }

    const lectures: LectureInfo[] = previewLectures.map((l) => ({
      date: l.date.toISOString(),
      label: l.label,
    }));

    const id = await addCourse(newCourseName.trim(), lectures, newSection.trim(), {
      lectureDays: selectedDays,
      lectureTime,
      semesterStart: semesterStart.toISOString(),
      semesterEnd: semesterEnd.toISOString(),
    });
    if (id && pendingStudentNames.length > 0) {
      await addStudentsToCourse(id, pendingStudentNames);
    }
    if (id) setActiveCourseId(id);
    resetModal();
    toast.success(tf(t("courseCreated"), { lectures: lectures.length }) + (pendingStudentNames.length > 0 ? tf(t("andStudents"), { n: pendingStudentNames.length }) : ""));
  };

  const resetModal = () => {
    setShowNewCourse(false);
    setNewCourseName("");
    setNewSection("");
    setSemesterStart(undefined);
    setSemesterEnd(undefined);
    setSelectedDays([]);
    setLectureTime("");
    setPendingStudentNames([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Bottom nav handlers shared across views
  const goHome = () => { setActiveCourseId(null); setMainView("courses"); };
  const goSettings = () => { setMainView("settings"); };
  const goCourseTab = (tab: "assess" | "status") => {
    setMainView("courses");
    setCourseTab(tab === "assess" ? "omr" : "status");
  };


  // Settings / Course management view
  if (mainView === "settings") {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="flex-shrink-0 border-b border-sky-200 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/90 backdrop-blur-sm safe-top">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
            <button
              onClick={() => setMainView("courses")}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            >
              <ChevronLeft size={20} className="rotate-180" />
            </button>
            <h1 className="font-display text-xl font-bold text-foreground">
              {t("settingsAndCourses")}
            </h1>
          </div>
        </header>

        {/* Scrollable content: Course Manager + Settings */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="mx-auto max-w-3xl px-4 pt-6">
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setCoursesManageOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 p-6"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="text-primary" size={20} />
                  <h2 className="font-display text-lg font-bold">{t("coursesManage")}</h2>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-muted-foreground transition-transform ${coursesManageOpen ? "rotate-180" : ""}`}
                />
              </button>
              {coursesManageOpen && (
                <div className="px-6 pb-6">
                  <CourseManager
                    courses={courses}
                    onDeleteCourse={deleteCourse}
                    onUpdateCourse={updateCourse}
                    onAddStudents={addStudentsToCourse}
                    onDeleteStudent={deleteStudent}
                    onSelectCourse={(id) => { setActiveCourseId(id); setMainView("courses"); }}
                  />
                </div>
              )}
            </div>
          </div>
          <SettingsPage courses={courses} onUpdateCourse={updateCourse} />
        </div>

        <BottomNav
          active="settings"
          hasActiveCourse={!!activeCourseId}
          onHome={goHome}
          onCourseTab={goCourseTab}
          onSettings={goSettings}
        />
      </div>
    );
  }


  // Course list view
  if (!activeCourse) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background">
        <header className="flex-shrink-0 border-b border-sky-200 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/90 backdrop-blur-sm safe-top">
          <div className="flex flex-col items-center gap-2 px-4 py-4 text-center">
            <img
              src={appIcon}
              alt="GradeTrackPro"
              className="h-16 w-16 rounded-2xl shadow-md"
            />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">GradeTrackPro</h1>
              <p className="text-xs text-muted-foreground">{t("appTagline")}</p>
            </div>
          </div>
        </header>



        <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-4 py-8 pb-24">
          <AppStoreBanner />
          <div className="mb-6 flex items-center justify-between">

            <h2 className="font-display text-lg font-semibold">{t("coursesTitle")}</h2>
            <button
              onClick={() => setShowNewCourse(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
            >
              <Plus size={18} />
              {t("newCourse")}
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
                  <h3 className="mb-5 font-display text-lg font-bold">{t("createCourse")}</h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("courseName")}</label>
                        <input
                          value={newCourseName}
                          onChange={(e) => setNewCourseName(e.target.value)}
                          placeholder={t("courseNamePh")}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("section")}</label>
                        <input
                          value={newSection}
                          onChange={(e) => setNewSection(e.target.value)}
                          placeholder={t("sectionPh")}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("semesterStart")}</label>
                        <Popover open={startOpen} onOpenChange={setStartOpen}>
                          <PopoverTrigger asChild>
                            <button className={cn("flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted", !semesterStart && "text-muted-foreground")}>
                              <CalendarIcon size={14} />
                              {semesterStart ? format(semesterStart, "yyyy/MM/dd") : t("pickDate")}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={semesterStart} onSelect={(d) => { setSemesterStart(d); setStartOpen(false); }} initialFocus className="pointer-events-auto p-3" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-muted-foreground">{t("semesterEnd")}</label>
                        <Popover open={endOpen} onOpenChange={setEndOpen}>
                          <PopoverTrigger asChild>
                            <button className={cn("flex w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:bg-muted", !semesterEnd && "text-muted-foreground")}>
                              <CalendarIcon size={14} />
                              {semesterEnd ? format(semesterEnd, "yyyy/MM/dd") : t("pickDate")}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={semesterEnd} onSelect={(d) => { setSemesterEnd(d); setEndOpen(false); }} disabled={(date) => semesterStart ? date < semesterStart : false} initialFocus className="pointer-events-auto p-3" />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">{t("lectureDays")}</label>
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

                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">{t("lectureTime")}</label>
                      <input
                        type="time"
                        value={lectureTime}
                        onChange={(e) => setLectureTime(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {previewLectures.length > 0 && (
                      <div className="rounded-lg border border-border bg-muted/50 p-3">
                        <p className="mb-2 text-sm font-semibold text-foreground">
                          {t("lecturesCount")}: {previewLectures.length} {t("lectureWord")}
                        </p>
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                          {previewLectures.slice(0, 20).map((l, i) => (
                            <span key={i} className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {l.label}
                            </span>
                          ))}
                          {previewLectures.length > 20 && (
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              +{previewLectures.length - 20} {t("other")}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add Students */}
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-display text-sm font-semibold text-foreground">{t("addStudents")}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {pendingStudentNames.length > 0
                              ? `✓ ${t("studentsLoadedCount")} ${pendingStudentNames.length} ${t("student")}`
                              : t("optionalLater")}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ExcelImport onImport={(names) => {
                          setPendingStudentNames((prev) => [...prev, ...names]);
                          toast.success(tf(t("studentLoadedSuccess"), { n: names.length }));
                        }} />
                        <ManualAddStudents
                          label={t("addManually")}
                          onAdd={(names) => {
                            setPendingStudentNames((prev) => [...prev, ...names]);
                          }}
                        />
                        {pendingStudentNames.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPendingStudentNames([])}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                          >
                            {t("clearList")}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button onClick={handleCreateCourse} className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110">
                        {t("create")} ({previewLectures.length} {t("lectureWord")}{pendingStudentNames.length > 0 ? ` • ${pendingStudentNames.length} ${t("student")}` : ""})
                      </button>
                      <button onClick={resetModal} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                        {t("cancel")}
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
              <p className="font-display text-lg font-semibold text-foreground">{t("noCoursesYet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("createToStart")}</p>
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
                        setPendingDeleteCourse({ id: course.id, name: course.name });
                      }}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">{course.name}</h3>
                  {course.section && (
                    <p className="text-xs text-muted-foreground">{t("sectionLabel")}: {course.section}</p>
                  )}
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{course.students.length} {t("student")}</span>
                    <span>{course.lectureCount} {t("lectureWord")}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </main>


        <ConfirmDialog
          open={!!pendingDeleteCourse}
          onOpenChange={(o) => !o && setPendingDeleteCourse(null)}
          title={t("deleteCourseTitle")}
          description={pendingDeleteCourse ? tf(t("deleteCourseDesc"), { name: pendingDeleteCourse.name }) : ""}
          confirmLabel={t("delete")}
          destructive
          onConfirm={() => {
            if (pendingDeleteCourse) {
              if (pendingDeleteCourse.id === activeCourseId) setActiveCourseId(null);
              deleteCourse(pendingDeleteCourse.id);
              toast.success(t("courseDeleted"));
              setPendingDeleteCourse(null);
            }
          }}
        />

        <BottomNav
          active="home"
          hasActiveCourse={!!activeCourseId}
          onHome={goHome}
          onCourseTab={goCourseTab}
          onSettings={goSettings}
        />
      </div>
    );
  }

  // Course detail view
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex-shrink-0 border-b border-sky-200 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/90 backdrop-blur-sm safe-top">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => { setActiveCourseId(null); setCourseTab("attendance"); }}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <ChevronLeft size={20} className="rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-extrabold leading-tight">{activeCourse.name}</h1>
            <p className="text-sm font-bold text-foreground/80">
              {activeCourse.section && <>{activeCourse.section} • </>}
              <span dir="ltr" className="inline-block">{activeCourse.students.length}</span> {t("student")} •{" "}
              <span dir="ltr" className="inline-block">{activeCourse.lectureCount}</span> {t("lectureWord")}
            </p>

          </div>
          <div className="flex items-center gap-2">
            {courseTab === "status" && (
              <button
                onClick={() => {
                  exportToExcel(activeCourse);
                  toast.success(t("exportSuccess"));
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                disabled={activeCourse.students.length === 0}
              >
                <Upload size={14} />
                {t("exportResults")}
              </button>
            )}
            <button
              onClick={() => setStudentsDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 active:scale-[0.98]"
              title={t("manageStudents")}
            >
              <Users size={14} />
              <span className="hidden sm:inline">{t("manageStudents")}</span>
            </button>
          </div>
        </div>

      </header>


      <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto px-4 py-6 pb-32">

        {(courseTab === "exams" || courseTab === "omr") && (
          <div className="mb-4 flex gap-2">
            {([
              { key: "omr", label: lang === "ar" ? "التصحيح الآلي والاختبارات" : "Auto grading & exams" },
              { key: "exams", label: lang === "ar" ? "رصد الدرجات" : "Grade entry" },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => setCourseTab(m.key)}
                className={
                  courseTab === m.key
                    ? "flex-1 rounded-xl border border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary"
                    : "flex-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {courseTab === "exams" && (
          <div className="space-y-6">
            <ExamsPage
              students={activeCourse.students}
              courseId={activeCourse.id}
              maxExam1={activeCourse.maxExam1}
              maxExam2={activeCourse.maxExam2}
              maxFinal={activeCourse.maxFinal}
              maxParticipation={activeCourse.maxParticipation}
              maxHomework={activeCourse.maxHomework}
              maxBonus={activeCourse.maxBonus}
              bonusEnabled={activeCourse.bonusEnabled !== false}
              lectureCount={activeCourse.lectureCount}
              componentLabels={activeCourse.componentLabels}
              customComponents={activeCourse.customComponents}
              hiddenComponents={activeCourse.hiddenComponents}
              onUpdateStudent={(sid, updates) => updateStudent(activeCourse.id, sid, updates)}
            />
          </div>
        )}

        {courseTab === "omr" && (
          <OmrExamsPage
            course={activeCourse}
            bankCourseIds={courses.filter((c) => c.name.trim() === activeCourse.name.trim()).map((c) => c.id)}
            onLearnNumber={(sid, num) => updateStudent(activeCourse.id, sid, { studentNumber: num } as any)}
            onApplyScore={async (studentId, targetComponent, score) => {
              const standard = ["exam1", "exam2", "finalExam", "participation", "homework"];
              if (standard.includes(targetComponent)) {
                await updateStudent(activeCourse.id, studentId, { [targetComponent]: score } as any);
              } else {
                const st = activeCourse.students.find((s) => s.id === studentId);
                await updateStudent(activeCourse.id, studentId, {
                  customScores: { ...(st?.customScores || {}), [targetComponent]: score },
                } as any);
              }
            }}
          />
        )}

        {courseTab === "attendance" && (
          <div className="space-y-6">
            <AttendancePerLecture
              students={activeCourse.students}
              lectures={activeCourse.lectures}
              course={activeCourse}
              onUpdateAttendance={(sid, li, present) => updateAttendance(activeCourse.id, sid, li, present)}
              onImportPaaet={(matched, newStudents) => importPaaetAttendance(activeCourse.id, matched, newStudents)}
            />


            <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <summary className="cursor-pointer font-display text-sm font-bold text-foreground">
                {t("attendanceSummary")}
              </summary>
              <div className="mt-4">
                <AttendanceSummary
                  students={activeCourse.students}
                  lectures={activeCourse.lectures}
                />
              </div>
            </details>
          </div>
        )}
        {courseTab === "status" && (
          <StudentStatus
            students={activeCourse.students}
            course={activeCourse}
          />
        )}

        {/* explicit spacer — guarantees the last item clears the fixed
            bottom nav regardless of container padding/dvh edge cases */}
        <div aria-hidden className="h-24" />
      </main>

      <CourseStudentsDialog
        open={studentsDialogOpen}
        onOpenChange={setStudentsDialogOpen}
        course={activeCourse}
        onAddStudents={(names) => addStudentsToCourse(activeCourse.id, names)}
        onSyncStudents={(names) => syncStudentsToCourse(activeCourse.id, names)}
        onDeleteStudent={(sid) => deleteStudent(activeCourse.id, sid)}
        onUpdateCourse={(u) => updateCourse(activeCourse.id, u)}
      />

      <BottomNav
        active={courseTab === "attendance" ? "home" : courseTab === "status" ? "status" : "assess"}
        hasActiveCourse={true}
        onHome={() => (courseTab === "attendance" ? goHome() : setCourseTab("attendance"))}
        onCourseTab={(tab) => setCourseTab(tab === "assess" ? "omr" : "status")}
        onSettings={goSettings}
      />
    </div>
  );
}
