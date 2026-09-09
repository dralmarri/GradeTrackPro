import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BankQuestion, Difficulty } from "@/types/questionBank";

// any-typed client: omr_questions isn't in the generated types yet (v2 branch)
const db = supabase as any;

function rowToQuestion(row: any): BankQuestion {
  return {
    id: row.id,
    bankId: row.bank_id,
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

// bankId: the named question bank (see useQuestionBanks) linked to the
// current course — null means the course has no bank linked yet.
export function useQuestionBank(bankId: string | null) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!user || !bankId) { setQuestions([]); setLoading(false); return; }
    const { data, error } = await db
      .from("omr_questions").select("*")
      .eq("bank_id", bankId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Error fetching questions:", error);
      const { toast } = await import("sonner");
      toast.error(`تعذّر تحميل بنك الأسئلة: ${error.message || error.code || "خطأ غير معروف"}`, { duration: 9000 });
      setQuestions([]); // never show another bank's stale questions
      setLoading(false);
      return;
    }
    setQuestions((data || []).map(rowToQuestion));
    setLoading(false);
  }, [user, bankId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const addQuestion = useCallback(async (input: {
    text: string; kind?: "choice" | "essay"; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }): Promise<boolean> => {
    if (!user || !bankId) return false;
    const baseRow: any = {
      user_id: user.id, bank_id: bankId, text: input.text, kind: input.kind || "choice",
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
  }, [user, bankId, fetchQuestions]);

  const addQuestions = useCallback(async (items: {
    text: string; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }[]): Promise<number> => {
    if (!user || !bankId || !items.length) return 0;
    const rows = items.map((q) => ({
      user_id: user.id,
      bank_id: bankId,
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
  }, [user, bankId, fetchQuestions]);

  const updateQuestion = useCallback(async (id: string, input: {
    text: string; kind?: "choice" | "essay"; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }): Promise<boolean> => {
    const row: any = {
      text: input.text, kind: input.kind || "choice", choices: input.choices, correct: input.correct,
      chapter: input.chapter || null, topic: input.topic || null, difficulty: input.difficulty || null,
      points: input.points ?? 1,
    };
    let { error } = await db.from("omr_questions").update(row).eq("id", id);
    // same schema catch-up as addQuestion: drop columns an older database
    // doesn't have yet and retry, instead of failing the edit outright.
    for (let i = 0; i < 2 && error && /(kind|points)/.test(error.message || ""); i++) {
      if (/kind/.test(error.message || "")) delete row.kind;
      if (/points/.test(error.message || "")) delete row.points;
      ({ error } = await db.from("omr_questions").update(row).eq("id", id));
    }
    if (error) {
      console.error("Error updating question:", error);
      const { toast } = await import("sonner");
      toast.error(`فشل حفظ التعديل: ${error.message || "خطأ غير معروف"}`, { duration: 9000 });
      return false;
    }
    await fetchQuestions();
    return true;
  }, [fetchQuestions]);

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

  return { questions, loading, addQuestion, addQuestions, updateQuestion, deleteQuestion, deleteQuestions, refetch: fetchQuestions };
}
