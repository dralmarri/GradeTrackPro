import { useMemo } from "react";
import { OmrExam, choiceLabelsFor } from "@/types/exam";
import { useOmrScans } from "@/hooks/useOmrScans";
import { useLanguage } from "@/hooks/useLanguage";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Loader2, BarChart3, Download, TrendingUp, TrendingDown, Users } from "lucide-react";

interface Props {
  exam: OmrExam;
  open: boolean;
  onClose: () => void;
}

export default function OmrStatsDialog({ exam, open, onClose }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { scans, loading } = useOmrScans(open ? exam.id : null);

  // keep only the LATEST scan per student (rescans replace older attempts)
  const latest = useMemo(() => {
    const byStudent = new Map<string, typeof scans[number]>();
    // scans are newest-first; keep first occurrence per student
    for (const s of scans) {
      const key = s.studentId || s.id;
      if (!byStudent.has(key)) byStudent.set(key, s);
    }
    return Array.from(byStudent.values());
  }, [scans]);

  const stats = useMemo(() => {
    if (!latest.length) return null;
    const scores = latest.map((s) => s.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passCount = latest.filter((s) => s.score >= exam.maxScore / 2).length;

    // per-question wrong/blank rates vs the answer key
    const qStats = Array.from({ length: exam.questionCount }, (_, qi) => {
      let wrong = 0, blank = 0, correct = 0;
      for (const s of latest) {
        const a = s.answers[qi];
        if (a === undefined) continue;
        if (exam.answerKey[qi] >= 0 && a === exam.answerKey[qi]) correct++;
        else if (a === -1) blank++;
        else wrong++;
      }
      const total = correct + wrong + blank;
      return { qi, correct, wrong, blank, wrongRate: total ? (wrong + blank) / total : 0 };
    });
    const hardest = [...qStats].sort((a, b) => b.wrongRate - a.wrongRate).slice(0, 5).filter((q) => q.wrongRate > 0);

    return { avg, max, min, passCount, count: latest.length, qStats, hardest };
  }, [latest, exam]);

  if (!open) return null;

  const exportExcel = () => {
    const rows = latest.map((s, i) => ({
      "#": i + 1,
      "اسم الطالب": s.studentName,
      "رقم الطالب": s.studentNumber || "",
      "الدرجة": s.score,
      "الإجابات الصحيحة": s.rawCorrect,
      "التاريخ": new Date(s.createdAt).toLocaleString("ar-EG-u-nu-latn"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النتائج");
    XLSX.writeFile(wb, `${exam.title}_نتائج_المسح.xlsx`);
    toast.success(ar ? "تم تصدير النتائج" : "Exported");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <BarChart3 size={18} className="text-primary" />
            {ar ? "إحصائيات الاختبار" : "Exam statistics"} · {exam.title}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <BarChart3 size={28} className="mb-2 opacity-50" />
            <p className="text-sm font-semibold">{ar ? "لا توجد نتائج بعد" : "No results yet"}</p>
            <p className="mt-1 text-xs">{ar ? "صحّح أوراق الطلاب أولاً وستظهر الإحصائيات هنا" : "Grade some sheets first"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* summary cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <Users size={14} className="mx-auto mb-1 text-muted-foreground" />
                <p className="font-display text-xl font-extrabold text-foreground">{stats.count}</p>
                <p className="text-[11px] text-muted-foreground">{ar ? "ورقة مصححة" : "Graded"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <BarChart3 size={14} className="mx-auto mb-1 text-primary" />
                <p className="font-display text-xl font-extrabold text-primary">{stats.avg.toFixed(1)}</p>
                <p className="text-[11px] text-muted-foreground">{ar ? "المتوسط" : "Average"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <TrendingUp size={14} className="mx-auto mb-1 text-success" />
                <p className="font-display text-xl font-extrabold text-success">{stats.max}</p>
                <p className="text-[11px] text-muted-foreground">{ar ? "أعلى درجة" : "Highest"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
                <TrendingDown size={14} className="mx-auto mb-1 text-destructive" />
                <p className="font-display text-xl font-extrabold text-destructive">{stats.min}</p>
                <p className="text-[11px] text-muted-foreground">{ar ? "أدنى درجة" : "Lowest"}</p>
              </div>
            </div>

            {/* pass rate bar */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">{ar ? "نسبة النجاح (٥٠٪ فأكثر)" : "Pass rate (≥50%)"}</span>
                <span className="text-success">{Math.round((stats.passCount / stats.count) * 100)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${(stats.passCount / stats.count) * 100}%` }}
                />
              </div>
            </div>

            {/* hardest questions */}
            {stats.hardest.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold text-muted-foreground">
                  {ar ? "أصعب الأسئلة (الأعلى خطأً)" : "Hardest questions"}
                </p>
                <div className="space-y-2">
                  {stats.hardest.map((q) => (
                    <div key={q.qi} className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-center text-sm font-extrabold text-foreground">{q.qi + 1}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", q.wrongRate > 0.6 ? "bg-destructive" : "bg-amber-500")}
                          style={{ width: `${q.wrongRate * 100}%` }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-end text-[11px] font-semibold text-muted-foreground">
                        {Math.round(q.wrongRate * 100)}% {ar ? "أخطؤوا" : "wrong"}
                      </span>
                      <span className="w-14 shrink-0 text-end text-[11px] text-muted-foreground">
                        {ar ? "الصحيح:" : "Key:"} <b className="text-success">{exam.answerKey[q.qi] >= 0 ? choiceLabelsFor(exam, q.qi)[exam.answerKey[q.qi]] : "؟"}</b>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {ar ? "💡 هذه المواضيع تحتاج إعادة شرح — أكثر الطلاب أخطؤوا فيها" : "💡 Consider re-teaching these topics"}
                </p>
              </div>
            )}

            {/* export */}
            <button
              onClick={exportExcel}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-bold text-foreground hover:bg-muted"
            >
              <Download size={15} />
              {ar ? "تصدير النتائج إلى Excel" : "Export to Excel"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
