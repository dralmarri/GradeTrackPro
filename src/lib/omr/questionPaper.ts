// Printable question paper (ورقة الأسئلة) for a generated exam form.
// Plain RTL A4 HTML — this sheet is read by students, not by the scanner,
// so it has no geometry constraints tying it to scan.ts. Visual language
// (brand header, section pills, navy accents) matches the redesigned OMR
// answer sheet in sheet.ts.

import type { GeneratedForm } from "@/types/questionBank";
import type { SheetHeader } from "@/lib/omr/sheet";
import { choiceLabels } from "@/types/exam";
import { printHtml } from "@/lib/printHtml";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildQuestionPaperHtml(
  title: string,
  form: GeneratedForm,
  header?: SheetHeader,
  maxScore?: number,
): string {
  // Split questions into a "multiple choice" run and a "true/false" run so
  // each can get its own section pill + matching layout (2-col grid for
  // 4/5-option MCQ, compact inline row for T/F) — mirrors the mockup, which
  // shows MCQ as "الجزء الأول" and T/F as "الجزء الثاني".
  const items = form.questions.map((q, qi) => {
    const labels = choiceLabels(q.choices.length as 2 | 3 | 4 | 5);
    const displayChoices = form.choiceOrders[qi].map((orig, pos) => ({
      label: labels[pos],
      text: q.choices[orig],
    }));
    return { qi, text: q.text, choices: displayChoices, isTF: q.choices.length === 2 };
  });
  const mcq = items.filter((it) => !it.isTF);
  const tf = items.filter((it) => it.isTF);

  const mcqHtml = mcq.map((it) => {
    const gridClass = it.choices.length >= 4 ? "choices-grid2" : "choices-grid1";
    const choicesHtml = it.choices.map((c) =>
      `<div class="choice"><span class="clabel">${esc(c.label)}</span><span>${esc(c.text)}</span></div>`
    ).join("");
    return `
      <div class="q">
        <div class="qtext"><b>${it.qi + 1}.</b> ${esc(it.text)}</div>
        <div class="${gridClass}">${choicesHtml}</div>
      </div>`;
  }).join("");

  const tfHtml = tf.map((it) => `
      <div class="tf-row">
        <div class="tf-text"><b>${it.qi + 1}.</b> ${esc(it.text)}</div>
        <div class="tf-opts"><span>أ) صح</span><span>ب) خطأ</span></div>
      </div>`).join("");

  // Essay questions never get bubbles — just the question text and its
  // point weight. The writing space itself lives on the answer sheet
  // (see sheet.ts's essay page), not here, so the paper stays purely the
  // question text students read from.
  const essayHtml = form.essayQuestions.map((q, ei) => {
    const points = q.points ?? 1;
    return `
      <div class="q">
        <div class="qtext"><b>${mcq.length + tf.length + ei + 1}.</b> ${esc(q.text)} <span class="essay-pts">(${points} ${points === 1 ? "درجة" : "درجات"})</span></div>
      </div>`;
  }).join("");

  const sections = [
    mcq.length ? `
      <section class="sec">
        <div class="sec-head"><span class="pill">الجزء الأول</span><h3>اختيار من متعدد</h3></div>
        ${mcqHtml}
      </section>` : "",
    tf.length ? `
      <section class="sec">
        <div class="sec-head"><span class="pill pill-muted">الجزء الثاني</span><h3>صح أم خطأ</h3></div>
        ${tfHtml}
      </section>` : "",
    form.essayQuestions.length ? `
      <section class="sec">
        <div class="sec-head"><span class="pill pill-essay">الجزء الثالث</span><h3>أسئلة مقالية</h3></div>
        ${essayHtml}
      </section>` : "",
  ].join("");

  const instStack = [header?.institution, header?.college, header?.department]
    .filter(Boolean).map((l, i) => `<div class="${i === 0 ? "inst-primary" : ""}">${esc(l!)}</div>`).join("");

  const metaCells = [
    header?.courseName ? { label: "اسم المقرر", value: header.courseName, model: false } : null,
    { label: "عنوان الاختبار", value: title, model: false },
    form.version ? { label: "رقم النموذج", value: `نموذج (${form.version})`, model: true } : null,
  ].filter(Boolean) as { label: string; value: string; model: boolean }[];

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<title>${esc(title)} — نموذج ${esc(form.version)}</title>
<style>
  :root { --navy: #1f2937; --navy2: #2d46b9; --navy-soft: #eef3f9; --line: #e5e7eb; }
  @page { size: A4 portrait; margin: 20mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 100%; margin: 0; padding: 0; }
  /* @page margin only applies once actually printed/paginated — add the
     same margin as body padding so an on-screen preview (no pagination)
     isn't flush against the edge; printing zeroes it back out so the two
     margins never stack. */
  body { font-family: 'IBM Plex Sans Arabic', 'Dubai', 'Segoe UI', Tahoma, Arial; font-weight: 500; color: #111; padding: 20mm; }
  @media print { body { padding: 0; } }

  .head { border-bottom: 3px solid var(--navy2); padding-bottom: 4mm; }
  .head-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { display: flex; align-items: center; gap: 3mm; }
  .badge { width: 12mm; height: 12mm; background: var(--navy2); color: #fff; border-radius: 2.5mm; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
  .brand-name { font-weight: 800; font-size: 15px; color: var(--navy2); }
  .brand-tag { font-size: 10px; color: #6b7280; }
  .meta-bar .cell.model .val { font-size: 15px; color: var(--navy2); }
  .inst { text-align: left; font-size: 11px; color: #374151; line-height: 1.6; }
  .inst-primary { font-weight: 700; font-size: 12.5px; color: var(--navy); }

  .meta-bar { margin-top: 4mm; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 3mm; text-align: center; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 3mm 0; }
  .meta-bar .cell .lbl { display: block; font-size: 9.5px; color: #6b7280; margin-bottom: 1mm; }
  .meta-bar .cell .val { font-weight: 800; color: var(--navy); font-size: 12.5px; }
  .icon-row { margin-top: 2.5mm; display: flex; justify-content: space-around; font-size: 10.5px; color: #6b7280; }
  .icon-row span::before { margin-inline-end: 1.5mm; }

  .note { background: #f9fafb; border-inline-start: 4px solid #d1d5db; border-radius: 2mm; padding: 3.5mm 4mm; font-size: 11px; margin: 6mm 0; color: #374151; }
  .note h2 { font-size: 12px; margin: 0 0 1.5mm; color: var(--navy); }
  .note ul { margin: 0; padding-inline-start: 5mm; }
  .note li { margin-bottom: 1mm; }

  .sec { margin-bottom: 6mm; }
  .sec-head { display: flex; align-items: center; gap: 3mm; margin-bottom: 4mm; }
  .pill { background: var(--navy2); color: #fff; border-radius: 1.6mm; padding: 1.2mm 3.5mm; font-weight: 800; font-size: 11px; }
  .pill-muted { background: #99a3ad; }
  .pill-essay { background: #b45309; }
  .sec-head h3 { margin: 0; font-size: 13.5px; color: #222; border-bottom: 2px solid var(--navy2); padding-bottom: 1.5mm; }

  .q { margin-bottom: 5mm; padding-bottom: 3.5mm; border-bottom: 1px dashed var(--line); page-break-inside: avoid; }
  .q:last-child { border-bottom: none; }
  .qtext { font-size: 13pt; font-weight: 700; margin-bottom: 2.5mm; }
  .qtext b { color: var(--navy2); margin-inline-end: 1mm; }
  .choices-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; padding-inline-start: 6mm; font-size: 12pt; }
  .choices-grid1 { display: flex; flex-direction: column; gap: 2mm; padding-inline-start: 6mm; font-size: 12pt; }
  .choice { display: flex; align-items: flex-start; gap: 2mm; }
  .clabel { width: 6mm; height: 6mm; min-width: 6mm; border: 1px solid #d1d5db; border-radius: 1.5mm; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; color: #6b7280; }

  .tf-row { display: flex; justify-content: space-between; align-items: center; gap: 4mm; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 2mm; padding: 2.6mm 3.5mm; margin-bottom: 2.5mm; }
  .tf-text { font-size: 11.5pt; font-weight: 600; flex: 1; }
  .tf-text b { color: var(--navy2); margin-inline-end: 1mm; }
  .tf-opts { display: flex; gap: 4mm; font-size: 10.5px; font-weight: 700; color: #6b7280; white-space: nowrap; }

  .essay-pts { font-size: 10px; font-weight: 700; color: #6b7280; }

  .foot { display: flex; justify-content: space-between; color: #9ca3af; font-weight: 600; font-size: 9.5px; margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #e5e7eb; break-inside: avoid; }
  .foot .mid { color: var(--navy); font-weight: 700; }
</style>
</head>
<body>
  <div class="head">
    <div class="head-top">
      <div class="brand">
        <div class="badge">GTP</div>
        <div>
          <div class="brand-name">GradeTrackPro</div>
          <div class="brand-tag">نظام إدارة التقييم الأكاديمي</div>
        </div>
      </div>
      <div class="inst">${instStack || `<div class="inst-primary">${esc(title)}</div>`}</div>
    </div>
    <div class="meta-bar">
      ${metaCells.map((c) => `<div class="cell${c.model ? " model" : ""}"><span class="lbl">${esc(c.label)}</span><span class="val">${esc(c.value)}</span></div>`).join("")}
    </div>
    <div class="icon-row">
      <span>عدد الأسئلة: ${form.questions.length + form.essayQuestions.length}</span>
      ${maxScore != null ? `<span>الدرجة الكلية: ${maxScore}</span>` : ""}
    </div>
  </div>

  <div class="note">
    <h2>تعليمات هامة:</h2>
    <ul>
      <li>اقرأ كل سؤال بعناية قبل البدء بالإجابة.</li>
      <li>ظلّل إجابتك في ورقة الإجابة المرفقة ولا تكتب على ورقة الأسئلة.</li>
      <li>تأكد من تظليل رقم النموذج الصحيح المذكور أعلاه، وكتابة اسمك ورقمك الجامعي بوضوح على ورقة الإجابة.</li>
    </ul>
  </div>

  ${sections}

  <div class="foot">
    <span>© GradeTrackPro</span>
    <span class="mid">تمنياتنا لكم بالتوفيق والنجاح</span>
    <span>نموذج ${esc(form.version)}</span>
  </div>
</body>
</html>`;
}

export function printQuestionPaper(title: string, form: GeneratedForm, header?: SheetHeader, maxScore?: number): boolean {
  return printHtml(buildQuestionPaperHtml(title, form, header, maxScore));
}
