// Printable question paper (ورقة الأسئلة) for a generated exam form.
// Plain RTL A4 HTML — this sheet is read by students, not by the scanner.

import { GeneratedForm } from "@/types/questionBank";
import { SheetHeader } from "@/lib/omr/sheet";
import { choiceLabels } from "@/types/exam";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildQuestionPaperHtml(
  title: string,
  form: GeneratedForm,
  header?: SheetHeader,
): string {
  const rows = form.questions.map((q, qi) => {
    const labels = choiceLabels(q.choices.length as 2 | 3 | 4 | 5);
    const displayChoices = form.choiceOrders[qi].map((orig, pos) =>
      `<span class="choice"><b>${labels[pos]}.</b> ${esc(q.choices[orig])}</span>`
    ).join("");
    return `
      <div class="q">
        <div class="qtext"><b>${qi + 1}.</b> ${esc(q.text)}</div>
        <div class="choices">${displayChoices}</div>
      </div>`;
  }).join("");

  const inst = [header?.institution, header?.college, header?.department]
    .filter(Boolean).map((l) => `<div>${esc(l!)}</div>`).join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/dubai" />
<title>${esc(title)} — نموذج ${esc(form.version)}</title>
<style>
  :root { --navy: #1e3a5f; --navy-soft: #eef3f9; --line: #d5e2f0; }
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: 'Dubai', 'Segoe UI', Tahoma, Arial; font-weight: 500; color: #111; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid var(--navy); padding-bottom: 4mm; }
  .inst { font-size: 11px; color: #333; line-height: 1.65; }
  .inst div:first-child { font-weight: bold; font-size: 12.5px; color: var(--navy); }
  .badge { border: 1.5px solid var(--navy); background: var(--navy-soft); color: var(--navy); border-radius: 8px; padding: 4px 14px; font-weight: bold; font-size: 14px; }
  h1 { text-align: center; font-size: 21pt; color: var(--navy); letter-spacing: 0.2px; margin: 6mm 0 1mm; }
  .meta { text-align: center; font-size: 11px; color: #555; margin-bottom: 4mm; }
  .rule { height: 2px; background: linear-gradient(90deg, transparent, var(--navy), transparent); opacity: 0.35; margin-bottom: 5mm; }
  .note { background: var(--navy-soft); border: 1px solid var(--line); border-radius: 8px; padding: 3.2mm 4mm; font-size: 11px; margin-bottom: 6mm; color: #223; }
  .q { margin-bottom: 5mm; padding-bottom: 3.5mm; border-bottom: 1px dashed var(--line); page-break-inside: avoid; }
  .q:last-child { border-bottom: none; }
  .qtext { font-size: 14pt; font-weight: 700; margin-bottom: 2mm; }
  .qtext b { color: var(--navy); margin-inline-end: 1mm; }
  .choices { display: flex; flex-wrap: wrap; gap: 2.2mm 8mm; padding-inline-start: 7mm; font-size: 14pt; }
  .choice { min-width: 38mm; }
  .choice b { color: var(--navy); }
  .foot { text-align: center; color: var(--navy); font-weight: bold; font-size: 12px; margin-top: 8mm; padding-top: 4mm; border-top: 1px solid var(--line); }
</style>
</head>
<body>
  <div class="head">
    <div class="inst">${inst}</div>
    <div class="badge">نموذج ${esc(form.version)}</div>
  </div>
  <h1>${esc(title)}</h1>
  <div class="meta">
    ${header?.courseName ? `المقرر: ${esc(header.courseName)} · ` : ""}
    عدد الأسئلة: ${form.questions.length}
  </div>
  <div class="rule"></div>
  <div class="note">ظلّل إجابتك في <b>ورقة الإجابة المرفقة</b> ولا تكتب على ورقة الأسئلة. تأكد من تظليل رقم النموذج الصحيح المذكور أعلاه.</div>
  ${rows}
  <div class="foot">تمنياتنا لكم بالتوفيق والنجاح</div>
</body>
</html>`;
}

export function printQuestionPaper(title: string, form: GeneratedForm, header?: SheetHeader): boolean {
  const html = buildQuestionPaperHtml(title, form, header);
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
