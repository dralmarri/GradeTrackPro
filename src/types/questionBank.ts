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
  chapter?: string;       // الفصل / الوحدة
  topic?: string;         // الموضوع داخل الفصل
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

// ---------- bulk Excel import ----------
// Template columns (first row headers):
// السؤال | أ | ب | ج | د | هـ | الإجابة | الموضوع | الصعوبة
// - MCQ: fill أ..(هـ) as needed; الإجابة = أ/ب/ج/د/هـ or A..E
// - True/False: leave choices empty; الإجابة = صح or خطأ (or ص/خ)
export interface ParsedQuestion {
  text: string;
  choices: string[];
  correct: number;         // -1 = answer not in the text; user picks it before saving
  num?: number;            // original number in the pasted text (for range-based typing)
  chapter?: string;
  topic?: string;
  difficulty?: Difficulty;
}

export interface BulkParseResult {
  questions: ParsedQuestion[];
  skipped: { row: number; reason: string }[];
}

const ANSWER_MAP: Record<string, number> = {
  "أ": 0, "ا": 0, "a": 0,
  "ب": 1, "b": 1,
  "ج": 2, "c": 2,
  "د": 3, "d": 3,
  "هـ": 4, "ه": 4, "e": 4,
};

const DIFF_MAP: Record<string, Difficulty> = {
  "سهل": "easy", "easy": "easy",
  "متوسط": "medium", "متوسطة": "medium", "medium": "medium",
  "صعب": "hard", "صعبة": "hard", "hard": "hard",
};

export function parseQuestionRows(rows: Record<string, unknown>[]): BulkParseResult {
  const questions: ParsedQuestion[] = [];
  const skipped: BulkParseResult["skipped"] = [];

  const val = (r: Record<string, unknown>, keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(r).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
      if (found && r[found] != null && String(r[found]).trim() !== "") return String(r[found]).trim();
    }
    return "";
  };

  rows.forEach((r, i) => {
    const rowNo = i + 2; // 1-based + header row
    const text = val(r, ["السؤال", "سؤال", "question", "نص السؤال"]);
    if (!text) { skipped.push({ row: rowNo, reason: "لا يوجد نص سؤال" }); return; }

    const rawChoices = [
      val(r, ["أ", "ا", "a"]),
      val(r, ["ب", "b"]),
      val(r, ["ج", "c"]),
      val(r, ["د", "d"]),
      val(r, ["هـ", "ه", "e"]),
    ];
    // trim trailing empties, keep leading order
    let last = -1;
    rawChoices.forEach((c, ci) => { if (c) last = ci; });
    const choices = rawChoices.slice(0, last + 1);

    const ansRaw = val(r, ["الإجابة", "الاجابة", "answer", "الصحيح"]).toLowerCase();
    if (!ansRaw) { skipped.push({ row: rowNo, reason: "لا توجد إجابة" }); return; }

    const chapter = val(r, ["الفصل", "الوحدة", "chapter"]) || undefined;
    const topic = val(r, ["الموضوع", "topic"]) || undefined;
    const difficulty = DIFF_MAP[val(r, ["الصعوبة", "difficulty"]).toLowerCase()] || undefined;

    // true/false question?
    const tfAnswer = ["صح", "ص", "true", "صواب"].includes(ansRaw) ? 0
      : ["خطأ", "خ", "false", "خاطئ"].includes(ansRaw) ? 1
      : -1;
    if (choices.length === 0) {
      if (tfAnswer === -1) { skipped.push({ row: rowNo, reason: "بدون خيارات والإجابة ليست صح/خطأ" }); return; }
      questions.push({ text, choices: ["صح", "خطأ"], correct: tfAnswer, chapter, topic, difficulty });
      return;
    }

    if (choices.length < 2 || choices.some((c) => !c)) {
      skipped.push({ row: rowNo, reason: "خيارات ناقصة (يلزم خياران متتاليان على الأقل)" }); return;
    }
    const correct = ANSWER_MAP[ansRaw] ?? -1;
    if (correct < 0 || correct >= choices.length) {
      skipped.push({ row: rowNo, reason: `إجابة غير صالحة: ${ansRaw}` }); return;
    }
    questions.push({ text, choices, correct, chapter, topic, difficulty });
  });

  return { questions, skipped };
}

// ---------- paste-from-Word / plain-text import ----------
// Understands the common Arabic exam format:
//   الموضوع: الفصل الأول            ← optional, applies to following questions
//   1. نص السؤال  (or  س: نص السؤال)
//   أ) خيار    ب) خيار    ج) خيار   (each on its own line, أ- أ. also accepted)
//   الإجابة: ب                       (or: صح / خطأ for T/F)
// forcedType:
//   "auto"  — classify by content (needs الإجابة: lines)
//   "tf"    — every question is صح/خطأ; answer lines optional (correct=-1 if absent)
//   "mcq"   — multiple choice; answer lines optional (correct=-1 if absent)
//   "mixed" — both types: a question with choice lines is MCQ, otherwise صح/خطأ;
//             answer lines optional. Ranges (أسئلة كذا–كذا) are applied by the UI.
export type PasteType = "auto" | "tf" | "mcq" | "mixed";

// "1-10, 15" → Set{1..10, 15} — Arabic-Indic digits and commas accepted
export function parseNumRanges(s: string): Set<number> {
  const out = new Set<number>();
  const norm = s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  for (const part of norm.split(/[,،]/)) {
    const m = part.trim().match(/^(\d+)\s*[-–—إلى]+\s*(\d+)$/) || part.trim().match(/^(\d+)$/);
    if (!m) continue;
    const a = Number(m[1]), b = Number(m[2] ?? m[1]);
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) out.add(n);
  }
  return out;
}

export function parseQuestionsText(text: string, forcedType: PasteType = "auto"): BulkParseResult {
  const questions: ParsedQuestion[] = [];
  const skipped: BulkParseResult["skipped"] = [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // choices may start with a dash/bullet: "- أ. خيار" / "– ب) خيار" / "• ج: خيار"
  const CHOICE_RE = /^[-–—•*]?\s*([أابجدهabcde]|هـ)\s*[\)\-\.:،]\s*(.+)$/i;
  const Q_RE = /^(?:س\s*[:.]|سؤال\s*[:.]?|(\d+)\s*[\)\-\.:،])\s*(.+)$/;
  const ANS_RE = /^[-–—•*]?\s*(?:الإجابة|الاجابة|الجواب|answer)\s*(?:الصحيحة)?\s*(?:هي)?\s*[:：]?\s*(.+)$/i;
  const CHAPTER_RE = /^(?:الفصل|الوحدة|chapter)\s*[:：]\s*(.+)$/i;
  const TOPIC_RE = /^(?:الموضوع|العنوان|topic)\s*[:：]\s*(.+)$/i;

  const CH_IDX: Record<string, number> = { "أ": 0, "ا": 0, "a": 0, "ب": 1, "b": 1, "ج": 2, "c": 2, "د": 3, "d": 3, "هـ": 4, "ه": 4, "e": 4 };

  let topic: string | undefined;
  let chapter: string | undefined;
  let cur: { text: string; choices: string[]; line: number; num?: number } | null = null;

  const flush = (ansRaw: string | null, lineNo: number) => {
    if (!cur) return;
    // in mixed mode the choices decide the type: with choices → MCQ, without → صح/خطأ
    const eff = forcedType === "mixed" ? (cur.choices.length >= 2 ? "mcq" : "tf") : forcedType;
    if (ansRaw === null) {
      // no answer line — allowed when the type is forced; the user picks answers before saving
      if (eff === "tf") {
        questions.push({ text: cur.text, choices: ["صح", "خطأ"], correct: -1, chapter, topic, num: cur.num });
      } else if (eff === "mcq" && cur.choices.length >= 2) {
        questions.push({ text: cur.text, choices: cur.choices, correct: -1, chapter, topic, num: cur.num });
      } else {
        skipped.push({ row: cur.line, reason: eff === "mcq" ? "خيارات ناقصة" : "سؤال بدون سطر إجابة" });
      }
      cur = null; return;
    }
    // tolerate "أ)" / "ب." / "صح." — keep only the leading token
    const a = ansRaw.trim().toLowerCase().replace(/[\)\-\.:،]+$/, "").split(/\s+/)[0] || "";
    const tf = ["صح", "ص", "true", "صواب"].includes(a) ? 0 : ["خطأ", "خ", "false", "خاطئ"].includes(a) ? 1 : -1;
    if (eff === "tf" || cur.choices.length === 0) {
      if (tf === -1) { skipped.push({ row: cur.line, reason: `إجابة غير مفهومة: ${ansRaw}` }); cur = null; return; }
      questions.push({ text: cur.text, choices: ["صح", "خطأ"], correct: tf, chapter, topic, num: cur.num });
    } else {
      const idx = CH_IDX[a] ?? -1;
      if (idx < 0 || idx >= cur.choices.length) {
        skipped.push({ row: cur.line, reason: `إجابة غير صالحة: ${ansRaw}` }); cur = null; return;
      }
      questions.push({ text: cur.text, choices: cur.choices, correct: idx, chapter, topic, num: cur.num });
    }
    cur = null;
  };

  lines.forEach((line, i) => {
    const chm = line.match(CHAPTER_RE);
    if (chm && !line.match(Q_RE)) { chapter = chm[1].trim(); return; }
    const tm = line.match(TOPIC_RE);
    if (tm) { topic = tm[1].trim(); return; }
    const qm = line.match(Q_RE);
    if (qm) {
      if (cur) flush(null, i); // previous question had no answer
      cur = { text: qm[2].trim(), choices: [], line: i + 1, num: qm[1] ? Number(qm[1]) : undefined };
      return;
    }
    const am = line.match(ANS_RE);
    if (am) { flush(am[1], i); return; }
    const cm = line.match(CHOICE_RE);
    if (cm && cur) { cur.choices.push(cm[2].trim()); return; }
    // continuation of question text
    if (cur && cur.choices.length === 0) cur.text += " " + line;
  });
  if (cur) flush(null, lines.length);

  return { questions, skipped };
}
