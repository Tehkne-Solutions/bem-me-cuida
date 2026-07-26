begin;

create table public.store_submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.release_candidates(id) on delete cascade,
  build_id uuid not null references public.release_builds(id) on delete restrict,
  store text not null check (store in ('google_play','app_store')),
  track text not null check (track in ('internal','closed','open','production','testflight')),
  status text not null default 'draft' check (status in ('draft','uploaded','in_review','approved','rejected','published','withdrawn')),
  external_reference text check (external_reference is null or length(external_reference) <= 240),
  notes text check (notes is null or length(notes) <= 2000),
  submitted_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(candidate_id, store, track)
);

create trigger store_submissions_updated_at
before update on public.store_submissions
for each row execute function public.set_updated_at();

create table public.production_rollouts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.release_candidates(id) on delete cascade,
  submission_id uuid not null references public.store_submissions(id) on delete restrict,
  store text not null check (store in ('google_play','app_store')),
  track text not null check (track in ('closed','open','production','testflight')),
  target_percent integer not null default 1 check (target_percent between 1 and 100),
  status text not null default 'active' check (status in ('active','paused','completed','rolled_back')),
  notes text check (notes is null or length(notes) <= 2000),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  rolled_back_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default timezone('utc', now()),
  unique(candidate_id, store, track)
);

create trigger production_rollouts_updated_at
before update on public.production_rollouts
for each row execute function public.set_updated_at();

create table public.production_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  rollout_id uuid not null references public.production_rollouts(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  source text not null default 'aggregated' check (source in ('aggregated','manual_review')),
  crash_free_sessions_pct numeric(5,2) not null check (crash_free_sessions_pct between 0 and 100),
  sync_success_pct numeric(5,2) not null check (sync_success_pct between 0 and 100),
  auth_success_pct numeric(5,2) not null check (auth_success_pct between 0 and 100),
  notification_success_pct numeric(5,2) check (notification_success_pct is null or notification_success_pct between 0 and 100),
  support_ticket_count integer not null default 0 check (support_ticket_count >= 0),
  blocker_count integer not null default 0 check (blocker_count >= 0),
  sampled_sessions integer not null default 0 check (sampled_sessions >= 0),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (window_end > window_start)
);

create table public.production_incidents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.release_candidates(id) on delete cascade,
  rollout_id uuid references public.production_rollouts(id) on delete set null,
  severity text not null check (severity in ('sev1','sev2','sev3','sev4')),
  status text not null default 'open' check (status in ('open','monitoring','resolved')),
  title text not null check (length(title) between 5 and 160),
  summary text not null check (length(summary) between 10 and 2000),
  technical_impact text check (technical_impact is null or length(technical_impact) <= 2000),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger production_incidents_updated_at
before update on public.production_incidents
for each row execute function public.set_updated_at();

create table public.production_incident_updates (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.production_incidents(id) on delete cascade,
  status text not null check (status in ('open','monitoring','resolved')),
  message text not null check (length(message) between 5 and 2000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index store_submissions_candidate_status on public.store_submissions(candidate_id, status);
create index production_rollouts_status_updated on public.production_rollouts(status, updated_at desc);
create index production_health_rollout_created on public.production_health_snapshots(rollout_id, created_at desc);
create index production_incidents_status_severity on public.production_incidents(status, severity, started_at desc);
create index production_incident_updates_incident on public.production_incident_updates(incident_id, created_at desc);

alter table public.store_submissions enable row level security;
alter table public.production_rollouts enable row level security;
alter table public.production_health_snapshots enable row level security;
alter table public.production_incidents enable row level security;
alter table public.production_incident_updates enable row level security;

create policy "store_submissions_operator_select"
on public.store_submissions for select to authenticated
using (public.is_release_operator());

create policy "production_rollouts_operator_select"
on public.production_rollouts for select to authenticated
using (public.is_release_operator());

create policy "production_health_operator_select"
on public.production_health_snapshots for select to authenticated
using (public.is_release_operator());

create policy "production_incidents_operator_select"
on public.production_incidents for select to authenticated
using (public.is_release_operator());

create policy "production_incident_updates_operator_select"
on public.production_incident_updates for select to authenticated
using (public.is_release_operator());

revoke insert, update, delete on public.store_submissions from authenticated;
revoke insert, update, delete on public.production_rollouts from authenticated;
revoke insert, update, delete on public.production_health_snapshots from authenticated;
revoke insert, update, delete on public.production_incidents from authenticated;
revoke insert, update, delete on public.production_incident_updates from authenticated;

commit;
