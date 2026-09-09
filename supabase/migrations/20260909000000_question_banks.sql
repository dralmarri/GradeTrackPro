-- Independent, account-owned question banks — decoupled from any single
-- course *instance*. A "course" row represents one semester's offering
-- (it has its own semester_start/semester_end), so re-creating it next term
-- used to mean the question bank (implicitly tied to course_id) had to be
-- rebuilt from scratch too. Now a bank is its own named entity the user
-- links to whichever course row represents "this course, this semester",
-- and it survives across semesters explicitly instead of relying on an
-- exact course-name string match.
create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.question_banks enable row level security;

drop policy if exists "question_banks_owner" on public.question_banks;
create policy "question_banks_owner" on public.question_banks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.courses add column if not exists bank_id uuid references public.question_banks(id) on delete set null;
alter table public.omr_questions add column if not exists bank_id uuid references public.question_banks(id) on delete set null;

-- One-time backfill (idempotent — only touches rows with bank_id still
-- null): gives every existing course a bank, grouped by exact trimmed name
-- per user — matching the old sibling-section sharing behaviour — and
-- points every existing question at its course's new bank, so no existing
-- question bank is lost by introducing this table.
do $$
declare
  r record;
  new_bank_id uuid;
begin
  for r in
    select distinct user_id, trim(name) as cname
    from public.courses
    where bank_id is null and trim(name) <> ''
  loop
    insert into public.question_banks (user_id, name) values (r.user_id, r.cname)
    returning id into new_bank_id;

    update public.courses
      set bank_id = new_bank_id
      where user_id = r.user_id and trim(name) = r.cname and bank_id is null;

    update public.omr_questions
      set bank_id = new_bank_id
      where bank_id is null and course_id in (
        select id from public.courses where user_id = r.user_id and trim(name) = r.cname
      );
  end loop;
end $$;
