import { useState } from "react";
import { Course, getLabel } from "@/types/student";
import { OmrExam, ChoiceCount, OmrSection, choiceLabels, choiceCountFor, choiceLabelsFor } from "@/types/exam";
import { useOmrExams } from "@/hooks/useOmrExams";
import { printAnswerSheet } from "@/lib/omr/sheet";
import { MAX_QUESTIONS } from "@/lib/omr/layout";
import OmrScanDialog from "@/components/OmrScanDialog";
import OmrScansDialog from "@/components/OmrScansDialog";
import OmrStatsDialog from "@/components/OmrStatsDialog";
import QuestionBankPage from "@/components/QuestionBankPage";
import { GeneratedForm } from "@/types/questionBank";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Printer, Trash2, KeyRound, ScanLine, Loader2, CheckCircle2, Pencil, History, BarChart3,
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
  const [sections, setSections] = useState<OmrSection[]>([{ questionCount: 20, choiceCount: 4 }]);
  const [targetComponent, setTargetComponent] = useState("exam1");
  const [maxScore, setMaxScore] = useState(20);
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
  const [idMode, setIdMode] = useState<"bubbles" | "written">("bubbles");
  const [logo, setLogo] = useState(() => localStorage.getItem("gtp_logo") || "");
  const [institution, setInstitution] = useState(() => localStorage.getItem("gtp_institution") || "");
  const [college, setCollege] = useState(() => localStorage.getItem("gtp_college") || "");
  const [department, setDepartment] = useState(() => localStorage.getItem("gtp_department") || "");

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
      setLogo(dataUrl);
      localStorage.setItem("gtp_logo", dataUrl);
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

  const totalQuestions = sections.reduce((a, s) => a + (Number(s.questionCount) || 0), 0);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (totalQuestions < 1 || totalQuestions > MAX_QUESTIONS) {
      toast.error(ar ? `عدد الأسئلة بين 1 و ${MAX_QUESTIONS}` : `Questions must be 1–${MAX_QUESTIONS}`); return;
    }
    setCreating(true);
    // one exam per requested form (نموذج أ/ب/ج/د) — each gets its own answer key
    const letters = ["أ", "ب", "ج", "د"];
    let firstId: string | null = null;
    for (let v = 0; v < formsCount; v++) {
      const id = await addExam({
        title: title.trim(),
        questionCount: totalQuestions,
        choiceCount: sections[0].choiceCount,
        targetComponent, maxScore, studentIdDigits: 12,
        sections: sections.length > 1 ? sections : undefined,
        version: formsCount > 1 ? letters[v] : undefined,
        idMode,
      });
      if (!id) break;
      if (!firstId) firstId = id;
    }
    setCreating(false);
    if (firstId) {
      toast.success(
        formsCount > 1
          ? (ar ? `أُنشئت ${formsCount} نماذج — أدخل مفتاح كل نموذج` : `${formsCount} forms created — enter each form's key`)
          : (ar ? "تم إنشاء الاختبار" : "Exam created"),
        { duration: 6000 },
      );
      setShowCreate(false); setTitle(""); setSections([{ questionCount: 20, choiceCount: 4 }]); setMaxScore(20); setFormsCount(1);
      setOpenKeyExamId(firstId);
      setDraftKey(new Array(totalQuestions).fill(-1));
      setDraftWeights(new Array(totalQuestions).fill(Math.round((maxScore / totalQuestions) * 100) / 100));
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
    await updateAnswerKey(exam.id, draftKey, draftWeights.map((w) => Number(w) || 0));
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
      {/* header + create */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">
          {ar ? "التصحيح الآلي" : "Auto Grading"}
        </h3>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus size={14} />
          {ar ? "اختبار جديد" : "New exam"}
        </button>
      </div>

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
                  onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, choiceCount: Number(e.target.value) as ChoiceCount } : s))}
                  className="flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value={2}>{ar ? "صح / خطأ" : "True / False"}</option>
                  <option value={3}>A – C</option>
                  <option value={4}>A – D</option>
                  <option value={5}>A – E</option>
                </select>
                <input
                  type="number" min={1} max={MAX_QUESTIONS} value={sec.questionCount}
                  onChange={(e) => setSections((prev) => prev.map((s, j) => j === i ? { ...s, questionCount: Number(e.target.value) || 1 } : s))}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-center text-sm text-foreground outline-none focus:border-primary"
                  title={ar ? "عدد الأسئلة" : "Questions"}
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
                onClick={() => setSections((prev) => [...prev, { questionCount: 5, choiceCount: 2 }])}
                className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Plus size={13} />
                {ar ? "إضافة قسم (نوع آخر)" : "Add section"}
              </button>
              <span className="text-xs text-muted-foreground">
                {ar ? `المجموع: ${totalQuestions} سؤالاً` : `Total: ${totalQuestions} questions`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الدرجة القصوى" : "Max score"}
              <input
                type="number" min={1} value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "رقم الطالب في الورقة" : "Student ID on sheet"}
              <select
                value={idMode}
                onChange={(e) => setIdMode(e.target.value as "bubbles" | "written")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="bubbles">{ar ? "فقاعات تُقرأ آلياً" : "Bubbles (auto-read)"}</option>
                <option value="written">{ar ? "مستطيل رقم مدني (كتابة يدوية)" : "Civil-ID box (handwritten)"}</option>
              </select>
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

      {/* sheet header settings (institution/college/department) */}
      <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <summary className="cursor-pointer text-xs font-bold text-muted-foreground">
          {ar ? "ترويسة ورقة الإجابة (المؤسسة / الكلية / القسم)" : "Sheet header (institution / college / dept)"}
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={institution}
            onChange={(e) => { setInstitution(e.target.value); localStorage.setItem("gtp_institution", e.target.value); }}
            placeholder={ar ? "المؤسسة التعليمية" : "Institution"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={college}
            onChange={(e) => { setCollege(e.target.value); localStorage.setItem("gtp_college", e.target.value); }}
            placeholder={ar ? "الكلية" : "College"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={department}
            onChange={(e) => { setDepartment(e.target.value); localStorage.setItem("gtp_department", e.target.value); }}
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
                onClick={() => { setLogo(""); localStorage.removeItem("gtp_logo"); }}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                {ar ? "إزالة" : "Remove"}
              </button>
            </>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {ar ? "تُحفظ هذه البيانات على جهازك وتظهر أعلى كل ورقة إجابة تطبعها. إن تُرك الشعار فارغاً تبقى مساحته خالية." : "Saved on this device and printed at the top of every sheet."}
        </p>
      </details>

      {/* exams list */}
      {exams.length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
          <ScanLine size={32} className="mb-2 opacity-50" />
          <p className="text-sm font-semibold">{ar ? "لا توجد اختبارات تصحيح آلي بعد" : "No auto-graded exams yet"}</p>
          <p className="mt-1 text-xs">{ar ? "أنشئ اختباراً، اطبع ورقة الإجابة، ثم صحّح بالكاميرا" : "Create an exam, print the sheet, then scan"}</p>
        </div>
      )}

      {exams.map((exam) => {
        const keyDone = exam.answerKey.filter((k) => k >= 0).length;
        const keyOpen = openKeyExamId === exam.id;
        return (
          <div key={exam.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
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
                  onClick={() => { if (!printAnswerSheet(exam, sheetHeader())) toast.error(ar ? "اسمح بالنوافذ المنبثقة للطباعة" : "Allow pop-ups to print"); }}
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-success/10 py-2.5 text-xs font-bold text-success transition-colors hover:bg-success/20"
            >
              <ScanLine size={14} />
              {ar ? "تصحيح بالكاميرا" : "Scan & grade"}
            </button>
          </div>
        );
      })}

      {/* question bank + auto exam generation */}
      <div className="border-t border-border pt-4">
        <QuestionBankPage
          course={course}
          bankCourseIds={bankCourseIds}
          sheetHeader={sheetHeader}
          componentOptions={componentOptions}
          onCreateExam={addExam}
          onSetAnswerKey={updateAnswerKey}
          buildExam={(id, form: GeneratedForm, t, target, max, mode) => ({
            id,
            courseId: course.id,
            title: t,
            questionCount: form.questions.length,
            choiceCount: form.sections[0].choiceCount,
            targetComponent: target,
            maxScore: max,
            answerKey: form.answerKey,
            studentIdDigits: 12,
            sections: form.sections.length > 1 ? form.sections : undefined,
            version: form.version,
            idMode: mode,
            createdAt: "",
            updatedAt: "",
          })}
        />
      </div>

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
        />
      )}
    </div>
  );
}
