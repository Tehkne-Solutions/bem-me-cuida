begin;

create or replace function public.is_release_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'release_admin',
    false
  );
$$;

revoke all on function public.is_release_admin() from public;
grant execute on function public.is_release_admin() to authenticated;

alter table public.operator_audit_log
  add column retention_hold_until timestamptz;

alter table public.production_health_snapshots
  add column retention_hold_until timestamptz;

alter table public.production_incidents
  add column legal_hold boolean not null default false;

create table public.maintenance_hotfixes (
  id uuid primary key default gen_random_uuid(),
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9.-]+)?$'),
  kind text not null check (kind in ('ota','binary')),
  severity text not null check (severity in ('critical','high','medium','low')),
  title text not null check (length(title) between 5 and 160),
  summary text not null check (length(summary) between 10 and 2000),
  target_runtime_version text not null check (length(target_runtime_version) between 1 and 80),
  target_channel text not null default 'production' check (target_channel in ('production','hotfix-validation')),
  source_commit text not null check (source_commit ~ '^[A-Fa-f0-9]{7,40}$'),
  native_changes boolean not null default false,
  requires_binary boolean not null default false,
  status text not null default 'draft' check (status in (
    'draft','awaiting_approval','approved','building','ready','deployed','rolled_back','cancelled'
  )),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz,
  deployed_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(version, kind, target_channel),
  check (kind = 'binary' or (native_changes = false and requires_binary = false))
);

create trigger maintenance_hotfixes_updated_at
before update on public.maintenance_hotfixes
for each row execute function public.set_updated_at();

create table public.operation_approvals (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('hotfix','ota_update','retention_run')),
  entity_id uuid not null,
  decision text not null check (decision in ('approved','rejected')),
  comment text check (comment is null or length(comment) <= 2000),
  decided_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique(entity_type, entity_id, decided_by)
);

create table public.hotfix_artifacts (
  id uuid primary key default gen_random_uuid(),
  hotfix_id uuid not null references public.maintenance_hotfixes(id) on delete cascade,
  platform text not null check (platform in ('android','ios')),
  build_number text not null check (length(build_number) between 1 and 80),
  artifact_url text not null check (artifact_url ~ '^https://'),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  status text not null default 'available' check (status in ('available','revoked','deployed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(hotfix_id, platform, build_number)
);

create trigger hotfix_artifacts_updated_at
before update on public.hotfix_artifacts
for each row execute function public.set_updated_at();

create table public.ota_update_plans (
  id uuid primary key default gen_random_uuid(),
  hotfix_id uuid not null unique references public.maintenance_hotfixes(id) on delete cascade,
  channel text not null default 'production' check (channel in ('production','hotfix-validation')),
  runtime_version text not null check (length(runtime_version) between 1 and 80),
  message text not null check (length(message) between 5 and 240),
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  asset_count integer not null check (asset_count between 1 and 5000),
  rollout_percentage integer not null default 5 check (rollout_percentage between 1 and 100),
  update_group_id text check (update_group_id is null or length(update_group_id) between 8 and 120),
  status text not null default 'draft' check (status in ('draft','approved','published','rolled_back','cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger ota_update_plans_updated_at
before update on public.ota_update_plans
for each row execute function public.set_updated_at();

create table public.operations_retention_runs (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null check (length(policy_version) between 1 and 40),
  dry_run boolean not null default true,
  health_cutoff timestamptz not null,
  audit_cutoff timestamptz not null,
  incident_update_cutoff timestamptz not null,
  eligible_health_count integer not null default 0 check (eligible_health_count >= 0),
  eligible_audit_count integer not null default 0 check (eligible_audit_count >= 0),
  eligible_incident_update_count integer not null default 0 check (eligible_incident_update_count >= 0),
  deleted_health_count integer not null default 0 check (deleted_health_count >= 0),
  deleted_audit_count integer not null default 0 check (deleted_audit_count >= 0),
  deleted_incident_update_count integer not null default 0 check (deleted_incident_update_count >= 0),
  status text not null default 'planned' check (status in ('planned','completed','failed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index maintenance_hotfixes_status_updated on public.maintenance_hotfixes(status, updated_at desc);
create index operation_approvals_entity on public.operation_approvals(entity_type, entity_id, created_at desc);
create index hotfix_artifacts_hotfix_status on public.hotfix_artifacts(hotfix_id, status);
create index ota_update_plans_status_updated on public.ota_update_plans(status, updated_at desc);
create index operations_retention_runs_created on public.operations_retention_runs(created_at desc);
create index operator_audit_log_retention on public.operator_audit_log(created_at, retention_hold_until);
create index production_health_retention on public.production_health_snapshots(created_at, retention_hold_until);

alter table public.maintenance_hotfixes enable row level security;
alter table public.operation_approvals enable row level security;
alter table public.hotfix_artifacts enable row level security;
alter table public.ota_update_plans enable row level security;
alter table public.operations_retention_runs enable row level security;

create policy "maintenance_hotfixes_operator_select"
on public.maintenance_hotfixes for select to authenticated
using (public.is_release_operator());

create policy "operation_approvals_operator_select"
on public.operation_approvals for select to authenticated
using (public.is_release_operator());

create policy "hotfix_artifacts_operator_select"
on public.hotfix_artifacts for select to authenticated
using (public.is_release_operator());

create policy "ota_update_plans_operator_select"
on public.ota_update_plans for select to authenticated
using (public.is_release_operator());

create policy "operations_retention_runs_operator_select"
on public.operations_retention_runs for select to authenticated
using (public.is_release_operator());

grant select on public.maintenance_hotfixes to authenticated;
grant select on public.operation_approvals to authenticated;
grant select on public.hotfix_artifacts to authenticated;
grant select on public.ota_update_plans to authenticated;
grant select on public.operations_retention_runs to authenticated;

revoke insert, update, delete on public.maintenance_hotfixes from authenticated;
revoke insert, update, delete on public.operation_approvals from authenticated;
revoke insert, update, delete on public.hotfix_artifacts from authenticated;
revoke insert, update, delete on public.ota_update_plans from authenticated;
revoke insert, update, delete on public.operations_retention_runs from authenticated;

commit;
