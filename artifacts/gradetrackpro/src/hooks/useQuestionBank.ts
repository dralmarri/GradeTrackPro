import { useState, useCallback, useEffect } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BankQuestion, Difficulty } from "@/types/questionBank";

// any-typed client: omr_questions isn't in the generated types yet (v2 branch)
const db = supabase as any;

const PREVIEW_QUESTION_DATA: Omit<BankQuestion, "id" | "courseId" | "createdAt">[] = [
  { text: "ما المعادلة المحاسبية الصحيحة؟", choices: ["الأصول = الخصوم + حقوق الملكية", "الأصول = الإيرادات + المصروفات", "الخصوم = الأصول + الإيرادات", "حقوق الملكية = الأصول + المصروفات"], correct: 0, topic: "المعادلة المحاسبية", difficulty: "easy", points: 1 },
  { text: "أي حساب يزداد عادةً في الطرف المدين؟", choices: ["الإيرادات", "الأصول", "الخصوم", "حقوق الملكية"], correct: 1, topic: "القيود اليومية", difficulty: "easy", points: 1 },
  { text: "متى تُثبت الإيرادات في أساس الاستحقاق؟", choices: ["عند تحصيل النقد فقط", "عند دفع المصروفات", "عند تحققها واكتسابها", "في نهاية السنة فقط"], correct: 2, topic: "أساس الاستحقاق", difficulty: "medium", points: 1 },
  { text: "ما الغرض الأساسي من ميزان المراجعة؟", choices: ["حساب الضريبة", "التأكد من تساوي المدين والدائن", "تحديد سعر البيع", "إعداد كشف الرواتب"], correct: 1, topic: "ميزان المراجعة", difficulty: "easy", points: 1 },
  { text: "أي قائمة مالية تُظهر الأصول والخصوم وحقوق الملكية؟", choices: ["قائمة الدخل", "قائمة التدفقات النقدية", "الميزانية العمومية", "قائمة التغيرات في المخزون"], correct: 2, topic: "القوائم المالية", difficulty: "easy", points: 1 },
  { text: "الإهلاك يُعد عادةً:", choices: ["إيرادًا نقديًا", "مصروفًا غير نقدي", "التزامًا متداولًا", "أصلًا متداولًا"], correct: 1, topic: "الأصول الثابتة", difficulty: "medium", points: 1 },
  { text: "أي مما يلي يُعد أصلًا متداولًا؟", choices: ["المباني", "براءة الاختراع", "النقدية", "رأس المال"], correct: 2, topic: "تصنيف الحسابات", difficulty: "easy", points: 1 },
  { text: "المصروف المستحق هو مصروف:", choices: ["دُفع مقدمًا ولم يُستخدم", "تحقق ولم يُدفع بعد", "أُلغي قبل حدوثه", "لا يؤثر في صافي الدخل"], correct: 1, topic: "التسويات", difficulty: "medium", points: 1 },
  { text: "مجمل الربح يساوي:", choices: ["المبيعات - تكلفة المبيعات", "المبيعات + المصروفات", "الأصول - الخصوم", "النقدية - المشتريات"], correct: 0, topic: "قائمة الدخل", difficulty: "easy", points: 1 },
  { text: "الحساب الذي يمثل مبلغًا مستحقًا للموردين هو:", choices: ["العملاء", "المخزون", "الدائنون", "المصروفات المقدمة"], correct: 2, topic: "الخصوم", difficulty: "easy", points: 1 },
  { text: "عند شراء معدات نقدًا، فإن الأثر هو:", choices: ["زيادة المعدات ونقص النقدية", "نقص المعدات وزيادة النقدية", "زيادة الإيرادات", "زيادة المصروفات فقط"], correct: 0, topic: "القيود اليومية", difficulty: "medium", points: 1 },
  { text: "إذا زادت المصروفات مع ثبات الإيرادات فإن صافي الربح:", choices: ["يزداد", "ينخفض", "لا يتغير", "يتحول إلى أصل"], correct: 1, topic: "قائمة الدخل", difficulty: "easy", points: 1 },
];

const previewStorageKey = (courseId: string) => `gtp_preview_question_bank:${courseId}`;

function getPreviewQuestions(courseId: string): BankQuestion[] {
  try {
    const saved = localStorage.getItem(previewStorageKey(courseId));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed as BankQuestion[];
    }
  } catch {
    // Use the starter set when local storage is unavailable.
  }
  const createdAt = new Date().toISOString();
  const seeded = PREVIEW_QUESTION_DATA.map((question, index) => ({
    ...question,
    id: `preview-question-${index + 1}`,
    courseId,
    createdAt,
  }));
  try { localStorage.setItem(previewStorageKey(courseId), JSON.stringify(seeded)); } catch { /* storage is optional */ }
  return seeded;
}

function savePreviewQuestions(courseId: string, questions: BankQuestion[]) {
  try { localStorage.setItem(previewStorageKey(courseId), JSON.stringify(questions)); } catch { /* storage is optional */ }
}

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
    if (!isSupabaseConfigured) {
      setQuestions(getPreviewQuestions(courseId));
      setLoading(false);
      return;
    }
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
    text: string; choices: string[]; correct: number; chapter?: string; topic?: string; difficulty?: Difficulty; points?: number;
  }): Promise<boolean> => {
    if (!user || !courseId) return false;
    if (!isSupabaseConfigured) {
      setQuestions((current) => {
        const next = [...current, {
          id: `preview-question-${Date.now()}-${current.length}`,
          courseId,
          text: input.text,
          choices: input.choices,
          correct: input.correct,
          chapter: input.chapter,
          topic: input.topic,
          difficulty: input.difficulty,
          points: input.points ?? 1,
          createdAt: new Date().toISOString(),
        }];
        savePreviewQuestions(courseId, next);
        return next;
      });
      return true;
    }
    let { error } = await db.from("omr_questions").insert({
      user_id: user.id,
      course_id: courseId,
      text: input.text,
      choices: input.choices,
      correct: input.correct,
      chapter: input.chapter || null,
      topic: input.topic || null,
      difficulty: input.difficulty || null,
      points: input.points ?? 1,
    });
    if (error && /points/.test(error.message || "")) {
      const { points: _p, ...rest } = {
        user_id: user.id, course_id: courseId, text: input.text, choices: input.choices,
        correct: input.correct, chapter: input.chapter || null, topic: input.topic || null,
        difficulty: input.difficulty || null, points: input.points ?? 1,
      };
      ({ error } = await db.from("omr_questions").insert(rest));
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
    if (!isSupabaseConfigured) {
      const createdAt = new Date().toISOString();
      setQuestions((current) => {
        const next = [
          ...current,
          ...items.map((question, index) => ({
            id: `preview-question-${Date.now()}-${current.length + index}`,
            courseId,
            ...question,
            points: question.points ?? 1,
            createdAt,
          })),
        ];
        savePreviewQuestions(courseId, next);
        return next;
      });
      return items.length;
    }
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
    if (!isSupabaseConfigured) {
      setQuestions((current) => {
        const next = current.filter((question) => question.id !== id);
        savePreviewQuestions(courseId!, next);
        return next;
      });
      return;
    }
    const { error } = await db.from("omr_questions").delete().eq("id", id);
    if (error) console.error("Error deleting question:", error);
    else await fetchQuestions();
  }, [fetchQuestions]);

  const deleteQuestions = useCallback(async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return true;
    if (!isSupabaseConfigured) {
      const idSet = new Set(ids);
      setQuestions((current) => {
        const next = current.filter((question) => !idSet.has(question.id));
        savePreviewQuestions(courseId!, next);
        return next;
      });
      return true;
    }
    const { error } = await db.from("omr_questions").delete().in("id", ids);
    if (error) { console.error("Error deleting questions:", error); return false; }
    await fetchQuestions();
    return true;
  }, [fetchQuestions]);

  return { questions, loading, addQuestion, addQuestions, deleteQuestion, deleteQuestions, refetch: fetchQuestions };
}
