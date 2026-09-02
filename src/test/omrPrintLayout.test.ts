import { describe, expect, it } from "vitest";
import { buildAnswerSheetHtml, buildAnswerSheetSvg } from "@/lib/omr/sheet";
import { gridSpec, maxQuestions, questionBubble } from "@/lib/omr/layout";
import type { OmrExam } from "@/types/exam";

function exam(questionCount: number, idMode: "written" | "bubbles" = "written"): OmrExam {
  return {
    id: `test-${questionCount}-${idMode}`, courseId: "course", title: "الاختبار النهائي",
    questionCount, choiceCount: 4, targetComponent: "exam1", maxScore: 60,
    answerKey: Array(questionCount).fill(-1), studentIdDigits: 12, idMode,
    version: "أ", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("UX Pilot OMR print layout", () => {
  it("renders the approved two-column identity header and exact A4 print CSS", () => {
    const value = { ...exam(5), studentIdDigits: 10 };
    const html = buildAnswerSheetHtml(value, { courseName: "قواعد البيانات" });
    expect(html).toContain("@page{size:A4 portrait;margin:0}");
    expect(html).toContain("اسم الطالب (بخط اليد)");
    expect(html).toContain("طريقة التظليل الصحيحة");
    expect(html).toContain("width=\"210mm\"");
    expect(html).toContain("height=\"297mm\"");
    expect((html.match(/y=\"60\" width=/g) || []).length).toBe(10);
  });

  it("uses two balanced columns for a 40-question written sheet", () => {
    const value = exam(40);
    expect(gridSpec(value).cols).toBe(2);
    expect(gridSpec(value).rows).toBe(20);
    expect(buildAnswerSheetSvg(value)).toContain("21–40");
  });

  it("keeps every supported bubble inside the safe printable area", () => {
    for (const mode of ["written", "bubbles"] as const) {
      const value = exam(Math.min(40, maxQuestions({ idMode: mode })), mode);
      for (let q = 0; q < value.questionCount; q++) {
        for (let choice = 0; choice < 4; choice++) {
          const point = questionBubble(value, q, choice);
          expect(point.x).toBeGreaterThanOrEqual(20);
          expect(point.x).toBeLessThanOrEqual(195);
          expect(point.y).toBeGreaterThanOrEqual(95);
          expect(point.y).toBeLessThanOrEqual(270);
        }
      }
    }
  });
});
