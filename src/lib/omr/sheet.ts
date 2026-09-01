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
  logoDataUrl?: string;   // شعار المؤسسة (اختياري)
}

const FONT = "'Dubai', 'Segoe UI', Tahoma, Arial";

function circle(x: number, y: number, r: number, letter: string): string {
  // letter drawn in light gray so it thresholds out during scanning
  return `
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-width="0.35"/>
    <text x="${x}" y="${y + 1.15}" font-size="3.2" fill="#a8a8a8" text-anchor="middle" font-family="${FONT}">${letter}</text>`;
}

const NAVY = "#1e3a5f";

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
    parts.push(`<text x="${PAGE_W - 25}" y="${10.5 + i * 4}" font-size="${i === 0 ? 3.1 : 2.7}" ${i === 0 ? 'font-weight="bold"' : 'fill="#444"'} text-anchor="start" direction="rtl" font-family="${FONT}">${escapeXml(line)}</text>`);
  });

  // institution logo — kept between the corner-mark search windows (x 64–146)
  if (header?.logoDataUrl) {
    parts.push(`<image href="${header.logoDataUrl}" x="128" y="5" width="18" height="14" preserveAspectRatio="xMidYMid meet"/>`);
  }

  // exam version badge (top-left, prominent) — e.g. "نموذج أ"
  if (exam.version) {
    parts.push(`<rect x="29" y="7.5" width="24" height="9" fill="none" stroke="#000" stroke-width="0.6" rx="1.5"/>`);
    parts.push(`<text x="41" y="13.6" font-size="4" font-weight="bold" text-anchor="middle" direction="rtl" font-family="${FONT}">نموذج ${escapeXml(exam.version)}</text>`);
  }

  // ---------- title block ----------
  parts.push(`<text x="${PAGE_W / 2}" y="${instLines.length ? 25 : 18}" font-size="5.2" font-weight="bold" fill="#1e3a5f" text-anchor="middle" font-family="${FONT}">${escapeXml(exam.title)}</text>`);
  const infoBits = [
    header?.courseName ? `المقرر: ${header.courseName}` : "",
    `عدد الأسئلة: ${exam.questionCount}`,
    `الدرجة: ${exam.maxScore}`,
  ].filter(Boolean).join("   ·   ");
  parts.push(`<text x="${PAGE_W / 2}" y="${instLines.length ? 30 : 23}" font-size="2.9" fill="#444" text-anchor="middle" direction="rtl" font-family="${FONT}">${escapeXml(infoBits)}</text>`);

  // ---------- name box (clear labelled rectangle, soft brand-tinted panel) ----------
  parts.push(`<rect x="25" y="31" width="160" height="11" fill="#f6f9fc" stroke="${NAVY}" stroke-width="0.5" rx="2.5"/>`);
  parts.push(`<text x="180" y="37.6" direction="rtl" font-size="3.5" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">اسم الطالب:</text>`);
  parts.push(`<line x1="30" y1="39.4" x2="152" y2="39.4" stroke="#bbb" stroke-width="0.25"/>`);

  // ---------- student number block ----------
  if (exam.idMode === "written") {
    // handwritten name+ID mode: no bubble grid at all — just this clearly
    // labelled, brand-tinted digit strip for the student's ID number, then
    // straight into the question grid (see Q_TOP_WRITTEN in layout.ts).
    const cells = 12, cellW = 8, stripW = cells * cellW;
    const sx = (PAGE_W - stripW) / 2, sy = 46, cellH = 10;
    parts.push(`<text x="${sx + stripW}" y="${sy - 2.6}" direction="rtl" font-size="3.3" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">الرقم الجامعي للطالب:</text>`);
    parts.push(`<rect x="${sx}" y="${sy}" width="${stripW}" height="${cellH}" fill="#f6f9fc" stroke="${NAVY}" stroke-width="0.55" rx="2"/>`);
    for (let i = 1; i < cells; i++) {
      parts.push(`<line x1="${sx + i * cellW}" y1="${sy}" x2="${sx + i * cellW}" y2="${sy + cellH}" stroke="${NAVY}" stroke-width="0.3" opacity="0.55"/>`);
    }
    parts.push(`<text x="${sx + stripW / 2}" y="${sy + cellH + 3.4}" direction="rtl" font-size="2.4" fill="#888" text-anchor="middle" font-family="${FONT}">يُكتب رقماً بخط واضح — سيُطابَق يدوياً مع قائمة الطلاب</text>`);
  } else {
  const firstTop = idBubble(exam, 0, 0);
  const lastTop = idBubble(exam, exam.studentIdDigits - 1, 0);
  const lastBottom = idBubble(exam, exam.studentIdDigits - 1, 9);
  const frameX = Math.min(firstTop.x, lastTop.x) - 6;
  const frameW = Math.abs(lastTop.x - firstTop.x) + 12;

  parts.push(`<rect x="${frameX}" y="43" width="${frameW}" height="${lastBottom.y + 4 - 43}" fill="none" stroke="#000" stroke-width="0.5" rx="2"/>`);
  parts.push(`<text x="${PAGE_W / 2}" y="46.8" direction="rtl" font-size="3" font-weight="bold" text-anchor="middle" font-family="${FONT}">الرقم المدني للطالب</text>`);
  parts.push(`<text x="${frameX - 3}" y="50" direction="rtl" font-size="2.5" fill="#555" text-anchor="start" font-family="${FONT}">اكتب رقمك في المربعات</text>`);
  parts.push(`<text x="${frameX - 3}" y="53.6" direction="rtl" font-size="2.5" fill="#555" text-anchor="start" font-family="${FONT}">ثم ظلّل الرقم المطابق في كل عمود</text>`);

  // handwritten digit boxes — one above each bubble column
  for (let col = 0; col < exam.studentIdDigits; col++) {
    const cx = idBubble(exam, col, 0).x;
    parts.push(`<rect x="${cx - 3.1}" y="48.4" width="6.2" height="5.2" fill="none" stroke="#000" stroke-width="0.4" rx="0.7"/>`);
  }

  // bubble grid 0–9 per column
  for (let col = 0; col < exam.studentIdDigits; col++) {
    for (let d = 0; d <= 9; d++) {
      const p = idBubble(exam, col, d);
      parts.push(circle(p.x, p.y, BUBBLE_R, String(d)));
    }
  }
  }

  // ---------- questions ----------
  const rows = questionRows(exam);
  // group badge above each column block: "الأسئلة X - Y" (written mode only —
  // in bubbles mode the ID grid leaves no room above the questions)
  if (exam.idMode === "written") {
    const blocksN = Math.ceil(exam.questionCount / rows);
    for (let b = 0; b < blocksN; b++) {
      const from = b * rows + 1;
      const to = Math.min((b + 1) * rows, exam.questionCount);
      const firstBubble = questionBubble(exam, b * rows, 0);
      const bx = firstBubble.x + 14;
      const by = firstBubble.y - 9;
      parts.push(`<rect x="${bx - 16}" y="${by - 4.2}" width="32" height="6" fill="${NAVY}" rx="3"/>`);
      parts.push(`<text x="${bx}" y="${by}" direction="rtl" font-size="2.9" font-weight="bold" fill="#fff" text-anchor="middle" font-family="${FONT}">الأسئلة ${from} - ${to}</text>`);
    }
  }
  // light separators between question column blocks
  const blocks = Math.ceil(exam.questionCount / rows);
  for (let b = 1; b < blocks; b++) {
    const x = questionNumberX(exam, b) - 6.5;
    const yTop = questionBubble(exam, 0, 0).y - 4;
    // separator length = the shorter of the two adjacent blocks; block b-1 is
    // always full, block b may be partial only when it's the last one
    const rowsRight = b === blocks - 1 ? exam.questionCount - rows * b : rows;
    const yBot = questionBubble(exam, Math.max(rows, rowsRight) - 1, 0).y + 4;
    parts.push(`<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="#ccc" stroke-width="0.25"/>`);
  }

  for (let q = 0; q < exam.questionCount; q++) {
    const colBlock = Math.floor(q / rows);
    const numPos = questionBubble(exam, q, 0);
    const labels = choiceLabelsFor(exam, q);
    const qChoices = choiceCountFor(exam, q);
    parts.push(`<text x="${questionNumberX(exam, colBlock)}" y="${numPos.y + 1.1}" font-size="3" font-weight="bold" fill="#333" text-anchor="end" font-family="${FONT}">${q + 1}</text>`);
    for (let c = 0; c < qChoices; c++) {
      const p = questionBubble(exam, q, c);
      parts.push(circle(p.x, p.y, BUBBLE_R, labels[c]));
    }
  }

  // ---------- footer ----------
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H - 11}" font-size="3" font-weight="bold" fill="#1e3a5f" text-anchor="middle" direction="rtl" font-family="${FONT}">تمنياتنا لكم بالتوفيق والنجاح</text>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H - 6.5}" font-size="2.2" fill="#999" text-anchor="middle" direction="rtl" font-family="${FONT}">GradeTrackPro — التصحيح الآلي · لا تكتب فوق المربعات السوداء في الزوايا</text>`);

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
<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/dubai" />
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
  const go = () => setTimeout(() => w.print(), 150);
  const fonts = (w.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) fonts.ready.then(go, go); else setTimeout(go, 500);
  return true;
}
