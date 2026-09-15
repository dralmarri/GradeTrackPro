-- omr_questions.course_id still carried its original constraint from
-- before question banks existed independently of a course: NOT NULL with
-- ON DELETE CASCADE. That meant deleting a course silently deleted every
-- question row that still pointed at it via course_id — even though a
-- question's real lifetime is now owned by its bank_id (which other
-- courses may still be linked to), wiping out a shared bank entirely
-- whenever the course that happened to create its questions was deleted.
--
-- course_id is now purely informational (which course originally added a
-- question) — bank_id is the real, durable link — so deleting a course
-- must no longer cascade-delete questions.
alter table public.omr_questions drop constraint if exists omr_questions_course_id_fkey;
alter table public.omr_questions alter column course_id drop not null;
alter table public.omr_questions add constraint omr_questions_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete set null;
