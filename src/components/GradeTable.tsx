import { Student, LectureInfo } from "@/types/student";
import { getTotal } from "@/lib/excel";
import { Trash2 } from "lucide-react";

interface GradeTableProps {
  students: Student[];
  lectureCount: number;
  lectures: LectureInfo[];
  maxBonus: number;
  maxExam1: number;
  maxExam2: number;
  maxFinal: number;
  maxParticipation: number;
  onUpdateBonus: (studentId: string, lectureIndex: number, value: number) => void;
  onUpdateStudent: (studentId: string, updates: Partial<Student>) => void;
  onDeleteStudent: (studentId: string) => void;
}

function clamp(val: number, max: number) {
  return Math.max(0, Math.min(val, max));
}

export default function GradeTable({
  students,
  lectures,
  lectureCount,
  maxBonus,
  maxExam1,
  maxExam2,
  maxFinal,
  maxParticipation,
  onUpdateBonus,
  onUpdateStudent,
  onDeleteStudent,
}: GradeTableProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
        <p className="text-sm">قم باستيراد كشف Excel لإضافة الطلبة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="sticky right-0 z-10 bg-secondary/50 px-3 py-3 text-right font-display font-semibold">#</th>
            <th className="sticky right-10 z-10 min-w-[140px] bg-secondary/50 px-3 py-3 text-right font-display font-semibold">
              اسم الطالب
            </th>
            {Array.from({ length: lectureCount }, (_, i) => (
              <th key={i} className="px-2 py-3 text-center font-display text-xs font-medium text-muted-foreground">
                م{i + 1}
                <br />
                <span className="text-[10px]">({maxBonus})</span>
              </th>
            ))}
            <th className="bg-accent/10 px-3 py-3 text-center font-display text-xs font-semibold text-accent">
              بونص
            </th>
            <th className="px-3 py-3 text-center font-display text-xs font-medium">
              اختبار١
              <br />
              <span className="text-[10px] text-muted-foreground">({maxExam1})</span>
            </th>
            <th className="px-3 py-3 text-center font-display text-xs font-medium">
              اختبار٢
              <br />
              <span className="text-[10px] text-muted-foreground">({maxExam2})</span>
            </th>
            <th className="px-3 py-3 text-center font-display text-xs font-medium">
              نهائي
              <br />
              <span className="text-[10px] text-muted-foreground">({maxFinal})</span>
            </th>
            <th className="px-3 py-3 text-center font-display text-xs font-medium">
              مشاركة
              <br />
              <span className="text-[10px] text-muted-foreground">({maxParticipation})</span>
            </th>
            <th className="bg-primary/5 px-3 py-3 text-center font-display text-xs font-bold text-primary">
              المجموع
            </th>
            <th className="px-2 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, idx) => {
            const bonusTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
            const total = getTotal(student);

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
                  <td key={li} className="px-1 py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      max={maxBonus}
                      value={bonus || ""}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value), maxBonus);
                        onUpdateBonus(student.id, li, v);
                      }}
                      className="w-10 rounded-md border border-border bg-background px-1 py-1 text-center text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </td>
                ))}
                <td className="bg-accent/5 px-2 py-2 text-center font-semibold text-accent">
                  {bonusTotal}
                </td>
                {[
                  { key: "exam1" as const, max: maxExam1 },
                  { key: "exam2" as const, max: maxExam2 },
                  { key: "finalExam" as const, max: maxFinal },
                  { key: "participation" as const, max: maxParticipation },
                ].map(({ key, max }) => (
                  <td key={key} className="px-1 py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      max={max}
                      value={student[key] || ""}
                      onChange={(e) => {
                        const v = clamp(Number(e.target.value), max);
                        onUpdateStudent(student.id, { [key]: v });
                      }}
                      className="w-14 rounded-md border border-border bg-background px-1 py-1 text-center text-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </td>
                ))}
                <td className="bg-primary/5 px-3 py-2 text-center font-display font-bold text-primary">
                  {total}
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
