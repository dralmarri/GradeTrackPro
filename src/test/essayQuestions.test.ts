import { describe, expect, it } from "vitest";
import { generateForms } from "@/types/questionBank";
import { buildQuestionPaperHtml } from "@/lib/omr/questionPaper";
import type { BankQuestion } from "@/types/questionBank";

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

  it("the printed question paper renders a blank writing area per essay question, numbered after the bubbled ones", () => {
    const pool = [mcq("m1"), essay("e1", 4)];
    const [form] = generateForms(pool, 1, 1);
    const html = buildQuestionPaperHtml("اختبار تجريبي", form);
    expect(html).toContain("أسئلة مقالية");
    expect(html).toContain("سؤال مقالي e1");
    expect(html).toContain("(4 درجات)");
    // essay question is numbered right after the single bubbled question
    expect(html).toContain("<b>2.</b>");
    // 4 points -> 8 blank lines (min 3, capped 10, 2 lines per point)
    expect((html.match(/class="essay-line"/g) || []).length).toBe(8);
  });
});
