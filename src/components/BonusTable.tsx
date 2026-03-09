import { useState } from "react";
import { Student, LectureInfo } from "@/types/student";
import { Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BonusTableProps {
  students: Student[];
  lectures: LectureInfo[];
  maxBonus: number;
  onUpdateBonus: (studentId: string, lectureIndex: number, value: number) => void;
  onUpdateAttendance: (studentId: string, lectureIndex: number, present: boolean) => void;
  onDeleteStudent: (studentId: string) => void;
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
  onDeleteStudent,
}: BonusTableProps) {
  const safeStudents = students || [];
  const safeLectures = lectures || [];
  const [selectedLecture, setSelectedLecture] = useState(safeLectures.length > 0 ? safeLectures.length - 1 : 0);

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
        {safeStudents.map((student, idx) => {
          const bonusTotal = (student.lectureBonus || []).reduce((a, b) => a + b, 0);
          const currentBonus = student.lectureBonus?.[selectedLecture] || 0;

          return (
            <div
              key={student.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
                <p className={cn("text-[11px] font-display font-bold", bonusTotal >= 0 ? "text-accent" : "text-destructive")}>
                  المجموع: {bonusTotal}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = clamp(currentBonus - 1, maxBonus);
                    onUpdateBonus(student.id, selectedLecture, v);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive font-bold text-lg transition-colors active:bg-destructive/20"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold text-foreground">{currentBonus}</span>
                <button
                  onClick={() => {
                    const v = clamp(currentBonus + 1, maxBonus);
                    onUpdateBonus(student.id, selectedLecture, v);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg transition-colors active:bg-primary/20"
                >
                  +
                </button>
                <button
                  onClick={() => onDeleteStudent(student.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
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
              <th className="px-3 py-3 text-center font-display font-semibold w-28">
                {currentLecture.label}
                <br />
                <span className="text-[10px] font-normal text-muted-foreground">(من {maxBonus})</span>
              </th>
              <th className="bg-accent/10 px-3 py-3 text-center font-display text-xs font-semibold text-accent w-24">
                مجموع البونص
              </th>
              <th className="px-2 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {safeStudents.map((student, idx) => {
              const bonusTotal = (student.lectureBonus || []).reduce((a, b) => a + b, 0);
              const currentBonus = student.lectureBonus?.[selectedLecture] || 0;

              return (
                <tr
                  key={student.id}
                  className="border-b border-border/50 transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{student.name}</td>
                  <td className="px-3 py-1.5 text-center">
                    <select
                      value={currentBonus}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        onUpdateBonus(student.id, selectedLecture, v);
                      }}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {Array.from({ length: maxBonus * 2 + 1 }, (_, i) => i - maxBonus).map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className={`bg-accent/5 px-3 py-2.5 text-center font-display font-bold ${bonusTotal >= 0 ? "text-accent" : "text-destructive"}`}>
                    {bonusTotal}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => onDeleteStudent(student.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
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
