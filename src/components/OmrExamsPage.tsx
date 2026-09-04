import { useState, useEffect } from "react";
import { Course, getLabel } from "@/types/student";
import { OmrExam, ChoiceCount, choiceLabels, choiceCountFor, choiceLabelsFor } from "@/types/exam";
import { useOmrExams } from "@/hooks/useOmrExams";
import { useSheetHeaderSettings } from "@/hooks/useSheetHeaderSettings";
import { printAnswerSheet } from "@/lib/omr/sheet";
import { MAX_QUESTIONS } from "@/lib/omr/layout";
import { daysUntilPurge, PURGE_WARNING_DAYS } from "@/lib/omr/archiveRetention";
import OmrScanDialog from "@/components/OmrScanDialog";
import OmrScansDialog from "@/components/OmrScansDialog";
import OmrStatsDialog from "@/components/OmrStatsDialog";
import QuestionBankPage from "@/components/QuestionBankPage";
import GenerateExamPanel from "@/components/GenerateExamPanel";
import { GeneratedForm } from "@/types/questionBank";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Printer, Trash2, KeyRound, ScanLine, Loader2, CheckCircle2, Pencil, History, BarChart3,
  Database, Wand2, Camera, ChevronRight, AlertTriangle,
} from "lucide-react";


interface Props {
  course: Course;
  bankCourseIds: string[];
  onApplyScore: (studentId: string, targetComponent: string, score: number) => Promise<void>;
  onLearnNumber: (studentId: string, studentNumber: string) => Promise<void>;
}

export default function OmrExamsPage({ course, bankCourseIds, onApplyScore, onLearnNumber }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { exams, loading, addExam, updateExam, updateAnswerKey, deleteExam } = useOmrExams(course.id);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  // a section here can also be "essay" — unlike bubble sections (which
  // become OmrSection entries + answer-key bubbles), essay ones become
  // essayQuestions entries instead (no bubbles, graded manually, points
  // additive on top of maxScore — same model as the bank-generated flow).
  // Every section — bubble or essay — carries its own per-question points,
  // same as essay always did; "الدرجة القصوى" below is computed from the
  // bubble sections' points instead of being typed in separately.
  const [sections, setSections] = useState<{ questionCount: number; choiceCount: ChoiceCount | "essay"; points: number }[]>(
    [{ questionCount: 20, choiceCount: 4, points: 1 }],
  );
  const [targetComponent, setTargetComponent] = useState("exam1");
  const [creating, setCreating] = useState(false);
  const [openKeyExamId, setOpenKeyExamId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState<number[]>([]);
  const [draftWeights, setDraftWeights] = useState<number[]>([]);
  const [savingKey, setSavingKey] = useState(false);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMaxScore, setEditMaxScore] = useState(20);
  const [editTarget, setEditTarget] = useState("exam1");
  const [savingEdit, setSavingEdit] = useState(false);
  const [scanExam, setScanExam] = useState<OmrExam | null>(null);
  const [historyExam, setHistoryExam] = useState<OmrExam | null>(null);
  const [statsExam, setStatsExam] = useState<OmrExam | null>(null);
  const [formsCount, setFormsCount] = useState(1);
  const [editVersion, setEditVersion] = useState("");
  // handwritten name/ID matched manually from the roster — always the
  // mode for the manual answer-sheet-only flow (no picker for it here).
  const idMode: "bubbles" | "written" = "written";
  const { institution, college, department, logo, update: updateSheetHeader } = useSheetHeaderSettings();
  // The page is organized into 3 collapsible sections — question bank,
  // exam forms, and grading — each closed by default so only one thing at
  // a time occupies the page instead of everything stacked at once.
  const [bankOpen, setBankOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const [gradingOpen, setGradingOpen] = useState(false);
  // "الاختبارات" is split into 4 sub-sections: generate a full exam from
  // the bank, generate an answer sheet only (for a paper exam already
  // outside the bank), and the two "previous" lists matching each —
  // instead of one combined section mixing generation tools with a single
  // undifferentiated list of everything ever created.
  const [examsTab, setExamsTab] = useState<"genFull" | "genSheet" | "prevFull" | "prevSheet">("genFull");
  // Question selection lives here, not inside either section, so the SAME
  // pick made while browsing the bank (QuestionBankPage) is what
  // GenerateExamPanel builds an exam from — one list instead of two.
  const [examSelected, setExamSelected] = useState<Set<string>>(new Set());
  const [examPoints, setExamPoints] = useState<Record<string, number>>({});
  // When more than one exam has a saved key, "Start scanning" can't just
  // guess which one — this opens a small picker instead.
  const [scanPickerOpen, setScanPickerOpen] = useState(false);

  // batch stats card — real numbers only, aggregated across this course's
  // exams' archived scans (scanned count, average accuracy, and how many
  // archived sheets still have unresolved flagged questions).
  const [batchStats, setBatchStats] = useState<{ scanned: number; accuracy: number | null; needsReview: number; expiringSoon: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const examIds = exams.map((e) => e.id);
    if (examIds.length === 0) { setBatchStats(null); return; }
    (async () => {
      // "today's scans" — not all-time, so the numbers actually reflect
      // what was just scanned in the current sitting instead of an
      // unlabeled all-time total that read as unclear ("أي دفعة؟").
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data, error } = await (supabase as any)
        .from("omr_scans")
        .select("exam_id, raw_correct, needs_review, created_at, image_path")
        .in("exam_id", examIds)
        .gte("created_at", startOfToday.toISOString());
      if (cancelled) return;
      if (error || !data) { setBatchStats(null); return; }
      const qcById = new Map(exams.map((e) => [e.id, e.questionCount]));
      const ratios: number[] = [];
      let needsReview = 0;
      let expiringSoon = 0;
      for (const row of data as { exam_id: string; raw_correct: number; needs_review: boolean; created_at: string; image_path: string | null }[]) {
        const qc = qcById.get(row.exam_id);
        if (qc && qc > 0) ratios.push((Number(row.raw_correct) || 0) / qc);
        if (row.needs_review) needsReview++;
        if (row.image_path && daysUntilPurge(row.created_at) <= PURGE_WARNING_DAYS) expiringSoon++;
      }
      setBatchStats({
        scanned: data.length,
        accuracy: ratios.length ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100) : null,
        needsReview,
        expiringSoon,
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams.map((e) => e.id).join(","), exams.map((e) => e.questionCount).join(",")]);

  // Split the exams list to match the two generation flows: "bank" =
  // generated from the question bank (full exam, questions + key).
  // Anything else (including exams saved before this field existed) is
  // treated as "manual" — the answer-sheet-only flow, which predates it.
  const prevFullExams = exams.filter((e) => e.source === "bank");
  const prevSheetExams = exams.filter((e) => e.source !== "bank");

  // Every exam that actually has a saved key — these are the ones
  // "Start scanning" can offer, most-recently-updated first.
  const scannableExams = [...exams]
    .filter((e) => e.answerKey.some((k) => k >= 0))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const quickScanExam = scannableExams[0] || null;

  // One exam → scan it directly. More than one → let the professor pick
  // which exam this sheet belongs to instead of silently guessing.
  const handleStartScan = () => {
    if (scannableExams.length === 0) return;
    if (scannableExams.length === 1) { setScanExam(scannableExams[0]); return; }
    setScanPickerOpen(true);
  };

  const sheetHeader = () => ({
    institution: institution.trim() || undefined,
    college: college.trim() || undefined,
    department: department.trim() || undefined,
    courseName: course.name + (course.section ? ` — شعبة ${course.section}` : ""),
    logoDataUrl: logo || undefined,
  });

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // resize to a small data URL so localStorage stays light
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL("image/png");
      updateSheetHeader({ logo: dataUrl });
      toast.success(ar ? "تم حفظ الشعار" : "Logo saved");
    };
    img.onerror = () => toast.error(ar ? "تعذّر قراءة الصورة" : "Could not read image");
    img.src = url;
  };

  // labels follow the course settings (المستخدم يعيد تسميتها من إعدادات المقرر)
  const componentOptions = [
    { key: "exam1", label: getLabel(course, "exam1") },
    { key: "exam2", label: getLabel(course, "exam2") },
    { key: "finalExam", label: getLabel(course, "finalExam") },
    ...(course.customComponents || []).map((c) => ({ key: c.key, label: c.label })),
  ];

  // essay sections don't have bubbles/answer-key slots — they become
  // essayQuestions instead, so keep them out of the bubble question count.
  const bubbleSections = sections.filter((s) => s.choiceCount !== "essay");
  const essaySections = sections.filter((s) => s.choiceCount === "essay");
  const totalQuestions = bubbleSections.reduce((a, s) => a + (Number(s.questionCount) || 0), 0);
  const totalEssayQuestions = essaySections.reduce((a, s) => a + (Number(s.questionCount) || 0), 0);
  // per-question weights, expanded from each bubble section's own points —
  // "الدرجة القصوى" is their sum, not a separately-typed number, same as
  // how the bank-generated flow always worked.
  const bubbleWeights = bubbleSections.flatMap((s) =>
    new Array(Number(s.questionCount) || 0).fill(Number(s.points) || 1));
  const computedMaxScore = Math.round(bubbleWeights.reduce((a, b) => a + b, 0) * 100) / 100;
  const totalEssayPoints = essaySections.reduce((a, s) => a + (Number(s.questionCount) || 0) * (Number(s.points) || 1), 0);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (totalQuestions === 0 && totalEssayQuestions === 0) {
      toast.error(ar ? "أضف سؤالاً واحداً على الأقل" : "Add at least one question"); return;
    }
    if (totalQuestions > MAX_QUESTIONS) {
      toast.error(ar ? `أسئلة الاختيار/الصح والخطأ حتى ${MAX_QUESTIONS} سؤالاً` : `Choice/T-F questions up to ${MAX_QUESTIONS}`); return;
    }
    setCreating(true);
    // one entry per essay question, matching the bank flow's shape — no
    // text since the professor's own paper exam has it, just a slot with
    // its point value for the answer sheet's grade box.
    const essayQuestions = essaySections.flatMap((s) =>
      new Array(Number(s.questionCount) || 0).fill(null).map(() => ({ text: "", points: s.points || 1 })));
    // one exam per requested form (نموذج أ/ب/ج/د) — each gets its own answer key
    const letters = ["أ", "ب", "ج", "د"];
    let firstId: string | null = null;
    for (let v = 0; v < formsCount; v++) {
      const id = await addExam({
        title: title.trim(),
        questionCount: totalQuestions,
        // an essay-only sheet has no bubbled section at all
        choiceCount: (bubbleSections[0]?.choiceCount as ChoiceCount) ?? 4,
        targetComponent, maxScore: computedMaxScore || 1, studentIdDigits: 10,
        sections: bubbleSections.length > 1
          ? bubbleSections.map((s) => ({ questionCount: s.questionCount, choiceCount: s.choiceCount as ChoiceCount }))
          : undefined,
        version: formsCount > 1 ? letters[v] : undefined,
        idMode,
        essayQuestions: essayQuestions.length ? essayQuestions : undefined,
        source: "manual",
      });
      if (!id) break;
      if (!firstId) firstId = id;
      // per-question weights straight from each section's own points, not
      // an equal split — the answer-key editor (opened right after) then
      // already reflects what was chosen here instead of a flat default.
      if (bubbleWeights.length) await updateAnswerKey(id, new Array(totalQuestions).fill(-1), bubbleWeights);
    }
    setCreating(false);
    if (firstId) {
      toast.success(
        formsCount > 1
          ? (ar ? `أُنشئت ${formsCount} نماذج — أدخل مفتاح كل نموذج` : `${formsCount} forms created — enter each form's key`)
          : (ar ? "تم إنشاء الاختبار" : "Exam created"),
        { duration: 6000 },
      );
      setShowCreate(false); setTitle(""); setSections([{ questionCount: 20, choiceCount: 4, points: 1 }]); setFormsCount(1);
      setFormsOpen(true);
      if (totalQuestions > 0) {
        setOpenKeyExamId(firstId);
        setDraftKey(new Array(totalQuestions).fill(-1));
        setDraftWeights(bubbleWeights.length ? bubbleWeights : new Array(totalQuestions).fill(1));
      }
    }
  };

  const openKey = (exam: OmrExam) => {
    setOpenKeyExamId(exam.id);
    setDraftKey(exam.answerKey.length === exam.questionCount ? [...exam.answerKey] : new Array(exam.questionCount).fill(-1));
    const equal = Math.round((exam.maxScore / exam.questionCount) * 100) / 100;
    setDraftWeights(
      exam.questionWeights && exam.questionWeights.length === exam.questionCount
        ? [...exam.questionWeights]
        : new Array(exam.questionCount).fill(equal),
    );
  };

  const setKeyChoice = (q: number, c: number) => {
    setDraftKey((prev) => { const n = [...prev]; n[q] = n[q] === c ? -1 : c; return n; });
  };

  const weightsTotal = Math.round(draftWeights.reduce((a, b) => a + (Number(b) || 0), 0) * 100) / 100;

  const saveKey = async (exam: OmrExam) => {
    if (weightsTotal <= 0) { toast.error(ar ? "مجموع الدرجات يجب أن يكون أكبر من صفر" : "Total points must be > 0"); return; }
    setSavingKey(true);
    const nums = draftWeights.map((w) => Number(w) || 0);
    // all-equal weights = plain equal split → don't overwrite max_score with a rounded sum (20 → 20.01)
    const allEqual = nums.every((w) => Math.abs(w - nums[0]) < 1e-9);
    await updateAnswerKey(exam.id, draftKey, allEqual ? undefined : nums);
    setSavingKey(false);
    const unset = draftKey.filter((k) => k < 0).length;
    toast.success(
      ar
        ? `تم حفظ مفتاح الإجابة${unset > 0 ? ` · ${unset} سؤال بدون إجابة` : ""}`
        : `Answer key saved${unset > 0 ? ` · ${unset} unset` : ""}`,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <h3 className="font-display text-lg font-bold text-foreground">
        {ar ? "التصحيح الآلي والاختبارات" : "Auto Grading & Exams"}
      </h3>

      {/* Section 1: Question bank — purely about managing the bank's own
          content (add/import/paste/browse/delete questions). Generating an
          exam FROM the bank is a separate action under "نماذج الاختبارات"
          below, since it produces an exam, not bank content. */}
      <button
        type="button"
        onClick={() => setBankOpen((v) => !v)}
        className="flex w-full items-center gap-4 rounded-[28px] border border-border bg-card p-4 text-start shadow-sm transition-colors hover:bg-muted/40 sm:gap-5 sm:p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
          <Database size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-foreground">{ar ? "بنك الأسئلة" : "Question bank"}</span>
          <span className="block text-xs text-muted-foreground">{ar ? "إضافة الأسئلة واستيرادها وإدارتها" : "Add, import, and manage questions"}</span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50 transition-transform", bankOpen ? "-rotate-90" : ar ? "rotate-180" : "")} />
      </button>
      {bankOpen && (
        <QuestionBankPage
          course={course}
          bankCourseIds={bankCourseIds}
          selectedIds={examSelected}
          setSelectedIds={setExamSelected}
          examPoints={examPoints}
          setExamPoints={setExamPoints}
        />
      )}

      {/* Section 2: Exams — generating (full exam from the bank, or an
          answer sheet only) and browsing previously created ones, split
          into 4 sub-sections instead of one mixed list. */}
      <button
        type="button"
        onClick={() => setFormsOpen((v) => !v)}
        className="flex w-full items-center gap-4 rounded-[28px] border border-border bg-card p-4 text-start shadow-sm transition-colors hover:bg-muted/40 sm:gap-5 sm:p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
          <Wand2 size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-foreground">{ar ? "الاختبارات" : "Exams"}</span>
          <span className="block text-xs text-muted-foreground">{ar ? "توليد اختبارات، توليد أوراق إجابة، والنماذج السابقة" : "Generate exams, generate answer sheets, and previous forms"}</span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50 transition-transform", formsOpen ? "-rotate-90" : ar ? "rotate-180" : "")} />
      </button>

      {formsOpen && (
      <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          { key: "genFull" as const, label: ar ? "توليد اختبارات كاملة" : "Generate full exams" },
          { key: "genSheet" as const, label: ar ? "توليد أوراق إجابة فقط" : "Generate answer sheets only" },
          { key: "prevFull" as const, label: ar ? `نماذج اختبارات سابقة (${prevFullExams.length})` : `Previous exams (${prevFullExams.length})` },
          { key: "prevSheet" as const, label: ar ? `نماذج أوراق إجابة سابقة (${prevSheetExams.length})` : `Previous answer sheets (${prevSheetExams.length})` },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setExamsTab(t.key)}
            className={cn(
              "rounded-xl border px-2.5 py-2 text-[11px] font-bold transition-colors",
              examsTab === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {examsTab === "genFull" && (
      <GenerateExamPanel
        course={course}
        bankCourseIds={bankCourseIds}
        sheetHeader={sheetHeader}
        componentOptions={componentOptions}
        manualSelected={examSelected}
        setManualSelected={setExamSelected}
        manualPoints={examPoints}
        setManualPoints={setExamPoints}
        onOpenBank={() => setBankOpen(true)}
        onCreateExam={addExam}
        onSetAnswerKey={updateAnswerKey}
        buildExam={(id, form: GeneratedForm, t, target, max, mode, essayQuestions) => ({
          id,
          courseId: course.id,
          title: t,
          questionCount: form.questions.length,
          // an essay-only form has no bubbled section at all
          choiceCount: form.sections[0]?.choiceCount ?? 4,
          targetComponent: target,
          maxScore: max,
          answerKey: form.answerKey,
          studentIdDigits: 10,
          sections: form.sections.length > 1 ? form.sections : undefined,
          version: form.version,
          idMode: mode,
          essayQuestions: essayQuestions && essayQuestions.length ? essayQuestions : undefined,
          createdAt: "",
          updatedAt: "",
        })}
      />
      )}

      {examsTab === "genSheet" && (
      <>
      <button
        type="button"
        onClick={() => setShowCreate((v) => !v)}
        className="flex w-full items-center gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-start shadow-sm transition-colors hover:bg-primary/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Plus size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-primary">{ar ? "توليد ورقة إجابة فقط" : "Generate answer sheet only"}</span>
          <span className="block text-xs text-muted-foreground">
            {ar
              ? "للأسئلة التي عندك خارج بنك الأسئلة — بدون سحب أي شيء من البنك"
              : "For questions you already have outside the question bank — nothing pulled from the bank"}
          </span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50 transition-transform", showCreate ? "-rotate-90" : ar ? "rotate-180" : "")} />
      </button>

      {showCreate && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={ar ? "عنوان الاختبار (مثال: اختبار الفصل الأول)" : "Exam title"}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          {/* sections: each has its own question type */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">
              {ar ? "أقسام الاختبار" : "Exam sections"}
            </p>
            {sections.map((sec, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <select
                  value={sec.choiceCount}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, choiceCount: e.target.value === "essay" ? "essay" : Number(e.target.value) as ChoiceCount } : s))}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value={2}>{ar ? "صح / خطأ" : "True / False"}</option>
                  <option value={3}>A – C</option>
                  <option value={4}>A – D</option>
                  <option value={5}>A – E</option>
                  <option value="essay">{ar ? "سؤال مقالي" : "Essay"}</option>
                </select>
                <input
                  type="number" min={1} max={MAX_QUESTIONS} value={sec.questionCount}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, questionCount: Number(e.target.value) || 1 } : s))}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm text-foreground outline-none focus:border-primary"
                  title={ar ? "عدد الأسئلة" : "Questions"}
                />
                <input
                  type="number" min={0.25} step={0.25} value={sec.points}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, points: Number(e.target.value) || 1 } : s))}
                  className="w-16 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm text-foreground outline-none focus:border-primary"
                  title={sec.choiceCount === "essay" ? (ar ? "درجة كل سؤال مقالي" : "Points per essay question") : (ar ? "درجة كل سؤال" : "Points per question")}
                />
                {sections.length > 1 && (
                  <button
                    onClick={() => setSections((prev) => prev.filter((_, j) => j !== i))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSections((prev) => [...prev, { questionCount: 5, choiceCount: 2, points: 1 }])}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={13} />
                {ar ? "إضافة قسم (نوع آخر)" : "Add section"}
              </button>
              <span className="text-xs text-muted-foreground">
                {ar
                  ? `المجموع: ${totalQuestions} سؤالاً${totalEssayQuestions ? ` + ${totalEssayQuestions} مقالي` : ""}`
                  : `Total: ${totalQuestions} question(s)${totalEssayQuestions ? ` + ${totalEssayQuestions} essay` : ""}`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الدرجة القصوى (مجموع درجات الأسئلة أعلاه)" : "Max score (sum of the questions' points above)"}
              <input
                type="number" value={computedMaxScore || 0} readOnly disabled
                title={ar ? "غيّرها بتعديل درجة كل قسم أعلاه" : "Change it by editing each section's points above"}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm font-bold text-foreground outline-none"
              />
              {totalEssayPoints > 0 && (
                <span className="block text-[10px] text-muted-foreground">
                  {ar ? `+ ${totalEssayPoints} للمقالي (تُضاف فوق هذا المجموع)` : `+ ${totalEssayPoints} for essay (added on top)`}
                </span>
              )}
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد النماذج" : "Forms count"}
              <select
                value={formsCount}
                onChange={(e) => setFormsCount(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={1}>{ar ? "نموذج واحد" : "1 form"}</option>
                <option value={2}>{ar ? "نموذجان (أ، ب)" : "2 forms (A, B)"}</option>
                <option value={3}>{ar ? "3 نماذج (أ، ب، ج)" : "3 forms"}</option>
                <option value={4}>{ar ? "4 نماذج (أ، ب، ج، د)" : "4 forms"}</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "تُرصد في" : "Maps to"}
              <select
                value={targetComponent}
                onChange={(e) => setTargetComponent(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                {componentOptions.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {ar ? "إنشاء الاختبار" : "Create exam"}
          </button>
        </div>
      )}
      </>
      )}

      {/* sheet header settings (institution/college/department) — tied to
          the professor's account (useSheetHeaderSettings), not the device:
          entered once, follows them to any device they sign into, and stays
          until they change it again. */}
      <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
          {ar ? "ترويسة ورقة الإجابة (المؤسسة / الكلية / القسم)" : "Sheet header (institution / college / dept)"}
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={institution}
            onChange={(e) => updateSheetHeader({ institution: e.target.value })}
            placeholder={ar ? "المؤسسة التعليمية" : "Institution"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={college}
            onChange={(e) => updateSheetHeader({ college: e.target.value })}
            placeholder={ar ? "الكلية" : "College"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={department}
            onChange={(e) => updateSheetHeader({ department: e.target.value })}
            placeholder={ar ? "القسم العلمي" : "Department"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
            <Plus size={13} />
            {ar ? (logo ? "تغيير الشعار" : "إضافة شعار المؤسسة") : (logo ? "Change logo" : "Add logo")}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </label>
          {logo && (
            <>
              <img src={logo} alt="logo" className="h-8 w-8 rounded object-contain ring-1 ring-border" />
              <button
                onClick={() => updateSheetHeader({ logo: "" })}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                {ar ? "إزالة" : "Remove"}
              </button>
            </>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {ar
            ? "تُحفظ هذه البيانات في حسابك وتظهر أعلى كل ورقة إجابة تطبعها من أي جهاز تسجّل دخول منه — تبقى كما هي حتى تغيّرها أنت. إن تُرك الشعار فارغاً تبقى مساحته خالية."
            : "Saved to your account and printed at the top of every sheet from any device you sign into — stays until you change it."}
        </p>
      </details>

      {(examsTab === "prevFull" || examsTab === "prevSheet") && (
      <>
      {(examsTab === "prevFull" ? prevFullExams : prevSheetExams).length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <ScanLine size={32} className="mb-2 opacity-50" />
          <p className="text-sm font-semibold">
            {examsTab === "prevFull"
              ? (ar ? "لا توجد اختبارات كاملة مولّدة بعد" : "No generated exams yet")
              : (ar ? "لا توجد أوراق إجابة منشأة بعد" : "No answer sheets created yet")}
          </p>
          <p className="mt-1 text-xs">
            {examsTab === "prevFull"
              ? (ar ? "ولّد اختباراً من بنك الأسئلة، اطبع، ثم صحّح بالكاميرا" : "Generate an exam from the bank, print, then scan")
              : (ar ? "أنشئ ورقة إجابة، اطبعها، ثم صحّح بالكاميرا" : "Create an answer sheet, print it, then scan")}
          </p>
        </div>
      )}

      {(examsTab === "prevFull" ? prevFullExams : prevSheetExams).map((exam) => {
        const keyDone = exam.answerKey.filter((k) => k >= 0).length;
        const keyOpen = openKeyExamId === exam.id;
        return (
          <div key={exam.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => (keyOpen ? setOpenKeyExamId(null) : openKey(exam))}
                title={ar ? "فتح مفتاح الإجابة ودرجات الأسئلة" : "Open answer key & points"}
              >
                <p className="truncate font-display text-base font-bold text-foreground">{exam.title}{exam.version ? <span className="ms-2 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">{`نموذج ${exam.version}`}</span> : null}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {exam.questionCount} {ar ? "سؤال" : "Qs"} · {exam.sections?.length ? (ar ? "مختلط" : "Mixed") : choiceLabels(exam.choiceCount).join(" ")} · {exam.maxScore} {ar ? "درجة" : "pts"}
                  {" · "}
                  <span className={cn(keyDone === exam.questionCount ? "text-success" : "text-amber-600")}>
                    {ar ? `المفتاح: ${keyDone}/${exam.questionCount}` : `Key: ${keyDone}/${exam.questionCount}`}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => {
                    if (editExamId === exam.id) { setEditExamId(null); return; }
                    setEditExamId(exam.id);
                    setEditTitle(exam.title);
                    setEditMaxScore(exam.maxScore);
                    setEditTarget(exam.targetComponent);
                    setEditVersion(exam.version || "");
                  }}
                  title={ar ? "تعديل الاختبار" : "Edit exam"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                    editExamId === exam.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => { if (!printAnswerSheet(exam, sheetHeader())) toast.error(ar ? "تعذّرت الطباعة" : "Couldn't print"); }}
                  title={ar ? "طباعة ورقة الإجابة" : "Print sheet"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
                >
                  <Printer size={15} />
                </button>
                <button
                  onClick={() => (keyOpen ? setOpenKeyExamId(null) : openKey(exam))}
                  title={ar ? "مفتاح الإجابة" : "Answer key"}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                    keyOpen ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
                  )}
                >
                  <KeyRound size={15} />
                </button>
                <button
                  onClick={() => setStatsExam(exam)}
                  title={ar ? "إحصائيات الاختبار" : "Statistics"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
                >
                  <BarChart3 size={15} />
                </button>
                <button
                  onClick={() => setHistoryExam(exam)}
                  title={ar ? "سجل المسح (الأوراق المؤرشفة)" : "Scan history"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border transition-colors hover:bg-muted"
                >
                  <History size={15} />
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(ar ? `حذف اختبار «${exam.title}» ومفتاحه ونتائجه؟` : `Delete exam "${exam.title}" with its key and scans?`)) return;
                    await deleteExam(exam.id); toast.success(ar ? "حُذف الاختبار" : "Exam deleted");
                  }}
                  title={ar ? "حذف" : "Delete"}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* edit exam panel */}
            {editExamId === exam.id && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={ar ? "عنوان الاختبار" : "Exam title"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    {ar ? "الدرجة القصوى" : "Max score"}
                    <input
                      type="number" min={1} value={editMaxScore}
                      onChange={(e) => setEditMaxScore(Number(e.target.value) || 1)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    {ar ? "رقم النموذج" : "Form version"}
                    <input
                      value={editVersion}
                      onChange={(e) => setEditVersion(e.target.value)}
                      placeholder={ar ? "مثال: أ" : "e.g. A"}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    {ar ? "تُرصد في" : "Maps to"}
                    <select
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    >
                      {componentOptions.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  onClick={async () => {
                    if (!editTitle.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
                    setSavingEdit(true);
                    await updateExam(exam.id, { title: editTitle.trim(), maxScore: editMaxScore, targetComponent: editTarget, version: editVersion.trim() });
                    setSavingEdit(false);
                    setEditExamId(null);
                    toast.success(ar ? "تم حفظ التعديلات" : "Changes saved");
                  }}
                  disabled={savingEdit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {ar ? "حفظ التعديلات" : "Save changes"}
                </button>
              </div>
            )}

            {/* answer key editor */}
            {keyOpen && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  {ar ? "اختر الإجابة الصحيحة لكل سؤال، وحدّد درجته:" : "Pick the correct answer and points per question:"}
                </p>
                <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {Array.from({ length: exam.questionCount }, (_, q) => (
                    <div key={q} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="w-6 text-center text-xs font-bold text-muted-foreground">{q + 1}</span>
                      <div className="flex flex-1 gap-1">
                        {Array.from({ length: choiceCountFor(exam, q) }, (_, c) => (
                          <button
                            key={c}
                            onClick={() => setKeyChoice(q, c)}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-all",
                              draftKey[q] === c
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/50",
                            )}
                          >
                            {choiceLabelsFor(exam, q)[c]}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number" min={0} step={0.25}
                        value={draftWeights[q] ?? 0}
                        onChange={(e) => setDraftWeights((prev) => prev.map((w, j) => (j === q ? Number(e.target.value) : w)))}
                        className="w-14 shrink-0 rounded-md border border-input bg-background px-1 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                        title={ar ? "درجة السؤال" : "Points"}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">{ar ? "مجموع الدرجات (يصبح الدرجة القصوى):" : "Points total (becomes max score):"}</span>
                  <span className="text-primary">{weightsTotal}</span>
                </div>
                <button
                  onClick={() => saveKey(exam)}
                  disabled={savingKey}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {savingKey ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {ar ? "حفظ المفتاح" : "Save key"}
                </button>
              </div>
            )}

            {/* scan & grade */}
            <button
              onClick={() => {
                if (keyDone === 0) {
                  toast.error(ar ? "أدخل مفتاح الإجابة أولاً" : "Set the answer key first");
                  return;
                }
                setScanExam(exam);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
            >
              <ScanLine size={14} />
              {ar ? "تصحيح بالكاميرا" : "Scan & grade"}
            </button>
          </div>
        );
      })}
      </>
      )}
      </>
      )}

      {/* Section 3: Grading — scanning + batch stats, all under one toggle. */}
      <button
        type="button"
        onClick={() => setGradingOpen((v) => !v)}
        className="flex w-full items-center gap-4 rounded-[28px] border border-border bg-card p-4 text-start shadow-sm transition-colors hover:bg-muted/40 sm:gap-5 sm:p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:h-14 sm:w-14">
          <Camera size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-foreground">{ar ? "التصحيح" : "Grading"}</span>
          <span className="block text-xs text-muted-foreground">{ar ? "المسح بالكاميرا وإحصائيات الدفعة" : "Camera scanning & batch statistics"}</span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50 transition-transform", gradingOpen ? "-rotate-90" : ar ? "rotate-180" : "")} />
      </button>

      {gradingOpen && (
      <>
      {/* quick scan — not tied to any one exam. One scannable exam → scans
          it directly; more than one → asks which exam this sheet is for.
          The camera view itself only appears once tapped (inside
          OmrScanDialog). */}
      <button
        type="button"
        onClick={handleStartScan}
        disabled={scannableExams.length === 0}
        className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-start shadow-sm transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-foreground">
            {ar ? "بدء المسح الآن" : "Start scanning"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {scannableExams.length === 0
              ? (ar ? "أدخل مفتاح إجابة أولاً" : "Set an answer key first")
              : scannableExams.length === 1
              ? (ar ? `جاهز — ${scannableExams[0].title}` : `Ready — ${scannableExams[0].title}`)
              : (ar ? `اختر أحد ${scannableExams.length} اختبارات جاهزة` : `Choose one of ${scannableExams.length} ready exams`)}
          </span>
        </span>
        <ChevronRight size={18} className={cn("shrink-0 text-muted-foreground/50", ar && "rotate-180")} />
      </button>

      {/* batch stats — real numbers only, aggregated from archived scans */}
      {batchStats && batchStats.scanned > 0 && (
        <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-bold text-foreground">{ar ? "إحصائيات اليوم" : "Today's statistics"}</h4>
            {historyExam === null && exams.length > 0 && (
              <button
                onClick={() => setHistoryExam(quickScanExam ?? exams[0])}
                className="text-xs font-bold text-primary hover:underline"
              >
                {ar ? "التفاصيل" : "Details"}
              </button>
            )}
          </div>
          <div className={cn(
            "grid gap-4 text-center",
            batchStats.accuracy !== null
              ? (batchStats.needsReview > 0 ? "grid-cols-3" : "grid-cols-2")
              : (batchStats.needsReview > 0 ? "grid-cols-2" : "grid-cols-1"),
          )}>
            <div>
              <p className="text-2xl font-bold text-primary">{batchStats.scanned}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{ar ? "تم مسحها" : "Scanned"}</p>
            </div>
            {batchStats.accuracy !== null && (
              <div className="border-s border-border">
                <p className="text-2xl font-bold text-success">{batchStats.accuracy}%</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{ar ? "متوسط الإجابات الصحيحة" : "Avg. correct"}</p>
              </div>
            )}
            {batchStats.needsReview > 0 && (
              <div className="border-s border-border">
                <p className="text-2xl font-bold text-amber-600">{batchStats.needsReview}</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{ar ? "تحتاج مراجعة" : "Needs review"}</p>
              </div>
            )}
          </div>
          {batchStats.expiringSoon > 0 && (
            <button
              onClick={() => setHistoryExam(quickScanExam ?? exams[0])}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/60 bg-amber-500/5 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
            >
              <AlertTriangle size={13} />
              {ar
                ? `${batchStats.expiringSoon} صورة أرشيف ستُحذف قريباً — افتح سجل المسح لتنزيلها قبل الحذف`
                : `${batchStats.expiringSoon} archived photo(s) will be deleted soon — open scan history to download before then`}
            </button>
          )}
        </div>
      )}
      </>
      )}

      {/* exam picker — only needed when more than one exam has a key */}
      {scanPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setScanPickerOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-background p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 shrink-0 font-display text-base font-bold text-foreground">
              {ar ? "لأي اختبار هذه الورقة؟" : "Which exam is this sheet for?"}
            </h3>
            {/* scrollable — with many exams, the list used to overflow past
                the top of the fixed overlay with no way to scroll up to the
                first item(s). */}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {scannableExams.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => { setScanExam(exam); setScanPickerOpen(false); }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border p-3 text-start hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-foreground">
                      {exam.title}
                      {exam.version ? ` — ${ar ? "نموذج" : "Form"} ${exam.version}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {exam.questionCount} {ar ? "سؤال" : "Qs"} · {exam.maxScore} {ar ? "درجة" : "pts"}
                    </span>
                  </span>
                  <ChevronRight size={16} className={cn("shrink-0 text-muted-foreground/50", ar && "rotate-180")} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setScanPickerOpen(false)}
              className="mt-3 w-full shrink-0 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {statsExam && (
        <OmrStatsDialog
          exam={statsExam}
          open={!!statsExam}
          onClose={() => setStatsExam(null)}
        />
      )}

      {historyExam && (
        <OmrScansDialog
          exam={historyExam}
          open={!!historyExam}
          onClose={() => setHistoryExam(null)}
        />
      )}

      {scanExam && (
        <OmrScanDialog
          exam={scanExam}
          course={course}
          open={!!scanExam}
          onClose={() => setScanExam(null)}
          onApplyScore={onApplyScore}
          onLearnNumber={onLearnNumber}
          allExams={exams}
          onSwitchExam={(e) => setScanExam(e)}
        />
      )}
    </div>
  );
}
