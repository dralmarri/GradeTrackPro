import { useState } from "react";
import { Course } from "@/types/student";
import { OmrExam, ChoiceCount } from "@/types/exam";
import { useOmrExams } from "@/hooks/useOmrExams";
import { printAnswerSheet } from "@/lib/omr/sheet";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Printer, Trash2, KeyRound, ScanLine, Loader2, CheckCircle2, Pencil,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];

interface Props {
  course: Course;
}

export default function OmrExamsPage({ course }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { exams, loading, addExam, updateExam, updateAnswerKey, deleteExam } = useOmrExams(course.id);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [choiceCount, setChoiceCount] = useState<ChoiceCount>(4);
  const [targetComponent, setTargetComponent] = useState("exam1");
  const [maxScore, setMaxScore] = useState(20);
  const [creating, setCreating] = useState(false);
  const [openKeyExamId, setOpenKeyExamId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState<number[]>([]);
  const [savingKey, setSavingKey] = useState(false);
  const [editExamId, setEditExamId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMaxScore, setEditMaxScore] = useState(20);
  const [editTarget, setEditTarget] = useState("exam1");
  const [savingEdit, setSavingEdit] = useState(false);

  const componentOptions = [
    { key: "exam1", label: ar ? "اختبار أول" : "Exam 1" },
    { key: "exam2", label: ar ? "اختبار ثاني" : "Exam 2" },
    { key: "finalExam", label: ar ? "نهائي" : "Final" },
    ...(course.customComponents || []).map((c) => ({ key: c.key, label: c.label })),
  ];

  const handleCreate = async () => {
    if (!title.trim()) { toast.error(ar ? "أدخل عنوان الاختبار" : "Enter exam title"); return; }
    if (questionCount < 1 || questionCount > 100) {
      toast.error(ar ? "عدد الأسئلة بين 1 و 100" : "Questions must be 1–100"); return;
    }
    setCreating(true);
    const id = await addExam({
      title: title.trim(), questionCount, choiceCount,
      targetComponent, maxScore, studentIdDigits: 6,
    });
    setCreating(false);
    if (id) {
      toast.success(ar ? "تم إنشاء الاختبار" : "Exam created");
      setShowCreate(false); setTitle(""); setQuestionCount(20); setMaxScore(20);
      setOpenKeyExamId(id);
      setDraftKey(new Array(questionCount).fill(-1));
    }
  };

  const openKey = (exam: OmrExam) => {
    setOpenKeyExamId(exam.id);
    setDraftKey(exam.answerKey.length === exam.questionCount ? [...exam.answerKey] : new Array(exam.questionCount).fill(-1));
  };

  const setKeyChoice = (q: number, c: number) => {
    setDraftKey((prev) => { const n = [...prev]; n[q] = n[q] === c ? -1 : c; return n; });
  };

  const saveKey = async (exam: OmrExam) => {
    setSavingKey(true);
    await updateAnswerKey(exam.id, draftKey);
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
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد الأسئلة" : "Questions"}
              <input
                type="number" min={1} max={100} value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "الدرجة القصوى" : "Max score"}
              <input
                type="number" min={1} value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              {ar ? "عدد الخيارات" : "Choices"}
              <select
                value={choiceCount}
                onChange={(e) => setChoiceCount(Number(e.target.value) as ChoiceCount)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={4}>A – D</option>
                <option value={5}>A – E</option>
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
                <p className="truncate font-display text-base font-bold text-foreground">{exam.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {exam.questionCount} {ar ? "سؤال" : "Qs"} · {LETTERS.slice(0, exam.choiceCount).join(" ")} · {exam.maxScore} {ar ? "درجة" : "pts"}
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
                  onClick={() => { if (!printAnswerSheet(exam)) toast.error(ar ? "اسمح بالنوافذ المنبثقة للطباعة" : "Allow pop-ups to print"); }}
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
                  onClick={async () => { await deleteExam(exam.id); toast.success(ar ? "حُذف الاختبار" : "Exam deleted"); }}
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
                    await updateExam(exam.id, { title: editTitle.trim(), maxScore: editMaxScore, targetComponent: editTarget });
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
                  {ar ? "اختر الإجابة الصحيحة لكل سؤال:" : "Pick the correct answer per question:"}
                </p>
                <div className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {Array.from({ length: exam.questionCount }, (_, q) => (
                    <div key={q} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                      <span className="w-6 text-center text-xs font-bold text-muted-foreground">{q + 1}</span>
                      <div className="flex gap-1">
                        {Array.from({ length: exam.choiceCount }, (_, c) => (
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
                            {LETTERS[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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

            {/* scan placeholder (Phase 3) */}
            <button
              disabled
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground"
              title={ar ? "قريباً" : "Coming soon"}
            >
              <ScanLine size={14} />
              {ar ? "تصحيح بالكاميرا (المرحلة القادمة)" : "Scan & grade (next phase)"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
