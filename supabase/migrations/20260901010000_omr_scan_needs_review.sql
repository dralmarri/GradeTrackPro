-- Persist whether an archived scan still has unresolved flagged questions
-- (blank / double-marked / crossed-out) so professors can find sheets that
-- need a second look after grading, instead of losing that signal once the
-- scan dialog closes.
alter table public.omr_scans
  add column if not exists needs_review boolean not null default false;
alter table public.omr_scans
  add column if not exists review_count integer not null default 0;
