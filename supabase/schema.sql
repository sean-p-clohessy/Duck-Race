-- Run once in a new Supabase project, followed by categories.sql and policies.sql.
begin;
create table public.learners (
 id uuid primary key default gen_random_uuid(),
 first_name text not null check (char_length(btrim(first_name)) between 1 and 50),
 surname_initial text not null check (surname_initial ~ '^[A-Z]$'),
 course_or_group text not null check (char_length(btrim(course_or_group)) between 1 and 80),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.staff (
 id uuid primary key references auth.users(id) on delete restrict,
 name text not null,
 email text not null,
 role text not null default 'staff' check(role in ('staff','admin')),
 active boolean not null default true
);
create table public.award_categories (
 id text primary key, name text not null, description text not null, active boolean not null default true
);
create table public.duck_awards (
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null references public.learners(id) on delete restrict,
 staff_id uuid not null default auth.uid() references public.staff(id) on delete restrict,
 category text not null references public.award_categories(id) on delete restrict,
 public_message text check(char_length(public_message)<=100),
 awarded_at timestamptz not null default now() check(awarded_at<=now()),
 created_at timestamptz not null default now()
);
create index duck_awards_learner_date on public.duck_awards(learner_id,awarded_at desc);
create index duck_awards_date on public.duck_awards(awarded_at desc);
alter table public.learners enable row level security;
alter table public.staff enable row level security;
alter table public.duck_awards enable row level security;
alter table public.award_categories enable row level security;
-- Locked down even before policies.sql has been run.
revoke all on public.learners, public.staff, public.duck_awards, public.award_categories from anon, authenticated;
commit;
