import { Student, LectureInfo } from "@/types/student";
import { Trash2 } from "lucide-react";

interface BonusTableProps {
  students: Student[];
  lectures: LectureInfo[];
  maxBonus: number;
  onUpdateBonus: (studentId: string, lectureIndex: number, value: number) => void;
  onDeleteStudent: (studentId: string) => void;
}

function clamp(val: number, max: number) {
  return Math.max(0, Math.min(val, max));
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
  if (safeStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
        <p className="text-sm">قم باستيراد كشف Excel لإضافة الطلبة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm" style={{ minWidth: `${200 + safeLectures.length * 70 + 120}px` }}>
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="sticky right-0 z-10 bg-secondary/50 px-3 py-3 text-right font-display font-semibold">#</th>
            <th className="sticky right-10 z-10 min-w-[140px] bg-secondary/50 px-3 py-3 text-right font-display font-semibold">
              اسم الطالب
            </th>
            {lectures.map((lecture, i) => (
              <th
                key={i}
                className="px-1 py-2 text-center font-display text-[10px] font-medium text-muted-foreground"
                title={lecture.label}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="whitespace-nowrap text-[10px] font-semibold text-foreground/70">
                    {lecture.label.split(" ")[0]}
                  </span>
                  <span className="whitespace-nowrap text-[10px]">
                    {lecture.label.split(" ")[1] || ""}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70">({maxBonus})</span>
                </div>
              </th>
            ))}
            <th className="bg-accent/10 px-3 py-3 text-center font-display text-xs font-semibold text-accent">
              المجموع
            </th>
            <th className="px-2 py-3 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const bonusTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
            return (
              <tr
                key={student.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="sticky right-0 z-10 bg-card px-3 py-2 text-center text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="sticky right-10 z-10 bg-card px-3 py-2 font-medium">
                  {student.name}
                </td>
                {student.lectureBonus.map((bonus, li) => (
                  <td key={li} className="px-0.5 py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      max={maxBonus}
                      value={bonus || ""}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value), maxBonus);
                        onUpdateBonus(student.id, li, v);
                      }}
                      className="w-9 rounded-md border border-border bg-background px-0.5 py-1 text-center text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </td>
                ))}
                <td className="bg-accent/5 px-2 py-2 text-center font-display font-bold text-accent">
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
  );
}
