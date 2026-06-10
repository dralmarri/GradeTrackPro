import { useState, useEffect } from "react";
import { Student, Course, getLabel } from "@/types/student";
import { getBonusTotal, getMaxTotal, getPercentage, getTotal } from "@/lib/excel";
import { motion } from "framer-motion";
import { User, TrendingUp, TrendingDown, Award, Search } from "lucide-react";
import { GradeTier, LetterTier, loadGradeTiers, loadLetterTiers, getTierFor, getLetterFor } from "@/lib/gradeTiers";
import { useLanguage } from "@/hooks/useLanguage";

interface StudentStatusProps {
  students: Student[];
  course: Course;
}

export default function StudentStatus({ students, course }: StudentStatusProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [tiers, setTiers] = useState<GradeTier[]>(loadGradeTiers());
  const [letterTiers, setLetterTiers] = useState<LetterTier[]>(loadLetterTiers());


  useEffect(() => {
    const handler = () => {
      setTiers(loadGradeTiers());
      setLetterTiers(loadLetterTiers());
    };
    window.addEventListener("gradeTiersChanged", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gradeTiersChanged", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const getGrade = (total: number, max: number) => {
    const pct = getPercentage(total, max);
    return { tier: getTierFor(pct, tiers), letter: getLetterFor(pct, letterTiers) };
  };

  const getTaqdeer = (letter: string): string => {
    const map: Record<string, string> = {
      "A": "ممتاز مرتفع",
      "A-": "ممتاز",
      "B+": "جيد جداً مرتفع",
      "B": "جيد جداً",
      "B-": "جيد جداً منخفض",
      "C+": "جيد مرتفع",
      "C": "جيد",
      "C-": "جيد منخفض",
      "D+": "مقبول مرتفع",
      "D": "مقبول",
      "F": "راسب",
    };
    return map[letter] || letter;
  };


  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">{t("noStudentsYet")}</p>
      </div>
    );
  }

  const maxTotal = getMaxTotal(course);
  const totals = students.map((s) => getTotal(s, course));
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const highest = Math.max(...totals);
  const lowest = Math.min(...totals);
  const passCount = totals.filter((t) => getPercentage(t, maxTotal) >= 60).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("average"), value: avg.toFixed(1), icon: TrendingUp, color: "bg-primary/10 text-primary" },
          { label: t("highestGrade"), value: highest.toString(), icon: Award, color: "bg-success/10 text-success" },
          { label: t("lowestGrade"), value: lowest.toString(), icon: TrendingDown, color: "bg-destructive/10 text-destructive" },
          { label: t("passRate"), value: `${((passCount / students.length) * 100).toFixed(0)}%`, icon: User, color: "bg-accent/10 text-accent" },
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
          placeholder={t("searchByName")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pr-9 pl-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Student Rows */}
      <div className="space-y-3">
        {(searchQuery ? students.filter((s) => s.name.includes(searchQuery)) : students).map((student, idx) => {
          const total = getTotal(student, course);
          const bonusTotal = getBonusTotal(student, course.maxBonus);
          const grade = getGrade(total, maxTotal);
          const letter = grade.letter.letter;
          const isPositiveBonus = bonusTotal > 0;
          const isNegativeBonus = bonusTotal < 0;

          // Letter badge color by grade family
          const letterBadgeClass = letter.startsWith("A")
            ? "bg-success/15 text-success"
            : letter.startsWith("B")
            ? "bg-primary/15 text-primary"
            : letter.startsWith("C")
            ? "bg-accent/15 text-accent"
            : letter.startsWith("D")
            ? "bg-warning/15 text-warning"
            : "bg-destructive/15 text-destructive";

          const miniCells = [
            {
              key: "exam1",
              label: getLabel(course, "exam1"),
              value: `${student.exam1}`,
              max: course.maxExam1,
              highlight: "bg-muted/50 text-foreground",
            },
            {
              key: "exam2",
              label: getLabel(course, "exam2"),
              value: `${student.exam2}`,
              max: course.maxExam2,
              highlight: "bg-muted/50 text-foreground",
            },
            {
              key: "final",
              label: getLabel(course, "finalExam"),
              value: `${student.finalExam}`,
              max: course.maxFinal,
              highlight: "bg-muted/50 text-foreground",
            },
            {
              key: "participation",
              label: getLabel(course, "participation"),
              value: `${student.participation}`,
              max: course.maxParticipation,
              highlight: "bg-muted/50 text-foreground",
            },
            {
              key: "homework",
              label: getLabel(course, "homework"),
              value: `${student.homework || 0}`,
              max: course.maxHomework ?? 10,
              highlight: "bg-muted/50 text-foreground",
            },
            {
              key: "bonus",
              label: getLabel(course, "bonus"),
              value: isPositiveBonus ? `+${bonusTotal}` : `${bonusTotal}`,
              max: course.maxBonus,
              highlight: isPositiveBonus
                ? "bg-success/10 text-success"
                : isNegativeBonus
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50 text-foreground",
            },
          ];

          // Absences
          const absenceIndices: number[] = [];
          (student.attendance || []).forEach((present, i) => {
            if (present === false) absenceIndices.push(i);
          });
          const absenceCount = absenceIndices.length;
          const absenceDates = absenceIndices
            .map((i) => course.lectures?.[i]?.date)
            .filter(Boolean) as string[];
          const fmtDate = (d: string) => {
            try {
              return new Date(d).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric" });
            } catch {
              return d;
            }
          };


          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header row: name + letter badge on right, total on left */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-display text-xs font-bold ${letterBadgeClass}`}
                    dir="ltr"
                  >
                    {letter}
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground truncate">{student.name}</h3>
                </div>
                <div className="flex items-baseline gap-2 font-display">
                  <span className="text-2xl font-bold text-primary">{total}</span>
                  <span className="text-xs text-muted-foreground">/ {maxTotal}</span>
                </div>
              </div>

              {/* Mini metric cards — matches Exams tabs order */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {miniCells.map((cell) => (
                  <div
                    key={cell.key}
                    className={`rounded-xl px-2 py-2 text-center ${cell.highlight}`}
                  >
                    <p className="mb-0.5 text-[10px] opacity-70 truncate">{cell.label}</p>
                    <p className="font-display text-sm font-bold leading-none">{cell.value}</p>
                    <p className="mt-0.5 text-[9px] opacity-50">من {cell.max}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
