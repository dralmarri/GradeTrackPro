import { useRef, useState, useMemo } from "react";
import { Student, LectureInfo, Course } from "@/types/student";
import { ChevronRight, ChevronLeft, Search, Download, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { exportAttendanceTemplate, parseAttendanceFile, parsePaaetAttendanceFile } from "@/lib/excel";
import { toast } from "sonner";

interface Props {
  students: Student[];
  lectures: LectureInfo[];
  course: Course;
  onUpdateAttendance: (studentId: string, lectureIndex: number, present: boolean) => void;
  onImportPaaet: (
    matched: { studentId: string; attendance: boolean[] }[],
    newStudents: { name: string; attendance: boolean[] }[],
  ) => Promise<void>;
}

export default function AttendancePerLecture({ students, lectures, course, onUpdateAttendance, onImportPaaet }: Props) {
  const { t, lang } = useLanguage();
  const safeStudents = students || [];
  const safeLectures = lectures || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [selectedLecture, setSelectedLecture] = useState(() => {
    if (safeLectures.length === 0) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let idx = 0, best = Infinity;
    safeLectures.forEach((l, i) => {
      const d = new Date(l.date); d.setHours(0, 0, 0, 0);
      const diff = Math.abs(d.getTime() - today.getTime());
      if (diff < best) { best = diff; idx = i; }
    });
    return idx;
  });
  const [search, setSearch] = useState("");

  if (safeStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">{t("noStudentsYet")}</p>
      </div>
    );
  }
  if (safeLectures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">{t("noLecturesYet")}</p>
        <p className="text-sm">{t("addLectureToStart")}</p>
      </div>
    );
  }

  const current = safeLectures[selectedLecture];

  const { presentCount, absentCount, pct } = useMemo(() => {
    let p = 0, a = 0;
    safeStudents.forEach((s) => {
      if (s.attendance?.[selectedLecture] === false) a += 1; else p += 1;
    });
    const total = p + a;
    return { presentCount: p, absentCount: a, pct: total ? Math.round((p / total) * 100) : 0 };
  }, [safeStudents, selectedLecture]);

  const filtered = search
    ? safeStudents.filter((s) => s.name.includes(search.trim()))
    : safeStudents;

  const goNext = () => selectedLecture < safeLectures.length - 1 && setSelectedLecture(selectedLecture + 1);
  const goPrev = () => selectedLecture > 0 && setSelectedLecture(selectedLecture - 1);

  const dateObj = new Date(current.date);
  const subtitle = dateObj.toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const title = `المحاضرة ${selectedLecture + 1}`;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const paaet = await parsePaaetAttendanceFile(file, course);
      if (paaet.matchedCount > 0 || paaet.newCount > 0) {
        await onImportPaaet(paaet.matched, paaet.newStudents);
        const msg = lang === "ar"
          ? `تم استيراد الحضور: ${paaet.matchedCount} طالب${paaet.newCount > 0 ? ` · ${paaet.newCount} طالب جديد أُضيف` : ""}`
          : `Attendance imported: ${paaet.matchedCount} students${paaet.newCount > 0 ? ` · ${paaet.newCount} new added` : ""}`;
        toast.success(msg, { duration: 5000 });
        return;
      }

      const result = await parseAttendanceFile(file, course);
      if (result.updates.length === 0) {
        toast.error(lang === "ar" ? "لم يتم التعرف على بيانات حضور في الملف" : "No attendance data found in file");
        return;
      }
      result.updates.forEach(({ studentId, lectureIndex, present }) => {
        onUpdateAttendance(studentId, lectureIndex, present);
      });
      const msg = lang === "ar"
        ? `تم استيراد ${result.updates.length} سجل حضور بنجاح${result.unmatched.length > 0 ? ` · ${result.unmatched.length} اسم لم يُطابَق` : ""}`
        : `Imported ${result.updates.length} attendance records${result.unmatched.length > 0 ? ` · ${result.unmatched.length} unmatched` : ""}`;
      toast.success(msg, { duration: 5000 });
      if (result.unmatched.length > 0) {
        console.warn("Unmatched students:", result.unmatched);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Lecture nav */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <button
          onClick={goPrev}
          disabled={selectedLecture === 0}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted disabled:opacity-30"
          aria-label="previous"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display text-lg font-extrabold text-foreground">{title}</p>
          <p className="mt-1 text-sm sm:text-base font-bold text-foreground">{subtitle}</p>
        </div>
        <button
          onClick={goNext}
          disabled={selectedLecture === safeLectures.length - 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted disabled:opacity-30"
          aria-label="next"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-success">{presentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("presentLabel")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-destructive">{absentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("absentLabel")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary">{pct}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("attendanceRate")}</p>
        </div>
      </div>

      {/* Import / Export attendance */}
      <div className="flex gap-2">
        <button
          onClick={() => exportAttendanceTemplate(course)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Download size={14} />
          {lang === "ar" ? "تصدير قالب الحضور" : "Export Template"}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {lang === "ar" ? "استيراد الحضور (Excel / نظام الكلية)" : "Import (Excel / College system)"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("searchByName")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2.5 pr-9 pl-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Student rows */}
      <div className="space-y-2">
        {filtered.map((student, idx) => {
          const isPresent = student.attendance?.[selectedLecture] !== false;
          return (
            <div
              key={student.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                {idx + 1}
              </span>
              <p className="flex-1 truncate text-sm sm:text-base font-bold text-foreground">{student.name}</p>

              {/* Toggle pill */}
              <div className="flex shrink-0 items-center rounded-xl bg-muted/60 p-1">
                <button
                  onClick={() => onUpdateAttendance(student.id, selectedLecture, true)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all",
                    isPresent
                      ? "bg-success text-success-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("presentLabel")}
                </button>
                <button
                  onClick={() => onUpdateAttendance(student.id, selectedLecture, false)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all",
                    !isPresent
                      ? "bg-destructive text-destructive-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("absentLabel")}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
