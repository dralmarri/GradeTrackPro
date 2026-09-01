import { useState, useEffect } from "react";
import { Student, Course, getLabel } from "@/types/student";
import { getBonusTotal, getMaxTotal, getPercentage, getTotal } from "@/lib/excel";
import { motion } from "framer-motion";
import { User, TrendingUp, TrendingDown, Award, Search, BarChart3, Trophy, ChevronDown } from "lucide-react";
import { GradeTier, LetterTier, loadGradeTiers, loadLetterTiers, getTierFor, getLetterFor } from "@/lib/gradeTiers";
import { useLanguage } from "@/hooks/useLanguage";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface StudentStatusProps {
  students: Student[];
  course: Course;
}

export default function StudentStatus({ students, course }: StudentStatusProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [tiers, setTiers] = useState<GradeTier[]>(loadGradeTiers());
  const [letterTiers, setLetterTiers] = useState<LetterTier[]>(loadLetterTiers());
  // Card details (per-component breakdown + absences) stay collapsed by
  // default so the list is scannable at a glance; expand one student at a
  // time to dig in.
  const [expandedId, setExpandedId] = useState<string | null>(null);


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

  // Grade-letter distribution — built from this course's real, user-configured
  // letter scale (letterTiers) rather than any invented buckets.
  const colorVarByClass: Record<string, string> = {
    "text-success": "hsl(var(--success))",
    "text-primary": "hsl(var(--primary))",
    "text-accent": "hsl(var(--accent))",
    "text-warning": "hsl(var(--warning))",
    "text-destructive": "hsl(var(--destructive))",
  };
  const letterDistribution = [...letterTiers]
    .sort((a, b) => b.minPercent - a.minPercent)
    .map((lt) => ({
      letter: lt.letter,
      fill: colorVarByClass[lt.color] || "hsl(var(--primary))",
      count: totals.filter((t) => getLetterFor(getPercentage(t, maxTotal), letterTiers).letter === lt.letter).length,
    }));

  // Top students by real computed total (ties broken by original order).
  const topStudents = students
    .map((s, i) => ({ student: s, total: totals[i] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.min(3, students.length));

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
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon size={16} />
            </div>
            <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Grade distribution */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">توزيع التقديرات</h3>
        </div>
        <div className="h-40 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={letterDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="letter"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value}`, "عدد الطلبة"]}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {letterDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top students */}
      {topStudents.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">أعلى الطلبة تحصيلاً</h3>
          </div>
          <div className="space-y-2">
            {topStudents.map(({ student, total }, i) => (
              <div key={student.id} className="flex items-center gap-3 rounded-xl bg-muted/40 p-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-display text-sm font-semibold text-foreground">
                  {student.name}
                </span>
                <span className="font-display text-sm font-bold text-primary" dir="ltr">
                  {total} / {maxTotal}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          const bonusOn = course.bonusEnabled !== false;
          const isExpanded = expandedId === student.id;
          const isPositiveBonus = bonusTotal > 0;
          const isNegativeBonus = bonusTotal < 0;

          const letterBadgeClass = letter.startsWith("A")
            ? "bg-success/15 text-success"
            : letter.startsWith("B")
            ? "bg-primary/15 text-primary"
            : letter.startsWith("C")
            ? "bg-accent/15 text-accent"
            : letter.startsWith("D")
            ? "bg-warning/15 text-warning"
            : "bg-destructive/15 text-destructive";

          const hidden = new Set(course.hiddenComponents || []);
          const miniCells: { key: string; label: string; value: string; max: number; highlight: string }[] = [];
          if (!hidden.has("exam1")) miniCells.push({ key: "exam1", label: getLabel(course, "exam1"), value: `${student.exam1}`, max: course.maxExam1, highlight: "bg-muted/50 text-foreground" });
          if (!hidden.has("exam2")) miniCells.push({ key: "exam2", label: getLabel(course, "exam2"), value: `${student.exam2}`, max: course.maxExam2, highlight: "bg-muted/50 text-foreground" });
          if (!hidden.has("finalExam")) miniCells.push({ key: "final", label: getLabel(course, "finalExam"), value: `${student.finalExam}`, max: course.maxFinal, highlight: "bg-muted/50 text-foreground" });
          if (!hidden.has("participation")) miniCells.push({ key: "participation", label: getLabel(course, "participation"), value: `${student.participation}`, max: course.maxParticipation, highlight: "bg-muted/50 text-foreground" });
          if (!hidden.has("homework")) miniCells.push({ key: "homework", label: getLabel(course, "homework"), value: `${student.homework || 0}`, max: course.maxHomework ?? 10, highlight: "bg-muted/50 text-foreground" });
          for (const c of (course.customComponents || [])) {
            miniCells.push({
              key: c.key,
              label: c.label,
              value: `${student.customScores?.[c.key] || 0}`,
              max: c.max,
              highlight: "bg-muted/50 text-foreground",
            });
          }
          if (bonusOn) {
            miniCells.push({
              key: "bonus",
              label: getLabel(course, "bonus"),
              value: isPositiveBonus ? `+${bonusTotal}` : `${bonusTotal}`,
              max: course.maxBonus,
              highlight: isPositiveBonus
                ? "bg-success/10 text-success"
                : isNegativeBonus
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50 text-foreground",
            });
          }

          // Only the REQUIRED components (excludes bonus, which is extra
          // credit, not something everyone is expected to have) decide
          // whether this student is "fully graded". A component counts as
          // entered once its score is > 0 — same heuristic already used for
          // the "graded" count on the Grades tab, kept consistent here.
          const requiredCells = miniCells.filter((c) => c.key !== "bonus");
          const gradedCells = requiredCells.filter((c) => Number(c.value) > 0);
          const isFullyGraded = requiredCells.length > 0 && gradedCells.length === requiredCells.length;
          // While partially graded, show the score out of what's ACTUALLY
          // been recorded so far (e.g. "18 / 20" after only the first exam),
          // never out of the course's full 100 — a partial score read
          // against the full total looks like a near-failing grade for a
          // student who's only sat one exam.
          const gradedMax = gradedCells.reduce((s, c) => s + c.max, 0);
          const gradedSum = gradedCells.reduce((s, c) => s + Number(c.value), 0) + (bonusOn ? bonusTotal : 0);
          // Nothing recorded at all (not even bonus points) → don't show a
          // score or a letter grade — a new student defaults to all zeros,
          // which isn't the same as having earned a zero.
          const hasAnyGrade = gradedCells.length > 0 || bonusTotal !== 0;

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
              return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
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
              className="rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
            >
              {/* Compact row, always visible: name + total (or "not graded
                  yet") + an expand toggle for the breakdown/absences. No
                  letter grade or emoji shown until something is actually
                  entered — avoids marking every new student as failing. */}
              <button
                type="button"
                onClick={() => setExpandedId((v) => (v === student.id ? null : student.id))}
                className="flex w-full items-center justify-between gap-3 p-4 text-start"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isFullyGraded && grade.tier?.emoji && (
                    <span className="shrink-0 text-xl leading-none" aria-hidden>
                      {grade.tier.emoji}
                    </span>
                  )}
                  {isFullyGraded && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 font-display text-xs font-bold ${letterBadgeClass}`}
                      dir="ltr"
                    >
                      {letter}
                    </span>
                  )}
                  <h3 className="truncate font-display text-base font-bold text-foreground">{student.name}</h3>
                  {absenceCount > 0 && (
                    <span className="flex shrink-0 items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                      {absenceCount}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isFullyGraded ? (
                    // All required components entered — the final score,
                    // out of the course's real full total.
                    <span className="flex items-baseline gap-1 font-display" dir="ltr">
                      <span className="text-xl font-bold text-primary">{total}</span>
                      <span className="text-xs text-muted-foreground">/ {maxTotal}</span>
                    </span>
                  ) : hasAnyGrade ? (
                    // Some, but not all, components entered — show the score
                    // out of only what's been recorded so far (never against
                    // the full 100), plus a "partial" label so it's clear
                    // this isn't the final grade.
                    <span className="flex items-center gap-1.5">
                      <span className="flex items-baseline gap-1 font-display" dir="ltr">
                        <span className="text-xl font-bold text-foreground">{gradedSum}</span>
                        <span className="text-xs text-muted-foreground">/ {gradedMax}</span>
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        جزئي
                      </span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      لم تُرصد الدرجات بعد
                    </span>
                  )}
                  <ChevronDown
                    size={16}
                    className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-3 border-t border-border p-4 pt-3">
                  {/* Mini metric cards — matches Exams tabs order */}
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {miniCells.map((cell) => (
                      <div
                        key={cell.key}
                        className={`rounded-xl px-2 py-2 text-center ${cell.highlight}`}
                      >
                        <p className="mb-1 truncate text-[10px] opacity-70">{cell.label}</p>
                        <p className="font-display text-xl font-extrabold leading-none">{cell.value}</p>
                        <p className="mt-1 text-[9px] opacity-50">من {cell.max}</p>
                      </div>
                    ))}
                  </div>

                  {/* Absences */}
                  {absenceCount === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-success">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                      <span>لا توجد غيابات</span>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-destructive">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                        الغيابات: <span className="font-display font-bold">{absenceCount}</span>
                      </p>
                      {absenceDates.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {absenceDates.map((d, i) => (
                            <span
                              key={i}
                              className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                            >
                              {fmtDate(d)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
