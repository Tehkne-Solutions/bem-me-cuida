begin;

create table public.product_slos (
  id uuid primary key default gen_random_uuid(),
  service_key text not null check (service_key ~ '^[a-z0-9_]{2,80}$'),
  name text not null check (length(name) between 3 and 160),
  description text check (description is null or length(description) <= 1000),
  objective_pct numeric(6,3) not null check (objective_pct > 0 and objective_pct < 100),
  evaluation_window_days integer not null default 30 check (evaluation_window_days between 1 and 90),
  warning_burn_rate numeric(8,3) not null default 1 check (warning_burn_rate > 0),
  critical_burn_rate numeric(8,3) not null default 2 check (critical_burn_rate > warning_burn_rate),
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(service_key)
);

create trigger product_slos_updated_at
before update on public.product_slos
for each row execute function public.set_updated_at();

create table public.slo_measurements (
  id uuid primary key default gen_random_uuid(),
  slo_id uuid not null references public.product_slos(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  good_events bigint not null check (good_events >= 0),
  total_events bigint not null check (total_events > 0 and good_events <= total_events),
  observed_pct numeric(8,4) not null check (observed_pct between 0 and 100),
  burn_rate numeric(12,4) not null check (burn_rate >= 0),
  error_budget_consumed_pct numeric(12,4) not null check (error_budget_consumed_pct >= 0),
  source text not null default 'aggregated' check (source in ('aggregated','manual_review')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (window_end > window_start),
  unique(slo_id, window_start, window_end)
);

create table public.postmortem_reports (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.production_incidents(id) on delete restrict,
  title text not null check (length(title) between 5 and 180),
  summary text not null check (length(summary) between 10 and 3000),
  root_cause text not null check (length(root_cause) between 10 and 5000),
  detection text not null check (length(detection) between 10 and 3000),
  resolution text not null check (length(resolution) between 10 and 3000),
  customer_impact text check (customer_impact is null or length(customer_impact) <= 3000),
  lessons text check (lessons is null or length(lessons) <= 3000),
  status text not null default 'draft' check (status in ('draft','review','approved','rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger postmortem_reports_updated_at
before update on public.postmortem_reports
for each row execute function public.set_updated_at();

create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  postmortem_id uuid not null references public.postmortem_reports(id) on delete cascade,
  title text not null check (length(title) between 5 and 180),
  description text check (description is null or length(description) <= 3000),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz not null,
  verification text check (verification is null or length(verification) <= 2000),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger corrective_actions_updated_at
before update on public.corrective_actions
for each row execute function public.set_updated_at();

create table public.capacity_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  active_accounts integer not null default 0 check (active_accounts >= 0),
  sync_operations bigint not null default 0 check (sync_operations >= 0),
  storage_megabytes numeric(14,2) not null default 0 check (storage_megabytes >= 0),
  notification_deliveries bigint not null default 0 check (notification_deliveries >= 0),
  estimated_cost_brl numeric(14,2) not null default 0 check (estimated_cost_brl >= 0),
  budget_brl numeric(14,2) not null default 0 check (budget_brl >= 0),
  source text not null default 'aggregated' check (source in ('aggregated','manual_review')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (period_end >= period_start),
  unique(period_start, period_end)
);

create table public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 5 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_impact text not null default 'none' check (customer_impact in ('none','degraded','unavailable')),
  status text not null default 'planned' check (status in ('planned','awaiting_approval','approved','in_progress','completed','cancelled','rejected')),
  notes text check (notes is null or length(notes) <= 3000),
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create trigger maintenance_windows_updated_at
before update on public.maintenance_windows
for each row execute function public.set_updated_at();

create table public.dependency_reviews (
  id uuid primary key default gen_random_uuid(),
  package_name text not null check (length(package_name) between 2 and 180),
  current_version text not null check (length(current_version) between 1 and 80),
  target_version text not null check (length(target_version) between 1 and 80),
  update_type text not null check (update_type in ('patch','minor','major','security')),
  risk_level text not null default 'medium' check (risk_level in ('critical','high','medium','low')),
  status text not null default 'proposed' check (status in ('proposed','approved','in_progress','validated','deployed','deferred','rejected')),
  due_at date,
  notes text check (notes is null or length(notes) <= 3000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(package_name, target_version)
);

create trigger dependency_reviews_updated_at
before update on public.dependency_reviews
for each row execute function public.set_updated_at();

create table public.product_cycles (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  title text not null check (length(title) between 5 and 180),
  goals text not null check (length(goals) between 10 and 5000),
  status text not null default 'planning' check (status in ('planning','awaiting_approval','approved','active','frozen','released','cancelled','rejected')),
  starts_at date,
  target_release_at date,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (target_release_at is null or starts_at is null or target_release_at >= starts_at)
);

create trigger product_cycles_updated_at
before update on public.product_cycles
for each row execute function public.set_updated_at();

create index product_slos_active_updated on public.product_slos(active, updated_at desc);
create index slo_measurements_slo_created on public.slo_measurements(slo_id, created_at desc);
create index postmortem_reports_status_updated on public.postmortem_reports(status, updated_at desc);
create index corrective_actions_status_due on public.corrective_actions(status, priority, due_at);
create index capacity_cost_period on public.capacity_cost_snapshots(period_end desc);
create index maintenance_windows_status_start on public.maintenance_windows(status, starts_at);
create index dependency_reviews_status_risk on public.dependency_reviews(status, risk_level, due_at);
create index product_cycles_status_target on public.product_cycles(status, target_release_at);

alter table public.product_slos enable row level security;
alter table public.slo_measurements enable row level security;
alter table public.postmortem_reports enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.capacity_cost_snapshots enable row level security;
alter table public.maintenance_windows enable row level security;
alter table public.dependency_reviews enable row level security;
alter table public.product_cycles enable row level security;

create policy "product_slos_operator_select" on public.product_slos for select to authenticated using (public.is_release_operator());
create policy "slo_measurements_operator_select" on public.slo_measurements for select to authenticated using (public.is_release_operator());
create policy "postmortem_reports_operator_select" on public.postmortem_reports for select to authenticated using (public.is_release_operator());
create policy "corrective_actions_operator_select" on public.corrective_actions for select to authenticated using (public.is_release_operator());
create policy "capacity_cost_operator_select" on public.capacity_cost_snapshots for select to authenticated using (public.is_release_operator());
create policy "maintenance_windows_operator_select" on public.maintenance_windows for select to authenticated using (public.is_release_operator());
create policy "dependency_reviews_operator_select" on public.dependency_reviews for select to authenticated using (public.is_release_operator());
create policy "product_cycles_operator_select" on public.product_cycles for select to authenticated using (public.is_release_operator());

grant select on public.product_slos, public.slo_measurements, public.postmortem_reports, public.corrective_actions,
  public.capacity_cost_snapshots, public.maintenance_windows, public.dependency_reviews, public.product_cycles to authenticated;

revoke insert, update, delete on public.product_slos, public.slo_measurements, public.postmortem_reports, public.corrective_actions,
  public.capacity_cost_snapshots, public.maintenance_windows, public.dependency_reviews, public.product_cycles from authenticated;

commit;
