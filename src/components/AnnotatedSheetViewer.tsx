import { useState } from "react";
import { OmrExam, choiceCountFor } from "@/types/exam";
import { questionBubble, BUBBLE_R, PAGE_W, PAGE_H } from "@/lib/omr/layout";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Full-screen view of a straightened answer sheet (see buildSheetImage in
// scan.ts — cropped exactly to the A4 page, so sheet-mm maps linearly onto
// the image) with a ring over every picked answer: green = matches the key,
// red = doesn't. When `onChange` is given, every bubble is tappable: tap the
// bubble the student really chose to switch the answer to it, tap the
// ringed one again to clear it. Rings are drawn from `answers`, so they
// always reflect the current (possibly corrected) answers.
interface Props {
  imageUrl: string;
  exam: OmrExam;
  answers: number[];
  ar: boolean;
  onClose: () => void;
  onChange?: (q: number, c: number) => void;
  busy?: boolean;
  footer?: React.ReactNode;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export default function AnnotatedSheetViewer({ imageUrl, exam, answers, ar, onClose, onChange, busy, footer }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const ringW = pct(BUBBLE_R * 2 * 1.3, PAGE_W);
  const hitW = pct(BUBBLE_R * 2, PAGE_W);

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black/90" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2 p-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground"
          aria-label={ar ? "إغلاق" : "Close"}
        >
          <X size={18} />
        </button>
        <p className="flex-1 text-center text-[11px] font-semibold text-white/80">
          {onChange
            ? (ar ? "اضغط الدائرة التي ظللها الطالب لتعديل الإجابة" : "Tap the bubble the student marked to correct it")
            : (ar ? "أخضر: صحيحة · أحمر: خاطئة" : "Green: correct · Red: wrong")}
        </p>
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground"
          aria-label={ar ? "تكبير" : "Zoom"}
        >
          {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <div className={cn("relative mx-auto", zoomed ? "w-[220%] max-w-none" : "w-full max-w-[640px]")}>
          <img src={imageUrl} alt="sheet" className="block w-full rounded-lg bg-white" draggable={false} />
          {Array.from({ length: exam.questionCount }, (_, q) => {
            const picked = answers[q];
            const key = exam.answerKey?.[q];
            return Array.from({ length: choiceCountFor(exam, q) }, (_, c) => {
              const p = questionBubble(exam, q, c);
              const isPicked = picked === c;
              const correct = key != null && key >= 0 && c === key;
              return (
                <div key={`${q}-${c}`}>
                  {isPicked && (
                    <span
                      className={cn("pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]",
                        correct ? "border-green-600" : "border-red-600")}
                      style={{ left: pct(p.x, PAGE_W), top: pct(p.y, PAGE_H), width: ringW }}
                    />
                  )}
                  {onChange && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onChange(q, c)}
                      aria-label={`Q${q + 1} choice ${c + 1}`}
                      className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full active:bg-primary/30"
                      style={{ left: pct(p.x, PAGE_W), top: pct(p.y, PAGE_H), width: hitW }}
                    />
                  )}
                </div>
              );
            });
          })}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

      {footer && <div className="border-t border-white/10 bg-black/60 p-3 text-center text-white" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>{footer}</div>}
    </div>
  );
}
