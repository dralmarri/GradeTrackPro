import { useRef, useState, useEffect } from "react";
import { Course, Student } from "@/types/student";
import { OmrExam, gradeOmr, OmrScanResult, choiceLabelsFor } from "@/types/exam";
import { scanAnswerSheet } from "@/lib/omr/scan";
import { examCode } from "@/lib/omr/layout";
import { useOmrScans } from "@/hooks/useOmrScans";
import { useLanguage } from "@/hooks/useLanguage";
import { isNativeApp } from "@/lib/platform";
import { Camera as CapCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Camera, Loader2, X, CheckCircle2, AlertTriangle, UserRound, RotateCcw, Search,
} from "lucide-react";


interface Props {
  exam: OmrExam;
  course: Course;
  open: boolean;
  onClose: () => void;
  onApplyScore: (studentId: string, targetComponent: string, score: number) => Promise<void>;
  onLearnNumber: (studentId: string, studentNumber: string) => Promise<void>;
  // The course's other exams — used only to recognise "this photo is
  // actually a different exam's sheet" from the machine-readable code
  // printed on every sheet, and offer a one-tap switch instead of the
  // professor having to notice and re-pick manually.
  allExams?: OmrExam[];
  onSwitchExam?: (exam: OmrExam) => void;
}

export default function OmrScanDialog({ exam, course, open, onClose, onApplyScore, onLearnNumber, allExams, onSwitchExam }: Props) {
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
  // which flagged questions the professor actually looked at and set an
  // intent for — used to persist "needs review" for anything left untouched
  const [resolvedQs, setResolvedQs] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [wrongExamMatch, setWrongExamMatch] = useState<OmrExam | null>(null);
  // which question's choice-picker is expanded in the answer-details list
  const [editingQ, setEditingQ] = useState<number | null>(null);
  const { addScan } = useOmrScans(null); // used for recording only

  const reset = () => { setResult(null); setSelectedStudentId(""); setPhoto(null); setNameCrop(null); setCivilCrop(null); setReviewItems([]); setAnswers([]); setResolvedQs(new Set()); setStudentSearch(""); setWrongExamMatch(null); setEditingQ(null); };

  // Shared by the initial photo upload AND by re-analysing the same photo
  // after switching to the exam the sheet's printed code actually matches —
  // no need to make the professor re-take/re-upload the picture.
  const runScan = async (file: File | Blob, examForScan: OmrExam) => {
    setScanning(true);
    try {
      const raw = await scanAnswerSheet(file, examForScan);

      // The sheet's machine-readable code doesn't match the exam currently
      // selected — most likely the professor scanned a different exam's
      // sheet than the one they picked. Look for the exam it actually
      // belongs to among the course's other exams and offer to switch,
      // instead of silently grading it against the wrong answer key.
      if (raw.detectedExamCode !== examCode(examForScan.id) && allExams) {
        const match = allExams.find((e) => e.id !== examForScan.id && examCode(e.id) === raw.detectedExamCode);
        setWrongExamMatch(match || null);
        if (match) {
          toast.warning(
            ar
              ? `يبدو أن هذه الورقة من اختبار «${match.title}» — راجع التنبيه أدناه`
              : `This sheet looks like it's from "${match.title}" — see the notice below`,
            { duration: 8000 },
          );
        }
      } else {
        setWrongExamMatch(null);
      }

      const graded = gradeOmr(examForScan, raw.answers);

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

  // A "switch to the matched exam" click updates the parent's selected exam
  // (the `exam` prop below); this effect notices that and re-runs the SAME
  // captured photo against the new exam — it never re-fires on the initial
  // scan, since `photo` is still null at that point.
  useEffect(() => {
    if (!photo) return;
    runScan(photo, exam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]);

  if (!open) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPhoto(file);
    await runScan(file, exam);
  };

  // On iOS/Android the plain HTML file input's `capture` attribute is
  // unreliable inside a WKWebView (no native picker, no permission prompt —
  // it silently does nothing). The native Capacitor Camera plugin talks to
  // the OS directly and reliably triggers the permission prompt + camera UI,
  // so use it whenever running inside the native app shell; the file input
  // stays as the (working) fallback for the web app.
  const capture = async () => {
    if (!isNativeApp()) {
      fileRef.current?.click();
      return;
    }
    try {
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
      if (!photo.webPath) return;
      const blob = await (await fetch(photo.webPath)).blob();
      setPhoto(blob);
      await runScan(blob, exam);
    } catch (err: unknown) {
      // User cancelling the camera sheet also lands here — only surface
      // real failures, not a cancelled capture.
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(msg)) return;
      toast.error(ar ? "تعذّر فتح الكاميرا" : "Couldn't open the camera");
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
    setResolvedQs((prev) => new Set(prev).add(q));
  };

  // flagged questions the professor never actually looked at — these get
  // archived with a "needs review" flag so they can be found later
  const unresolvedCount = reviewItems.filter((it) => !resolvedQs.has(it.q)).length;

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
        needsReview: unresolvedCount > 0,
        reviewCount: unresolvedCount,
      }).catch((e: unknown) => ({ ok: false, imageFailed: false, error: e instanceof Error ? e.message : String(e) }));
      if (!archived.ok) {
        // surface the real reason instead of a generic message — silently
        // swallowing it here is exactly what made a real archiving failure
        // undiagnosable before.
        toast.warning(
          ar ? `رُصدت الدرجة لكن تعذّرت أرشفة الورقة: ${archived.error || "سبب غير معروف"}` : `Score saved, but archiving failed: ${archived.error || "unknown reason"}`,
          { duration: 8000 },
        );
      } else if (archived.imageFailed) {
        toast.warning(ar ? "رُصدت الدرجة والنتيجة، لكن تعذّر رفع صورة الورقة نفسها" : "Score and result saved, but the sheet photo itself failed to upload");
      }
      if (unresolvedCount > 0) {
        toast.warning(
          ar
            ? `رُصدت الدرجة، لكن ${unresolvedCount} سؤالاً لم تُراجعه — سيظهر في سجل المسح بعلامة "يحتاج مراجعة"`
            : `Score saved, but ${unresolvedCount} question(s) were left unreviewed — flagged in the scan history as "needs review"`,
        );
      } else {
        toast.success(
          ar
            ? `رُصدت الدرجة ${result.score}/${exam.maxScore} للطالب ${s?.name ?? ""}`
            : `Scored ${result.score}/${exam.maxScore} for ${s?.name ?? ""}`,
        );
      }
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
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-background p-5 sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Camera size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold leading-none text-foreground">
              {ar ? "تصحيح بالكاميرا" : "Scan & grade"}
            </h3>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              OMR · {exam.title}
            </p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70">
            <X size={17} />
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
              onClick={capture}
              disabled={scanning}
              className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] border-4 border-card bg-foreground/90 shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-background/40">
                <div className="h-56 w-44 rounded-xl border-2 border-primary/80 sm:h-64 sm:w-52" />
                <p className="mt-5 rounded-full bg-black/40 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
                  {ar ? "قم بمحاذاة ورقة الإجابة داخل المربع" : "Align the answer sheet inside the box"}
                </p>
              </div>
              <div className="absolute bottom-6 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/90 transition-transform group-hover:scale-105 group-active:scale-95">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground">
                    {scanning ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                  </span>
                </span>
              </div>
            </button>
            <p className="text-center text-xs font-bold text-muted-foreground">
              {scanning ? (ar ? "جارٍ التحليل…" : "Analysing…") : (ar ? "التقاط / اختيار صورة" : "Tap to capture / choose photo")}
            </p>
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
            {/* wrong-exam warning — decoded from the sheet's own printed
                code marks, not a guess */}
            {wrongExamMatch && onSwitchExam && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-destructive">
                  <AlertTriangle size={16} />
                  {ar ? "هذه الورقة ليست لهذا الاختبار" : "This sheet isn't for this exam"}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {ar
                    ? `الرمز المطبوع على الورقة يطابق اختبار «${wrongExamMatch.title}» — الدرجة المعروضة أدناه محسوبة بمفتاح الإجابة الخطأ.`
                    : `The sheet's printed code matches "${wrongExamMatch.title}" — the score below was graded with the wrong answer key.`}
                </p>
                <button
                  onClick={() => { onSwitchExam(wrongExamMatch); }}
                  className="w-full rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground hover:brightness-110"
                >
                  {ar ? `التبديل إلى «${wrongExamMatch.title}» وإعادة القراءة` : `Switch to "${wrongExamMatch.title}" and re-read`}
                </button>
              </div>
            )}

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
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-foreground">
                      {ar ? `سؤال ${it.q + 1}` : `Q${it.q + 1}`}
                      <span className="font-normal text-muted-foreground">
                        {it.reason === "blank"
                          ? (ar ? "لم يُرصد تظليل" : "no mark detected")
                          : (ar ? "تظليل متعدد / شطب" : "multiple marks / cross-out")}
                      </span>
                      {resolvedQs.has(it.q) ? (
                        <span className="ms-auto flex items-center gap-1 text-[10px] font-bold text-success">
                          <CheckCircle2 size={12} /> {ar ? "رُوجع" : "reviewed"}
                        </span>
                      ) : (
                        <span className="ms-auto text-[10px] font-bold text-amber-600">
                          {ar ? "لم تُراجع بعد" : "not yet reviewed"}
                        </span>
                      )}
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
                        onClick={() => { if (answers[it.q] !== -1) overrideAnswer(it.q, answers[it.q]); }}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                          answers[it.q] === -1
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

            {/* handwriting reference + searchable student picker */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground">
                <UserRound size={14} />
                {ar ? "طابق الاسم/الرقم المكتوبين مع قائمة الطلاب" : "Match the handwritten name/ID against the roster"}
              </p>
              {(nameCrop || civilCrop) && (
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {nameCrop && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold text-muted-foreground">
                        {ar ? "الاسم كما كُتب:" : "Name as written:"}
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
                        {ar ? "الرقم الجامعي كما كُتب:" : "Student ID as written:"}
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
              {result.matchedStudentId && (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-success">
                    {ar ? "تلميح: رقم متطابق مع بيانات طالب محفوظة" : "Hint: number matches a saved student record"}
                  </span>
                </p>
              )}

              {/* searchable roster */}
              <div className="relative mb-2">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder={ar ? "ابحث عن اسم الطالب…" : "Search student name…"}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pr-9 pl-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-1.5">
                {course.students
                  .filter((s: Student) => !studentSearch.trim() || s.name.includes(studentSearch.trim()))
                  .map((s: Student) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudentId(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-start text-sm font-semibold transition-colors",
                        selectedStudentId === s.id
                          ? "bg-primary/15 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      <span className="truncate">{s.name}</span>
                      {selectedStudentId === s.id && <CheckCircle2 size={15} className="shrink-0" />}
                    </button>
                  ))}
                {course.students.filter((s: Student) => !studentSearch.trim() || s.name.includes(studentSearch.trim())).length === 0 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">{ar ? "لا نتائج" : "No results"}</p>
                )}
              </div>
            </div>

            {/* per-question detail — every question is correctable here, not
                just the ones the scanner itself flagged. A confidently but
                WRONGLY read bubble (student filled B, scanner mis-sampled it
                as A) never gets flagged as "needs review", so the professor
                needs a way to fix any answer by hand, not only the
                ambiguous ones. Tapping a question expands the same
                choice-picker used for flagged questions. */}
            <details className="rounded-2xl border border-border bg-card p-4 shadow-sm" open={reviewItems.length > 0}>
              <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
                {ar ? "تفاصيل الإجابات (اضغط أي سؤال لتصحيحه يدوياً)" : "Answer details (tap any question to correct it by hand)"}
              </summary>
              <div className="mt-3 space-y-1">
                {result.results.map((r) => {
                  const isEditing = editingQ === r.questionIndex;
                  return (
                    <div key={r.questionIndex} className="rounded-lg">
                      <button
                        type="button"
                        onClick={() => setEditingQ((v) => (v === r.questionIndex ? null : r.questionIndex))}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                          isEditing ? "ring-1 ring-primary" : "",
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
                      </button>
                      {isEditing && (
                        <div className="mt-1 flex flex-wrap gap-1.5 rounded-lg bg-muted/40 p-2">
                          {choiceLabelsFor(exam, r.questionIndex).map((label, ci) => (
                            <button
                              key={ci}
                              onClick={() => { overrideAnswer(r.questionIndex, ci); setEditingQ(null); }}
                              className={cn(
                                "min-w-9 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors",
                                answers[r.questionIndex] === ci
                                  ? "border-success bg-success/15 text-success"
                                  : "border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              if (answers[r.questionIndex] !== -1) overrideAnswer(r.questionIndex, answers[r.questionIndex]);
                              setEditingQ(null);
                            }}
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors",
                              answers[r.questionIndex] === -1
                                ? "border-muted-foreground bg-muted text-foreground"
                                : "border-border text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {ar ? "بلا إجابة" : "No answer"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
