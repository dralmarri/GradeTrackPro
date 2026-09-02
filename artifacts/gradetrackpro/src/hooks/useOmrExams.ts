import { useState, useCallback, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OmrExam, ChoiceCount, OmrSection } from "@/types/exam";

// any-typed client: omr_exams isn't in the generated types yet (v2 branch)
const db = supabase as any;

function rowToExam(row: any): OmrExam {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    questionCount: Number(row.question_count) || 20,
    choiceCount: ([2, 3, 4, 5].includes(Number(row.choice_count)) ? Number(row.choice_count) : 4) as ChoiceCount,
    targetComponent: row.target_component || "exam1",
    maxScore: Number(row.max_score) || 20,
    answerKey: (row.answer_key || []) as number[],
    studentIdDigits: Number(row.student_id_digits) || 6,
    sections: Array.isArray(row.sections) && row.sections.length ? (row.sections as OmrSection[]) : undefined,
    version: row.version || undefined,
    idMode: row.id_mode === "written" ? "written" : "bubbles",
    questionWeights: Array.isArray(row.question_weights) && row.question_weights.length ? (row.question_weights as number[]) : undefined,
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
    if (!isSupabaseConfigured) {
      const now = new Date().toISOString();
      setExams(Array.from({ length: 8 }, (_, index): OmrExam => ({
        id: `preview-exam-${index + 1}`,
        courseId,
        title: `اختبار ${index + 1}`,
        questionCount: 20,
        choiceCount: 4,
        targetComponent: "exam1",
        maxScore: 20,
        answerKey: new Array(20).fill(-1),
        studentIdDigits: 10,
        idMode: "written",
        createdAt: now,
        updatedAt: now,
      })));
      setLoading(false);
      return;
    }
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
    sections?: OmrSection[];
    version?: string;
    idMode?: "bubbles" | "written";
  }): Promise<string> => {
    if (!user || !courseId) return "";
    if (!isSupabaseConfigured) {
      const id = `preview-exam-${Date.now()}`;
      const now = new Date().toISOString();
      setExams((current) => [...current, {
        id,
        courseId,
        title: input.title,
        questionCount: input.questionCount,
        choiceCount: input.choiceCount,
        targetComponent: input.targetComponent,
        maxScore: input.maxScore,
        answerKey: new Array(input.questionCount).fill(-1),
        studentIdDigits: input.studentIdDigits,
        sections: input.sections,
        version: input.version,
        idMode: input.idMode || "bubbles",
        createdAt: now,
        updatedAt: now,
      }]);
      return id;
    }
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
      sections: input.sections && input.sections.length > 1 ? input.sections : null,
      version: input.version || null,
      id_mode: input.idMode || "bubbles",
    }).select().single();
    if (error || !data) { console.error("Error adding omr exam:", error); return ""; }
    await fetchExams();
    return data.id;
  }, [user, courseId, fetchExams]);

  const updateExam = useCallback(async (examId: string, updates: {
    title?: string; maxScore?: number; targetComponent?: string; version?: string;
  }) => {
    if (!isSupabaseConfigured) {
      setExams((current) => current.map((exam) => exam.id === examId ? {
        ...exam,
        ...updates,
        updatedAt: new Date().toISOString(),
      } : exam));
      return;
    }
    const u: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) u.title = updates.title;
    if (updates.maxScore !== undefined) u.max_score = updates.maxScore;
    if (updates.targetComponent !== undefined) u.target_component = updates.targetComponent;
    if (updates.version !== undefined) u.version = updates.version || null;
    const { error } = await db.from("omr_exams").update(u).eq("id", examId);
    if (error) console.error("Error updating omr exam:", error);
    else await fetchExams();
  }, [fetchExams]);

  const updateAnswerKey = useCallback(async (examId: string, answerKey: number[], weights?: number[] | null) => {
    if (!isSupabaseConfigured) {
      setExams((current) => current.map((exam) => exam.id === examId ? {
        ...exam,
        answerKey,
        questionWeights: weights || undefined,
        maxScore: weights ? Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100 : exam.maxScore,
        updatedAt: new Date().toISOString(),
      } : exam));
      return;
    }
    const u: any = { answer_key: answerKey, updated_at: new Date().toISOString() };
    if (weights !== undefined) {
      u.question_weights = weights;
      // keep maxScore consistent with the weight total
      if (weights) u.max_score = Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100;
    }
    const { error } = await db.from("omr_exams")
      .update(u)
      .eq("id", examId);
    if (error) console.error("Error updating answer key:", error);
    else await fetchExams();
  }, [fetchExams]);

  const deleteExam = useCallback(async (examId: string) => {
    if (!isSupabaseConfigured) {
      setExams((current) => current.filter((exam) => exam.id !== examId));
      return;
    }
    const { error } = await db.from("omr_exams").delete().eq("id", examId);
    if (error) console.error("Error deleting omr exam:", error);
    else await fetchExams();
  }, [fetchExams]);

  return { exams, loading, addExam, updateExam, updateAnswerKey, deleteExam, refetch: fetchExams };
}
