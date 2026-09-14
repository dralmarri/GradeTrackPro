-- Tracks the last cumulative absence total reported by the college system
-- (PAAET) per student, so importing that week's report can tell whether a
-- NEW absence happened (count increased since last import) without the
-- file ever naming which lecture date it belongs to.
alter table public.students add column if not exists paaet_absence_count integer;
