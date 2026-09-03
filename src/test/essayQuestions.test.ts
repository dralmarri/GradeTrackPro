import { describe, expect, it } from "vitest";
import { generateForms } from "@/types/questionBank";
import { buildQuestionPaperHtml } from "@/lib/omr/questionPaper";
import { buildAnswerSheetHtml } from "@/lib/omr/sheet";
import type { BankQuestion } from "@/types/questionBank";
import type { OmrExam } from "@/types/exam";

function mcq(id: string, points = 1): BankQuestion {
  return {
    id, courseId: "c", text: `سؤال اختيار ${id}`, choices: ["أ", "ب", "ج", "د"], correct: 0,
    points, createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function essay(id: string, points = 5): BankQuestion {
  return {
    id, courseId: "c", text: `سؤال مقالي ${id}`, kind: "essay", choices: [], correct: -1,
    points, createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("essay questions", () => {
  it("generateForms keeps essay questions out of the bubble-graded set", () => {
    const pool = [mcq("m1"), mcq("m2"), essay("e1", 5), essay("e2", 3)];
    const [form] = generateForms(pool, 1, 1);
    expect(form.questions).toHaveLength(2);
    expect(form.questions.every((q) => q.kind !== "essay")).toBe(true);
    expect(form.answerKey).toHaveLength(2);
    expect(form.essayQuestions).toHaveLength(2);
    expect(form.essayQuestions.map((q) => q.id).sort()).toEqual(["e1", "e2"]);
  });

  it("generateForms works with an essay-only pool (no bubbled questions at all)", () => {
    const pool = [essay("e1"), essay("e2")];
    const [form] = generateForms(pool, 1, 1);
    expect(form.questions).toHaveLength(0);
    expect(form.answerKey).toHaveLength(0);
    expect(form.essayQuestions).toHaveLength(2);
  });

  it("the printed question paper shows only the essay question text (no writing area), numbered after the bubbled ones", () => {
    const pool = [mcq("m1"), essay("e1", 4)];
    const [form] = generateForms(pool, 1, 1);
    const html = buildQuestionPaperHtml("اختبار تجريبي", form);
    expect(html).toContain("أسئلة مقالية");
    expect(html).toContain("سؤال مقالي e1");
    expect(html).toContain("(4 درجات)");
    // essay question is numbered right after the single bubbled question
    expect(html).toContain("<b>2.</b>");
    // the writing area itself lives on the answer sheet, not here
    expect(html).not.toContain("eline");
  });

  it("the answer sheet appends a second page with ruled writing lines for essay questions, sized to their points", () => {
    const exam: OmrExam = {
      id: "exam1", courseId: "c", title: "اختبار تجريبي", questionCount: 2, choiceCount: 4,
      targetComponent: "exam1", maxScore: 20, answerKey: [0, 1], studentIdDigits: 10,
      idMode: "written", essayQuestions: [{ text: "سؤال مقالي 1", points: 4 }, { text: "سؤال مقالي 2", points: 1 }],
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const html = buildAnswerSheetHtml(exam);
    expect(html).toContain("essay-page");
    expect(html).toContain("إجابات مقالية");
    expect(html).toContain("GradeTrackPro"); // matches page 1's brand header
    expect(html).toContain("سؤال مقالي 1");
    expect(html).toContain("سؤال مقالي 2");
    // page numbers: bubble page is 1/2, essay page is 2/2
    expect(html).toContain(">1/2<");
    expect(html).toContain(">2/2<");
    // 4 points -> 8 lines, 1 point -> min 3 lines
    expect((html.match(/class="eline"/g) || []).length).toBe(11);
    // an exam with no essay questions gets no second page at all
    const plainHtml = buildAnswerSheetHtml({ ...exam, essayQuestions: undefined });
    expect(plainHtml).not.toContain("essay-page");
  });
});
