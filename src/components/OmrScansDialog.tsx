import { useState } from "react";
import { OmrExam } from "@/types/exam";
import { useOmrScans, OmrScanRecord } from "@/hooks/useOmrScans";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { X, Loader2, ImageIcon, Trash2, History, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  exam: OmrExam;
  open: boolean;
  onClose: () => void;
}

export default function OmrScansDialog({ exam, open, onClose }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { scans, loading, getImageUrl, deleteScan } = useOmrScans(open ? exam.id : null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState<string | null>(null);

  if (!open) return null;

  const openImage = async (scan: OmrScanRecord) => {
    if (!scan.imagePath) { toast.error(ar ? "لا توجد صورة محفوظة لهذا المسح" : "No image saved"); return; }
    setLoadingImg(scan.id);
    const url = await getImageUrl(scan.imagePath);
    setLoadingImg(null);
    if (url) setViewUrl(url);
    else toast.error(ar ? "تعذّر فتح الصورة" : "Could not open image");
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ar-EG-u-nu-latn", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <History size={18} className="text-primary" />
            {ar ? "سجل المسح" : "Scan history"} · {exam.title}
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : scans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <ImageIcon size={28} className="mb-2 opacity-50" />
            <p className="text-sm font-semibold">{ar ? "لا توجد عمليات مسح مؤرشفة بعد" : "No archived scans yet"}</p>
            <p className="mt-1 text-xs">{ar ? "كل ورقة ترصد درجتها تُحفظ صورتها هنا تلقائياً" : "Every graded sheet is archived here automatically"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {scans.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm",
                  s.needsReview ? "border-amber-400/60 bg-amber-500/5" : "border-border",
                )}
              >
                <button
                  onClick={() => openImage(s)}
                  disabled={loadingImg === s.id}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  title={ar ? "عرض صورة الورقة" : "View sheet photo"}
                >
                  {loadingImg === s.id ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={17} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-bold text-foreground">
                    {s.studentName || (ar ? "غير معروف" : "Unknown")}
                    {s.needsReview && (
                      <span className="flex shrink-0 items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={10} />
                        {ar ? `يحتاج مراجعة (${s.reviewCount})` : `Needs review (${s.reviewCount})`}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.score}/{exam.maxScore} · {s.rawCorrect} {ar ? "صحيحة" : "correct"}
                    {s.studentNumber ? ` · #${s.studentNumber}` : ""} · {fmtDate(s.createdAt)}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(ar ? "حذف هذه الورقة من الأرشيف؟" : "Delete this sheet from the archive?")) return;
                    await deleteScan(s); toast.success(ar ? "حُذف من الأرشيف" : "Deleted");
                  }}
                  className="shrink-0 rounded-lg p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* full image viewer */}
        {viewUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setViewUrl(null)}>
            <img src={viewUrl} alt="scan" className="max-h-full max-w-full rounded-xl object-contain" />
            <button
              onClick={() => setViewUrl(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
