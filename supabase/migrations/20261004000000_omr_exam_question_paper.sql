-- The question paper's own content (text/choices/points, per the shuffled
-- order printed on that form) was only ever held in memory right after
-- generation — GenerateExamPanel's local `generated` state — never
-- persisted. Reprinting it later from the exam's own history list ("نماذج
-- اختبارات سابقة") was therefore impossible; only the OMR bubble answer
-- sheet (built from answer_key/choice_count alone) could be reprinted.
alter table public.omr_exams add column if not exists question_paper jsonb;
