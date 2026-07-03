import { useRef, useState } from "react";
import { Course, Student } from "@/types/student";
import { OmrExam, gradeOmr, OmrScanResult, choiceLabelsFor } from "@/types/exam";
import { scanAnswerSheet } from "@/lib/omr/scan";
import { useOmrScans } from "@/hooks/useOmrScans";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Camera, Loader2, X, CheckCircle2, AlertTriangle, UserRound, RotateCcw,
} from "lucide-react";


interface Props {
  exam: OmrExam;
  course: Course;
  open: boolean;
  onClose: () => void;
  onApplyScore: (studentId: string, targetComponent: string, score: number) => Promise<void>;
  onLearnNumber: (studentId: string, studentNumber: string) => Promise<void>;
}

export default function OmrScanDialog({ exam, course, open, onClose, onApplyScore, onLearnNumber }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<OmrScanResult | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [nameCrop, setNameCrop] = useState<string | null>(null);
  const [civilCrop, setCivilCrop] = useState<string | null>(null);
  // questions the engine flagged (blank / double-marked) — professor sets the
  // intended answer from the row photo and the score is recomputed
  const [reviewItems, setReviewItems] = useState<{ q: number; imageUrl?: string; reason: "blank" | "multiple" }[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const { addScan } = useOmrScans(null); // used for recording only

  if (!open) return null;

  const reset = () => { setResult(null); setSelectedStudentId(""); setPhoto(null); setNameCrop(null); setCivilCrop(null); setReviewItems([]); setAnswers([]); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanning(true);
    setPhoto(file);
    try {
      const raw = await scanAnswerSheet(file, exam);
      const graded = gradeOmr(exam, raw.answers);

      // auto-match by bubbled number against learned student numbers
      const clean = raw.studentNumber && !raw.studentNumber.includes("؟") ? raw.studentNumber : "";
      const match = clean ? course.students.find((st) => st.studentNumber === clean) : undefined;
      const res: OmrScanResult = {
        studentNumber: raw.studentNumber,
        matchedStudentId: match?.id ?? null,
        ...graded,
      };
      setResult(res);
      setAnswers(raw.answers);
      setReviewItems(raw.review || []);
      setNameCrop(raw.nameImageUrl || null);
      setCivilCrop(raw.civilIdImageUrl || null);
      if (match) setSelectedStudentId(match.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (ar ? "فشل المسح" : "Scan failed"));
    } finally {
      setScanning(false);
    }
  };

  // professor picks the intended answer for a flagged question → regrade
  const overrideAnswer = (q: number, c: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[q] = next[q] === c ? -1 : c;
      const graded = gradeOmr(exam, next);
      setResult((r) => (r ? { ...r, ...graded } : r));
      return next;
    });
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
      // learn: bind the clean bubbled number to this student for future auto-match
      const cleanNum = result.studentNumber && !result.studentNumber.includes("؟") ? result.studentNumber : "";
      if (cleanNum && s && s.studentNumber !== cleanNum) {
        await onLearnNumber(s.id, cleanNum);
      }
      // archive the sheet photo + result for later review
      const archived = await addScan({
        examId: exam.id,
        studentId: selectedStudentId,
        studentName: s?.name || "",
        studentNumber: cleanNum,
        score: result.score,
        rawCorrect: result.rawCorrect,
        answers: result.answers,
        photo,
      }).catch(() => false);
      if (!archived) {
        toast.warning(ar ? "رُصدت الدرجة لكن تعذّرت أرشفة صورة الورقة" : "Score saved, but archiving the sheet photo failed");
      }
      toast.success(
        ar
          ? `رُصدت الدرجة ${result.score}/${exam.maxScore} للطالب ${s?.name ?? ""}`
          : `Scored ${result.score}/${exam.maxScore} for ${s?.name ?? ""}`,
      );
      reset(); // ready to scan the next sheet
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : (ar ? "فشل رصد الدرجة — حاول مجدداً" : "Failed to apply score — try again"));
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

            {/* flagged questions review */}
            {reviewItems.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-amber-400/60 bg-amber-500/5 p-4 shadow-sm">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  {ar
                    ? `${reviewItems.length} سؤالاً يحتاج مراجعتك — انظر صورة السطر وحدد قصد الطالب:`
                    : `${reviewItems.length} question(s) need your review — see the row photo and set the intent:`}
                </p>
                {reviewItems.map((it) => (
                  <div key={it.q} className="rounded-xl bg-background p-3">
                    <p className="mb-1.5 text-xs font-bold text-foreground">
                      {ar ? `سؤال ${it.q + 1}` : `Q${it.q + 1}`}
                      <span className="ms-2 font-normal text-muted-foreground">
                        {it.reason === "blank"
                          ? (ar ? "لم يُرصد تظليل" : "no mark detected")
                          : (ar ? "تظليل متعدد / شطب" : "multiple marks / cross-out")}
                      </span>
                    </p>
                    {it.imageUrl && (
                      <img
                        src={it.imageUrl}
                        alt={`question ${it.q + 1}`}
                        className="mb-2 w-full rounded-lg border border-border bg-white object-contain"
                      />
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {choiceLabelsFor(exam, it.q).map((label, ci) => (
                        <button
                          key={ci}
                          onClick={() => overrideAnswer(it.q, ci)}
                          className={cn(
                            "min-w-10 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                            answers[it.q] === ci
                              ? "border-success bg-success/15 text-success"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => overrideAnswer(it.q, answers[it.q])}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                          answers[it.q] < 0
                            ? "border-muted-foreground bg-muted text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {ar ? "بلا إجابة" : "No answer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* student number + picker */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              {(nameCrop || civilCrop) && (
                <div className="mb-3 space-y-2">
                  {nameCrop && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold text-muted-foreground">
                        {ar ? "الاسم كما كُتب في الورقة — اقرأه واختر الطالب المطابق:" : "Name as written — read it and pick the student:"}
                      </p>
                      <img
                        src={nameCrop}
                        alt="handwritten name"
                        className="w-full rounded-lg border border-border bg-white object-contain"
                      />
                    </div>
                  )}
                  {civilCrop && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold text-muted-foreground">
                        {ar ? "الرقم المدني كما كُتب:" : "Civil ID as written:"}
                      </p>
                      <img
                        src={civilCrop}
                        alt="civil id"
                        className="w-full rounded-lg border border-border bg-white object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <UserRound size={14} />
                {ar ? `رقم الطالب المقروء: ${result.studentNumber || "—"}` : `Read student #: ${result.studentNumber || "—"}`}
                {result.matchedStudentId && (
                  <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                    {ar ? "تم التعرف تلقائياً ✓" : "Auto-matched ✓"}
                  </span>
                )}
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
                      {r.marked >= 0 ? choiceLabelsFor(exam, r.questionIndex)[r.marked] : r.marked === -1 ? "—" : "؟"}
                      {" / "}
                      {exam.answerKey[r.questionIndex] >= 0 ? choiceLabelsFor(exam, r.questionIndex)[exam.answerKey[r.questionIndex]] : "؟"}
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
