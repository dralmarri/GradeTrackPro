// Question bank for auto-generating exams (v2).
// Professors store questions once, then generate exam forms (نموذج أ/ب…)
// with shuffled order — the answer key is filled in automatically.

export type Difficulty = "easy" | "medium" | "hard";

export interface BankQuestion {
  id: string;
  courseId: string;
  text: string;
  choices: string[];      // 2 = true/false (ص/خ), 3-5 = MCQ
  correct: number;        // index into choices
  topic?: string;         // e.g. "الفصل الثالث"
  difficulty?: Difficulty;
  createdAt: string;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

// deterministic shuffle so نموذج أ/ب are stable per version index
function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rnd = lcg(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface GeneratedForm {
  version: string;                 // "أ", "ب", …
  questions: BankQuestion[];       // in exam order (MCQ block first, then T/F)
  choiceOrders: number[][];        // per question: mapping display-pos -> original choice index
  answerKey: number[];             // per question: correct choice index in DISPLAY order
  sections: { questionCount: number; choiceCount: 2 | 3 | 4 | 5 }[];
}

export const VERSION_LETTERS = ["أ", "ب", "ج", "د"];

// Build N exam forms from a pool: shuffle question order and (for MCQ) choice
// order per form. T/F choices are never shuffled (ص always first).
export function generateForms(pool: BankQuestion[], formsCount: number, seedBase: number): GeneratedForm[] {
  const forms: GeneratedForm[] = [];
  for (let v = 0; v < formsCount; v++) {
    const seed = seedBase + v * 7919;
    // group by EXACT choice count (5,4,3 then 2) so every question's printed
    // bubbles match its real choices — no phantom D/E bubbles on 3-choice items
    const widths = Array.from(new Set(pool.map((q) => q.choices.length)))
      .sort((a, b) => b - a)
      .filter((w) => w > 2);
    const groups = widths.map((w) =>
      seededShuffle(pool.filter((q) => q.choices.length === w), seed + w * 31),
    );
    const tf = seededShuffle(pool.filter((q) => q.choices.length === 2), seed + 13);
    const ordered = [...groups.flat(), ...tf];

    const choiceOrders: number[][] = [];
    const answerKey: number[] = [];
    ordered.forEach((q, qi) => {
      const idx = q.choices.map((_, i) => i);
      const order = q.choices.length === 2 ? idx : seededShuffle(idx, seed + 101 * (qi + 1));
      choiceOrders.push(order);
      answerKey.push(order.indexOf(q.correct));
    });

    const sections: GeneratedForm["sections"] = [];
    groups.forEach((g, gi) => {
      if (g.length) sections.push({ questionCount: g.length, choiceCount: widths[gi] as 3 | 4 | 5 });
    });
    if (tf.length) sections.push({ questionCount: tf.length, choiceCount: 2 });

    forms.push({ version: VERSION_LETTERS[v] || String(v + 1), questions: ordered, choiceOrders, answerKey, sections });
  }
  return forms;
}
