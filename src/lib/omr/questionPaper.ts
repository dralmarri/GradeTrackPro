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
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: 'Dubai', 'Segoe UI', Tahoma, Arial; font-weight: 500; color: #111; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a5f; padding-bottom: 4mm; }
  .inst { font-size: 11px; color: #333; line-height: 1.6; }
  .inst div:first-child { font-weight: bold; font-size: 12px; }
  .badge { border: 1.5px solid #1e3a5f; color: #1e3a5f; border-radius: 6px; padding: 3px 12px; font-weight: bold; font-size: 14px; }
  h1 { text-align: center; font-size: 20pt; color: #1e3a5f; margin: 6mm 0 1mm; }
  .meta { text-align: center; font-size: 11px; color: #555; margin-bottom: 5mm; }
  .note { background: #f2f6fb; border: 1px solid #d5e2f0; border-radius: 6px; padding: 3mm; font-size: 11px; margin-bottom: 5mm; }
  .q { margin-bottom: 4.5mm; page-break-inside: avoid; }
  .qtext { font-size: 14pt; font-weight: 700; margin-bottom: 1.5mm; }
  .choices { display: flex; flex-wrap: wrap; gap: 2mm 8mm; padding-inline-start: 7mm; font-size: 14pt; }
  .choice { min-width: 38mm; }
  .foot { text-align: center; color: #1e3a5f; font-weight: bold; font-size: 12px; margin-top: 8mm; }
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
  (w.document as any).fonts?.ready ? (w.document as any).fonts.ready.then(go).catch(go) : setTimeout(go, 500);
  return true;
}
