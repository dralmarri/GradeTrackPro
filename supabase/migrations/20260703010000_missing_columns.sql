-- Consolidated schema catch-up: columns the app writes that earlier
-- migration files never added (they were applied manually in SQL Editor).
-- Safe to re-run: all guarded with IF NOT EXISTS.

alter table public.omr_exams add column if not exists sections jsonb;
alter table public.omr_exams add column if not exists version text;
alter table public.omr_exams add column if not exists id_mode text not null default 'bubbles';
alter table public.omr_exams add column if not exists question_weights jsonb;

alter table public.omr_questions add column if not exists chapter text;
alter table public.omr_questions add column if not exists points numeric not null default 1;

alter table public.students add column if not exists student_number text;
