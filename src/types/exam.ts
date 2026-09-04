// Exam / OMR (bubble-sheet) data model for GradeTrackPro v2.
// This is a native, integrated grading system — not a ZipGrade clone.
// Scores flow straight into the student's course record.

export type ChoiceCount = 2 | 3 | 4 | 5; // 2 = صح/خطأ, 3 = أ–ج, 4 = أ–د, 5 = أ–هـ

// display letters per choice count — Arabic alphabet letters (أ ب ج د هـ)
// for multiple choice, matching the approved OMR sheet mockup. True/false
// (choiceCount 2) uses ص/خ (صح/خطأ) instead — labeling it أ/ب read as
// arbitrary rather than naming the actual answer.
export function choiceLabels(choiceCount: ChoiceCount): string[] {
  if (choiceCount === 2) return ["ص", "خ"];
  return ["أ", "ب", "ج", "د", "هـ"].slice(0, choiceCount);
}

// A mixed exam is made of consecutive sections, each with its own choice
// count — e.g. section 1: 10 MCQ (A–D), section 2: 5 true/false.
export interface OmrSection {
  questionCount: number;
  choiceCount: ChoiceCount;
}

// choice count for question q (0-based), honouring sections when present
export function choiceCountFor(exam: Pick<OmrExam, "choiceCount" | "sections">, q: number): ChoiceCount {
  if (exam.sections && exam.sections.length > 0) {
    let acc = 0;
    for (const s of exam.sections) {
      acc += s.questionCount;
      if (q < acc) return s.choiceCount;
    }
  }
  return exam.choiceCount;
}

export function choiceLabelsFor(exam: Pick<OmrExam, "choiceCount" | "sections">, q: number): string[] {
  return choiceLabels(choiceCountFor(exam, q));
}

export interface OmrExam {
  id: string;
  courseId: string;
  title: string;
  questionCount: number;
  choiceCount: ChoiceCount;
  // which course component this exam's score maps to (exam1 / exam2 / custom key…)
  targetComponent: string;
  maxScore: number;            // full mark for this exam
  answerKey: number[];         // per question: index of correct choice (0=A), -1 = not set
  studentIdDigits: number;     // how many digits the student number box has
  sections?: OmrSection[];     // optional mixed-type sections (T/F + MCQ…)
  version?: string;            // exam form letter/number (نموذج أ/ب…) printed on the sheet
  idMode?: "bubbles" | "written"; // student number: bubble grid (auto-read) or handwritten civil-ID box
  questionWeights?: number[];  // per-question points; when set, maxScore = sum(weights)
  // Essay questions never get bubbles or an answerKey entry — they print
  // with a blank writing area and are scored manually after scanning (see
  // OmrScanDialog). Their points are on top of maxScore, not part of it.
  essayQuestions?: { text: string; points: number }[];
  // "bank" = generated from the question bank (GenerateExamPanel, full
  // exam with questions + auto answer key). "manual" = the answer-sheet-
  // only flow, for a paper exam the professor already has outside the
  // bank. Lets the exams list be split into "نماذج اختبارات سابقة" vs
  // "نماذج أوراق اجابة سابقة". Absent on rows saved before this existed —
  // treated as "manual" by callers, since that flow predates it.
  source?: "bank" | "manual";
  createdAt: string;
  updatedAt: string;
}

export interface OmrQuestionResult {
  questionIndex: number;
  marked: number;              // chosen choice index, -1 = blank, -2 = multiple/ambiguous
  correct: boolean;
}

export interface OmrScanResult {
  studentNumber: string;       // read from the ID box
  matchedStudentId: string | null;
  answers: number[];           // per question chosen index
  results: OmrQuestionResult[];
  score: number;               // out of maxScore
  rawCorrect: number;          // number of correct questions
}

export function createOmrExam(
  courseId: string,
  title: string,
  questionCount: number,
  choiceCount: ChoiceCount,
  targetComponent: string,
  maxScore: number,
  studentIdDigits: number,
  timestampIso: string,
): OmrExam {
  return {
    id: crypto.randomUUID(),
    courseId,
    title,
    questionCount,
    choiceCount,
    targetComponent,
    maxScore,
    answerKey: new Array(questionCount).fill(-1),
    studentIdDigits,
    createdAt: timestampIso,
    updatedAt: timestampIso,
  };
}

// Grade a set of student answers against the exam's answer key.
// With questionWeights set, each question earns its own points; otherwise
// all questions weigh equally against maxScore.
export function gradeOmr(exam: OmrExam, answers: number[]): Omit<OmrScanResult, "studentNumber" | "matchedStudentId"> {
  const results: OmrQuestionResult[] = [];
  let rawCorrect = 0;
  let earned = 0;
  const weights = exam.questionWeights && exam.questionWeights.length === exam.questionCount
    ? exam.questionWeights
    : null;
  for (let i = 0; i < exam.questionCount; i++) {
    const key = exam.answerKey[i];
    const marked = answers[i] ?? -1;
    const correct = key >= 0 && marked === key;
    if (correct) {
      rawCorrect++;
      if (weights) earned += weights[i];
    }
    results.push({ questionIndex: i, marked, correct });
  }
  let score: number;
  if (weights) {
    score = Math.round(earned * 100) / 100;
  } else {
    const gradedCount = exam.answerKey.filter((k) => k >= 0).length || exam.questionCount;
    score = gradedCount > 0
      ? Math.round((rawCorrect / gradedCount) * exam.maxScore * 100) / 100
      : 0;
  }
  return { answers, results, score, rawCorrect };
}
