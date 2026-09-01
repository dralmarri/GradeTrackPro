import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// any-typed client: omr_scans/omr_exams aren't in the generated types yet
const db = supabase as any;

// Frees Supabase Storage space by deleting archived answer-sheet PHOTOS —
// never the score/answers themselves, which stay in omr_scans forever (they
// were already applied to the student's grade, so deleting the photo can't
// affect anything the professor sees in the gradebook). Only image_path is
// cleared so the scan-history dialog gracefully shows "no image" instead of
// a broken link.
export function useScanArchiveCleanup() {
  const { user } = useAuth();
  const [cleaning, setCleaning] = useState(false);

  // Purge every archived photo for a single course (used once its semester
  // has ended — the professor no longer needs to re-examine the sheets).
  const purgeCourseArchive = useCallback(async (courseId: string): Promise<number> => {
    if (!user) return 0;
    setCleaning(true);
    try {
      const { data: exams, error: examErr } = await db
        .from("omr_exams").select("id").eq("course_id", courseId);
      if (examErr || !exams || exams.length === 0) return 0;
      const examIds = exams.map((e: { id: string }) => e.id);

      const { data: scans, error: scanErr } = await db
        .from("omr_scans").select("id, image_path")
        .in("exam_id", examIds).not("image_path", "is", null);
      if (scanErr || !scans || scans.length === 0) return 0;

      return await deleteScanPhotos(scans);
    } finally {
      setCleaning(false);
    }
  }, [user]);

  // Purge archived photos older than a cutoff, across ALL of this user's
  // courses — a safety net so storage never grows unbounded even for
  // courses nobody remembers to clean up manually.
  const purgeOlderThan = useCallback(async (cutoff: Date): Promise<number> => {
    if (!user) return 0;
    setCleaning(true);
    try {
      const { data: scans, error } = await db
        .from("omr_scans").select("id, image_path")
        .eq("user_id", user.id)
        .not("image_path", "is", null)
        .lt("created_at", cutoff.toISOString());
      if (error || !scans || scans.length === 0) return 0;
      return await deleteScanPhotos(scans);
    } finally {
      setCleaning(false);
    }
  }, [user]);

  const deleteScanPhotos = async (scans: { id: string; image_path: string }[]): Promise<number> => {
    const paths = scans.map((s) => s.image_path).filter(Boolean);
    if (paths.length === 0) return 0;
    // remove the files first — clearing the DB reference before the file is
    // actually gone would leave orphaned storage objects with nothing
    // pointing at them (harder to find and clean up later)
    const { error: rmErr } = await supabase.storage.from("scans").remove(paths);
    if (rmErr) { console.error("Error removing archived scan photos:", rmErr); return 0; }
    const ids = scans.map((s) => s.id);
    const { error: updErr } = await db
      .from("omr_scans").update({ image_path: null }).in("id", ids);
    if (updErr) { console.error("Error clearing image_path after cleanup:", updErr); }
    return paths.length;
  };

  return { cleaning, purgeCourseArchive, purgeOlderThan };
}
