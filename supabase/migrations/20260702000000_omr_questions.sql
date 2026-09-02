-- v2: question bank for auto-generated exams
CREATE TABLE IF NOT EXISTS public.omr_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  text text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct integer NOT NULL DEFAULT 0,
  topic text,
  difficulty text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omr_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own questions select"
  ON public.omr_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own questions insert"
  ON public.omr_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own questions update"
  ON public.omr_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own questions delete"
  ON public.omr_questions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS omr_questions_course_idx ON public.omr_questions(course_id);
