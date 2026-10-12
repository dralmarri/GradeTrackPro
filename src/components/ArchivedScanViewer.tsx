import { useEffect, useState } from "react";
import { OmrExam, gradeOmr } from "@/types/exam";
import { OmrScanRecord, isSheetImage, updateScanRow } from "@/hooks/useOmrScans";
import { scanAnswerSheet } from "@/lib/omr/scan";
import AnnotatedSheetViewer from "@/components/AnnotatedSheetViewer";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Opens one archived scan as the straightened sheet with the answer rings,
// and lets the professor correct answers: each tap regrades, saves the
// scan, and re-records the student's grade. Sheets archived before the
// straightened image was stored (a raw camera photo) are re-detected from
// that photo on the fly, so the rings show on older scans too.
interface Props {
  scan: OmrScanRecord;
  exam: OmrExam;
  ar: boolean;
  getImageUrl: (path: string) => Promise<string | null>;
  onClose: () => void;
  onSaved?: () => void;
  onApplyScore?: (studentId: string, targetComponent: string, score: number) => Promise<void>;
}

export default function ArchivedScanViewer({ scan, exam, ar, getImageUrl, onClose, onSaved, onApplyScore }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>(scan.answers);
  const [score, setScore] = useState(scan.score);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!scan.imagePath) { toast.error(ar ? "لا توجد صورة محفوظة لهذه الورقة" : "No image saved"); onClose(); return; }
      const url = await getImageUrl(scan.imagePath);
      if (!url) { toast.error(ar ? "تعذّر فتح الصورة" : "Could not open image"); onClose(); return; }
      if (isSheetImage(scan.imagePath)) { if (!cancelled) setImageUrl(url); return; }
      try {
        const blob = await (await fetch(url)).blob();
        const raw = await scanAnswerSheet(blob, exam);
        if (cancelled) return;
        if (raw.sheetImageUrl) setImageUrl(raw.sheetImageUrl);
        else setRawFallback(url);
      } catch {
        // corners not found etc. — still show the photo itself
        if (!cancelled) setRawFallback(url);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.id]);

  const change = async (q: number, c: number) => {
    if (saving) return;
    const next = [...answers];
    next[q] = next[q] === c ? -1 : c;
    const graded = gradeOmr(exam, next);
    const essay = (scan.essayScores || []).reduce((a, b) => a + (Number(b) || 0), 0);
    const finalScore = Math.round((graded.score + essay) * 100) / 100;
    setSaving(true);
    try {
      const ok = await updateScanRow(scan.id, { answers: next, score: finalScore, rawCorrect: graded.rawCorrect });
      if (!ok) {
        toast.error(ar
          ? "تعذّر حفظ التعديل — تأكد من تشغيل ملف التحديث (migration) الخاص بتعديل الأرشيف في Supabase"
          : "Couldn't save the change — make sure the archive-edit migration has been run in Supabase", { duration: 9000 });
        return;
      }
      if (scan.studentId && onApplyScore) await onApplyScore(scan.studentId, exam.targetComponent, finalScore);
      setAnswers(next);
      setScore(finalScore);
      onSaved?.();
      toast.success(ar ? `عُدّلت الدرجة إلى ${finalScore}` : `Grade updated to ${finalScore}`);
    } finally {
      setSaving(false);
    }
  };

  const maxTotal = exam.maxScore + (exam.essayQuestions || []).reduce((a, q) => a + (q.points ?? 1), 0);

  if (rawFallback) {
    return (
      <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <p className="mb-2 text-center text-xs text-white/80">
          {ar ? "تعذّر التعرف على حدود الورقة في هذه الصورة — تُعرض كما صُوّرت دون دوائر" : "Couldn't detect the sheet in this photo — shown as taken, without rings"}
        </p>
        <img src={rawFallback} alt="scan" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80" onClick={(e) => e.stopPropagation()}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <AnnotatedSheetViewer
      imageUrl={imageUrl}
      exam={exam}
      answers={answers}
      ar={ar}
      busy={saving}
      onClose={onClose}
      onChange={change}
      footer={<p className="text-sm font-bold">{scan.studentName} · {score} / {maxTotal}</p>}
    />
  );
}
