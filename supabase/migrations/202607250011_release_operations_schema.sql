begin;

create or replace function public.is_release_operator()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('release_operator', 'release_admin'),
    false
  );
$$;

revoke all on function public.is_release_operator() from public;
grant execute on function public.is_release_operator() to authenticated;

create table public.release_candidates (
  id uuid primary key default gen_random_uuid(),
  version text not null check (length(version) between 1 and 40),
  rc_number integer not null check (rc_number between 1 and 999),
  title text not null check (length(title) between 3 and 160),
  channel text not null default 'rc' check (channel in ('rc','production')),
  status text not null default 'draft' check (status in ('draft','qa','blocked','approved','promoted','rolled_back')),
  notes text check (notes is null or length(notes) <= 2000),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  promoted_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(version, rc_number)
);

create trigger release_candidates_updated_at
before update on public.release_candidates
for each row execute function public.set_updated_at();

create table public.release_gates (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.release_candidates(id) on delete cascade,
  gate_key text not null check (length(gate_key) between 2 and 80),
  label text not null check (length(label) between 3 and 160),
  required boolean not null default true,
  status text not null default 'pending' check (status in ('pending','passed','failed','waived')),
  evidence text check (evidence is null or length(evidence) <= 2000),
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(candidate_id, gate_key)
);

create trigger release_gates_updated_at
before update on public.release_gates
for each row execute function public.set_updated_at();

create table public.release_builds (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.release_candidates(id) on delete cascade,
  platform text not null check (platform in ('android','ios')),
  build_profile text not null check (length(build_profile) between 2 and 80),
  build_number text not null check (length(build_number) between 1 and 80),
  artifact_url text not null check (length(artifact_url) between 10 and 1000),
  artifact_sha256 text check (artifact_sha256 is null or artifact_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  audience text not null default 'internal' check (audience in ('internal','closed_beta','store')),
  status text not null default 'available' check (status in ('pending','available','revoked')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(candidate_id, platform, build_number)
);

create trigger release_builds_updated_at
before update on public.release_builds
for each row execute function public.set_updated_at();

create table public.operator_audit_log (
  id bigint generated always as identity primary key,
  operator_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (length(action) between 2 and 120),
  entity_type text not null check (length(entity_type) between 2 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.beta_feedback
  add column priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  add column operator_notes text check (operator_notes is null or length(operator_notes) <= 2000),
  add column assigned_to uuid references auth.users(id) on delete set null,
  add column candidate_id uuid references public.release_candidates(id) on delete set null;

create index release_candidates_status_updated_at on public.release_candidates(status, updated_at desc);
create index release_gates_candidate_status on public.release_gates(candidate_id, status);
create index release_builds_candidate_status on public.release_builds(candidate_id, status);
create index operator_audit_log_created_at on public.operator_audit_log(created_at desc);
create index beta_feedback_operator_queue on public.beta_feedback(status, priority, created_at desc);
create index beta_feedback_candidate on public.beta_feedback(candidate_id, status, impact);

alter table public.release_candidates enable row level security;
alter table public.release_gates enable row level security;
alter table public.release_builds enable row level security;
alter table public.operator_audit_log enable row level security;

create policy "release_candidates_operator_select"
on public.release_candidates for select to authenticated
using (public.is_release_operator());

create policy "release_gates_operator_select"
on public.release_gates for select to authenticated
using (public.is_release_operator());

create policy "release_builds_operator_select"
on public.release_builds for select to authenticated
using (public.is_release_operator());

create policy "operator_audit_log_operator_select"
on public.operator_audit_log for select to authenticated
using (public.is_release_operator());

create policy "beta_feedback_operator_select"
on public.beta_feedback for select to authenticated
using (public.is_release_operator());

create policy "beta_testers_operator_select"
on public.beta_tester_enrollments for select to authenticated
using (public.is_release_operator());

grant select on public.release_candidates to authenticated;
grant select on public.release_gates to authenticated;
grant select on public.release_builds to authenticated;
grant select on public.operator_audit_log to authenticated;

revoke insert, update, delete on public.release_candidates from authenticated;
revoke insert, update, delete on public.release_gates from authenticated;
revoke insert, update, delete on public.release_builds from authenticated;
revoke insert, update, delete on public.operator_audit_log from authenticated;

commit;
