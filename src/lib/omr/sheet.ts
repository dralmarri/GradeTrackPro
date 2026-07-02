// Generates the printable OMR answer sheet as exact-geometry SVG.
// Bubble positions come from layout.ts — the SAME source the scanner
// uses — so print and scan always agree.

import { OmrExam, choiceCountFor, choiceLabelsFor } from "@/types/exam";
import {
  PAGE_W, PAGE_H, MARK_SIZE, MARKS, ORIENT_MARK, BUBBLE_R,
  idBubble, questionBubble, questionRows, questionNumberX,
} from "@/lib/omr/layout";


function circle(x: number, y: number, r: number, letter: string): string {
  // letter drawn in light gray so it thresholds out during scanning
  return `
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="0.35"/>
    <text x="${x}" y="${y + 1.05}" font-size="2.6" fill="#aaa" text-anchor="middle" font-family="Arial">${letter}</text>`;
}

export function buildAnswerSheetSvg(exam: OmrExam): string {
  const parts: string[] = [];

  // registration marks
  for (const m of MARKS) {
    parts.push(`<rect x="${m.x - MARK_SIZE / 2}" y="${m.y - MARK_SIZE / 2}" width="${MARK_SIZE}" height="${MARK_SIZE}" fill="#000"/>`);
  }
  // orientation anchor (small square beside the TL mark — breaks 180° ambiguity)
  parts.push(`<rect x="${ORIENT_MARK.x - ORIENT_MARK.size / 2}" y="${ORIENT_MARK.y - ORIENT_MARK.size / 2}" width="${ORIENT_MARK.size}" height="${ORIENT_MARK.size}" fill="#000"/>`);

  // header
  parts.push(`<text x="${PAGE_W / 2}" y="20" font-size="6" font-weight="bold" text-anchor="middle" font-family="Arial">${escapeXml(exam.title)}</text>`);
  parts.push(`<text x="${PAGE_W / 2}" y="27" font-size="3.2" fill="#444" text-anchor="middle" font-family="Arial">عدد الأسئلة: ${exam.questionCount} · ظلّل الدائرة كاملة بقلم داكن</text>`);

  // handwritten name line
  parts.push(`<text x="${PAGE_W - 22}" y="35" font-size="3.6" font-weight="bold" text-anchor="end" font-family="Arial">اسم الطالب:</text>`);
  parts.push(`<line x1="22" y1="36" x2="${PAGE_W - 60}" y2="36" stroke="#000" stroke-width="0.3"/>`);

  // student-ID grid
  parts.push(`<text x="${PAGE_W / 2}" y="${42}" font-size="3.4" font-weight="bold" text-anchor="middle" font-family="Arial">رقم الطالب</text>`);
  for (let col = 0; col < exam.studentIdDigits; col++) {
    for (let d = 0; d <= 9; d++) {
      const p = idBubble(exam, col, d);
      parts.push(circle(p.x, p.y, BUBBLE_R, String(d)));
    }
  }
  // ID grid frame
  {
    const first = idBubble(exam, 0, 0);
    const last = idBubble(exam, exam.studentIdDigits - 1, 9);
    parts.push(`<rect x="${first.x - 5}" y="${first.y - 5}" width="${last.x - first.x + 10}" height="${last.y - first.y + 10}" fill="none" stroke="#000" stroke-width="0.4" rx="2"/>`);
  }

  // questions (choice count may differ per section in mixed exams)
  const rows = questionRows(exam);
  for (let q = 0; q < exam.questionCount; q++) {
    const colBlock = Math.floor(q / rows);
    const numPos = questionBubble(exam, q, 0);
    const labels = choiceLabelsFor(exam, q);
    const qChoices = choiceCountFor(exam, q);
    parts.push(`<text x="${questionNumberX(colBlock)}" y="${numPos.y + 1.1}" font-size="3.2" font-weight="bold" text-anchor="end" font-family="Arial">${q + 1}</text>`);
    for (let c = 0; c < qChoices; c++) {
      const p = questionBubble(exam, q, c);
      parts.push(circle(p.x, p.y, BUBBLE_R, labels[c]));
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}">${parts.join("")}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildAnswerSheetHtml(exam: OmrExam): string {
  return `<!doctype html>
<html lang="ar">
<head>
<meta charset="utf-8" />
<title>${escapeXml(exam.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; }
  svg { display: block; }
</style>
</head>
<body>${buildAnswerSheetSvg(exam)}</body>
</html>`;
}

// Open the sheet in a new window and trigger the print dialog.
export function printAnswerSheet(exam: OmrExam): boolean {
  const html = buildAnswerSheetHtml(exam);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
