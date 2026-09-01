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
    <text x="${x}" y="${y + 1.3}" font-size="3.6" fill="#a8a8a8" text-anchor="middle" font-family="${FONT}">${letter}</text>`;
}

const NAVY = "#1e3a5f";
const NAVY_SOFT = "#eef3f9";  // safe pale tint — never dark enough to be read as "filled" by the scanner

// A very light zebra-row background behind each question, purely decorative.
// Stays well above the scan threshold (near-white) so it never affects bubble reads.
function rowBand(x: number, y: number, w: number, h: number, tint: boolean): string {
  if (!tint) return "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${NAVY_SOFT}" opacity="0.55" rx="1.4"/>`;
}

export function buildAnswerSheetSvg(exam: OmrExam, header?: SheetHeader): string {
  const parts: string[] = [];

  // ---------- registration marks ----------
  for (const m of MARKS) {
    parts.push(`<rect x="${m.x - MARK_SIZE / 2}" y="${m.y - MARK_SIZE / 2}" width="${MARK_SIZE}" height="${MARK_SIZE}" fill="#000"/>`);
  }
  // orientation anchor (small square beside the TL mark — breaks 180° ambiguity)
  parts.push(`<rect x="${ORIENT_MARK.x - ORIENT_MARK.size / 2}" y="${ORIENT_MARK.y - ORIENT_MARK.size / 2}" width="${ORIENT_MARK.size}" height="${ORIENT_MARK.size}" fill="#000"/>`);

  // ---------- header card — a single unified pale panel framing the whole
  // header block (institution, title, meta, version badge). Stays a safe
  // pale tint throughout, and its x-range (20→190) clears the corner-mark
  // search windows (which live within x 0–20 and 190–210) so it never
  // interferes with mark detection. ----------
  // Fixed compact height (y 5→28) regardless of how many institution lines
  // there are — deliberately kept clear of the name box, which scan.ts crops
  // at a fixed sheet-mm rectangle and must not move.
  const instLines: string[] = [];
  if (header?.institution) instLines.push(header.institution);
  if (header?.college) instLines.push(header.college);
  if (header?.department) instLines.push(header.department);
  // Card starts a little lower than the very top edge (y=7, not 5) for
  // breathing room from the page edge, while its BOTTOM stays at the
  // already-verified-safe y=25 (same clearance to the name label below).
  parts.push(`<rect x="20" y="7" width="170" height="18" fill="${NAVY_SOFT}" stroke="${NAVY}" stroke-width="0.4" rx="3"/>`);
  parts.push(`<rect x="20" y="7" width="170" height="1.8" fill="${NAVY}" rx="3"/>`);
  parts.push(`<rect x="20" y="7.4" width="170" height="1.4" fill="${NAVY}"/>`);

  instLines.forEach((line, i) => {
    parts.push(`<text x="${PAGE_W - 25}" y="${13.5 + i * 3.4}" font-size="${i === 0 ? 3 : 2.5}" font-weight="${i === 0 ? "bold" : "normal"}" fill="${i === 0 ? NAVY : "#445"}" text-anchor="start" direction="rtl" font-family="${FONT}">${escapeXml(line)}</text>`);
  });

  // institution logo — kept between the corner-mark search windows (x 64–146)
  if (header?.logoDataUrl) {
    parts.push(`<image href="${header.logoDataUrl}" x="128" y="9" width="16" height="12" preserveAspectRatio="xMidYMid meet"/>`);
  }

  // exam version badge (top-left, prominent) — e.g. "نموذج أ"
  if (exam.version) {
    parts.push(`<rect x="27" y="10" width="25" height="8.5" fill="${NAVY}" rx="2"/>`);
    parts.push(`<text x="39.5" y="16" font-size="3.7" font-weight="bold" fill="#fff" text-anchor="middle" direction="rtl" font-family="${FONT}">نموذج ${escapeXml(exam.version)}</text>`);
  }

  // ---------- title block ----------
  parts.push(`<text x="${PAGE_W / 2}" y="16.5" font-size="5" font-weight="bold" fill="${NAVY}" text-anchor="middle" font-family="${FONT}">${escapeXml(exam.title)}</text>`);
  const infoBits = [
    header?.courseName ? `المقرر: ${header.courseName}` : "",
    `عدد الأسئلة: ${exam.questionCount}`,
    `الدرجة: ${exam.maxScore}`,
  ].filter(Boolean).join("   ·   ");
  parts.push(`<text x="${PAGE_W / 2}" y="23.3" font-size="3.1" fill="#556" text-anchor="middle" direction="rtl" font-family="${FONT}">${escapeXml(infoBits)}</text>`);

  // ---------- name box — the label lives INSIDE the box's own top strip
  // (a tinted caption band with a divider line above the writing area)
  // instead of floating above it. This permanently removes any risk of the
  // label colliding with whatever sits above (the exact glyph metrics of
  // the real print font can't be verified in this sandbox — no internet
  // access to fetch it — so a floating label is inherently fragile; putting
  // it inside its own container's guaranteed space is not). Box footprint
  // stays at its original (25,31)-(185,42) — scan.ts crops exactly that
  // rectangle — only its internal content changed. ----------
  parts.push(`<rect x="25" y="31" width="160" height="11" fill="#fff" stroke="${NAVY}" stroke-width="0.5" rx="2.5"/>`);
  parts.push(`<rect x="25" y="31" width="160" height="4" fill="${NAVY_SOFT}" rx="2.5"/>`);
  parts.push(`<rect x="25" y="33" width="160" height="2" fill="${NAVY_SOFT}"/>`);
  parts.push(`<line x1="25" y1="35" x2="185" y2="35" stroke="${NAVY}" stroke-width="0.35"/>`);
  parts.push(`<text x="180" y="33.6" direction="rtl" font-size="2.6" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">اسم الطالب بخط واضح:</text>`);

  // ---------- student number block ----------
  if (exam.idMode === "written") {
    // handwritten name+ID mode: no bubble grid at all — just this clearly
    // labelled, brand-tinted digit strip for the student's ID number, then
    // straight into the question grid (see Q_TOP_WRITTEN in layout.ts).
    // Same "label lives inside its own box" pattern as the name box above —
    // no floating text competing for the tight ~4mm gap to the name box.
    const cells = 12, cellW = 8, stripW = cells * cellW;
    const sx = (PAGE_W - stripW) / 2, sy = 46, cellH = 10, labelH = 3.4;
    parts.push(`<rect x="${sx}" y="${sy}" width="${stripW}" height="${cellH}" fill="#fff" stroke="${NAVY}" stroke-width="0.55" rx="2"/>`);
    parts.push(`<rect x="${sx}" y="${sy}" width="${stripW}" height="${labelH}" fill="${NAVY_SOFT}" rx="2"/>`);
    parts.push(`<rect x="${sx}" y="${sy + labelH - 2}" width="${stripW}" height="2" fill="${NAVY_SOFT}"/>`);
    parts.push(`<line x1="${sx}" y1="${sy + labelH}" x2="${sx + stripW}" y2="${sy + labelH}" stroke="${NAVY}" stroke-width="0.35"/>`);
    parts.push(`<text x="${sx + stripW - 2}" y="${sy + labelH - 0.9}" direction="rtl" font-size="2.4" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">الرقم الجامعي للطالب — يُكتب رقماً بخط واضح:</text>`);
    for (let i = 1; i < cells; i++) {
      parts.push(`<line x1="${sx + i * cellW}" y1="${sy + labelH}" x2="${sx + i * cellW}" y2="${sy + cellH}" stroke="${NAVY}" stroke-width="0.3" opacity="0.55"/>`);
    }
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
      // Pulled in closer to the first question row (was -9) so it sits
      // cleanly between the ID-strip hint text above and the bubbles below,
      // instead of crowding the hint text.
      const by = firstBubble.y - 7;
      parts.push(`<rect x="${bx - 18}" y="${by - 4.4}" width="36" height="6.8" fill="${NAVY}" rx="3.2"/>`);
      parts.push(`<text x="${bx}" y="${by}" direction="rtl" font-size="3.3" font-weight="bold" fill="#fff" text-anchor="middle" font-family="${FONT}">الأسئلة ${from} - ${to}</text>`);
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

    // very light zebra band behind every other row, purely decorative — a
    // near-white tint that never risks being read as a "filled" bubble.
    if (q % 2 === 1) {
      const bandX = questionNumberX(exam, colBlock) - 8.5;
      const lastP = questionBubble(exam, q, qChoices - 1);
      parts.push(rowBand(bandX, numPos.y - 3.6, lastP.x - bandX + 7, 7.2, true));
    }

    // question number in a small navy-outlined circle instead of bare text —
    // enlarged for legibility, matching the bigger answer bubbles
    const nx = questionNumberX(exam, colBlock);
    parts.push(`<circle cx="${nx}" cy="${numPos.y}" r="3" fill="#fff" stroke="${NAVY}" stroke-width="0.45"/>`);
    parts.push(`<text x="${nx}" y="${numPos.y + 1.15}" font-size="3.3" font-weight="bold" fill="${NAVY}" text-anchor="middle" font-family="${FONT}">${q + 1}</text>`);

    for (let c = 0; c < qChoices; c++) {
      const p = questionBubble(exam, q, c);
      parts.push(circle(p.x, p.y, BUBBLE_R, labels[c]));
    }
  }

  // ---------- footer ----------
  parts.push(`<rect x="20" y="${PAGE_H - 17}" width="170" height="10" fill="${NAVY_SOFT}" rx="2.5"/>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H - 11.2}" font-size="3.4" font-weight="bold" fill="${NAVY}" text-anchor="middle" direction="rtl" font-family="${FONT}">تمنياتنا لكم بالتوفيق والنجاح</text>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H - 7.2}" font-size="2.5" fill="#778" text-anchor="middle" direction="rtl" font-family="${FONT}">GradeTrackPro — التصحيح الآلي · لا تكتب فوق المربعات السوداء في الزوايا</text>`);

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
