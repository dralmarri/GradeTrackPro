import { writeFile } from "node:fs/promises";
import { buildAnswerSheetSvg } from "../src/lib/omr/sheet.ts";

const count = Number(process.argv[2] || 20);
const mode = process.argv[3] === "bubbles" ? "bubbles" : "written";
const exam = {
  id: `preview-${count}-${mode}`,
  courseId: "preview",
  title: "الاختبار النهائي",
  questionCount: count,
  choiceCount: 4,
  targetComponent: "exam1",
  maxScore: 60,
  answerKey: Array(count).fill(-1),
  studentIdDigits: 12,
  sections: count >= 10 ? [{ questionCount: Math.ceil(count * .75), choiceCount: 4 }, { questionCount: Math.floor(count * .25), choiceCount: 2 }] : undefined,
  version: "أ",
  idMode: mode,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
const header = { institution: "جامعة المدينة التقنية", college: "كلية علوم الحاسوب", department: "قسم هندسة البرمجيات", courseName: "أساسيات قواعد البيانات" };
const output = process.argv[4] || `omr-preview-${count}-${mode}.svg`;
await writeFile(output, buildAnswerSheetSvg(exam, header), "utf8");
console.log(output);
