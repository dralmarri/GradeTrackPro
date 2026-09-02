-- وزن السؤال بالدرجات (الافتراضي 1)
alter table public.omr_questions add column if not exists points numeric not null default 1;
