import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export interface OmrScanRecord {
  id: string;
  examId: string;
  studentId: string | null;
  studentName: string;
  studentNumber: string;
  score: number;
  rawCorrect: number;
  answers: number[];
  imagePath: string | null;
  createdAt: string;
  needsReview: boolean;
  reviewCount: number;
}

function rowToScan(row: any): OmrScanRecord {
  return {
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    studentName: row.student_name || "",
    studentNumber: row.student_number || "",
    score: Number(row.score) || 0,
    rawCorrect: Number(row.raw_correct) || 0,
    answers: (row.answers || []) as number[],
    imagePath: row.image_path,
    createdAt: row.created_at,
    needsReview: Boolean(row.needs_review),
    reviewCount: Number(row.review_count) || 0,
  };
}

// compress a photo to a reasonable JPEG before archiving
async function compressImage(file: Blob, maxDim = 1600, quality = 0.72): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("bad image"));
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b || file), "image/jpeg", quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useOmrScans(examId: string | null) {
  const { user } = useAuth();
  const [scans, setScans] = useState<OmrScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScans = useCallback(async () => {
    if (!user || !examId) { setScans([]); setLoading(false); return; }
    const { data, error } = await db
      .from("omr_scans").select("*")
      .eq("exam_id", examId)
      .order("created_at", { ascending: false });
    if (error) { console.error("Error fetching scans:", error); setLoading(false); return; }
    setScans((data || []).map(rowToScan));
    setLoading(false);
  }, [user, examId]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  const addScan = useCallback(async (input: {
    examId: string;
    studentId: string;
    studentName: string;
    studentNumber: string;
    score: number;
    rawCorrect: number;
    answers: number[];
    photo: Blob | null;
    needsReview?: boolean;
    reviewCount?: number;
  }): Promise<{ ok: boolean; imageFailed?: boolean; error?: string }> => {
    if (!user) return { ok: false, error: "not signed in" };
    let imagePath: string | null = null;
    let imageFailed = false;
    if (input.photo) {
      try {
        const compressed = await compressImage(input.photo);
        imagePath = `${user.id}/${input.examId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("scans")
          .upload(imagePath, compressed, { contentType: "image/jpeg" });
        if (upErr) { console.error("Scan image upload failed:", upErr); imagePath = null; imageFailed = true; }
      } catch (e) {
        console.error("Scan image compress failed:", e);
        imageFailed = true;
      }
    }
    const { error } = await db.from("omr_scans").insert({
      user_id: user.id,
      exam_id: input.examId,
      student_id: input.studentId || null,
      student_name: input.studentName,
      student_number: input.studentNumber || null,
      score: input.score,
      raw_correct: input.rawCorrect,
      answers: input.answers,
      image_path: imagePath,
      needs_review: input.needsReview ?? false,
      review_count: input.reviewCount ?? 0,
    });
    if (error) { console.error("Error recording scan:", error); return { ok: false, error: error.message }; }
    await fetchScans();
    return { ok: true, imageFailed };
  }, [user, fetchScans]);

  const getImageUrl = useCallback(async (imagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("scans")
      .createSignedUrl(imagePath, 60 * 10); // 10-minute link
    if (error) { console.error("Signed URL failed:", error); return null; }
    return data.signedUrl;
  }, []);

  const deleteScan = useCallback(async (scan: OmrScanRecord) => {
    // delete the row FIRST — removing the image before a failed row delete
    // would leave a record pointing at a missing file
    const { error } = await db.from("omr_scans").delete().eq("id", scan.id);
    if (error) { console.error("Error deleting scan:", error); return; }
    if (scan.imagePath) {
      await supabase.storage.from("scans").remove([scan.imagePath]).catch(() => {});
    }
    await fetchScans();
  }, [fetchScans]);

  return { scans, loading, addScan, getImageUrl, deleteScan, refetch: fetchScans };
}
