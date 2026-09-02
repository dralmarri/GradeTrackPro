-- Per-student, per-lecture free-text notes, mirroring the lecture_bonus
-- array-per-lecture-index pattern already used for attendance bonus points.
alter table public.students
  add column if not exists lecture_notes jsonb not null default '[]'::jsonb;
