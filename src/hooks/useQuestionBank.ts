import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BankQuestion, Difficulty } from "@/types/questionBank";

// any-typed client: omr_questions isn't in the generated types yet (v2 branch)
const db = supabase as any;

function rowToQuestion(row: any): BankQuestion {
  return {
    id: row.id,
    courseId: row.course_id,
    text: row.text,
    kind: row.kind === "essay" ? "essay" : "choice",
    choices: (row.choices || []) as string[],
    correct: Number(row.correct) || 0,
    chapter: row.chapter || undefined,
    topic: row.topic || undefined,
    difficulty: (row.difficulty as Difficulty) || undefined,
    points: row.points != null ? Number(row.points) : undefined,
    createdAt: row.created_at,
  };
}

// courseIds: the current course + its sibling sections (same course name),
// so the bank is shared across sections of the same course.
export function useQuestionBank(courseId: string | null, courseIds?: string[]) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  // stable key — a fresh array identity per render must NOT retrigger fetching
  const idsKey = (courseIds && courseIds.length ? courseIds : courseId ? [courseId] : []).slice().sort().join(",");

  const fetchQuestions = useCallback(async () => {
    if (!user || !courseId) { setQuestions([]); setLoading(false); return; }
    const ids = idsKey.split(",").filter(Boolean);
    const { data, error } = await db
      .from("omr_questions").select("*")
      .in("course_id", ids)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching questions:", error);
      const { toast } = await import("sonner");
      toast.error(`تعذّر تحميل بنك الأسئلة: ${error.message || error.code || "خطأ غير معروف"}`, { duration: 9000 });
      setQuestions([]); // never show another course's stale questions
      setLoading(false);
      return;
    }
    setQuestions((data || []).map(rowToQuestion));
    setLoading(false);
  }, [user, courseId, idsKey]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const addQuestion = useCallback(async (input: {
    text: string; kind?: "choice" | "essay"; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }): Promise<boolean> => {
    if (!user || !courseId) return false;
    const baseRow: any = {
      user_id: user.id, course_id: courseId, text: input.text, kind: input.kind || "choice",
      choices: input.choices, correct: input.correct, chapter: input.chapter || null,
      topic: input.topic || null, difficulty: input.difficulty || null, points: input.points ?? 1,
    };
    let { error } = await db.from("omr_questions").insert(baseRow);
    // schema catch-up: the "kind" and/or "points" columns may not exist yet
    // in an older database — drop whichever ones the error names and retry,
    // instead of failing to save the question outright.
    for (let i = 0; i < 2 && error && /(kind|points)/.test(error.message || ""); i++) {
      if (/kind/.test(error.message || "")) delete baseRow.kind;
      if (/points/.test(error.message || "")) delete baseRow.points;
      ({ error } = await db.from("omr_questions").insert(baseRow));
    }
    if (error) {
      console.error("Error adding question:", error);
      const { toast } = await import("sonner");
      toast.error(`فشل الحفظ: ${error.message || "خطأ غير معروف"}`, { duration: 9000 });
      return false;
    }
    await fetchQuestions();
    return true;
  }, [user, courseId, fetchQuestions]);

  const addQuestions = useCallback(async (items: {
    text: string; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }[]): Promise<number> => {
    if (!user || !courseId || !items.length) return 0;
    const rows = items.map((q) => ({
      user_id: user.id,
      course_id: courseId,
      text: q.text,
      choices: q.choices,
      correct: q.correct,
      chapter: q.chapter || null,
      topic: q.topic || null,
      difficulty: q.difficulty || null,
      points: q.points ?? 1,
    }));
    let { error } = await db.from("omr_questions").insert(rows);
    if (error && /points/.test(error.message || "")) {
      // قاعدة البيانات لم تُحدَّث بعمود الدرجات بعد — احفظ بدونه بدل الفشل
      ({ error } = await db.from("omr_questions").insert(rows.map(({ points: _p, ...r }) => r)));
    }
    if (error) {
      console.error("Bulk insert failed:", error);
      const { toast } = await import("sonner");
      toast.error(`فشل الحفظ: ${error.message || error.code || "خطأ غير معروف"}`, { duration: 9000 });
      return 0;
    }
    await fetchQuestions();
    return rows.length;
  }, [user, courseId, fetchQuestions]);

  const deleteQuestion = useCallback(async (id: string) => {
    const { error } = await db.from("omr_questions").delete().eq("id", id);
    if (error) console.error("Error deleting question:", error);
    else await fetchQuestions();
  }, [fetchQuestions]);

  const deleteQuestions = useCallback(async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return true;
    const { error } = await db.from("omr_questions").delete().in("id", ids);
    if (error) { console.error("Error deleting questions:", error); return false; }
    await fetchQuestions();
    return true;
  }, [fetchQuestions]);

  return { questions, loading, addQuestion, addQuestions, deleteQuestion, deleteQuestions, refetch: fetchQuestions };
}
