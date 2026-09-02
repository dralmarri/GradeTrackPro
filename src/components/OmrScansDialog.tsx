import { useState } from "react";
import { OmrExam } from "@/types/exam";
import { useOmrScans, OmrScanRecord } from "@/hooks/useOmrScans";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";
import { X, Loader2, ImageIcon, Trash2, History, AlertTriangle, Download, CloudDownload } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntilPurge, PURGE_WARNING_DAYS, RETENTION_MONTHS } from "@/lib/omr/archiveRetention";

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  if (!open) return null;

  const openImage = async (scan: OmrScanRecord) => {
    if (!scan.imagePath) { toast.error(ar ? "لا توجد صورة محفوظة لهذا المسح" : "No image saved"); return; }
    setLoadingImg(scan.id);
    const url = await getImageUrl(scan.imagePath);
    setLoadingImg(null);
    if (url) setViewUrl(url);
    else toast.error(ar ? "تعذّر فتح الصورة" : "Could not open image");
  };

  // Saves the photo to the device's normal Downloads location — from there
  // the professor can move it anywhere they like, including a folder
  // synced to their own cloud storage (Google Drive, OneDrive, iCloud…).
  // This app never uploads it anywhere on their behalf.
  const downloadImage = async (scan: OmrScanRecord) => {
    if (!scan.imagePath) { toast.error(ar ? "لا توجد صورة محفوظة لهذا المسح" : "No image saved"); return; }
    setDownloadingId(scan.id);
    try {
      const url = await getImageUrl(scan.imagePath);
      if (!url) throw new Error("no url");
      const blob = await (await fetch(url)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${exam.title}-${scan.studentName || scan.id}.jpg`.replace(/[/\\]/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error(ar ? "تعذّر تنزيل الصورة" : "Could not download the image");
    } finally {
      setDownloadingId(null);
    }
  };

  const expiringScans = scans.filter((s) => s.imagePath && daysUntilPurge(s.createdAt) <= PURGE_WARNING_DAYS);

  const downloadAllExpiring = async () => {
    setBulkDownloading(true);
    try {
      for (const s of expiringScans) {
        await downloadImage(s);
        // small gap so the browser doesn't block a burst of programmatic downloads
        await new Promise((r) => setTimeout(r, 350));
      }
      toast.success(ar ? "تم تنزيل الصور" : "Photos downloaded");
    } finally {
      setBulkDownloading(false);
    }
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

        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          {ar
            ? `تُحذف صور الأوراق المؤرشفة تلقائياً بعد ${RETENTION_MONTHS} أشهر لتوفير مساحة التخزين (الدرجات المرصودة لا تتأثر). يمكنك تنزيل أي صورة الآن وحفظها على جهازك أو في أي تخزين سحابي تملكه.`
            : `Archived sheet photos are automatically deleted after ${RETENTION_MONTHS} months to save storage (recorded grades are never affected). You can download any photo now and keep it on your device or your own cloud storage.`}
        </p>

        {expiringScans.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-400/60 bg-amber-500/5 p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {ar
                ? `${expiringScans.length} صورة ستُحذف خلال ${PURGE_WARNING_DAYS} يوماً`
                : `${expiringScans.length} photo(s) will be deleted within ${PURGE_WARNING_DAYS} days`}
            </p>
            <button
              onClick={downloadAllExpiring}
              disabled={bulkDownloading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-400"
            >
              {bulkDownloading ? <Loader2 size={13} className="animate-spin" /> : <CloudDownload size={13} />}
              {ar ? "تنزيل الكل قبل الحذف" : "Download all before deletion"}
            </button>
          </div>
        )}

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
                  {s.imagePath && daysUntilPurge(s.createdAt) <= PURGE_WARNING_DAYS && (
                    <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
                      {ar
                        ? `ستُحذف الصورة خلال ${Math.max(0, daysUntilPurge(s.createdAt))} يوماً`
                        : `Photo deletes in ${Math.max(0, daysUntilPurge(s.createdAt))} day(s)`}
                    </p>
                  )}
                </div>
                {s.imagePath && (
                  <button
                    onClick={() => downloadImage(s)}
                    disabled={downloadingId === s.id}
                    title={ar ? "تنزيل الصورة" : "Download photo"}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {downloadingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  </button>
                )}
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
