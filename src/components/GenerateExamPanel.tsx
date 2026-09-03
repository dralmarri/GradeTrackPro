// Generates exam forms (with auto answer keys) directly from the saved
// question bank. Split out of QuestionBankPage so it can be placed under
// "نماذج الاختبارات" (exam forms) instead of nested inside "بنك الأسئلة"
// (question bank) — it PRODUCES an exam, so a professor looking for exam
// tools shouldn't have to open the bank-management section to find it.
// Reads the same bank data via its own useQuestionBank() call.
import { useMemo, useState } from "react";
import { Course } from "@/types/student";
import { OmrExam, ChoiceCount } from "@/types/exam";
import { DIFFICULTY_LABELS, GeneratedForm, generateForms, seededShuffle } from "@/types/questionBank";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { printQuestionPaper } from "@/lib/omr/questionPaper";
import { printAnswerSheet, SheetHeader } from "@/lib/omr/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Wand2, Loader2, FileText, Printer, ChevronRight } from "lucide-react";

interface Props {
  course: Course;
  bankCourseIds: string[];
  sheetHeader: () => SheetHeader;
  componentOptions: { key: string; label: string }[];
  onCreateExam: (input: {
    title: string; questionCount: number; choiceCount: ChoiceCount;
    targetComponent: string; maxScore: number; studentIdDigits: number;
    sections?: { questionCount: number; choiceCount: ChoiceCount }[];
    version?: string; idMode?: "bubbles" | "written";
    essayQuestions?: { text: string; points: number }[];
  }) => Promise<string>;
  onSetAnswerKey: (examId: string, key: number[], weights?: number[]) => Promise<void>;
  buildExam: (
    id: string, form: GeneratedForm, title: string, targetComponent: string, maxScore: number,
    idMode: "bubbles" | "written", essayQuestions?: { text: string; points: number }[],
  ) => OmrExam;
}

export default function GenerateExamPanel({ course, bankCourseIds, sheetHeader, componentOptions, onCreateExam, onSetAnswerKey, buildExam }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { questions, loading } = useQuestionBank(course.id, bankCourseIds);

  const [open, setOpen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genMode, setGenMode] = useState<"full" | "paper">("full");
  const [genChapters, setGenChapters] = useState<Set<string>>(new Set());
  const [genTopics, setGenTopics] = useState<Set<string>>(new Set());
  const [genPickMode, setGenPickMode] = useState<"random" | "manual">("random");
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set());
  const [manualPoints, setManualPoints] = useState<Record<string, number>>({});
  const [bulkPoints, setBulkPoints] = useState(1);
  const [genForms, setGenForms] = useState(2);
  const [genTarget, setGenTarget] = useState("exam1");
  const [genMax, setGenMax] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ exam: OmrExam | null; form: GeneratedForm }[]>([]);

  const genPool = useMemo(
    () => questions.filter((q) =>
      (genChapters.size === 0 || genChapters.has(q.chapter || "")) &&
      (genTopics.size === 0 || genTopics.has(q.topic || ""))),
    [questions, genChapters, genTopics],
  );
  const topics = useMemo(
    () => Array.from(new Set(questions.map((q) => q.topic).filter(Boolean))) as string[],
    [questions],
  );
  const chapters = useMemo(
    () => Array.from(new Set(questions.map((q) => q.chapter).filter(Boolean))) as string[],
    [questions],
  );

  const handleGenerate = async () => {
    const pool = genPool;
    if (!genTitle.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (genPickMode === "manual") {
      if (manualSelected.size === 0) {
        toast.error(ar ? "اختر سؤالاً واحداً على الأقل من القائمة" : "Select at least one question"); return;
      }
    } else if (pool.length < genCount) {
      toast.error(ar ? `البنك يحتوي ${pool.length} سؤالاً فقط بهذا التصفية` : `Only ${pool.length} questions match`); return;
    }
    setGenerating(true);
    try {
      const seedBase = (genTitle.trim().length * 2654435761) ^ pool.length;
      const picked = genPickMode === "manual"
        ? pool.filter((q) => manualSelected.has(q.id)).map((q) => ({ ...q, points: manualPoints[q.id] ?? q.points ?? 1 }))
        : seededShuffle(pool, seedBase).slice(0, genCount);
      const forms = generateForms(picked, genForms, seedBase + 17);

      if (genMode === "paper") {
        setGenerated(forms.map((form) => ({ exam: null, form })));
        toast.success(
          ar
            ? `جُهّز ${forms.length} نموذج ورقة أسئلة — اطبعها من الأزرار أدناه`
            : `${forms.length} question paper(s) ready — print below`,
          { duration: 6000 },
        );
        return;
      }

      const out: { exam: OmrExam | null; form: GeneratedForm }[] = [];
      for (const form of forms) {
        const weights = form.questions.map((q) => q.points ?? 1);
        const customWeights = weights.some((w) => w !== 1);
        // maxScore covers only the bubble-graded (OMR) portion — same as
        // before essay questions existed. Essay points are additional,
        // manually-graded marks on top (see OmrScanDialog), so they must
        // NOT feed into gradeOmr()'s proportional-score math via maxScore.
        const maxScore = customWeights ? weights.reduce((a, b) => a + b, 0) : genMax;
        const essayQuestions = form.essayQuestions.map((q) => ({ text: q.text, points: q.points ?? 1 }));
        const id = await onCreateExam({
          title: genTitle.trim(),
          questionCount: form.questions.length,
          // an essay-only form has no bubbled section at all
          choiceCount: form.sections[0]?.choiceCount ?? 4,
          targetComponent: genTarget,
          maxScore,
          studentIdDigits: 10,
          sections: form.sections.length > 1 ? form.sections : undefined,
          version: genForms > 1 ? form.version : undefined,
          idMode: "written",
          essayQuestions: essayQuestions.length ? essayQuestions : undefined,
        });
        if (!id) throw new Error(ar ? "فشل إنشاء الاختبار" : "Failed to create exam");
        await onSetAnswerKey(id, form.answerKey, customWeights ? weights : undefined);
        out.push({
          exam: buildExam(id, form, genTitle.trim(), genTarget, maxScore, "written", essayQuestions),
          form,
        });
      }
      setGenerated(out);
      toast.success(
        ar
          ? `وُلّد ${out.length} نموذج${out.length > 1 ? "ين" : ""} والمفاتيح جاهزة تلقائياً ✓`
          : `Generated ${out.length} form(s) with auto keys ✓`,
        { duration: 6000 },
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل التوليد");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading || questions.length === 0}
        className="flex w-full items-center gap-4 rounded-2xl border border-success/40 bg-success/5 p-4 text-start shadow-sm transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
          <Wand2 size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-success">{ar ? "توليد اختبار من البنك" : "Generate exam from bank"}</span>
          <span className="block text-xs text-muted-foreground">
            {loading
              ? (ar ? "جارٍ التحميل…" : "Loading…")
              : questions.length === 0
              ? (ar ? "أضف أسئلة للبنك أولاً" : "Add questions to the bank first")
              : (ar ? `نماذج أ/ب — ${questions.length} سؤالاً متاحاً` : `Forms A/B — ${questions.length} question(s) available`)}
          </span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50 transition-transform", open ? "-rotate-90" : ar ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="space-y-3 rounded-2xl border border-success/40 bg-success/5 p-4 shadow-sm">
          <input
            value={genTitle}
            onChange={(e) => setGenTitle(e.target.value)}
            placeholder={ar ? "عنوان الاختبار المولّد" : "Generated exam title"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            {([
              { key: "full", label: ar ? "اختبار كامل (تصحيح آلي)" : "Full exam (auto grading)" },
              { key: "paper", label: ar ? "ورقة أسئلة فقط (طباعة)" : "Question paper only" },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => setGenMode(m.key)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                  genMode === m.key
                    ? "border-success bg-success/15 text-success"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {chapters.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">
                {ar ? "الفصول الداخلة في الاختبار (اتركها بلا تحديد = الكل):" : "Chapters included (none = all):"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chapters.map((c) => (
                  <button
                    key={c}
                    onClick={() => setGenChapters((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n; })}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                      genChapters.has(c)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {topics.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground">
                {ar ? "المواضيع الداخلة في الاختبار (اتركها بلا تحديد = الكل):" : "Topics included (none = all):"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => setGenTopics((s) => { const n = new Set(s); if (n.has(t)) n.delete(t); else n.add(t); return n; })}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                      genTopics.has(t)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {ar
              ? `الأسئلة المتاحة بهذا الاختيار: ${genPool.length}`
              : `Questions matching: ${genPool.length}`}
          </p>

          <div className="flex gap-2">
            {([
              { key: "random", label: ar ? "اختيار عشوائي" : "Random" },
              { key: "manual", label: ar ? "اختيار يدوي" : "Manual selection" },
            ] as const).map((m) => (
              <button
                key={m.key}
                onClick={() => setGenPickMode(m.key)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                  genPickMode === m.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {genPickMode === "random" && <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد الأسئلة" : "Questions"}
              <input
                type="number" min={1} max={questions.length} value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>}
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد النماذج" : "Forms"}
              <select
                value={genForms}
                onChange={(e) => setGenForms(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={1}>{ar ? "نموذج واحد" : "1 form"}</option>
                <option value={2}>{ar ? "نموذجان (أ، ب)" : "2 forms"}</option>
                <option value={3}>{ar ? "3 نماذج" : "3 forms"}</option>
                <option value={4}>{ar ? "4 نماذج" : "4 forms"}</option>
              </select>
            </label>
            {genMode === "full" && <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الدرجة القصوى" : "Max score"}
              <input
                type="number" min={1} value={genMax}
                onChange={(e) => setGenMax(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>}
            {genMode === "full" && <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "تُرصد في" : "Maps to"}
              <select
                value={genTarget}
                onChange={(e) => setGenTarget(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {componentOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>}
          </div>

          {genPickMode === "manual" && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">
                  {ar ? `المحدد: ${manualSelected.size} / ${genPool.length}` : `Selected: ${manualSelected.size} / ${genPool.length}`}
                </span>
                <button
                  onClick={() => setManualSelected(
                    manualSelected.size === genPool.length && genPool.length > 0
                      ? new Set()
                      : new Set(genPool.map((q) => q.id)),
                  )}
                  className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-muted"
                >
                  {manualSelected.size === genPool.length && genPool.length > 0
                    ? (ar ? "إلغاء التحديد" : "Clear selection")
                    : (ar ? "تحديد الكل" : "Select all")}
                </button>
              </div>

              {manualSelected.size > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-2.5 py-2">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {ar ? "درجة موحدة للمحدد" : "Uniform points for selection"}
                  </span>
                  <input
                    type="number" min={0.25} step={0.25} value={bulkPoints}
                    onChange={(e) => setBulkPoints(Number(e.target.value) || 1)}
                    className="w-16 shrink-0 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setManualPoints((mp) => {
                      const n = { ...mp };
                      manualSelected.forEach((id) => { n[id] = bulkPoints; });
                      return n;
                    })}
                    className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground"
                  >
                    {ar ? "تطبيق" : "Apply"}
                  </button>
                </div>
              )}

              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
                {genPool.length === 0 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">
                    {ar ? "لا توجد أسئلة مطابقة لهذا التصفية" : "No questions match this filter"}
                  </p>
                )}
                {genPool.map((q) => (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2 py-1.5",
                      manualSelected.has(q.id) ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={manualSelected.has(q.id)}
                      onChange={(e) => setManualSelected((s) => {
                        const n = new Set(s);
                        if (e.target.checked) n.add(q.id); else n.delete(q.id);
                        return n;
                      })}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{q.text}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {q.chapter && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{q.chapter}</span>}
                        {q.topic && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{q.topic}</span>}
                        {q.difficulty && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{DIFFICULTY_LABELS[q.difficulty]}</span>}
                      </div>
                    </div>
                    <input
                      type="number" min={0.25} step={0.25}
                      value={manualPoints[q.id] ?? q.points ?? 1}
                      onChange={(e) => setManualPoints((mp) => ({ ...mp, [q.id]: Number(e.target.value) || 1 }))}
                      title={ar ? "درجة السؤال" : "Points"}
                      className="mt-0.5 w-14 shrink-0 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || (genPickMode === "manual" && manualSelected.size === 0)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {genMode === "paper"
              ? (ar ? "ولّد أوراق الأسئلة للطباعة" : "Generate question papers")
              : (ar ? "ولّد النماذج والمفاتيح تلقائياً" : "Generate forms + keys")}
          </button>

          {generated.length > 0 && (
            <div className="space-y-2 border-t border-success/30 pt-3">
              <p className="text-xs font-bold text-success">
                {generated[0]?.exam
                  ? (ar ? "جاهزة — اطبع لكل نموذج ورقة الأسئلة وورقة الإجابة:" : "Ready — print each form's papers:")
                  : (ar ? "جاهزة — اطبع ورقة الأسئلة لكل نموذج:" : "Ready — print each form's question paper:")}
              </p>
              {generated.map(({ exam, form }) => (
                <div key={exam?.id ?? form.version} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="text-sm font-bold text-foreground">
                    {ar ? `نموذج ${form.version}` : `Form ${form.version}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const essayTotal = form.essayQuestions.reduce((a, q) => a + (q.points ?? 1), 0);
                        const displayMax = exam ? exam.maxScore + essayTotal : undefined;
                        if (!printQuestionPaper(exam?.title ?? genTitle.trim(), form, sheetHeader(), displayMax)) toast.error(ar ? "تعذّرت الطباعة" : "Couldn't print");
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <FileText size={13} />
                      {ar ? "ورقة الأسئلة" : "Questions"}
                    </button>
                    {exam && <button
                      onClick={() => { if (!printAnswerSheet(exam, sheetHeader())) toast.error(ar ? "تعذّرت الطباعة" : "Couldn't print"); }}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Printer size={13} />
                      {ar ? "ورقة الإجابة" : "Answer sheet"}
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
