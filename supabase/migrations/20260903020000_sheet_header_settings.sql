-- One row per professor: the answer-sheet header (institution/college/
-- department/logo) is entered once and reused across every exam and every
-- device signed into their account, instead of living in localStorage.
create table if not exists public.sheet_header_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  institution text,
  college text,
  department text,
  logo_data_url text,
  updated_at timestamptz not null default now()
);

alter table public.sheet_header_settings enable row level security;

create policy "Users manage own sheet header select"
  on public.sheet_header_settings for select using (auth.uid() = user_id);
create policy "Users manage own sheet header insert"
  on public.sheet_header_settings for insert with check (auth.uid() = user_id);
create policy "Users manage own sheet header update"
  on public.sheet_header_settings for update using (auth.uid() = user_id);
