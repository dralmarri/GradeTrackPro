// Generates a printable OMR (bubble) answer sheet as self-contained HTML.
// Includes four corner registration marks so the scanner (Phase 3) can
// detect the sheet and correct perspective. No external dependencies.

import { OmrExam } from "@/types/exam";

const CHOICE_LETTERS = ["A", "B", "C", "D", "E"];

function bubble(label: string): string {
  return `<span class="bub">${label}</span>`;
}

function questionRow(qIndex: number, choiceCount: number): string {
  const bubbles = Array.from({ length: choiceCount }, (_, c) => bubble(CHOICE_LETTERS[c])).join("");
  return `
    <div class="qrow">
      <span class="qnum">${qIndex + 1}</span>
      <div class="bubs">${bubbles}</div>
    </div>`;
}

function idColumn(colIndex: number): string {
  const digits = Array.from({ length: 10 }, (_, d) => bubble(String(d))).join("");
  return `<div class="idcol"><span class="idhead">${colIndex + 1}</span>${digits}</div>`;
}

export function buildAnswerSheetHtml(exam: OmrExam): string {
  const half = Math.ceil(exam.questionCount / 2);
  const col1 = Array.from({ length: half }, (_, i) => questionRow(i, exam.choiceCount)).join("");
  const col2 = Array.from({ length: exam.questionCount - half }, (_, i) =>
    questionRow(half + i, exam.choiceCount),
  ).join("");
  const idCols = Array.from({ length: exam.studentIdDigits }, (_, i) => idColumn(i)).join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${exam.title}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #000; margin: 0; }
  .mark { position: fixed; width: 10mm; height: 10mm; background: #000; }
  .mark.tl { top: 6mm; left: 6mm; }
  .mark.tr { top: 6mm; right: 6mm; }
  .mark.bl { bottom: 6mm; left: 6mm; }
  .mark.br { bottom: 6mm; right: 6mm; }
  .head { text-align: center; margin: 4mm 0 3mm; }
  .head h1 { font-size: 16pt; margin: 0 0 2mm; }
  .head .meta { font-size: 10pt; color: #333; }
  .idbox { border: 1.5px solid #000; border-radius: 3mm; padding: 3mm; margin: 0 auto 4mm; width: fit-content; }
  .idbox .lbl { font-size: 9pt; text-align: center; margin-bottom: 2mm; font-weight: bold; }
  .idgrid { display: flex; gap: 2.5mm; direction: ltr; }
  .idcol { display: flex; flex-direction: column; align-items: center; gap: 1mm; }
  .idhead { font-size: 8pt; color: #666; margin-bottom: 1mm; }
  .cols { display: flex; gap: 8mm; direction: ltr; justify-content: center; }
  .qrow { display: flex; align-items: center; gap: 2mm; margin-bottom: 1.6mm; }
  .qnum { width: 8mm; text-align: right; font-size: 10pt; font-weight: bold; }
  .bubs { display: flex; gap: 2mm; }
  .bub {
    display: inline-flex; align-items: center; justify-content: center;
    width: 6mm; height: 6mm; border: 1.2px solid #000; border-radius: 50%;
    font-size: 8pt; color: #000;
  }
  .note { text-align: center; font-size: 8pt; color: #555; margin-top: 3mm; }
</style>
</head>
<body>
  <div class="mark tl"></div>
  <div class="mark tr"></div>
  <div class="mark bl"></div>
  <div class="mark br"></div>

  <div class="head">
    <h1>${exam.title}</h1>
    <div class="meta">عدد الأسئلة: ${exam.questionCount} · الخيارات: ${exam.choiceCount}</div>
  </div>

  <div class="idbox">
    <div class="lbl">رقم الطالب</div>
    <div class="idgrid">${idCols}</div>
  </div>

  <div class="cols">
    <div>${col1}</div>
    <div>${col2}</div>
  </div>

  <div class="note">ظلّل الدائرة كاملةً بقلم رصاص أو حبر داكن. لا تخرج عن حدود الدائرة.</div>
</body>
</html>`;
}

// Open the sheet in a new window and trigger the print dialog.
export function printAnswerSheet(exam: OmrExam) {
  const html = buildAnswerSheetHtml(exam);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  // give layout a tick before printing
  setTimeout(() => w.print(), 300);
  return true;
}
