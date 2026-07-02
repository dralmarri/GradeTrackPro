// Generates the printable OMR answer sheet as exact-geometry SVG.
// Bubble positions come from layout.ts — the SAME source the scanner
// uses — so print and scan always agree.

import { OmrExam, choiceCountFor, choiceLabelsFor } from "@/types/exam";
import {
  PAGE_W, PAGE_H, MARK_SIZE, MARKS, ORIENT_MARK, BUBBLE_R,
  idBubble, questionBubble, questionRows, questionNumberX,
} from "@/lib/omr/layout";

// Optional institutional header printed at the top of the sheet.
export interface SheetHeader {
  institution?: string;   // اسم المؤسسة التعليمية
  college?: string;       // الكلية
  department?: string;    // القسم العلمي
  courseName?: string;    // اسم المقرر (+ الشعبة)
}

const FONT = "'Segoe UI', Tahoma, Arial";

function circle(x: number, y: number, r: number, letter: string): string {
  // letter drawn in light gray so it thresholds out during scanning
  return `
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="0.35"/>
    <text x="${x}" y="${y + 1.0}" font-size="2.5" fill="#b5b5b5" text-anchor="middle" font-family="${FONT}">${letter}</text>`;
}

export function buildAnswerSheetSvg(exam: OmrExam, header?: SheetHeader): string {
  const parts: string[] = [];

  // ---------- registration marks ----------
  for (const m of MARKS) {
    parts.push(`<rect x="${m.x - MARK_SIZE / 2}" y="${m.y - MARK_SIZE / 2}" width="${MARK_SIZE}" height="${MARK_SIZE}" fill="#000"/>`);
  }
  // orientation anchor (small square beside the TL mark — breaks 180° ambiguity)
  parts.push(`<rect x="${ORIENT_MARK.x - ORIENT_MARK.size / 2}" y="${ORIENT_MARK.y - ORIENT_MARK.size / 2}" width="${ORIENT_MARK.size}" height="${ORIENT_MARK.size}" fill="#000"/>`);

  // ---------- institutional header (right-aligned, official style) ----------
  const instLines: string[] = [];
  if (header?.institution) instLines.push(header.institution);
  if (header?.college) instLines.push(header.college);
  if (header?.department) instLines.push(header.department);
  instLines.forEach((line, i) => {
    parts.push(`<text x="${PAGE_W - 25}" y="${10.5 + i * 4}" font-size="${i === 0 ? 3.1 : 2.7}" ${i === 0 ? 'font-weight="bold"' : 'fill="#444"'} text-anchor="end" font-family="${FONT}">${escapeXml(line)}</text>`);
  });

  // exam version badge (top-left, prominent) — e.g. "نموذج أ"
  if (exam.version) {
    parts.push(`<rect x="25" y="7.5" width="24" height="9" fill="none" stroke="#000" stroke-width="0.6" rx="1.5"/>`);
    parts.push(`<text x="37" y="13.6" font-size="4" font-weight="bold" text-anchor="middle" font-family="${FONT}">نموذج ${escapeXml(exam.version)}</text>`);
  }

  // ---------- title block ----------
  parts.push(`<text x="${PAGE_W / 2}" y="${instLines.length ? 25 : 18}" font-size="5.2" font-weight="bold" text-anchor="middle" font-family="${FONT}">${escapeXml(exam.title)}</text>`);
  const infoBits = [
    header?.courseName ? `المقرر: ${header.courseName}` : "",
    `عدد الأسئلة: ${exam.questionCount}`,
    `الدرجة: ${exam.maxScore}`,
  ].filter(Boolean).join("   ·   ");
  parts.push(`<text x="${PAGE_W / 2}" y="${instLines.length ? 30 : 23}" font-size="2.9" fill="#444" text-anchor="middle" font-family="${FONT}">${escapeXml(infoBits)}</text>`);

  // ---------- name box (clear labelled rectangle) ----------
  parts.push(`<rect x="25" y="32" width="160" height="9" fill="none" stroke="#000" stroke-width="0.45" rx="1.5"/>`);
  parts.push(`<text x="181.5" y="37.7" font-size="3.3" font-weight="bold" text-anchor="end" font-family="${FONT}">اسم الطالب:</text>`);
  parts.push(`<line x1="30" y1="39.2" x2="150" y2="39.2" stroke="#bbb" stroke-width="0.25"/>`);

  // ---------- student number block ----------
  const firstTop = idBubble(exam, 0, 0);
  const lastTop = idBubble(exam, exam.studentIdDigits - 1, 0);
  const lastBottom = idBubble(exam, exam.studentIdDigits - 1, 9);
  const frameX = Math.min(firstTop.x, lastTop.x) - 6;
  const frameW = Math.abs(lastTop.x - firstTop.x) + 12;

  parts.push(`<rect x="${frameX}" y="42.5" width="${frameW}" height="${lastBottom.y + 4.5 - 42.5}" fill="none" stroke="#000" stroke-width="0.5" rx="2"/>`);
  parts.push(`<text x="${PAGE_W / 2}" y="46.6" font-size="3" font-weight="bold" text-anchor="middle" font-family="${FONT}">رقم الطالب: اكتب رقمك في المربعات ثم ظلّل الرقم المطابق في كل عمود</text>`);

  // handwritten digit boxes — one above each bubble column
  for (let col = 0; col < exam.studentIdDigits; col++) {
    const cx = idBubble(exam, col, 0).x;
    parts.push(`<rect x="${cx - 3.1}" y="47.8" width="6.2" height="5.4" fill="none" stroke="#000" stroke-width="0.4" rx="0.7"/>`);
  }

  // bubble grid 0–9 per column
  for (let col = 0; col < exam.studentIdDigits; col++) {
    for (let d = 0; d <= 9; d++) {
      const p = idBubble(exam, col, d);
      parts.push(circle(p.x, p.y, BUBBLE_R, String(d)));
    }
  }

  // ---------- questions ----------
  const rows = questionRows(exam);
  // light separators between question column blocks
  const blocks = Math.ceil(exam.questionCount / rows);
  for (let b = 1; b < blocks; b++) {
    const x = questionNumberX(b) - 6.5;
    const yTop = questionBubble(exam, 0, 0).y - 4;
    const lastQ = Math.min(exam.questionCount, rows * blocks) - 1;
    const yBot = questionBubble(exam, Math.min(rows - 1, lastQ % rows), 0).y + 4;
    parts.push(`<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="#ccc" stroke-width="0.25"/>`);
  }

  for (let q = 0; q < exam.questionCount; q++) {
    const colBlock = Math.floor(q / rows);
    const numPos = questionBubble(exam, q, 0);
    const labels = choiceLabelsFor(exam, q);
    const qChoices = choiceCountFor(exam, q);
    parts.push(`<text x="${questionNumberX(colBlock)}" y="${numPos.y + 1.1}" font-size="3" font-weight="bold" fill="#333" text-anchor="end" font-family="${FONT}">${q + 1}</text>`);
    for (let c = 0; c < qChoices; c++) {
      const p = questionBubble(exam, q, c);
      parts.push(circle(p.x, p.y, BUBBLE_R, labels[c]));
    }
  }

  // ---------- footer ----------
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H - 6.5}" font-size="2.4" fill="#999" text-anchor="middle" font-family="${FONT}">GradeTrackPro — التصحيح الآلي · لا تكتب فوق المربعات السوداء في الزوايا</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}">${parts.join("")}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildAnswerSheetHtml(exam: OmrExam, header?: SheetHeader): string {
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
<body>${buildAnswerSheetSvg(exam, header)}</body>
</html>`;
}

// Open the sheet in a new window and trigger the print dialog.
export function printAnswerSheet(exam: OmrExam, header?: SheetHeader): boolean {
  const html = buildAnswerSheetHtml(exam, header);
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}
