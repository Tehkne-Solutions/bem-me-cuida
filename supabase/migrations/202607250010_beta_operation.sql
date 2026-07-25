begin;

create table public.beta_tester_enrollments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused')),
  app_version text not null check (length(app_version) between 1 and 40),
  app_variant text not null check (length(app_variant) between 1 and 40),
  platform text not null check (length(platform) between 1 and 80),
  enrolled_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger beta_tester_enrollments_updated_at
before update on public.beta_tester_enrollments
for each row execute function public.set_updated_at();

alter table public.beta_tester_enrollments enable row level security;

create policy "beta_tester_enrollments_select_own"
on public.beta_tester_enrollments for select to authenticated
using ((select auth.uid()) = user_id);

create policy "beta_tester_enrollments_insert_own"
on public.beta_tester_enrollments for insert to authenticated
with check ((select auth.uid()) = user_id and status in ('active','paused'));

create policy "beta_tester_enrollments_update_own"
on public.beta_tester_enrollments for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status in ('active','paused'));

revoke delete on public.beta_tester_enrollments from authenticated;

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','usability','accessibility','performance','idea','other')),
  impact text not null check (impact in ('low','medium','high','blocking')),
  message text not null check (length(message) between 20 and 2000),
  reproduction_steps text check (reproduction_steps is null or length(reproduction_steps) <= 2000),
  include_diagnostics boolean not null default false,
  diagnostic_snapshot jsonb check (diagnostic_snapshot is null or jsonb_typeof(diagnostic_snapshot) = 'object'),
  technical_events jsonb not null default '[]'::jsonb check (jsonb_typeof(technical_events) = 'array'),
  app_version text not null check (length(app_version) between 1 and 40),
  app_variant text not null check (length(app_variant) between 1 and 40),
  platform text not null check (length(platform) between 1 and 80),
  status text not null default 'received' check (status in ('received','triaged','planned','resolved','closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index beta_feedback_user_created_at
on public.beta_feedback(user_id, created_at desc);

create trigger beta_feedback_updated_at
before update on public.beta_feedback
for each row execute function public.set_updated_at();

alter table public.beta_feedback enable row level security;

create policy "beta_feedback_select_own"
on public.beta_feedback for select to authenticated
using ((select auth.uid()) = user_id);

create policy "beta_feedback_insert_own"
on public.beta_feedback for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and status = 'received'
  and jsonb_array_length(technical_events) <= 100
);

revoke update, delete on public.beta_feedback from authenticated;

commit;
