import { useState } from "react";
import { Student, LectureInfo } from "@/types/student";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BonusTableProps {
  students: Student[];
  lectures: LectureInfo[];
  maxBonus: number;
  onUpdateBonus: (studentId: string, lectureIndex: number, value: number) => void;
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

  return (
    <div className="space-y-4">
      {/* Lecture dropdown */}
      <div className="flex items-center gap-3">
        <label className="font-display text-sm font-semibold text-foreground">المحاضرة:</label>
        <select
          value={selectedLecture}
          onChange={(e) => setSelectedLecture(Number(e.target.value))}
          className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {safeLectures.map((lecture, i) => (
            <option key={i} value={i}>
              {lecture.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          ({selectedLecture + 1} من {safeLectures.length})
        </span>
      </div>

      {/* Table for selected lecture */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
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
                    <input
                      type="number"
                      min={-maxBonus}
                      max={maxBonus}
                      value={currentBonus === 0 ? "" : currentBonus}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value), maxBonus);
                        onUpdateBonus(student.id, selectedLecture, v);
                      }}
                      className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </td>
                  <td className="bg-accent/5 px-3 py-2.5 text-center font-display font-bold text-accent">
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
