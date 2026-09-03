import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Course } from "@/types/student";
import { ChoiceCount, choiceLabels } from "@/types/exam";
import {
  Difficulty, DIFFICULTY_LABELS, parseQuestionRows, parseQuestionsText,
  PasteType, ParsedQuestion, parseNumRanges,
} from "@/types/questionBank";
import * as XLSX from "xlsx";
import { useQuestionBank } from "@/hooks/useQuestionBank";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import {
  Plus, Trash2, Loader2, Library, ChevronDown, Upload, Download, ClipboardPaste, Wand2,
} from "lucide-react";

// This is the single place questions are browsed AND selected for exam
// generation — the same checkboxes used to pick questions to delete also
// pick questions to build an exam from, so there is only one list to learn
// instead of a separate "manual selection" screen duplicating it (see
// GenerateExamPanel, which now only owns the generation *settings* and
// reads this selection instead of rendering its own question list).
interface Props {
  course: Course;
  bankCourseIds: string[];
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  examPoints: Record<string, number>;
  setExamPoints: Dispatch<SetStateAction<Record<string, number>>>;
  onGenerateFromSelection: () => void;
  onGenerateRandom: () => void;
}

export default function QuestionBankPage({
  course, bankCourseIds, selectedIds, setSelectedIds, examPoints, setExamPoints,
  onGenerateFromSelection, onGenerateRandom,
}: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { questions, loading, addQuestion, addQuestions, deleteQuestion, deleteQuestions } = useQuestionBank(course.id, bankCourseIds);
  const [showBank, setShowBank] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteType, setPasteType] = useState<PasteType>("auto");
  const [tfRange, setTfRange] = useState("");   // e.g. "1-10" — mixed mode only
  const [mcqRange, setMcqRange] = useState("");
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
  const [qType, setQType] = useState<ChoiceCount | "essay">(4);
  const [qChoices, setQChoices] = useState<string[]>(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState(0);
  const [qChapter, setQChapter] = useState("");
  const [qTopic, setQTopic] = useState("");
  const [qDifficulty, setQDifficulty] = useState<Difficulty | "">("");
  const [qPoints, setQPoints] = useState(1);
  const [saving, setSaving] = useState(false);

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

  const setType = (t: ChoiceCount | "essay") => {
    setQType(t);
    setQCorrect(0);
    setQChoices(t === "essay" ? [] : t === 2 ? ["صح", "خطأ"] : new Array(t).fill(""));
  };

  const handleAdd = async () => {
    if (!qText.trim()) { toast.error(ar ? "أدخل نص السؤال" : "Enter question text"); return; }
    if (qType !== "essay" && qType !== 2 && qChoices.some((c) => !c.trim())) {
      toast.error(ar ? "أكمل جميع الخيارات" : "Fill all choices"); return;
    }
    setSaving(true);
    const ok = await addQuestion({
      text: qText.trim(),
      kind: qType === "essay" ? "essay" : "choice",
      choices: qType === "essay" ? [] : qType === 2 ? ["صح", "خطأ"] : qChoices.map((c) => c.trim()),
      correct: qType === "essay" ? -1 : qCorrect,
      chapter: qChapter.trim() || undefined,
      topic: qTopic.trim() || undefined,
      difficulty: (qDifficulty || undefined) as Difficulty | undefined,
      points: qPoints,
    });
    setSaving(false);
    if (ok) {
      toast.success(ar ? "أُضيف السؤال إلى البنك ✓" : "Question added");
      setQText(""); setQCorrect(0);
      if (qType !== "essay" && qType !== 2) setQChoices(new Array(qType).fill(""));
      setShowAdd(false);
    }
  };

  const downloadTemplate = () => {
    const rows = [
      { "السؤال": "عاصمة الكويت هي مدينة الكويت", "أ": "", "ب": "", "ج": "", "د": "", "هـ": "", "الإجابة": "صح", "الدرجة": 1, "الفصل": "الفصل الأول", "الموضوع": "مقدمة", "الصعوبة": "سهل" },
      { "السؤال": "ما ناتج 2 + 3 ؟", "أ": "4", "ب": "5", "ج": "6", "د": "7", "هـ": "", "الإجابة": "ب", "الدرجة": 2, "الفصل": "الفصل الأول", "الموضوع": "العمليات", "الصعوبة": "متوسط" },
      { "السؤال": "أي مما يلي عدد أولي؟", "أ": "4", "ب": "6", "ج": "7", "د": "", "هـ": "", "الإجابة": "ج", "الدرجة": 1, "الفصل": "الفصل الثاني", "الموضوع": "الأعداد الأولية", "الصعوبة": "صعب" },
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
        setShowExcel(false); setImportChapter(""); setImportTopic("");
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
      setPasteType("auto"); setTfRange(""); setMcqRange("");
      setImportChapter(""); setImportTopic("");
    } else {
      toast.error(ar ? "فشل الاستيراد" : "Import failed");
    }
  };

  // live parse: as soon as text is pasted (or the type changes) the questions
  // appear below with answer buttons — answers found in the text are pre-selected
  const pasteSkipped = useRef(0);
  useEffect(() => {
    if (!pasteText.trim()) { setReviewList(null); pasteSkipped.current = 0; return; }
    const t = setTimeout(() => {
      const { questions: parsed, skipped } = parseQuestionsText(pasteText, pasteType);
      pasteSkipped.current = skipped.length;
      // mixed mode: ranges typed by the professor override the auto classification
      let final = parsed;
      if (pasteType === "mixed") {
        const tfSet = parseNumRanges(tfRange);
        const mcqSet = parseNumRanges(mcqRange);
        final = parsed.map((q) => {
          if (q.num != null && tfSet.has(q.num) && q.choices.length !== 2) {
            return { ...q, choices: ["صح", "خطأ"], correct: -1 };
          }
          if (q.num != null && mcqSet.has(q.num) && q.choices.length === 2 && q.choices[0] === "صح") {
            // marked MCQ but no choice lines were found — keep as pending with empty note
            return q;
          }
          return q;
        });
      }
      setReviewList(final.length ? final : null);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteText, pasteType, tfRange, mcqRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center gap-3 rounded-[28px] border border-border bg-card p-4 shadow-sm sm:p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Library size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-foreground">
            {ar ? "بنك الأسئلة" : "Question Bank"}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {questions.length} {ar ? "سؤالاً" : "questions"}
            </span>
            {bankCourseIds.length > 1 && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {ar ? "مشترك بين الشعب" : "Shared across sections"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* actions — adding questions to the bank. Generating an exam FROM the
          bank lives under "نماذج الاختبارات" (GenerateExamPanel) instead —
          it produces an exam, so it belongs with exam tools, not here. */}
      <div className="grid grid-cols-3 gap-2">
        {([
          {
            key: "add",
            active: showAdd,
            icon: <Plus size={18} />,
            title: ar ? "إضافة سؤال" : "Add question",
            desc: ar ? "إدخال يدوي واحداً واحداً" : "Type one by one",
            onClick: () => { setShowAdd((v) => !v); setShowPaste(false); setShowExcel(false); },
            disabled: false,
          },
          {
            key: "paste",
            active: showPaste,
            icon: <ClipboardPaste size={18} />,
            title: ar ? "لصق أسئلة" : "Paste questions",
            desc: ar ? "نسخ من Word أو PDF" : "Copy from Word/PDF",
            onClick: () => { setShowPaste((v) => !v); setShowExcel(false); setShowAdd(false); },
            disabled: false,
          },
          {
            key: "excel",
            active: showExcel,
            icon: importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />,
            title: ar ? "استيراد Excel" : "Import Excel",
            desc: ar ? "ملف جاهز بالقالب" : "From template file",
            onClick: () => { setShowExcel((v) => !v); setShowPaste(false); setShowAdd(false); },
            disabled: importing,
          },
        ]).map((b) => (
          <button
            key={b.key}
            onClick={b.onClick}
            disabled={b.disabled}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[22px] border p-3.5 text-center transition-colors disabled:opacity-40",
              b.active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                b.active ? "bg-primary/15" : "bg-muted",
              )}
            >
              {b.icon}
            </span>
            <span className="text-xs font-bold">{b.title}</span>
            <span className={cn("text-[10px]", b.active ? "text-primary/80" : "text-muted-foreground")}>{b.desc}</span>
          </button>
        ))}
      </div>
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />

      {/* Excel import settings */}
      {showExcel && (
        <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground">
            {ar
              ? "اختر الفصل والموضوع هنا — سيُطبَّقان على كل الأسئلة المستوردة (لا حاجة لكتابتهما داخل الملف)"
              : "Pick chapter/topic here — applied to all imported questions (no need to include them in the file)"}
          </p>
          {importMetaFields}
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              <Download size={14} />
              {ar ? "تحميل القالب" : "Template"}
            </button>
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {ar ? "اختيار ملف Excel واستيراده" : "Choose Excel file and import"}
            </button>
          </div>
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
              <option value="mixed">{ar ? "متنوع (صح/خطأ + اختيار من متعدد)" : "Mixed (T/F + MCQ)"}</option>
            </select>
          </label>
          {pasteType === "mixed" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-muted-foreground">
                {ar ? "أسئلة صح وخطأ (الأرقام)" : "T/F question numbers"}
                <input
                  value={tfRange}
                  onChange={(e) => setTfRange(e.target.value)}
                  placeholder={ar ? "مثال: 1-10" : "e.g. 1-10"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  dir="ltr"
                />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                {ar ? "أسئلة اختيار من متعدد (الأرقام)" : "MCQ question numbers"}
                <input
                  value={mcqRange}
                  onChange={(e) => setMcqRange(e.target.value)}
                  placeholder={ar ? "مثال: 11-20" : "e.g. 11-20"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  dir="ltr"
                />
              </label>
              <p className="col-span-2 text-[11px] text-muted-foreground">
                {ar
                  ? "اختياري — يمكن تركهما فارغين: أي سؤال تحته خيارات يُعد اختياراً من متعدد تلقائياً، وما عداه صح وخطأ"
                  : "Optional — leave empty: questions with choice lines become MCQ automatically, the rest T/F"}
              </p>
            </div>
          )}
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
                  <div className="mb-1.5 flex items-start gap-2">
                    <span className="mt-2 w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{qi + 1}</span>
                    <textarea
                      value={q.text}
                      onChange={(e) => setReviewList((l) => l!.map((x, xi) => (xi === qi ? { ...x, text: e.target.value } : x)))}
                      rows={1}
                      className="min-h-[36px] flex-1 resize-y rounded-lg border border-transparent bg-muted/40 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                      dir="rtl"
                    />
                    <input
                      type="number" min={0.25} step={0.25}
                      value={q.points ?? 1}
                      onChange={(e) => setReviewList((l) => l!.map((x, xi) => (xi === qi ? { ...x, points: Number(e.target.value) || 1 } : x)))}
                      title={ar ? "درجة السؤال" : "Points"}
                      className="mt-1 w-14 shrink-0 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => setReviewList((l) => {
                        const n = l!.filter((_, xi) => xi !== qi);
                        return n.length ? n : null;
                      })}
                      title={ar ? "حذف هذا السؤال من الاستيراد" : "Remove from import"}
                      className="mt-1 shrink-0 rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {q.choices.length === 2 && q.choices[0] === "صح" ? (
                    <div className="flex flex-wrap gap-1.5 ps-7">
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
                          {c}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1 ps-7">
                      {q.choices.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-1.5">
                          <button
                            onClick={() => setReviewList((l) => l!.map((x, xi) => (xi === qi ? { ...x, correct: ci } : x)))}
                            title={ar ? "هذه هي الإجابة الصحيحة" : "Mark correct"}
                            className={cn(
                              "w-8 shrink-0 rounded-lg border py-1 text-xs font-bold transition-colors",
                              q.correct === ci
                                ? "border-success bg-success/15 text-success"
                                : "border-border text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {["أ", "ب", "ج", "د", "هـ"][ci]}
                          </button>
                          <input
                            value={c}
                            onChange={(e) => setReviewList((l) => l!.map((x, xi) =>
                              (xi === qi ? { ...x, choices: x.choices.map((cc, cci) => (cci === ci ? e.target.value : cc)) } : x)))}
                            className="flex-1 rounded-lg border border-transparent bg-muted/40 px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                            dir="rtl"
                          />
                        </div>
                      ))}
                    </div>
                  )}
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
                onChange={(e) => setType(e.target.value === "essay" ? "essay" : (Number(e.target.value) as ChoiceCount))}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={2}>{ar ? "صح / خطأ" : "True/False"}</option>
                <option value={3}>A – C</option>
                <option value={4}>A – D</option>
                <option value={5}>A – E</option>
                <option value="essay">{ar ? "مقالي (إجابة كتابية)" : "Essay (written answer)"}</option>
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
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "درجة السؤال" : "Points"}
              <input
                type="number" min={0.25} step={0.25} value={qPoints}
                onChange={(e) => setQPoints(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>

          {/* choices + correct pick — essay questions have neither, they
              print with a blank writing area and are graded manually */}
          {qType === "essay" ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              {ar
                ? "سيُطبع مربع كتابة فارغ للطالب أسفل هذا السؤال في ورقة الأسئلة، ويُصحَّح يدوياً بعد المسح."
                : "A blank writing area prints under this question on the paper; it's graded manually after scanning."}
            </p>
          ) : (
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
          )}

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

      {/* bank list */}
      {questions.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Library size={28} className="mb-2 opacity-50" />
          <p className="text-sm font-semibold">{ar ? "بنك الأسئلة فارغ" : "Question bank is empty"}</p>
          <p className="mt-1 text-xs">{ar ? "أضف أسئلتك مرة واحدة وولّد منها اختبارات بنماذج متعددة" : "Add questions once, generate multi-form exams forever"}</p>
        </div>
      ) : (
        questions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <button
              onClick={() => setShowBank((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-bold text-foreground"
            >
              <span className="flex items-center gap-2">
                <Library size={16} className="text-primary" />
                {ar ? `الاطلاع على بنك الأسئلة (${questions.length})` : `Browse question bank (${questions.length})`}
              </span>
              <ChevronDown size={16} className={cn("transition-transform", showBank && "rotate-180")} />
            </button>
            {showBank && (
              <div className="mt-3 space-y-2">
                {/* selecting questions here also feeds "توليد اختبار من
                    البنك" below — pick questions, set their points (shown
                    once selected), then either delete or generate. No
                    separate manual-selection screen needed. */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === questions.length && questions.length > 0}
                      onChange={(e) => setSelectedIds(e.target.checked ? new Set(questions.map((q) => q.id)) : new Set())}
                      className="h-4 w-4 accent-primary"
                    />
                    {ar ? `تحديد الكل${selectedIds.size ? ` (${selectedIds.size} محدد)` : ""}` : `Select all${selectedIds.size ? ` (${selectedIds.size} selected)` : ""}`}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={onGenerateRandom}
                      className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-bold text-success transition-colors hover:bg-success/20"
                    >
                      <Wand2 size={13} />
                      {ar ? "توليد عشوائي" : "Random generate"}
                    </button>
                    <button
                      onClick={onGenerateFromSelection}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                    >
                      <Wand2 size={13} />
                      {ar ? `توليد من المحدد (${selectedIds.size})` : `Generate from selection (${selectedIds.size})`}
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedIds.size) return;
                        if (!window.confirm(ar ? `حذف ${selectedIds.size} سؤالاً من البنك؟` : `Delete ${selectedIds.size} questions?`)) return;
                        const ok = await deleteQuestions(Array.from(selectedIds));
                        if (ok) { toast.success(ar ? `حُذف ${selectedIds.size} سؤالاً` : "Deleted"); setSelectedIds(new Set()); }
                        else toast.error(ar ? "فشل الحذف" : "Delete failed");
                      }}
                      disabled={selectedIds.size === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                      {ar ? `حذف المحدد (${selectedIds.size})` : `Delete selected (${selectedIds.size})`}
                    </button>
                  </div>
                </div>
                {Array.from(new Set(questions.map((q) => q.chapter || ""))).flatMap((ch) => {
                  const items = questions.filter((q) => (q.chapter || "") === ch);
                  // within each chapter, group further by question type so
                  // T/F, MCQ and essay questions don't run together
                  // ("سايحة على بعض") — each sub-group gets its own label.
                  const kindOf = (q: (typeof items)[number]): "tf" | "mcq" | "essay" =>
                    q.kind === "essay" ? "essay" : q.choices.length === 2 ? "tf" : "mcq";
                  const typeGroups: { key: "tf" | "mcq" | "essay"; label: string }[] = [
                    { key: "tf", label: ar ? "صح وخطأ" : "True/False" },
                    { key: "mcq", label: ar ? "اختيار من متعدد" : "Multiple choice" },
                    { key: "essay", label: ar ? "مقالي" : "Essay" },
                  ];
                  return [
                    <div key={"h" + ch} className="flex items-center justify-between pt-2 first:pt-0">
                      <p className="text-xs font-extrabold text-primary">
                        {ch || (ar ? "بدون فصل" : "No chapter")}
                        <span className="ms-2 text-muted-foreground">({items.length})</span>
                      </p>
                      <button
                        onClick={() => {
                          setImportChapter(ch); setImportTopic("");
                          setShowPaste(true); setShowExcel(false); setShowAdd(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                      >
                        <Plus size={12} />
                        {ar ? "إضافة أسئلة" : "Add questions"}
                      </button>
                    </div>,
                    ...typeGroups.flatMap(({ key, label }) => {
                      const group = items.filter((q) => kindOf(q) === key);
                      if (!group.length) return [];
                      return [
                        <p key={"t" + ch + key} className="ps-1 pt-1 text-[11px] font-bold text-muted-foreground">
                          {label} <span className="text-muted-foreground/70">({group.length})</span>
                        </p>,
                        ...group.map((q) => {
                          const i = questions.indexOf(q);
                          const selected = selectedIds.has(q.id);
                          return (
                            <div key={q.id} className={cn("flex items-start gap-2 rounded-xl px-3 py-2", selected ? "bg-primary/5 ring-1 ring-primary/30" : "bg-muted/40")}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => setSelectedIds((s) => {
                                  const n = new Set(s);
                                  if (e.target.checked) n.add(q.id); else n.delete(q.id);
                                  return n;
                                })}
                                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                              />
                              <span className="mt-0.5 w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{q.text}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {q.kind === "essay"
                                    ? (ar ? "مقالي" : "Essay")
                                    : <>
                                        {q.choices.length === 2 ? (ar ? "صح/خطأ" : "T/F") : `${q.choices.length} ${ar ? "خيارات" : "choices"}`}
                                        {" · "}{ar ? "الإجابة:" : "Answer:"} <b className="text-success">{q.choices.length === 2 ? q.choices[q.correct] : choiceLabels(q.choices.length as ChoiceCount)[q.correct]}</b>
                                      </>}
                                  {" · "}{ar ? "الدرجة:" : "Pts:"} <b>{q.points ?? 1}</b>
                                  {q.topic ? ` · ${q.topic}` : ""}
                                  {q.difficulty ? ` · ${DIFFICULTY_LABELS[q.difficulty]}` : ""}
                                </p>
                              </div>
                              {selected && (
                                <input
                                  type="number" min={0.25} step={0.25}
                                  value={examPoints[q.id] ?? q.points ?? 1}
                                  onChange={(e) => setExamPoints((p) => ({ ...p, [q.id]: Number(e.target.value) || 1 }))}
                                  title={ar ? "درجة السؤال في الاختبار القادم" : "Points in the next generated exam"}
                                  className="mt-0.5 w-14 shrink-0 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                                />
                              )}
                              <button
                                onClick={async () => {
                                  if (!window.confirm(ar ? "حذف هذا السؤال من البنك؟" : "Delete this question?")) return;
                                  await deleteQuestion(q.id);
                                  setSelectedIds((sel) => { const n = new Set(sel); n.delete(q.id); return n; });
                                  toast.success(ar ? "حُذف السؤال" : "Deleted");
                                }}
                                className="shrink-0 rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        }),
                      ];
                    }),
                  ];
                })}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
