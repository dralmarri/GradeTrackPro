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
    choices: (row.choices || []) as string[],
    correct: Number(row.correct) || 0,
    chapter: row.chapter || undefined,
    topic: row.topic || undefined,
    difficulty: (row.difficulty as Difficulty) || undefined,
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
    if (error) { console.error("Error fetching questions:", error); setLoading(false); return; }
    setQuestions((data || []).map(rowToQuestion));
    setLoading(false);
  }, [user, courseId, idsKey]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const addQuestion = useCallback(async (input: {
    text: string; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty;
  }): Promise<boolean> => {
    if (!user || !courseId) return false;
    const { error } = await db.from("omr_questions").insert({
      user_id: user.id,
      course_id: courseId,
      text: input.text,
      choices: input.choices,
      correct: input.correct,
      chapter: input.chapter || null,
      topic: input.topic || null,
      difficulty: input.difficulty || null,
    });
    if (error) { console.error("Error adding question:", error); return false; }
    await fetchQuestions();
    return true;
  }, [user, courseId, fetchQuestions]);

  const addQuestions = useCallback(async (items: {
    text: string; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty;
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
    }));
    const { error } = await db.from("omr_questions").insert(rows);
    if (error) { console.error("Bulk insert failed:", error); return 0; }
    await fetchQuestions();
    return rows.length;
  }, [user, courseId, fetchQuestions]);

  const deleteQuestion = useCallback(async (id: string) => {
    const { error } = await db.from("omr_questions").delete().eq("id", id);
    if (error) console.error("Error deleting question:", error);
    else await fetchQuestions();
  }, [fetchQuestions]);

  return { questions, loading, addQuestion, addQuestions, deleteQuestion, refetch: fetchQuestions };
}
