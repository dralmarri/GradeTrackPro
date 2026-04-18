
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_homework numeric DEFAULT 10;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS homework numeric DEFAULT 0;
