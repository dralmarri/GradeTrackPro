import { BankQuestion, DIFFICULTY_LABELS } from "@/types/questionBank";

function choiceLabel(count: number, index: number): string {
  if (count === 2) return ["ص", "خ"][index] ?? String(index + 1);
  return (["أ", "ب", "ج", "د", "هـ"][index]) ?? String(index + 1);
}

// Builds a .docx the professor can open, edit and print like any other
// Word document — useful for sharing the bank outside the app, archiving a
// printable copy, or handing it to a colleague who doesn't use GradeTrackPro.
export async function exportQuestionBankToWord(bankName: string, questions: BankQuestion[], ar: boolean) {
  // Loaded on demand — the docx library is sizable and only this export
  // path ever needs it, so it shouldn't add to every user's initial bundle.
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      text: bankName || (ar ? "بنك الأسئلة" : "Question Bank"),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      bidirectional: ar,
    }),
    new Paragraph({
      text: ar ? `${questions.length} سؤالاً` : `${questions.length} questions`,
      alignment: AlignmentType.CENTER,
      bidirectional: ar,
      spacing: { after: 300 },
    }),
  ];

  questions.forEach((q, idx) => {
    children.push(new Paragraph({
      bidirectional: ar,
      alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { before: 280, after: 100 },
      children: [new TextRun({ text: `${idx + 1}. ${q.text}`, bold: true, rightToLeft: ar })],
    }));

    if (q.kind === "essay") {
      children.push(new Paragraph({
        bidirectional: ar,
        alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT,
        indent: ar ? { right: 400 } : { left: 400 },
        children: [new TextRun({ text: ar ? "(سؤال مقالي)" : "(Essay question)", italics: true, rightToLeft: ar })],
      }));
    } else {
      q.choices.forEach((choice, ci) => {
        const isCorrect = ci === q.correct;
        children.push(new Paragraph({
          bidirectional: ar,
          alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT,
          indent: ar ? { right: 400 } : { left: 400 },
          children: [new TextRun({
            text: `${choiceLabel(q.choices.length, ci)}. ${choice}${isCorrect ? "  ✓" : ""}`,
            rightToLeft: ar,
            bold: isCorrect,
            color: isCorrect ? "16A34A" : undefined,
          })],
        }));
      });
    }

    const meta: string[] = [];
    if (q.chapter) meta.push(ar ? `الفصل: ${q.chapter}` : `Chapter: ${q.chapter}`);
    if (q.topic) meta.push(ar ? `الموضوع: ${q.topic}` : `Topic: ${q.topic}`);
    if (q.difficulty) meta.push(ar ? `المستوى: ${DIFFICULTY_LABELS[q.difficulty]}` : `Level: ${q.difficulty}`);
    if (meta.length > 0) {
      children.push(new Paragraph({
        bidirectional: ar,
        alignment: ar ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [new TextRun({ text: meta.join("  ·  "), size: 18, color: "6B7280", rightToLeft: ar })],
      }));
    }
  });

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const fileName = `${(bankName || "بنك_الأسئلة").replace(/[\\/:*?"<>|]/g, "_")}.docx`;
  const file = new File([blob], fileName, { type: blob.type });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch {
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
