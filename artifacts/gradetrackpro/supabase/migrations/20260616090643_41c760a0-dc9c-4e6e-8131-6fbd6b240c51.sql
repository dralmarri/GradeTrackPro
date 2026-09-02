ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS bonus_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_components jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS custom_scores jsonb NOT NULL DEFAULT '{}'::jsonb;