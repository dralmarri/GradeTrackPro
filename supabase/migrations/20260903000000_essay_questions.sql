-- Essay ("مقالي") question support: a question type with no bubbled
-- choices, printed with a blank writing area and graded manually.
alter table public.omr_questions add column if not exists kind text not null default 'choice';

-- Per-exam essay question list (text + point weight), separate from the
-- bubble-graded answerKey/questionCount/questionWeights.
alter table public.omr_exams add column if not exists essay_questions jsonb;

-- Manually-entered essay scores recorded alongside each archived scan.
alter table public.omr_scans add column if not exists essay_scores jsonb;
