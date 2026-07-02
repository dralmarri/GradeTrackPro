import { useMemo, useState } from "react";
import { Course } from "@/types/student";
import { OmrExam, ChoiceCount, choiceLabels } from "@/types/exam";
import {
  BankQuestion, Difficulty, DIFFICULTY_LABELS, GeneratedForm, generateForms,
} from "@/types/questionBank";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { printQuestionPaper } from "@/lib/omr/questionPaper";
import { printAnswerSheet, SheetHeader } from "@/lib/omr/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, Library, Wand2, Printer, FileText, ChevronDown,
} from "lucide-react";

interface Props {
  course: Course;
  sheetHeader: () => SheetHeader;
  componentOptions: { key: string; label: string }[];
  onCreateExam: (input: {
    title: string; questionCount: number; choiceCount: ChoiceCount;
    targetComponent: string; maxScore: number; studentIdDigits: number;
    sections?: { questionCount: number; choiceCount: ChoiceCount }[];
    version?: string; idMode?: "bubbles" | "written";
  }) => Promise<string>;
  onSetAnswerKey: (examId: string, key: number[]) => Promise<void>;
  buildExam: (id: string, form: GeneratedForm, title: string, targetComponent: string, maxScore: number, idMode: "bubbles" | "written") => OmrExam;
}

export default function QuestionBankPage({ course, sheetHeader, componentOptions, onCreateExam, onSetAnswerKey, buildExam }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { questions, loading, addQuestion, deleteQuestion } = useQuestionBank(course.id);

  // --- add question form ---
  const [showAdd, setShowAdd] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<ChoiceCount>(4);
  const [qChoices, setQChoices] = useState<string[]>(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qTopic, setQTopic] = useState("");
  const [qDifficulty, setQDifficulty] = useState<Difficulty | "">("");
  const [saving, setSaving] = useState(false);

  // --- generation form ---
  const [showGen, setShowGen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genTopic, setGenTopic] = useState("");
  const [genForms, setGenForms] = useState(2);
  const [genTarget, setGenTarget] = useState("exam1");
  const [genMax, setGenMax] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ exam: OmrExam; form: GeneratedForm }[]>([]);

  const topics = useMemo(
    () => Array.from(new Set(questions.map((q) => q.topic).filter(Boolean))) as string[],
    [questions],
  );

  const setType = (t: ChoiceCount) => {
    setQType(t);
    setQCorrect(0);
    setQChoices(t === 2 ? ["صح", "خطأ"] : new Array(t).fill(""));
  };

  const handleAdd = async () => {
    if (!qText.trim()) { toast.error(ar ? "أدخل نص السؤال" : "Enter question text"); return; }
    if (qType !== 2 && qChoices.some((c) => !c.trim())) {
      toast.error(ar ? "أكمل جميع الخيارات" : "Fill all choices"); return;
    }
    setSaving(true);
    const ok = await addQuestion({
      text: qText.trim(),
      choices: qType === 2 ? ["صح", "خطأ"] : qChoices.map((c) => c.trim()),
      correct: qCorrect,
      topic: qTopic.trim() || undefined,
      difficulty: (qDifficulty || undefined) as Difficulty | undefined,
    });
    setSaving(false);
    if (ok) {
      toast.success(ar ? "أُضيف السؤال إلى البنك" : "Question added");
      setQText(""); setQCorrect(0);
      if (qType !== 2) setQChoices(new Array(qType).fill(""));
    }
  };

  const handleGenerate = async () => {
    const pool = questions.filter((q) => !genTopic || q.topic === genTopic);
    if (!genTitle.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (pool.length < genCount) {
      toast.error(ar ? `البنك يحتوي ${pool.length} سؤالاً فقط بهذا التصفية` : `Only ${pool.length} questions match`); return;
    }
    setGenerating(true);
    try {
      // pick genCount questions deterministically from the filtered pool
      const seedBase = (genTitle.trim().length * 2654435761) ^ pool.length;
      const picked = generateForms(pool, 1, seedBase)[0].questions.slice(0, genCount);
      const forms = generateForms(picked, genForms, seedBase + 17);

      const out: { exam: OmrExam; form: GeneratedForm }[] = [];
      for (const form of forms) {
        const id = await onCreateExam({
          title: genTitle.trim(),
          questionCount: form.questions.length,
          choiceCount: form.sections[0].choiceCount,
          targetComponent: genTarget,
          maxScore: genMax,
          studentIdDigits: 6,
          sections: form.sections.length > 1 ? form.sections : undefined,
          version: genForms > 1 ? form.version : undefined,
          idMode: "bubbles",
        });
        if (!id) throw new Error(ar ? "فشل إنشاء الاختبار" : "Failed to create exam");
        await onSetAnswerKey(id, form.answerKey);
        out.push({
          exam: buildExam(id, form, genTitle.trim(), genTarget, genMax, "bubbles"),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Library size={18} className="text-primary" />
          {ar ? "بنك الأسئلة" : "Question Bank"}
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{questions.length}</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowGen((v) => !v); setShowAdd(false); }}
            disabled={questions.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-2 text-xs font-bold text-success transition-colors hover:bg-success/25 disabled:opacity-40"
          >
            <Wand2 size={14} />
            {ar ? "توليد اختبار" : "Generate exam"}
          </button>
          <button
            onClick={() => { setShowAdd((v) => !v); setShowGen(false); }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={14} />
            {ar ? "سؤال جديد" : "Add question"}
          </button>
        </div>
      </div>

      {/* add question */}
      {showAdd && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <textarea
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder={ar ? "نص السؤال…" : "Question text…"}
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "النوع" : "Type"}
              <select
                value={qType}
                onChange={(e) => setType(Number(e.target.value) as ChoiceCount)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={2}>{ar ? "صح / خطأ" : "True/False"}</option>
                <option value={3}>A – C</option>
                <option value={4}>A – D</option>
                <option value={5}>A – E</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الموضوع (اختياري)" : "Topic"}
              <input
                value={qTopic}
                onChange={(e) => setQTopic(e.target.value)}
                list="gtp-topics"
                placeholder={ar ? "مثال: الفصل الأول" : "e.g. Chapter 1"}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <datalist id="gtp-topics">
                {topics.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الصعوبة" : "Difficulty"}
              <select
                value={qDifficulty}
                onChange={(e) => setQDifficulty(e.target.value as Difficulty | "")}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{ar ? "—" : "—"}</option>
                <option value="easy">{DIFFICULTY_LABELS.easy}</option>
                <option value="medium">{DIFFICULTY_LABELS.medium}</option>
                <option value="hard">{DIFFICULTY_LABELS.hard}</option>
              </select>
            </label>
          </div>

          {/* choices + correct pick */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              {ar ? "الخيارات — اضغط الدائرة لتحديد الإجابة الصحيحة:" : "Choices — tap the circle to mark the correct one:"}
            </p>
            {(qType === 2 ? ["صح", "خطأ"] : qChoices).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => setQCorrect(i)}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all",
                    qCorrect === i
                      ? "border-success bg-success text-success-foreground"
                      : "border-border text-muted-foreground hover:border-success/60",
                  )}
                >
                  {choiceLabels(qType)[i]}
                </button>
                {qType === 2 ? (
                  <span className="text-sm font-semibold text-foreground">{c}</span>
                ) : (
                  <input
                    value={c}
                    onChange={(e) => setQChoices((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                    placeholder={`${ar ? "الخيار" : "Choice"} ${choiceLabels(qType)[i]}`}
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {ar ? "إضافة إلى البنك" : "Add to bank"}
          </button>
        </div>
      )}

      {/* generate exam */}
      {showGen && (
        <div className="space-y-3 rounded-2xl border border-success/40 bg-success/5 p-4 shadow-sm">
          <input
            value={genTitle}
            onChange={(e) => setGenTitle(e.target.value)}
            placeholder={ar ? "عنوان الاختبار المولّد" : "Generated exam title"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد الأسئلة" : "Questions"}
              <input
                type="number" min={1} max={questions.length} value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الموضوع" : "Topic"}
              <select
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{ar ? "الكل" : "All"}</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
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
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الدرجة القصوى" : "Max score"}
              <input
                type="number" min={1} value={genMax}
                onChange={(e) => setGenMax(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
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
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {ar ? "ولّد النماذج والمفاتيح تلقائياً" : "Generate forms + keys"}
          </button>

          {/* generated results */}
          {generated.length > 0 && (
            <div className="space-y-2 border-t border-success/30 pt-3">
              <p className="text-xs font-bold text-success">
                {ar ? "جاهزة — اطبع لكل نموذج ورقة الأسئلة وورقة الإجابة:" : "Ready — print each form's papers:"}
              </p>
              {generated.map(({ exam, form }) => (
                <div key={exam.id} className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="text-sm font-bold text-foreground">
                    {ar ? `نموذج ${form.version}` : `Form ${form.version}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (!printQuestionPaper(exam.title, form, sheetHeader())) toast.error(ar ? "اسمح بالنوافذ المنبثقة" : "Allow pop-ups"); }}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <FileText size={13} />
                      {ar ? "ورقة الأسئلة" : "Questions"}
                    </button>
                    <button
                      onClick={() => { if (!printAnswerSheet(exam, sheetHeader())) toast.error(ar ? "اسمح بالنوافذ المنبثقة" : "Allow pop-ups"); }}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <Printer size={13} />
                      {ar ? "ورقة الإجابة" : "Answer sheet"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* bank list */}
      {questions.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Library size={28} className="mb-2 opacity-50" />
          <p className="text-sm font-semibold">{ar ? "بنك الأسئلة فارغ" : "Question bank is empty"}</p>
          <p className="mt-1 text-xs">{ar ? "أضف أسئلتك مرة واحدة وولّد منها اختبارات بنماذج متعددة" : "Add questions once, generate multi-form exams forever"}</p>
        </div>
      ) : (
        questions.length > 0 && (
          <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-muted-foreground">
              {ar ? `عرض الأسئلة (${questions.length})` : `View questions (${questions.length})`}
              <ChevronDown size={14} />
            </summary>
            <div className="mt-3 space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2">
                  <span className="mt-0.5 w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{q.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.choices.length === 2 ? (ar ? "صح/خطأ" : "T/F") : `${q.choices.length} ${ar ? "خيارات" : "choices"}`}
                      {" · "}{ar ? "الإجابة:" : "Answer:"} <b className="text-success">{choiceLabels(q.choices.length as ChoiceCount)[q.correct]}</b>
                      {q.topic ? ` · ${q.topic}` : ""}
                      {q.difficulty ? ` · ${DIFFICULTY_LABELS[q.difficulty]}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={async () => { await deleteQuestion(q.id); toast.success(ar ? "حُذف السؤال" : "Deleted"); }}
                    className="shrink-0 rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )
      )}
    </div>
  );
}
