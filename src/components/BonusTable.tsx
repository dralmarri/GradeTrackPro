import { useState } from "react";
import { Student, LectureInfo } from "@/types/student";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import NumberInput from "@/components/NumberInput";

interface BonusTableProps {
  students: Student[];
  lectures: LectureInfo[];
  maxBonus: number;
  onUpdateBonus: (studentId: string, lectureIndex: number, value: number) => void;
  onUpdateAttendance: (studentId: string, lectureIndex: number, present: boolean) => void;
}

function clamp(val: number, max: number) {
  return Math.max(-max, Math.min(val, max));
}

export default function BonusTable({
  students,
  lectures,
  maxBonus,
  onUpdateBonus,
  onUpdateAttendance,
}: BonusTableProps) {
  const safeStudents = students || [];
  const safeLectures = lectures || [];
  const [selectedLecture, setSelectedLecture] = useState(() => {
    if (safeLectures.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let closestIdx = 0;
    let closestDiff = Infinity;
    safeLectures.forEach((lec, i) => {
      const lecDate = new Date(lec.date);
      lecDate.setHours(0, 0, 0, 0);
      const diff = Math.abs(lecDate.getTime() - today.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIdx = i;
      }
    });
    return closestIdx;
  });
  const [searchQuery, setSearchQuery] = useState("");

  if (safeStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
        <p className="text-sm">قم باستيراد كشف Excel لإضافة الطلبة</p>
      </div>
    );
  }

  if (safeLectures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا توجد محاضرات بعد</p>
        <p className="text-sm">أضف محاضرة جديدة للبدء</p>
      </div>
    );
  }

  const currentLecture = safeLectures[selectedLecture];
  const filteredStudents = searchQuery
    ? safeStudents.filter((s) => s.name.includes(searchQuery))
    : safeStudents;

  const goNext = () => {
    if (selectedLecture < safeLectures.length - 1) setSelectedLecture(selectedLecture + 1);
  };
  const goPrev = () => {
    if (selectedLecture > 0) setSelectedLecture(selectedLecture - 1);
  };

  return (
    <div className="space-y-4">
      {/* Lecture navigation - mobile friendly */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <button
          onClick={goPrev}
          disabled={selectedLecture === 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display text-sm font-bold text-foreground">{currentLecture.label}</p>
          <p className="text-[11px] text-muted-foreground">
            المحاضرة {selectedLecture + 1} من {safeLectures.length} • أقصى بونص: {maxBonus}
          </p>
        </div>
        <button
          onClick={goNext}
          disabled={selectedLecture === safeLectures.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث باسم الطالب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pr-9 pl-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Lecture quick jump dropdown */}
      <select
        value={selectedLecture}
        onChange={(e) => setSelectedLecture(Number(e.target.value))}
        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {safeLectures.map((lecture, i) => (
          <option key={i} value={i}>
            {lecture.label}
          </option>
        ))}
      </select>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {filteredStudents.map((student, idx) => {
          const bonusTotal = (student.lectureBonus || []).reduce((a, b) => a + b, 0);
          const currentBonus = student.lectureBonus?.[selectedLecture] || 0;
          const isPresent = student.attendance?.[selectedLecture] !== false;

          return (
            <div
              key={student.id}
              onClick={() => onUpdateAttendance(student.id, selectedLecture, !isPresent)}
              className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm cursor-pointer select-none", !isPresent ? "border-destructive/30 bg-destructive/5" : "border-border")}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors pointer-events-none",
                  isPresent ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                )}
              >
                {isPresent ? "✓" : "✗"}
              </div>
              <div className="flex-1 min-w-0 pointer-events-none">
                <p className={cn("truncate text-sm font-medium", !isPresent ? "text-muted-foreground line-through" : "text-foreground")}>{student.name}</p>
                <p className={cn("text-[11px] font-display font-bold", bonusTotal >= 0 ? "text-accent" : "text-destructive")}>
                  المجموع: {bonusTotal}
                </p>
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <NumberInput
                  value={currentBonus}
                  onChange={(v) => onUpdateBonus(student.id, selectedLecture, v)}
                  allowNegative
                  className="w-20 px-2 py-2 text-base font-bold"
                />
              </div>

            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-3 py-3 text-right font-display font-semibold w-12">#</th>
              <th className="min-w-[180px] px-3 py-3 text-right font-display font-semibold">
                اسم الطالب
              </th>
              <th className="px-3 py-3 text-center font-display font-semibold w-16">حضور</th>
              <th className="px-3 py-3 text-center font-display font-semibold w-28">
                {currentLecture.label}
                <br />
                <span className="text-[10px] font-normal text-muted-foreground">(من {maxBonus})</span>
              </th>
              <th className="bg-accent/10 px-3 py-3 text-center font-display text-xs font-semibold text-accent w-24">
                مجموع البونص
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const bonusTotal = (student.lectureBonus || []).reduce((a, b) => a + b, 0);
              const currentBonus = student.lectureBonus?.[selectedLecture] || 0;
              const isPresent = student.attendance?.[selectedLecture] !== false;

              return (
                <tr
                  key={student.id}
                  className={cn("border-b border-border/50 transition-colors hover:bg-muted/30", !isPresent && "bg-destructive/5")}
                >
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className={cn("px-3 py-2.5 font-medium", !isPresent && "text-muted-foreground line-through")}>{student.name}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => onUpdateAttendance(student.id, selectedLecture, !isPresent)}
                      className={cn(
                        "h-7 w-7 rounded-md border-2 transition-colors inline-flex items-center justify-center text-xs font-bold",
                        isPresent ? "border-primary bg-primary/10 text-primary" : "border-destructive bg-destructive/10 text-destructive"
                      )}
                    >
                      {isPresent ? "✓" : "✗"}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex items-center justify-center">
                      <NumberInput
                        value={currentBonus}
                        onChange={(v) => onUpdateBonus(student.id, selectedLecture, v)}
                        allowNegative
                        className="w-20"
                      />
                    </div>
                  </td>

                  <td className={`bg-accent/5 px-3 py-2.5 text-center font-display font-bold ${bonusTotal >= 0 ? "text-accent" : "text-destructive"}`}>
                    {bonusTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
