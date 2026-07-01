import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OmrExam, ChoiceCount } from "@/types/exam";

// any-typed client: omr_exams isn't in the generated types yet (v2 branch)
const db = supabase as any;

function rowToExam(row: any): OmrExam {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    questionCount: Number(row.question_count) || 20,
    choiceCount: (Number(row.choice_count) === 5 ? 5 : 4) as ChoiceCount,
    targetComponent: row.target_component || "exam1",
    maxScore: Number(row.max_score) || 20,
    answerKey: (row.answer_key || []) as number[],
    studentIdDigits: Number(row.student_id_digits) || 6,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useOmrExams(courseId: string | null) {
  const { user } = useAuth();
  const [exams, setExams] = useState<OmrExam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    if (!user || !courseId) { setExams([]); setLoading(false); return; }
    const { data, error } = await db
      .from("omr_exams").select("*")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });
    if (error) { console.error("Error fetching omr exams:", error); setLoading(false); return; }
    setExams((data || []).map(rowToExam));
    setLoading(false);
  }, [user, courseId]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const addExam = useCallback(async (input: {
    title: string;
    questionCount: number;
    choiceCount: ChoiceCount;
    targetComponent: string;
    maxScore: number;
    studentIdDigits: number;
  }): Promise<string> => {
    if (!user || !courseId) return "";
    const { data, error } = await db.from("omr_exams").insert({
      user_id: user.id,
      course_id: courseId,
      title: input.title,
      question_count: input.questionCount,
      choice_count: input.choiceCount,
      target_component: input.targetComponent,
      max_score: input.maxScore,
      answer_key: new Array(input.questionCount).fill(-1),
      student_id_digits: input.studentIdDigits,
    }).select().single();
    if (error || !data) { console.error("Error adding omr exam:", error); return ""; }
    await fetchExams();
    return data.id;
  }, [user, courseId, fetchExams]);

  const updateExam = useCallback(async (examId: string, updates: {
    title?: string; maxScore?: number; targetComponent?: string;
  }) => {
    const u: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) u.title = updates.title;
    if (updates.maxScore !== undefined) u.max_score = updates.maxScore;
    if (updates.targetComponent !== undefined) u.target_component = updates.targetComponent;
    const { error } = await db.from("omr_exams").update(u).eq("id", examId);
    if (error) console.error("Error updating omr exam:", error);
    else await fetchExams();
  }, [fetchExams]);

  const updateAnswerKey = useCallback(async (examId: string, answerKey: number[]) => {
    const { error } = await db.from("omr_exams")
      .update({ answer_key: answerKey, updated_at: new Date().toISOString() })
      .eq("id", examId);
    if (error) console.error("Error updating answer key:", error);
    else await fetchExams();
  }, [fetchExams]);

  const deleteExam = useCallback(async (examId: string) => {
    const { error } = await db.from("omr_exams").delete().eq("id", examId);
    if (error) console.error("Error deleting omr exam:", error);
    else await fetchExams();
  }, [fetchExams]);

  return { exams, loading, addExam, updateExam, updateAnswerKey, deleteExam, refetch: fetchExams };
}
