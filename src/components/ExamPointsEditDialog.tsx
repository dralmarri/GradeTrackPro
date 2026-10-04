import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import type { GeneratedForm } from "@/types/questionBank";

// Lets the professor adjust each question's points one last time, right
// before printing — whether it's the first print right after generating,
// or a reprint from the exam's history. Shown instead of printing
// immediately so a wrong weight (or a last-minute change of mind) can be
// fixed without regenerating the whole exam.
interface Props {
  form: GeneratedForm;
  ar: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (form: GeneratedForm) => void;
}

const kindOf = (q: { kind?: "choice" | "essay"; choices: string[] }): "tf" | "mcq" | "essay" =>
  q.kind === "essay" ? "essay" : q.choices.length === 2 ? "tf" : "mcq";

export default function ExamPointsEditDialog({ form, ar, busy, onCancel, onConfirm }: Props) {
  const [questions, setQuestions] = useState(form.questions);
  const [essayQuestions, setEssayQuestions] = useState(form.essayQuestions);

  const setPoints = (id: string, essay: boolean, v: number) => {
    const upd = <T extends { id: string; points?: number }>(list: T[]) =>
      list.map((q) => (q.id === id ? { ...q, points: v } : q));
    if (essay) setEssayQuestions((prev) => upd(prev));
    else setQuestions((prev) => upd(prev));
  };

  const bubbleTotal = questions.reduce((a, q) => a + (q.points ?? 1), 0);
  const essayTotal = essayQuestions.reduce((a, q) => a + (q.points ?? 1), 0);

  const groups = [
    { key: "tf" as const, essay: false, label: ar ? "صح وخطأ" : "True/False", items: questions.filter((q) => kindOf(q) === "tf") },
    { key: "mcq" as const, essay: false, label: ar ? "اختيار من متعدد" : "Multiple choice", items: questions.filter((q) => kindOf(q) === "mcq") },
    { key: "essay" as const, essay: true, label: ar ? "مقالي" : "Essay", items: essayQuestions },
  ].filter((g) => g.items.length);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
        <p className="text-sm font-bold text-foreground">
          {ar ? "عدّل درجات الأسئلة قبل الطباعة" : "Edit question points before printing"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {ar
            ? `مجموع أسئلة الاختيار/صح وخطأ: ${bubbleTotal}${essayTotal ? ` + مقالي: ${essayTotal}` : ""}`
            : `MCQ/T-F total: ${bubbleTotal}${essayTotal ? ` + essay: ${essayTotal}` : ""}`}
        </p>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-1.5">
          {groups.flatMap((g) => [
            <p key={"t" + g.key} className="sticky top-0 -mx-1.5 -mt-1.5 bg-background px-2.5 py-1 text-[11px] font-bold text-muted-foreground first:mt-0">
              {g.label} <span className="text-muted-foreground/70">({g.items.length})</span>
            </p>,
            ...g.items.map((q) => (
              <div key={q.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{q.text}</p>
                <input
                  type="number" min={0.25} step={0.25}
                  value={q.points ?? 1}
                  onChange={(e) => setPoints(q.id, g.essay, Number(e.target.value) || 1)}
                  title={ar ? "درجة السؤال" : "Points"}
                  className="w-14 shrink-0 rounded-lg border border-input bg-background px-1.5 py-1 text-center text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
            )),
          ])}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm({ ...form, questions, essayQuestions })}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            {ar ? "طباعة بهذه الدرجات" : "Print with these points"}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {ar ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
