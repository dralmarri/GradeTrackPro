import { useEffect, useMemo, useState } from "react";
import { Course } from "@/types/student";
import { OmrExam, ChoiceCount, choiceLabels } from "@/types/exam";
import {
  BankQuestion, Difficulty, DIFFICULTY_LABELS, GeneratedForm, generateForms, seededShuffle, parseQuestionRows, parseQuestionsText,
  PasteType, ParsedQuestion,
} from "@/types/questionBank";
import * as XLSX from "xlsx";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { printQuestionPaper } from "@/lib/omr/questionPaper";
import { printAnswerSheet, SheetHeader } from "@/lib/omr/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import {
  Plus, Trash2, Loader2, Library, Wand2, Printer, FileText, ChevronDown, Upload, Download, ClipboardPaste,
} from "lucide-react";

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
  }) => Promise<string>;
  onSetAnswerKey: (examId: string, key: number[]) => Promise<void>;
  buildExam: (id: string, form: GeneratedForm, title: string, targetComponent: string, maxScore: number, idMode: "bubbles" | "written") => OmrExam;
}

export default function QuestionBankPage({ course, bankCourseIds, sheetHeader, componentOptions, onCreateExam, onSetAnswerKey, buildExam }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { questions, loading, addQuestion, addQuestions, deleteQuestion } = useQuestionBank(course.id, bankCourseIds);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteType, setPasteType] = useState<PasteType>("auto");
  // parsed questions whose answers weren't in the text — user picks them here before saving
  const [reviewList, setReviewList] = useState<ParsedQuestion[] | null>(null);
  // الفصل/الموضوع يُختاران هنا ويُطبَّقان على كل الأسئلة المستوردة (لصقاً أو Excel)
  const [importChapter, setImportChapter] = useState("");
  const [importTopic, setImportTopic] = useState("");

  const applyImportMeta = <T extends { chapter?: string; topic?: string }>(qs: T[]): T[] =>
    qs.map((q) => ({
      ...q,
      chapter: q.chapter || importChapter.trim() || undefined,
      topic: q.topic || importTopic.trim() || undefined,
    }));

  // --- add question form ---
  const [showAdd, setShowAdd] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<ChoiceCount>(4);
  const [qChoices, setQChoices] = useState<string[]>(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qChapter, setQChapter] = useState("");
  const [qTopic, setQTopic] = useState("");
  const [qDifficulty, setQDifficulty] = useState<Difficulty | "">("");
  const [saving, setSaving] = useState(false);

  // --- generation form ---
  const [showGen, setShowGen] = useState(false);
  const [genTitle, setGenTitle] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [genChapter, setGenChapter] = useState("");
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
  const chapters = useMemo(
    () => Array.from(new Set(questions.map((q) => q.chapter).filter(Boolean))) as string[],
    [questions],
  );

  // chapter/topic pickers for imports — datalists suggest existing values so
  // later batches can be added to the same chapter/topic
  const importMetaFields = (
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-1 text-xs text-muted-foreground">
        {ar ? "الفصل / الوحدة" : "Chapter"}
        <input
          list="bank-chapters"
          value={importChapter}
          onChange={(e) => setImportChapter(e.target.value)}
          placeholder={ar ? "مثال: الفصل الأول" : "e.g. Chapter 1"}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        {ar ? "الموضوع / العنوان" : "Topic"}
        <input
          list="bank-topics"
          value={importTopic}
          onChange={(e) => setImportTopic(e.target.value)}
          placeholder={ar ? "مثال: مقدمة" : "e.g. Introduction"}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <datalist id="bank-chapters">{chapters.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="bank-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
    </div>
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
      chapter: qChapter.trim() || undefined,
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

  const downloadTemplate = () => {
    const rows = [
      { "السؤال": "عاصمة الكويت هي مدينة الكويت", "أ": "", "ب": "", "ج": "", "د": "", "هـ": "", "الإجابة": "صح", "الفصل": "الفصل الأول", "الموضوع": "مقدمة", "الصعوبة": "سهل" },
      { "السؤال": "ما ناتج 2 + 3 ؟", "أ": "4", "ب": "5", "ج": "6", "د": "7", "هـ": "", "الإجابة": "ب", "الفصل": "الفصل الأول", "الموضوع": "العمليات", "الصعوبة": "متوسط" },
      { "السؤال": "أي مما يلي عدد أولي؟", "أ": "4", "ب": "6", "ج": "7", "د": "", "هـ": "", "الإجابة": "ج", "الفصل": "الفصل الثاني", "الموضوع": "الأعداد الأولية", "الصعوبة": "صعب" },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
    XLSX.writeFile(wb, "قالب_بنك_الأسئلة.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const { questions: parsed, skipped } = parseQuestionRows(rows);
      if (!parsed.length) {
        toast.error(ar ? "لم يُتعرف على أي سؤال — تأكد من أعمدة القالب" : "No questions recognised — check the template columns");
        if (skipped.length) console.warn("Skipped rows:", skipped);
        return;
      }
      const added = await addQuestions(applyImportMeta(parsed));
      if (added > 0) {
        toast.success(
          ar
            ? `استُورد ${added} سؤالاً${skipped.length ? ` · تم تخطي ${skipped.length} صفاً (راجع التنسيق)` : ""}`
            : `Imported ${added} questions${skipped.length ? ` · ${skipped.length} rows skipped` : ""}`,
          { duration: 6000 },
        );
        if (skipped.length) console.warn("Skipped rows:", skipped);
      } else {
        toast.error(ar ? "فشل الاستيراد — حاول مجدداً" : "Import failed");
      }
    } catch {
      toast.error(ar ? "تعذّرت قراءة الملف" : "Could not read file");
    } finally {
      setImporting(false);
    }
  };

  const savePastedQuestions = async (parsed: ParsedQuestion[], skippedCount: number) => {
    setImporting(true);
    const added = await addQuestions(applyImportMeta(parsed));
    setImporting(false);
    if (added > 0) {
      toast.success(
        ar
          ? `استُورد ${added} سؤالاً من النص${skippedCount ? ` · تم تخطي ${skippedCount}` : ""}`
          : `Imported ${added} questions${skippedCount ? ` · ${skippedCount} skipped` : ""}`,
        { duration: 6000 },
      );
      setPasteText(""); setShowPaste(false); setReviewList(null);
    } else {
      toast.error(ar ? "فشل الاستيراد" : "Import failed");
    }
  };

  // live parse: as soon as text is pasted (or the type changes) the questions
  // appear below with answer buttons — answers found in the text are pre-selected
  const pasteSkipped = useRef(0);
  useEffect(() => {
    if (!showPaste || !pasteText.trim()) { setReviewList(null); pasteSkipped.current = 0; return; }
    const t = setTimeout(() => {
      const { questions: parsed, skipped } = parseQuestionsText(pasteText, pasteType);
      pasteSkipped.current = skipped.length;
      setReviewList(parsed.length ? parsed : null);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteText, pasteType, showPaste]);

  const handleGenerate = async () => {
    const pool = questions.filter((q) => (!genChapter || q.chapter === genChapter) && (!genTopic || q.topic === genTopic));
    if (!genTitle.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (pool.length < genCount) {
      toast.error(ar ? `البنك يحتوي ${pool.length} سؤالاً فقط بهذا التصفية` : `Only ${pool.length} questions match`); return;
    }
    setGenerating(true);
    try {
      // pick genCount questions fairly across all types (no MCQ/TF bias)
      const seedBase = (genTitle.trim().length * 2654435761) ^ pool.length;
      const picked = seededShuffle(pool, seedBase).slice(0, genCount);
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
          {bankCourseIds.length > 1 && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {ar ? "مشترك بين الشعب" : "Shared across sections"}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadTemplate}
            title={ar ? "تحميل قالب Excel" : "Download Excel template"}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Download size={14} />
            {ar ? "القالب" : "Template"}
          </button>
          <button
            onClick={() => { setShowExcel((v) => !v); setShowPaste(false); setShowAdd(false); setShowGen(false); }}
            disabled={importing}
            className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {ar ? "استيراد Excel" : "Import Excel"}
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => { setShowPaste((v) => !v); setShowExcel(false); setShowAdd(false); setShowGen(false); }}
            className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <ClipboardPaste size={14} />
            {ar ? "لصق من Word" : "Paste"}
          </button>
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

      {/* Excel import settings */}
      {showExcel && (
        <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">
            {ar
              ? "اختر الفصل والموضوع هنا — سيُطبَّقان على كل الأسئلة المستوردة (لا حاجة لكتابتهما داخل الملف)"
              : "Pick chapter/topic here — applied to all imported questions (no need to include them in the file)"}
          </p>
          {importMetaFields}
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {ar ? "اختيار ملف Excel واستيراده" : "Choose Excel file and import"}
          </button>
        </div>
      )}

      {/* paste-from-Word import */}
      {showPaste && (
        <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">
            {ar
              ? "اختر الفصل والموضوع لهذه الدفعة (يُطبَّقان على كل الأسئلة الملصقة):"
              : "Pick chapter/topic for this batch (applied to all pasted questions):"}
          </p>
          {importMetaFields}
          <label className="block space-y-1 text-xs text-muted-foreground">
            {ar ? "نوع الأسئلة الملصقة" : "Type of pasted questions"}
            <select
              value={pasteType}
              onChange={(e) => setPasteType(e.target.value as PasteType)}
              className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="auto">{ar ? "تلقائي (الإجابات مكتوبة داخل النص)" : "Auto (answers included in text)"}</option>
              <option value="tf">{ar ? "صح وخطأ" : "True / False"}</option>
              <option value="mcq">{ar ? "اختيار من متعدد" : "Multiple choice"}</option>
            </select>
          </label>
          <p className="text-xs font-bold text-muted-foreground">
            {ar
              ? "الصق الأسئلة — إن لم تكن الإجابات داخل النص فستحددها هنا قبل الحفظ:"
              : "Paste the questions — if answers aren't in the text you'll pick them here before saving:"}
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground" dir="rtl">{`1. ما تعريف القانون؟
- أ. مجموعة قواعد ملزمة
- ب. عادات اجتماعية
- ج. نصائح أخلاقية
الإجابة: أ

2. القانون التجاري فرع من القانون الخاص
الإجابة: صح

(سطر «الإجابة» اختياري إذا اخترت نوع الأسئلة أعلاه)`}</pre>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={ar ? "الصق الأسئلة هنا…" : "Paste questions here…"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            dir="rtl"
          />
          {!reviewList && pasteText.trim() && (
            <p className="text-xs font-bold text-destructive">
              {ar ? "لم يُتعرف على أي سؤال — تأكد من ترقيم الأسئلة (1. 2. …)" : "No questions recognised — number them (1. 2. …)"}
            </p>
          )}
          {reviewList && (
            <div className="space-y-2 rounded-xl border border-warning/50 bg-warning/5 p-3">
              <p className="text-xs font-bold text-foreground">
                {ar
                  ? `حدد الإجابة الصحيحة (${reviewList.filter((q) => q.correct >= 0).length}/${reviewList.length})`
                  : `Pick the correct answers (${reviewList.filter((q) => q.correct >= 0).length}/${reviewList.length})`}
              </p>
              {reviewList.map((q, qi) => (
                <div key={qi} className="rounded-lg bg-background p-2.5">
                  <p className="mb-1.5 text-sm text-foreground">{qi + 1}. {q.text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {q.choices.map((c, ci) => (
                      <button
                        key={ci}
                        onClick={() => setReviewList((l) => l!.map((x, xi) => (xi === qi ? { ...x, correct: ci } : x)))}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                          q.correct === ci
                            ? "border-success bg-success/15 text-success"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {q.choices.length === 2 ? c : `${["أ", "ب", "ج", "د", "هـ"][ci]}. ${c}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => reviewList && savePastedQuestions(reviewList, pasteSkipped.current)}
            disabled={importing || !reviewList || reviewList.some((q) => q.correct < 0)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <ClipboardPaste size={16} />}
            {ar
              ? `حفظ الأسئلة في البنك${reviewList ? ` (${reviewList.length})` : ""}`
              : `Save questions to bank${reviewList ? ` (${reviewList.length})` : ""}`}
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              {ar ? "الفصل / الوحدة" : "Chapter"}
              <input
                value={qChapter}
                onChange={(e) => setQChapter(e.target.value)}
                list="gtp-chapters"
                placeholder={ar ? "مثال: الفصل الأول" : "e.g. Chapter 1"}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <datalist id="gtp-chapters">
                {chapters.map((c) => <option key={c} value={c} />)}
              </datalist>
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
              {ar ? "الفصل" : "Chapter"}
              <select
                value={genChapter}
                onChange={(e) => setGenChapter(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{ar ? "الكل" : "All"}</option>
                {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
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
              {Array.from(new Set(questions.map((q) => q.chapter || ""))).map((ch) => (
                <p key={"h" + ch} className="pt-2 text-xs font-extrabold text-primary first:pt-0">
                  {ch || (ar ? "بدون فصل" : "No chapter")}
                  <span className="ms-2 text-muted-foreground">({questions.filter((q) => (q.chapter || "") === ch).length})</span>
                </p>
              )).flatMap((header, hi, arr) => {
                const ch = Array.from(new Set(questions.map((q) => q.chapter || "")))[hi];
                const items = questions.filter((q) => (q.chapter || "") === ch);
                return [header, ...items.map((q) => {
                  const i = questions.indexOf(q);
                  return (
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
                  );
                })];
              })}
            </div>
          </details>
        )
      )}
    </div>
  );
}
