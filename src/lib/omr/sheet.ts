// Generates the printable OMR answer sheet as exact-geometry SVG.
// Bubble positions come from layout.ts — the SAME source the scanner
// uses — so print and scan always agree.

import { OmrExam, choiceCountFor, choiceLabelsFor } from "@/types/exam";
import {
  PAGE_W, PAGE_H, MARK_SIZE, MARKS, ORIENT_MARK, BUBBLE_R,
  idBubble, questionBubble, questionRows, questionNumberX,
  CODE_BITS, codeMarkPos, examCode, HEADER_SHIFT,
} from "@/lib/omr/layout";

// Optional institutional header printed at the top of the sheet.
export interface SheetHeader {
  institution?: string;   // اسم المؤسسة التعليمية
  college?: string;       // الكلية
  department?: string;    // القسم العلمي
  courseName?: string;    // اسم المقرر (+ الشعبة)
  logoDataUrl?: string;   // شعار المؤسسة (اختياري)
}

const FONT = "'IBM Plex Sans Arabic', 'Dubai', 'Segoe UI', Tahoma, Arial";

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

  // ---------- large faint rotated watermark (purely decorative, drawn early
  // so every real element paints on top of it) ----------
  parts.push(`<text x="${PAGE_W / 2}" y="${PAGE_H / 2 + 20}" font-size="26" font-weight="bold" fill="#000" opacity="0.045" text-anchor="middle" letter-spacing="3" transform="rotate(-28 ${PAGE_W / 2} ${PAGE_H / 2 + 20})" font-family="${FONT}">GradeTrackPro</text>`);

  // ---------- header card — a single unified pale panel framing the whole
  // header block (brand, institution, meta-info bar, shading legend). Its
  // x-range (20→190) clears the corner-mark search windows (x 0–20 / 190–210)
  // so it never interferes with mark detection. Enlarged (from 18mm to
  // 7+HEADER_SHIFT+18 ≈ 28mm) to match the approved mockup's extra rows —
  // everything below it (code marks, name box, ID grid, questions) is pushed
  // down by the same HEADER_SHIFT in layout.ts, so nothing drifts out of sync. ----------
  const HEAD_BOTTOM = 25 + HEADER_SHIFT; // 35
  parts.push(`<rect x="20" y="7" width="170" height="${HEAD_BOTTOM - 7}" fill="${NAVY_SOFT}" stroke="${NAVY}" stroke-width="0.4" rx="3"/>`);
  parts.push(`<rect x="20" y="7" width="170" height="1.8" fill="${NAVY}" rx="3"/>`);
  parts.push(`<rect x="20" y="7.4" width="170" height="1.4" fill="${NAVY}"/>`);

  // orientation anchor (small square beside the TL mark — breaks 180°
  // ambiguity). Drawn AFTER the header card background: the card's fill
  // covers this mark's sheet-mm position, so it must be painted on top to
  // stay visible.
  parts.push(`<rect x="${ORIENT_MARK.x - ORIENT_MARK.size / 2}" y="${ORIENT_MARK.y - ORIENT_MARK.size / 2}" width="${ORIENT_MARK.size}" height="${ORIENT_MARK.size}" fill="#000"/>`);

  // ---------- brand row: GTP badge + name (right, RTL logical start) vs
  // institution/college/department stack (left) — falls back to the exam
  // title when no institution info was given. ----------
  parts.push(`<rect x="24" y="9.5" width="9" height="9" fill="${NAVY}" rx="1.6"/>`);
  parts.push(`<text x="28.5" y="15.3" font-size="3.6" font-weight="bold" fill="#fff" text-anchor="middle" font-family="${FONT}">GTP</text>`);
  parts.push(`<text x="35.5" y="13.2" font-size="3.4" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">GradeTrackPro</text>`);
  parts.push(`<text x="35.5" y="16.6" font-size="2.2" fill="#667" text-anchor="end" direction="rtl" font-family="${FONT}">نظام التصحيح الآلي المعتمد</text>`);

  const instLines: string[] = [];
  if (header?.institution) instLines.push(header.institution);
  if (header?.college) instLines.push(header.college);
  if (header?.department) instLines.push(header.department);
  if (instLines.length === 0) instLines.push(exam.title);
  instLines.slice(0, 3).forEach((line, i) => {
    parts.push(`<text x="${PAGE_W - 24}" y="${12 + i * 3.2}" font-size="${i === 0 ? 3 : 2.4}" font-weight="${i === 0 ? "bold" : "normal"}" fill="${i === 0 ? NAVY : "#556"}" text-anchor="start" direction="rtl" font-family="${FONT}">${escapeXml(line)}</text>`);
  });

  // institution logo — kept between the corner-mark search windows (x 64–146)
  if (header?.logoDataUrl) {
    parts.push(`<image href="${header.logoDataUrl}" x="128" y="9" width="16" height="10" preserveAspectRatio="xMidYMid meet"/>`);
  }

  // ---------- compact meta-info bar: exam title / course / question count /
  // total score, in small labelled cells (mockup's exam-info box) ----------
  const metaY0 = 20;
  const metaCells: [string, string][] = [
    ["الاختبار", exam.title],
    ...(header?.courseName ? [["المقرر", header.courseName] as [string, string]] : []),
    ["عدد الأسئلة", String(exam.questionCount)],
    ["الدرجة الكلية", String(exam.maxScore)],
  ];
  parts.push(`<rect x="24" y="${metaY0}" width="162" height="7.4" fill="#fff" stroke="${NAVY}" stroke-width="0.25" opacity="0.7" rx="1.6"/>`);
  const metaW = 162 / metaCells.length;
  metaCells.forEach(([label, value], i) => {
    const cx = 24 + metaW * i + metaW / 2;
    parts.push(`<text x="${cx}" y="${metaY0 + 3.1}" font-size="1.9" fill="#778" text-anchor="middle" direction="rtl" font-family="${FONT}">${escapeXml(label)}</text>`);
    parts.push(`<text x="${cx}" y="${metaY0 + 6.2}" font-size="2.5" font-weight="bold" fill="${NAVY}" text-anchor="middle" direction="rtl" font-family="${FONT}">${escapeXml(value)}</text>`);
    if (i > 0) parts.push(`<line x1="${24 + metaW * i}" y1="${metaY0 + 1}" x2="${24 + metaW * i}" y2="${metaY0 + 6.4}" stroke="${NAVY}" stroke-width="0.2" opacity="0.35"/>`);
  });

  // ---------- shading-legend bar: "طريقة التظليل الصحيحة" with 3 example
  // bubbles (filled=correct, X=wrong, dot=wrong), dashed border like the
  // mockup — shares its row with the version-model indicator (أ/ب/ج,
  // current version highlighted; only shown for the common single-letter
  // forms so nothing is fabricated for unusual version labels). ----------
  const ly = metaY0 + 8, lh = HEAD_BOTTOM - ly - 1;
  const midY = ly + lh / 2;
  parts.push(`<rect x="24" y="${ly}" width="162" height="${lh}" fill="none" stroke="#99a" stroke-width="0.3" stroke-dasharray="1.2,1" rx="1.6"/>`);

  const VERSIONS = ["أ", "ب", "ج"];
  if (exam.version && VERSIONS.includes(exam.version)) {
    parts.push(`<text x="76" y="${midY + 1}" font-size="2.2" font-weight="bold" fill="#556" text-anchor="start" direction="rtl" font-family="${FONT}">النموذج:</text>`);
    VERSIONS.forEach((v, i) => {
      const vx = 60 - i * 9;
      const active = v === exam.version;
      parts.push(`<circle cx="${vx}" cy="${midY}" r="2.1" fill="${active ? NAVY : "#fff"}" stroke="${active ? NAVY : "#99a"}" stroke-width="0.4"/>`);
      parts.push(`<text x="${vx}" y="${midY + 0.9}" font-size="2.1" font-weight="bold" fill="${active ? "#fff" : "#556"}" text-anchor="middle" font-family="${FONT}">${v}</text>`);
    });
    parts.push(`<line x1="78" y1="${ly + 0.8}" x2="78" y2="${ly + lh - 0.8}" stroke="#99a" stroke-width="0.25" opacity="0.5"/>`);
  }

  parts.push(`<text x="${PAGE_W - 24}" y="${midY + 1}" font-size="2.3" font-weight="bold" fill="#556" text-anchor="start" direction="rtl" font-family="${FONT}">طريقة التظليل الصحيحة:</text>`);
  const exR = 2.1;
  const legendItems: { x: number; kind: "fill" | "x" | "dot"; label: string }[] = [
    { x: 148, kind: "fill", label: "صح" },
    { x: 125, kind: "x", label: "خطأ" },
    { x: 102, kind: "dot", label: "خطأ" },
  ];
  for (const it of legendItems) {
    if (it.kind === "fill") {
      parts.push(`<circle cx="${it.x}" cy="${midY}" r="${exR}" fill="#333"/>`);
    } else if (it.kind === "x") {
      parts.push(`<circle cx="${it.x}" cy="${midY}" r="${exR}" fill="none" stroke="#333" stroke-width="0.4"/>`);
      parts.push(`<line x1="${it.x - 1.1}" y1="${midY - 1.1}" x2="${it.x + 1.1}" y2="${midY + 1.1}" stroke="#333" stroke-width="0.4"/>`);
      parts.push(`<line x1="${it.x - 1.1}" y1="${midY + 1.1}" x2="${it.x + 1.1}" y2="${midY - 1.1}" stroke="#333" stroke-width="0.4"/>`);
    } else {
      parts.push(`<circle cx="${it.x}" cy="${midY}" r="${exR}" fill="none" stroke="#333" stroke-width="0.4"/>`);
      parts.push(`<circle cx="${it.x}" cy="${midY}" r="0.7" fill="#333"/>`);
    }
    parts.push(`<text x="${it.x - exR - 1}" y="${midY + 0.9}" font-size="2.1" fill="#556" text-anchor="start" direction="rtl" font-family="${FONT}">${it.label}</text>`);
  }

  // ---------- exam-code marks: machine-readable "which exam is this sheet"
  // encoding, in the always-empty 6mm gap between the header card and the
  // name box (never touches the name box's own fixed footprint below). Lets
  // the scanner auto-recognise the exam instead of relying only on the
  // professor picking the right one by hand. ----------
  {
    const code = examCode(exam.id);
    for (let b = 0; b < CODE_BITS; b++) {
      const bitOn = (code >> b) & 1;
      const p = codeMarkPos(b);
      parts.push(
        bitOn
          ? `<rect x="${p.x - p.size / 2}" y="${p.y - p.size / 2}" width="${p.size}" height="${p.size}" fill="#000"/>`
          : `<rect x="${p.x - p.size / 2}" y="${p.y - p.size / 2}" width="${p.size}" height="${p.size}" fill="none" stroke="#ccc" stroke-width="0.25"/>`,
      );
    }
  }

  // ---------- name box — the label lives INSIDE the box's own top strip
  // (a tinted caption band with a divider line above the writing area)
  // instead of floating above it. This permanently removes any risk of the
  // label colliding with whatever sits above (the exact glyph metrics of
  // the real print font can't be verified in this sandbox — no internet
  // access to fetch it — so a floating label is inherently fragile; putting
  // it inside its own container's guaranteed space is not). Box footprint
  // stays at its original (25,31)-(185,42) shifted down by HEADER_SHIFT for
  // the taller header — scan.ts crops the matching shifted rectangle — only
  // its internal content is otherwise unchanged. ----------
  const NB_Y = 31 + HEADER_SHIFT;
  parts.push(`<rect x="25" y="${NB_Y}" width="160" height="11" fill="#fff" stroke="${NAVY}" stroke-width="0.5" rx="2.5"/>`);
  parts.push(`<rect x="25" y="${NB_Y}" width="160" height="4" fill="${NAVY_SOFT}" rx="2.5"/>`);
  parts.push(`<rect x="25" y="${NB_Y + 2}" width="160" height="2" fill="${NAVY_SOFT}"/>`);
  parts.push(`<line x1="25" y1="${NB_Y + 4}" x2="185" y2="${NB_Y + 4}" stroke="${NAVY}" stroke-width="0.35"/>`);
  parts.push(`<text x="180" y="${NB_Y + 2.6}" direction="rtl" font-size="2.6" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">اسم الطالب بخط واضح:</text>`);

  // ---------- student number block ----------
  if (exam.idMode === "written") {
    // handwritten name+ID mode: no bubble grid at all — just this clearly
    // labelled, brand-tinted digit strip for the student's ID number, then
    // straight into the question grid (see Q_TOP_WRITTEN in layout.ts).
    // Same "label lives inside its own box" pattern as the name box above —
    // no floating text competing for the tight ~4mm gap to the name box.
    const cells = 12, cellW = 8, stripW = cells * cellW;
    const sx = (PAGE_W - stripW) / 2, sy = 46 + HEADER_SHIFT, cellH = 10, labelH = 3.4;
    parts.push(`<rect x="${sx}" y="${sy}" width="${stripW}" height="${labelH}" fill="${NAVY_SOFT}" rx="2"/>`);
    parts.push(`<rect x="${sx}" y="${sy + labelH - 2}" width="${stripW}" height="2" fill="${NAVY_SOFT}"/>`);
    parts.push(`<line x1="${sx}" y1="${sy + labelH}" x2="${sx + stripW}" y2="${sy + labelH}" stroke="${NAVY}" stroke-width="0.35"/>`);
    parts.push(`<text x="${sx + stripW - 2}" y="${sy + labelH - 0.9}" direction="rtl" font-size="2.4" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">الرقم الجامعي للطالب — يُكتب رقماً بخط واضح:</text>`);
    // bordered rectangular cell per digit position (mockup's .id-box), same
    // overall strip footprint as before.
    for (let i = 0; i < cells; i++) {
      parts.push(`<rect x="${sx + i * cellW}" y="${sy + labelH}" width="${cellW}" height="${cellH - labelH}" fill="#fff" stroke="${NAVY}" stroke-width="0.4"/>`);
    }
  } else {
  const firstTop = idBubble(exam, 0, 0);
  const lastTop = idBubble(exam, exam.studentIdDigits - 1, 0);
  const lastBottom = idBubble(exam, exam.studentIdDigits - 1, 9);
  const frameX = Math.min(firstTop.x, lastTop.x) - 6;
  const frameW = Math.abs(lastTop.x - firstTop.x) + 12;
  const FY = 43 + HEADER_SHIFT;

  parts.push(`<rect x="${frameX}" y="${FY}" width="${frameW}" height="${lastBottom.y + 4 - FY}" fill="none" stroke="#000" stroke-width="0.5" rx="2"/>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${FY + 3.8}" direction="rtl" font-size="3" font-weight="bold" text-anchor="middle" font-family="${FONT}">الرقم المدني للطالب</text>`);
  parts.push(`<text x="${frameX - 3}" y="${FY + 7}" direction="rtl" font-size="2.5" fill="#555" text-anchor="start" font-family="${FONT}">اكتب رقمك في المربعات</text>`);
  parts.push(`<text x="${frameX - 3}" y="${FY + 10.6}" direction="rtl" font-size="2.5" fill="#555" text-anchor="start" font-family="${FONT}">ثم ظلّل الرقم المطابق في كل عمود</text>`);

  // handwritten digit boxes — one above each bubble column
  for (let col = 0; col < exam.studentIdDigits; col++) {
    const cx = idBubble(exam, col, 0).x;
    parts.push(`<rect x="${cx - 3.1}" y="${FY + 5.4}" width="6.2" height="5.2" fill="none" stroke="#000" stroke-width="0.4" rx="0.7"/>`);
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
  // group badge above each column block — styled as a colour pill + heading
  // like the mockup's "الجزء الأول / اختيار من متعدد" section label (written
  // mode only — in bubbles mode the ID grid leaves no room above the questions).
  if (exam.idMode === "written") {
    const blocksN = Math.ceil(exam.questionCount / rows);
    for (let b = 0; b < blocksN; b++) {
      const from = b * rows + 1;
      const to = Math.min((b + 1) * rows, exam.questionCount);
      const firstBubble = questionBubble(exam, b * rows, 0);
      const bx = firstBubble.x + 14;
      const by = firstBubble.y - 7;
      const kind = choiceCountFor(exam, b * rows) === 2 ? "صح أو خطأ" : "اختيار من متعدد";
      parts.push(`<rect x="${bx - 21}" y="${by - 4.4}" width="21" height="6.8" fill="${NAVY}" rx="2.2"/>`);
      parts.push(`<text x="${bx - 10.5}" y="${by}" direction="rtl" font-size="2.4" font-weight="bold" fill="#fff" text-anchor="middle" font-family="${FONT}">الأسئلة ${from}-${to}</text>`);
      parts.push(`<text x="${bx - 23}" y="${by}" direction="rtl" font-size="2.9" font-weight="bold" fill="${NAVY}" text-anchor="start" font-family="${FONT}">${kind}</text>`);
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

  // ---------- footer: two signature lines (student / proctor) with the
  // motivational line centered between them, matching the mockup — no
  // fabricated session/sheet-ID stamp. ----------
  const FB_TOP = PAGE_H - 19;
  parts.push(`<rect x="20" y="${FB_TOP}" width="170" height="14" fill="${NAVY_SOFT}" rx="2.5"/>`);
  const sigY = FB_TOP + 5;
  parts.push(`<line x1="${PAGE_W - 62}" y1="${sigY}" x2="${PAGE_W - 32}" y2="${sigY}" stroke="#889" stroke-width="0.35"/>`);
  parts.push(`<text x="${PAGE_W - 47}" y="${sigY + 3.4}" font-size="2.3" fill="#667" text-anchor="middle" direction="rtl" font-family="${FONT}">توقيع الطالب</text>`);
  parts.push(`<line x1="32" y1="${sigY}" x2="62" y2="${sigY}" stroke="#889" stroke-width="0.35"/>`);
  parts.push(`<text x="47" y="${sigY + 3.4}" font-size="2.3" fill="#667" text-anchor="middle" direction="rtl" font-family="${FONT}">توقيع المراقب</text>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${sigY + 1}" font-size="3.2" font-weight="bold" fill="${NAVY}" text-anchor="middle" direction="rtl" font-family="${FONT}">تمنياتنا لكم بالتوفيق والنجاح</text>`);
  parts.push(`<text x="${PAGE_W / 2}" y="${FB_TOP + 11}" font-size="2.3" fill="#778" text-anchor="middle" direction="rtl" font-family="${FONT}">GradeTrackPro — التصحيح الآلي · لا تكتب فوق المربعات السوداء في الزوايا</text>`);

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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
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
