import { useState } from "react";
import { Student, Course } from "@/types/student";
import { getTotal } from "@/lib/excel";
import { motion } from "framer-motion";
import { User, TrendingUp, TrendingDown, Award, Search } from "lucide-react";

interface StudentStatusProps {
  students: Student[];
  course: Course;
}

function getGrade(total: number, max: number): { label: string; color: string } {
  const pct = (total / max) * 100;
  if (pct >= 90) return { label: "🌟", color: "text-success" };
  if (pct >= 80) return { label: "🏆", color: "text-primary" };
  if (pct >= 70) return { label: "👍", color: "text-accent" };
  if (pct >= 60) return { label: "✅", color: "text-warning" };
  return { label: "❌", color: "text-destructive" };
}

export default function StudentStatus({ students, course }: StudentStatusProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
      </div>
    );
  }

  const maxTotal = course.maxExam1 + course.maxExam2 + course.maxFinal + course.maxParticipation + (course.maxHomework || 0) + (course.maxBonus * course.lectureCount);
  const totals = students.map((s) => getTotal(s));
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  const passCount = totals.filter((t) => (t / maxTotal) * 100 >= 60).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "المعدل", value: avg.toFixed(1), icon: TrendingUp, color: "bg-primary/10 text-primary" },
          { label: "أعلى درجة", value: highest.toString(), icon: Award, color: "bg-success/10 text-success" },
          { label: "أدنى درجة", value: lowest.toString(), icon: TrendingDown, color: "bg-destructive/10 text-destructive" },
          { label: "نسبة النجاح", value: `${((passCount / students.length) * 100).toFixed(0)}%`, icon: User, color: "bg-accent/10 text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
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

      {/* Student Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(searchQuery ? students.filter((s) => s.name.includes(searchQuery)) : students).map((student, idx) => {
          const total = getTotal(student);
          const bonusTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
          const grade = getGrade(total, maxTotal);

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-display text-xs font-bold text-secondary-foreground">
                    {idx + 1}
                  </div>
                  <h3 className="font-display text-sm font-bold text-foreground">{student.name}</h3>
                </div>
                <span className={`font-display text-sm font-bold ${grade.color}`}>{grade.label}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">بونص المحاضرات</span>
                  <span className="font-medium">{bonusTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">اختبار أول ({course.maxExam1})</span>
                  <span className="font-medium">{student.exam1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">اختبار ثاني ({course.maxExam2})</span>
                  <span className="font-medium">{student.exam2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">نهائي ({course.maxFinal})</span>
                  <span className="font-medium">{student.finalExam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مشاركة ({course.maxParticipation})</span>
                  <span className="font-medium">{student.participation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">واجب ({course.maxHomework ?? 10})</span>
                  <span className="font-medium">{student.homework || 0}</span>
                </div>
                <div className="border-t border-border pt-1.5">
                  <div className="flex justify-between">
                    <span className="font-display font-bold text-foreground">المجموع الكلي</span>
                    <span className="font-display font-bold text-primary">{total}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((total / maxTotal) * 100, 100)}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
