// Exam / OMR (bubble-sheet) data model for GradeTrackPro v2.
// This is a native, integrated grading system — not a ZipGrade clone.
// Scores flow straight into the student's course record.

export type ChoiceCount = 4 | 5; // A–D or A–E

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
export function gradeOmr(exam: OmrExam, answers: number[]): Omit<OmrScanResult, "studentNumber" | "matchedStudentId"> {
  const results: OmrQuestionResult[] = [];
  let rawCorrect = 0;
  for (let i = 0; i < exam.questionCount; i++) {
    const key = exam.answerKey[i];
    const marked = answers[i] ?? -1;
    const correct = key >= 0 && marked === key;
    if (correct) rawCorrect++;
    results.push({ questionIndex: i, marked, correct });
  }
  const gradedCount = exam.answerKey.filter((k) => k >= 0).length || exam.questionCount;
  const score = gradedCount > 0
    ? Math.round((rawCorrect / gradedCount) * exam.maxScore * 100) / 100
    : 0;
  return { answers, results, score, rawCorrect };
}
