import { Student, LectureInfo } from "@/types/student";
import { cn } from "@/lib/utils";
import { UserX } from "lucide-react";

interface AttendanceSummaryProps {
  students: Student[];
  lectures: LectureInfo[];
}

export default function AttendanceSummary({ students, lectures }: AttendanceSummaryProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
      </div>
    );
  }

  const studentAbsences = students.map((student) => {
    const absentDates: string[] = [];
    lectures.forEach((lecture, i) => {
      if (student.attendance?.[i] === false) {
        absentDates.push(lecture.label);
      }
    });
    return { student, absentCount: absentDates.length, absentDates };
  });

  // Sort by most absences first
  studentAbsences.sort((a, b) => b.absentCount - a.absentCount);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="font-display text-sm font-bold text-foreground mb-1">ملخص الحضور والغياب</h3>
        <p className="text-xs text-muted-foreground">إجمالي المحاضرات: {lectures.length}</p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {studentAbsences.map(({ student, absentCount, absentDates }) => (
          <div
            key={student.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              absentCount > 0 ? "border-destructive/30" : "border-border"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">{student.name}</p>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                absentCount === 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                {absentCount === 0 ? "لا غياب" : `${absentCount} غياب`}
              </span>
            </div>
            {absentDates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {absentDates.map((date, i) => (
                  <span key={i} className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                    {date}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-3 py-3 text-right font-display font-semibold w-12">#</th>
              <th className="min-w-[180px] px-3 py-3 text-right font-display font-semibold">اسم الطالب</th>
              <th className="px-3 py-3 text-center font-display font-semibold w-24">عدد الغياب</th>
              <th className="px-3 py-3 text-right font-display font-semibold">أيام الغياب</th>
            </tr>
          </thead>
          <tbody>
            {studentAbsences.map(({ student, absentCount, absentDates }, idx) => (
              <tr key={student.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/30", absentCount > 0 && "bg-destructive/5")}>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2.5 font-medium">{student.name}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    absentCount === 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    {absentCount}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {absentDates.map((date, i) => (
                      <span key={i} className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                        {date}
                      </span>
                    ))}
                    {absentCount === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
