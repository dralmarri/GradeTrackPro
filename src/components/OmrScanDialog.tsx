import { useRef, useState } from "react";
import { Course, Student } from "@/types/student";
import { OmrExam, gradeOmr, OmrScanResult } from "@/types/exam";
import { scanAnswerSheet } from "@/lib/omr/scan";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Camera, Loader2, X, CheckCircle2, AlertTriangle, UserRound, RotateCcw,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  exam: OmrExam;
  course: Course;
  open: boolean;
  onClose: () => void;
  onApplyScore: (studentId: string, targetComponent: string, score: number) => Promise<void>;
}

export default function OmrScanDialog({ exam, course, open, onClose, onApplyScore }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<OmrScanResult | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [applying, setApplying] = useState(false);

  if (!open) return null;

  const reset = () => { setResult(null); setSelectedStudentId(""); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanning(true);
    try {
      const raw = await scanAnswerSheet(file, exam);
      const graded = gradeOmr(exam, raw.answers);

      // try to auto-match a student by bubbled number (fallback UI select)
      // students have no stored number yet — matching by order isn't safe,
      // so we surface the read number and let the professor pick/confirm.
      const res: OmrScanResult = {
        studentNumber: raw.studentNumber,
        matchedStudentId: null,
        ...graded,
      };
      setResult(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (ar ? "فشل المسح" : "Scan failed"));
    } finally {
      setScanning(false);
    }
  };

  const apply = async () => {
    if (!result || !selectedStudentId) {
      toast.error(ar ? "اختر الطالب أولاً" : "Select the student first");
      return;
    }
    setApplying(true);
    try {
      await onApplyScore(selectedStudentId, exam.targetComponent, result.score);
      const s = course.students.find((st) => st.id === selectedStudentId);
      toast.success(
        ar
          ? `رُصدت الدرجة ${result.score}/${exam.maxScore} للطالب ${s?.name ?? ""}`
          : `Scored ${result.score}/${exam.maxScore} for ${s?.name ?? ""}`,
      );
      reset(); // ready to scan the next sheet
    } finally {
      setApplying(false);
    }
  };

  const blanks = result?.results.filter((r) => r.marked === -1).length ?? 0;
  const ambiguous = result?.results.filter((r) => r.marked === -2).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">
            {ar ? "تصحيح بالكاميرا" : "Scan & grade"} · {exam.title}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {!result && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {ar
                ? "صوّر ورقة إجابة الطالب. تأكد أن العلامات السوداء الأربع في الزوايا ظاهرة كاملة وبإضاءة جيدة."
                : "Photograph the student's sheet. Make sure all four black corner marks are visible with good lighting."}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 py-10 text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={36} className="animate-spin" /> : <Camera size={36} />}
              <span className="text-sm font-bold">
                {scanning ? (ar ? "جارٍ التحليل…" : "Analysing…") : (ar ? "التقاط / اختيار صورة" : "Capture / choose photo")}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* score summary */}
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="font-display text-4xl font-extrabold text-primary">
                {result.score}
                <span className="text-lg text-muted-foreground"> / {exam.maxScore}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ar
                  ? `${result.rawCorrect} إجابة صحيحة من ${exam.questionCount}`
                  : `${result.rawCorrect} correct out of ${exam.questionCount}`}
              </p>
              {(blanks > 0 || ambiguous > 0) && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-600">
                  <AlertTriangle size={13} />
                  {ar
                    ? `${blanks} بدون إجابة · ${ambiguous} غامضة (تظليل متعدد)`
                    : `${blanks} blank · ${ambiguous} ambiguous`}
                </p>
              )}
            </div>

            {/* student number + picker */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <UserRound size={14} />
                {ar ? `رقم الطالب المقروء: ${result.studentNumber || "—"}` : `Read student #: ${result.studentNumber || "—"}`}
              </p>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">{ar ? "اختر الطالب…" : "Select student…"}</option>
                {course.students.map((s: Student) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* per-question detail */}
            <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
                {ar ? "تفاصيل الإجابات" : "Answer details"}
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
                {result.results.map((r) => (
                  <div
                    key={r.questionIndex}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-2 py-1 text-[11px] font-semibold",
                      r.correct ? "bg-success/10 text-success" :
                      r.marked === -1 ? "bg-muted text-muted-foreground" :
                      r.marked === -2 ? "bg-amber-500/10 text-amber-600" :
                      "bg-destructive/10 text-destructive",
                    )}
                  >
                    <span>{r.questionIndex + 1}</span>
                    <span>
                      {r.marked >= 0 ? LETTERS[r.marked] : r.marked === -1 ? "—" : "؟"}
                      {" / "}
                      {exam.answerKey[r.questionIndex] >= 0 ? LETTERS[exam.answerKey[r.questionIndex]] : "؟"}
                    </span>
                  </div>
                ))}
              </div>
            </details>

            {/* actions */}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-bold text-foreground hover:bg-muted"
              >
                <RotateCcw size={15} />
                {ar ? "مسح ورقة أخرى" : "Scan another"}
              </button>
              <button
                onClick={apply}
                disabled={applying || !selectedStudentId}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {applying ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {ar ? "رصد الدرجة" : "Apply score"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
