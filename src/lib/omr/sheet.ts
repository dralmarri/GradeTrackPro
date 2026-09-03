// Printable OMR answer sheet. Machine-read geometry comes from layout.ts;
// the surrounding SVG reproduces the approved UX Pilot visual hierarchy.
import type { OmrExam } from "@/types/exam";
import { choiceCountFor, choiceLabelsFor } from "@/types/exam";
import { PAGE_W, PAGE_H, MARK_SIZE, MARKS, ORIENT_MARK, BUBBLE_R, idBubble, questionBubble, questionRows, questionNumberX, CODE_BITS, codeMarkPos, examCode } from "@/lib/omr/layout";
import { printHtml } from "@/lib/printHtml";

export interface SheetHeader {
  institution?: string;
  college?: string;
  department?: string;
  courseName?: string;
  logoDataUrl?: string;
}

const FONT = "'IBM Plex Sans Arabic', 'Dubai', 'Segoe UI', Tahoma, Arial";
const INK = "#1f2937";
const MUTED = "#6b7280";
const LINE = "#d1d5db";
const PALE = "#f9fafb";
const INDIGO = "#2d46b9";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function svgText(x: number, y: number, value: string, size = 3, options = ""): string {
  const defaultFill = options.includes("fill=") ? "" : `fill="${INK}"`;
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" ${defaultFill} ${options}>${escapeXml(value)}</text>`;
}

function answerBubble(x: number, y: number, letter: string): string {
  return `<circle cx="${x}" cy="${y}" r="${BUBBLE_R}" fill="#fff" stroke="${INK}" stroke-width="0.55"/>` +
    svgText(x, y + 1.15, letter, 3.1, `fill="#555" text-anchor="middle" font-weight="600"`);
}

function registrationMarks(): string {
  return MARKS.map((m) => `<rect x="${m.x - MARK_SIZE / 2}" y="${m.y - MARK_SIZE / 2}" width="${MARK_SIZE}" height="${MARK_SIZE}" fill="#000"/>`).join("") +
    `<rect x="${ORIENT_MARK.x - ORIENT_MARK.size / 2}" y="${ORIENT_MARK.y - ORIENT_MARK.size / 2}" width="${ORIENT_MARK.size}" height="${ORIENT_MARK.size}" fill="#000"/>`;
}

function brand(header?: SheetHeader): string {
  const titleBlock = svgText(30, 16, "ورقة إجابة نموذجية (OMR)", 3.8, `direction="rtl" text-anchor="end" font-weight="700"`) +
    svgText(30, 21, "يرجى استخدام قلم رصاص داكن أو قلم حبر أسود", 2.35, `direction="rtl" text-anchor="end" fill="${MUTED}"`);
  const logo = header?.logoDataUrl
    ? `<image href="${header.logoDataUrl}" x="136" y="10" width="13" height="13" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="136" y="10" width="13" height="13" rx="2.2" fill="${INDIGO}"/>${svgText(142.5, 18.1, "GTP", 3.6, `fill="#fff" direction="ltr" unicode-bidi="bidi-override" text-anchor="middle" font-weight="800"`)}`;
  // text-anchor="start"/"end" resolution for a pure-Latin run inside an
  // RTL-ancestor document proved to vary across real browsers even with
  // direction="ltr" + unicode-bidi="bidi-override" set explicitly (worked
  // in this sandbox's Chromium, still broke in the reporter's browser) —
  // text-anchor="middle" sidesteps the ambiguity entirely, since a
  // symmetric anchor point can't flip with direction in any implementation.
  // cx picked generously past the badge's right edge (149) for the widest
  // fallback-font measurement of "GradeTrackPro" at this size (~26.5mm).
  return titleBlock + logo +
    svgText(167, 15.8, "GradeTrackPro", 3.7, `fill="${INDIGO}" direction="ltr" unicode-bidi="bidi-override" text-anchor="middle" font-weight="800"`) +
    svgText(152, 20.1, "نظام التصحيح الآلي المعتمد", 2.2, `fill="${MUTED}" direction="rtl" text-anchor="end"`) +
    `<line x1="30" y1="29" x2="180" y2="29" stroke="${INK}" stroke-width="0.65"/>`;
}

function identityAndMeta(exam: OmrExam, header?: SheetHeader): string {
  const out: string[] = [];
  out.push(svgText(180, 36.5, "اسم الطالب (بخط اليد):", 2.6, `direction="rtl" text-anchor="start" font-weight="700"`));
  out.push(`<rect x="106" y="39" width="74" height="15" rx="2" fill="#fff" stroke="${MUTED}" stroke-width="0.55"/>`);
  out.push(svgText(180, 58.2, "الرقم الجامعي:", 2.6, `direction="rtl" text-anchor="start" font-weight="700"`));
  if (exam.idMode === "written") {
    const count = Math.max(1, exam.studentIdDigits || 12);
    const cellW = 74 / count;
    for (let i = 0; i < count; i++) out.push(`<rect x="${106 + i * cellW}" y="60" width="${cellW}" height="11" fill="#fff" stroke="${INK}" stroke-width="0.4"/>`);
  }

  out.push(`<rect x="30" y="34" width="68" height="38" rx="2" fill="${PALE}" stroke="#e5e7eb" stroke-width="0.4"/>`);
  const cells: [string, string, number, number][] = [
    ["المقرر:", header?.courseName || "—", 94, 41], ["الاختبار:", exam.title, 61, 41],
    ["عدد الأسئلة:", String(exam.questionCount), 94, 53], ["الدرجة الكلية:", String(exam.maxScore), 61, 53],
  ];
  for (const [label, value, x, y] of cells) {
    out.push(svgText(x, y, label, 2.1, `fill="${MUTED}" direction="rtl" text-anchor="start"`));
    out.push(svgText(x, y + 4, value, 2.7, `direction="rtl" text-anchor="start" font-weight="700"`));
  }
  out.push(`<line x1="34" y1="59" x2="94" y2="59" stroke="#e5e7eb" stroke-width="0.35"/>`);
  out.push(svgText(94, 65, "النموذج:", 2.4, `direction="rtl" text-anchor="start" font-weight="700"`));
  ["أ", "ب", "ج"].forEach((version, i) => {
    const x = 72 - i * 11;
    const active = exam.version === version || (!exam.version && i === 0);
    out.push(`<circle cx="${x}" cy="64" r="2.7" fill="${active ? INDIGO : "#fff"}" stroke="${active ? INDIGO : "#9ca3af"}" stroke-width="0.45"/>`);
    out.push(svgText(x, 65, version, 2.4, `fill="${active ? "#fff" : INK}" text-anchor="middle" font-weight="700"`));
  });
  return out.join("");
}

function legend(): string {
  const out = [`<rect x="30" y="77" width="150" height="11" rx="2" fill="#fff" stroke="${LINE}" stroke-width="0.45" stroke-dasharray="1.4 1.4"/>`];
  out.push(svgText(176, 83.7, "طريقة التظليل الصحيحة:", 2.4, `direction="rtl" text-anchor="start" font-weight="700" fill="${MUTED}"`));
  const examples: [number, "fill" | "x" | "dot", string][] = [[132, "fill", "صح"], [105, "x", "خطأ"], [78, "dot", "خطأ"]];
  for (const [x, kind, label] of examples) {
    out.push(`<circle cx="${x}" cy="82.5" r="2.5" fill="${kind === "fill" ? INK : "#fff"}" stroke="${INK}" stroke-width="0.45"/>`);
    if (kind === "x") out.push(`<path d="M${x - 1.2} 81.3 L${x + 1.2} 83.7 M${x + 1.2} 81.3 L${x - 1.2} 83.7" stroke="${INK}" stroke-width="0.45"/>`);
    if (kind === "dot") out.push(`<circle cx="${x}" cy="82.5" r="0.65" fill="${INK}"/>`);
    out.push(svgText(x - 4, 83.5, label, 2.2, `direction="rtl" text-anchor="start" fill="${MUTED}"`));
  }
  return out.join("");
}

function machineCode(exam: OmrExam): string {
  const code = examCode(exam.id);
  return Array.from({ length: CODE_BITS }, (_, bit) => {
    const p = codeMarkPos(bit);
    const on = (code >> bit) & 1;
    return `<rect x="${p.x - p.size / 2}" y="${p.y - p.size / 2}" width="${p.size}" height="${p.size}" fill="${on ? "#000" : "#fff"}" stroke="${on ? "#000" : "#d1d5db"}" stroke-width="0.25"/>`;
  }).join("");
}

function bubbledStudentId(exam: OmrExam): string {
  if (exam.idMode === "written") return "";
  const out: string[] = [];
  const first = idBubble(exam, 0, 0);
  const last = idBubble(exam, exam.studentIdDigits - 1, 9);
  // frame box top/height derived from the digit-0 row (first.y) instead of a
  // hardcoded constant, so it always tracks ID_TOP_Y in layout.ts and can't
  // silently drift out of sync with it again.
  const boxTop = first.y - 4;
  const boxHeight = last.y + 4 - boxTop;
  out.push(`<rect x="${first.x - 5}" y="${boxTop}" width="${last.x - first.x + 10}" height="${boxHeight}" rx="2" fill="#fff" stroke="${INK}" stroke-width="0.45"/>`);
  for (let col = 0; col < exam.studentIdDigits; col++) {
    const top = idBubble(exam, col, 0);
    out.push(`<rect x="${top.x - 3}" y="${first.y - 3}" width="6" height="5" rx="0.6" fill="#fff" stroke="${INK}" stroke-width="0.4"/>`);
    for (let digit = 0; digit < 10; digit++) { const p = idBubble(exam, col, digit); out.push(answerBubble(p.x, p.y, String(digit))); }
  }
  return out.join("");
}

function questionGrid(exam: OmrExam): string {
  const out: string[] = [];
  const rows = questionRows(exam);
  const blocks = Math.ceil(exam.questionCount / rows);
  for (let block = 0; block < blocks; block++) {
    const firstIndex = block * rows;
    const lastIndex = Math.min(exam.questionCount, firstIndex + rows);
    const firstBubble = questionBubble(exam, firstIndex, 0);
    const headingY = firstBubble.y - 10;
    const blockCounts = new Set(Array.from({ length: lastIndex - firstIndex }, (_, offset) => choiceCountFor(exam, firstIndex + offset)));
    const kind = blockCounts.size > 1 ? "إجابات الأسئلة" : choiceCountFor(exam, firstIndex) === 2 ? "صح أو خطأ" : "اختيار من متعدد";
    out.push(`<rect x="${firstBubble.x + 35}" y="${headingY - 4}" width="2.2" height="7" rx="1.1" fill="${block === 0 ? INDIGO : "#9ca3af"}"/>`);
    out.push(svgText(firstBubble.x + 32, headingY, `الجزء ${block === 0 ? "الأول" : block === 1 ? "الثاني" : "الثالث"}: ${kind}`, 2.75, `direction="rtl" text-anchor="start" font-weight="700"`));
    out.push(svgText(firstBubble.x - 8, headingY, `${firstIndex + 1}–${lastIndex}`, 2.1, `fill="${MUTED}" text-anchor="end" font-weight="600"`));
  }
  for (let q = 0; q < exam.questionCount; q++) {
    const block = Math.floor(q / rows);
    const p0 = questionBubble(exam, q, 0);
    const labels = choiceLabelsFor(exam, q);
    const nx = questionNumberX(exam, block);
    if (q % 2) {
      const last = questionBubble(exam, q, labels.length - 1);
      out.push(`<rect x="${nx - 4}" y="${p0.y - 3.6}" width="${last.x - nx + 8}" height="7.2" rx="1.4" fill="#f7f9fc"/>`);
    }
    out.push(`<circle cx="${nx}" cy="${p0.y}" r="3" fill="#fff" stroke="${INK}" stroke-width="0.5"/>`);
    out.push(svgText(nx, p0.y + 1.1, String(q + 1), 3.1, `text-anchor="middle" font-weight="700"`));
    labels.forEach((label, choice) => { const p = questionBubble(exam, q, choice); out.push(answerBubble(p.x, p.y, label)); });
  }
  return out.join("");
}

function footer(): string {
  return `<line x1="30" y1="278" x2="180" y2="278" stroke="${LINE}" stroke-width="0.35"/>` +
    `<line x1="32" y1="284" x2="65" y2="284" stroke="#9ca3af" stroke-width="0.4"/>` +
    svgText(48.5, 288, "توقيع المراقب", 2.2, `fill="${MUTED}" direction="rtl" text-anchor="middle"`) +
    `<line x1="145" y1="284" x2="178" y2="284" stroke="#9ca3af" stroke-width="0.4"/>` +
    svgText(161.5, 288, "توقيع الطالب", 2.2, `fill="${MUTED}" direction="rtl" text-anchor="middle"`) +
    svgText(105, 284.8, "تمنياتنا لكم بالتوفيق والنجاح", 3, `direction="rtl" text-anchor="middle" font-weight="700"`) +
    svgText(105, 292, "GradeTrackPro — نظام التصحيح الآلي", 2.1, `fill="#9ca3af" direction="rtl" text-anchor="middle"`);
}

export function buildAnswerSheetSvg(exam: OmrExam, header?: SheetHeader): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}mm" height="${PAGE_H}mm" viewBox="0 0 ${PAGE_W} ${PAGE_H}" role="img" aria-label="ورقة إجابة OMR"><rect width="210" height="297" fill="#fff"/>` +
    registrationMarks() + `<text x="105" y="184" font-family="${FONT}" font-size="24" font-weight="800" fill="#111827" opacity="0.035" text-anchor="middle" letter-spacing="2" transform="rotate(-24 105 184)">GradeTrackPro</text>` +
    brand(header) + identityAndMeta(exam, header) + legend() + machineCode(exam) + bubbledStudentId(exam) + questionGrid(exam) + footer() + `</svg>`;
}

// Essay answer lines don't fit the mm-exact bubble page — that page's every
// coordinate is tied to scan.ts's read geometry, so nothing else can share
// it. Essay writing space instead becomes its own extra page appended after
// the bubble page, printed as part of the same "answer sheet" document but
// never touched by the scanner (it only ever reads page 1's photo).
function essayAnswerPageHtml(exam: OmrExam, header?: SheetHeader): string {
  const essayQuestions = exam.essayQuestions || [];
  if (!essayQuestions.length) return "";
  const rows = essayQuestions.map((q, i) => {
    const lines = Math.max(3, Math.min(10, Math.round(q.points ?? 1) * 2));
    const linesHtml = Array.from({ length: lines }, () => `<div class="eline"></div>`).join("");
    return `<div class="eq"><div class="etext"><b>${i + 1}.</b> ${escapeXml(q.text)} <span class="epts">(${q.points ?? 1} ${(q.points ?? 1) === 1 ? "درجة" : "درجات"})</span></div><div class="elines">${linesHtml}</div></div>`;
  }).join("");
  return `
    <div class="essay-page">
      <div class="ehead">
        <div class="ebrand">GradeTrackPro — ${escapeXml(exam.title)}</div>
        <div class="efields">
          <span>الاسم: <span class="eblank"></span></span>
          <span>الرقم الجامعي: <span class="eblank"></span></span>
        </div>
      </div>
      <h2 class="etitle">إجابات الأسئلة المقالية</h2>
      ${rows}
    </div>`;
}

export function buildAnswerSheetHtml(exam: OmrExam, header?: SheetHeader): string {
  const essayPage = essayAnswerPageHtml(exam, header);
  const essayCss = essayPage ? `
    .essay-page { width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 20mm; overflow: visible; page-break-before: always; font-family: ${FONT}; }
    @media print { .essay-page { padding: 15mm 20mm; } }
    .ehead { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${INDIGO}; padding-bottom: 4mm; margin-bottom: 6mm; }
    .ebrand { font-weight: 800; font-size: 13px; color: ${INDIGO}; }
    .efields { display: flex; gap: 8mm; font-size: 11px; font-weight: 700; color: ${INK}; }
    .eblank { display: inline-block; width: 35mm; border-bottom: 1px solid ${MUTED}; margin-inline-start: 2mm; }
    .etitle { font-size: 14px; margin: 0 0 6mm; color: ${INK}; }
    .eq { margin-bottom: 6mm; }
    .etext { font-size: 12.5pt; font-weight: 700; margin-bottom: 2.5mm; }
    .etext b { color: ${INDIGO}; margin-inline-end: 1mm; }
    .epts { font-size: 10px; font-weight: 600; color: ${MUTED}; }
    .elines { padding-inline-start: 6mm; }
    .eline { height: 8mm; border-bottom: 1px solid #cbd5e1; }` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><title>${escapeXml(exam.title)}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{width:210mm;margin:0;padding:0;background:#fff}.sheet-page{width:210mm;height:297mm;overflow:hidden}svg{display:block;width:210mm;height:297mm}${essayCss}</style></head><body><div class="sheet-page">${buildAnswerSheetSvg(exam, header)}</div>${essayPage}</body></html>`;
}

export function printAnswerSheet(exam: OmrExam, header?: SheetHeader): boolean {
  return printHtml(buildAnswerSheetHtml(exam, header));
}
