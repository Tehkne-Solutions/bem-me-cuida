begin;

create table public.cycle_backlog_items (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('reliability','accessibility','value','security','operations')),
  impact_score integer not null check (impact_score between 1 and 100),
  confidence_score integer not null check (confidence_score between 1 and 100),
  effort_points integer not null check (effort_points between 1 and 21),
  risk_score integer not null check (risk_score between 1 and 100),
  priority_score numeric(10,4) generated always as (((impact_score::numeric * confidence_score::numeric) / greatest(effort_points, 1)) - risk_score::numeric) stored,
  status text not null default 'proposed' check (status in ('proposed','committed','in_progress','blocked','done','removed')),
  owner_id uuid references auth.users(id),
  due_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_objectives (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  weight integer not null default 100 check (weight between 1 and 100),
  status text not null default 'active' check (status in ('draft','active','achieved','missed','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.cycle_objectives(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  baseline_value numeric not null default 0,
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text not null check (unit in ('count','percentage','rate','hours','currency_brl')),
  aggregation_mode text not null default 'latest' check (aggregation_mode in ('latest','sum','average','minimum','maximum')),
  status text not null default 'on_track' check (status in ('on_track','at_risk','achieved','missed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_value <> baseline_value)
);

create table public.cycle_scope_changes (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  backlog_item_id uuid references public.cycle_backlog_items(id) on delete set null,
  change_type text not null check (change_type in ('add','remove','reorder','resize')),
  reason text not null check (char_length(reason) between 10 and 2000),
  impact_summary text not null check (char_length(impact_summary) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_experiments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  experiment_key text not null unique check (experiment_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  title text not null check (char_length(title) between 3 and 160),
  hypothesis text not null check (char_length(hypothesis) between 20 and 2000),
  success_metric text not null check (char_length(success_metric) between 3 and 160),
  guardrail_metric text not null check (char_length(guardrail_metric) between 3 and 160),
  audience_description text not null check (char_length(audience_description) between 10 and 500),
  consent_required boolean not null default true,
  status text not null default 'draft' check (status in ('draft','awaiting_approval','approved','running','paused','concluded','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.experiment_measurements (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.product_experiments(id) on delete cascade,
  variant text not null check (variant in ('control','treatment')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  sample_size integer not null check (sample_size >= 0),
  conversions integer not null check (conversions >= 0 and conversions <= sample_size),
  value_sum numeric not null default 0,
  guardrail_breaches integer not null default 0 check (guardrail_breaches >= 0 and guardrail_breaches <= sample_size),
  source text not null default 'aggregated' check (source in ('aggregated','manual_review')),
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  check (period_end > period_start)
);

create table public.delivery_milestones (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  milestone_kind text not null check (milestone_kind in ('planning','design','development','qa','rc','freeze','release')),
  due_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned','in_progress','blocked','done','cancelled')),
  owner_id uuid references auth.users(id),
  evidence_summary text not null default '' check (char_length(evidence_summary) <= 2000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cycle_release_gates (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.product_cycles(id) on delete cascade,
  gate_key text not null check (gate_key ~ '^[a-z0-9][a-z0-9_-]{2,63}$'),
  label text not null check (char_length(label) between 3 and 160),
  required boolean not null default true,
  status text not null default 'pending' check (status in ('pending','passed','failed','waived')),
  evidence_summary text not null default '' check (char_length(evidence_summary) <= 2000),
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, gate_key)
);

alter table public.cycle_backlog_items enable row level security;
alter table public.cycle_objectives enable row level security;
alter table public.cycle_key_results enable row level security;
alter table public.cycle_scope_changes enable row level security;
alter table public.product_experiments enable row level security;
alter table public.experiment_measurements enable row level security;
alter table public.delivery_milestones enable row level security;
alter table public.cycle_release_gates enable row level security;

create policy cycle_backlog_items_operator_select on public.cycle_backlog_items for select using (public.is_release_operator());
create policy cycle_objectives_operator_select on public.cycle_objectives for select using (public.is_release_operator());
create policy cycle_key_results_operator_select on public.cycle_key_results for select using (public.is_release_operator());
create policy cycle_scope_changes_operator_select on public.cycle_scope_changes for select using (public.is_release_operator());
create policy product_experiments_operator_select on public.product_experiments for select using (public.is_release_operator());
create policy experiment_measurements_operator_select on public.experiment_measurements for select using (public.is_release_operator());
create policy delivery_milestones_operator_select on public.delivery_milestones for select using (public.is_release_operator());
create policy cycle_release_gates_operator_select on public.cycle_release_gates for select using (public.is_release_operator());

revoke insert, update, delete on public.cycle_backlog_items from authenticated;
revoke insert, update, delete on public.cycle_objectives from authenticated;
revoke insert, update, delete on public.cycle_key_results from authenticated;
revoke insert, update, delete on public.cycle_scope_changes from authenticated;
revoke insert, update, delete on public.product_experiments from authenticated;
revoke insert, update, delete on public.experiment_measurements from authenticated;
revoke insert, update, delete on public.delivery_milestones from authenticated;
revoke insert, update, delete on public.cycle_release_gates from authenticated;

create index cycle_backlog_items_cycle_priority on public.cycle_backlog_items(cycle_id, status, priority_score desc);
create index cycle_objectives_cycle_status on public.cycle_objectives(cycle_id, status);
create index cycle_key_results_objective on public.cycle_key_results(objective_id, status);
create index cycle_scope_changes_cycle_status on public.cycle_scope_changes(cycle_id, status, created_at desc);
create index product_experiments_cycle_status on public.product_experiments(cycle_id, status, updated_at desc);
create index experiment_measurements_experiment_period on public.experiment_measurements(experiment_id, period_end desc);
create index delivery_milestones_cycle_due on public.delivery_milestones(cycle_id, status, due_at);
create index cycle_release_gates_cycle_status on public.cycle_release_gates(cycle_id, required, status);

commit;
