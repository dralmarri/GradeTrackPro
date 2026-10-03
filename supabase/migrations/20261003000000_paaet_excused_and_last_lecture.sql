-- Supports the attendance-import "catch-up" feature: when a PAAET report
-- is imported for a lecture and the cumulative absence count jumped by more
-- than one lecture's worth, we need to know (a) which lectures the student
-- was already excused for (so they're never auto-marked absent), and (b)
-- the last lecture index this student's PAAET count was reconciled up to
-- (so we know which lectures, if any, are still unaccounted for).
alter table public.students add column if not exists excused jsonb default '[]'::jsonb;
alter table public.students add column if not exists paaet_last_lecture_index integer;
