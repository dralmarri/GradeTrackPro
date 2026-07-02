-- v2: scan archive — stores each graded sheet photo + result for later review
CREATE TABLE IF NOT EXISTS public.omr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.omr_exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  student_name text,
  student_number text,
  score numeric NOT NULL DEFAULT 0,
  raw_correct integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scans select"
  ON public.omr_scans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own scans insert"
  ON public.omr_scans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own scans delete"
  ON public.omr_scans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS omr_scans_exam_idx ON public.omr_scans(exam_id);

-- private storage bucket for sheet photos; each user writes under his own folder
INSERT INTO storage.buckets (id, name, public)
VALUES ('scans', 'scans', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "scan images select own"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scan images insert own"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "scan images delete own"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
