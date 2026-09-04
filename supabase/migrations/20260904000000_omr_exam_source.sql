-- Distinguishes exams generated from the question bank ("bank") from the
-- answer-sheet-only flow for a paper exam the professor already has
-- ("manual") — lets the exams list split into "نماذج اختبارات سابقة" vs
-- "نماذج أوراق اجابة سابقة".
alter table public.omr_exams add column if not exists source text;
