-- v2: OMR (bubble-sheet) exams table
CREATE TABLE IF NOT EXISTS public.omr_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  question_count integer NOT NULL DEFAULT 20,
  choice_count integer NOT NULL DEFAULT 4,
  target_component text NOT NULL DEFAULT 'exam1',
  max_score numeric NOT NULL DEFAULT 20,
  answer_key jsonb NOT NULL DEFAULT '[]'::jsonb,
  student_id_digits integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omr_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own omr exams select"
  ON public.omr_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams insert"
  ON public.omr_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams update"
  ON public.omr_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams delete"
  ON public.omr_exams FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS omr_exams_course_idx ON public.omr_exams(course_id);
