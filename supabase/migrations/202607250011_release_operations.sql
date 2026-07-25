begin;

create or replace function public.is_release_operator()
returns boolean
language sql
stable
security definer
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

create policy "beta_feedback_operator_update"
on public.beta_feedback for update to authenticated
using (public.is_release_operator())
with check (public.is_release_operator());

create policy "beta_testers_operator_select"
on public.beta_tester_enrollments for select to authenticated
using (public.is_release_operator());

create policy "beta_testers_operator_update"
on public.beta_tester_enrollments for update to authenticated
using (public.is_release_operator())
with check (public.is_release_operator() and status in ('active','paused'));

revoke insert, update, delete on public.release_candidates from authenticated;
revoke insert, update, delete on public.release_gates from authenticated;
revoke insert, update, delete on public.release_builds from authenticated;
revoke insert, update, delete on public.operator_audit_log from authenticated;
grant update (status, priority, operator_notes, assigned_to, candidate_id) on public.beta_feedback to authenticated;
grant update (status) on public.beta_tester_enrollments to authenticated;

create or replace function public.operator_create_release_candidate(
  p_version text,
  p_rc_number integer,
  p_title text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate_id uuid;
begin
  if not public.is_release_operator() then
    raise exception 'release_operator_required';
  end if;

  insert into public.release_candidates(version, rc_number, title, notes, created_by)
  values (trim(p_version), p_rc_number, trim(p_title), nullif(trim(p_notes), ''), auth.uid())
  returning id into v_candidate_id;

  insert into public.release_gates(candidate_id, gate_key, label, required)
  values
    (v_candidate_id, 'ci_quality', 'CI de qualidade aprovado', true),
    (v_candidate_id, 'ci_database', 'CI de banco aprovado', true),
    (v_candidate_id, 'android_install', 'Instalação Android validada', true),
    (v_candidate_id, 'ios_install', 'Instalação iOS validada', false),
    (v_candidate_id, 'auth_callbacks', 'Callbacks de autenticação validados', true),
    (v_candidate_id, 'offline_sync', 'Offline e sincronização validados', true),
    (v_candidate_id, 'privacy_review', 'Revisão de privacidade concluída', true),
    (v_candidate_id, 'accessibility_review', 'Acessibilidade homologada', true),
    (v_candidate_id, 'store_listing', 'Ficha da loja revisada', true),
    (v_candidate_id, 'data_safety', 'Formulário de segurança de dados revisado', true),
    (v_candidate_id, 'age_rating', 'Classificação etária revisada', true),
    (v_candidate_id, 'support_contact', 'Contato de suporte publicado', true),
    (v_candidate_id, 'legal_review', 'Termos e privacidade revisados', true);

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'release_candidate_created', 'release_candidate', v_candidate_id,
    jsonb_build_object('version', trim(p_version), 'rc_number', p_rc_number));

  return v_candidate_id;
end;
$$;

create or replace function public.operator_set_release_gate(
  p_candidate_id uuid,
  p_gate_key text,
  p_status text,
  p_evidence text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then
    raise exception 'release_operator_required';
  end if;
  if p_status not in ('pending','passed','failed','waived') then
    raise exception 'invalid_gate_status';
  end if;

  update public.release_gates
  set status = p_status,
      evidence = nullif(trim(p_evidence), ''),
      checked_by = auth.uid(),
      checked_at = case when p_status = 'pending' then null else timezone('utc', now()) end
  where candidate_id = p_candidate_id and gate_key = p_gate_key;

  if not found then raise exception 'release_gate_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'release_gate_updated', 'release_candidate', p_candidate_id,
    jsonb_build_object('gate_key', p_gate_key, 'status', p_status));
end;
$$;

create or replace function public.operator_register_release_build(
  p_candidate_id uuid,
  p_platform text,
  p_build_profile text,
  p_build_number text,
  p_artifact_url text,
  p_artifact_sha256 text default null,
  p_audience text default 'internal'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_build_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_platform not in ('android','ios') then raise exception 'invalid_platform'; end if;
  if p_audience not in ('internal','closed_beta','store') then raise exception 'invalid_audience'; end if;

  insert into public.release_builds(
    candidate_id, platform, build_profile, build_number, artifact_url,
    artifact_sha256, audience, status, created_by
  ) values (
    p_candidate_id, p_platform, trim(p_build_profile), trim(p_build_number), trim(p_artifact_url),
    nullif(trim(p_artifact_sha256), ''), p_audience, 'available', auth.uid()
  ) returning id into v_build_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'release_build_registered', 'release_build', v_build_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'platform', p_platform, 'audience', p_audience));

  return v_build_id;
end;
$$;

create or replace function public.operator_set_release_status(
  p_candidate_id uuid,
  p_status text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('draft','qa','blocked','approved','rolled_back') then
    raise exception 'invalid_release_status';
  end if;

  update public.release_candidates
  set status = p_status,
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
      rolled_back_at = case when p_status = 'rolled_back' then timezone('utc', now()) else rolled_back_at end
  where id = p_candidate_id;
  if not found then raise exception 'release_candidate_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'release_status_changed', 'release_candidate', p_candidate_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.operator_update_feedback(
  p_feedback_id uuid,
  p_status text,
  p_priority text,
  p_operator_notes text default null,
  p_candidate_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('received','triaged','planned','resolved','closed') then raise exception 'invalid_feedback_status'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'invalid_feedback_priority'; end if;

  update public.beta_feedback
  set status = p_status,
      priority = p_priority,
      operator_notes = nullif(trim(p_operator_notes), ''),
      assigned_to = auth.uid(),
      candidate_id = p_candidate_id
  where id = p_feedback_id;
  if not found then raise exception 'beta_feedback_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'beta_feedback_triaged', 'beta_feedback', p_feedback_id,
    jsonb_build_object('status', p_status, 'priority', p_priority, 'candidate_id', p_candidate_id));
end;
$$;

create or replace function public.operator_set_tester_status(
  p_user_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('active','paused') then raise exception 'invalid_tester_status'; end if;

  update public.beta_tester_enrollments set status = p_status where user_id = p_user_id;
  if not found then raise exception 'beta_tester_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'beta_tester_status_changed', 'beta_tester', p_user_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.operator_promote_release(p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_missing_gates integer;
  v_available_builds integer;
  v_blockers integer;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;

  select count(*) into v_missing_gates
  from public.release_gates
  where candidate_id = p_candidate_id and required and status <> 'passed';
  if v_missing_gates > 0 then raise exception 'required_release_gates_pending:%', v_missing_gates; end if;

  select count(*) into v_available_builds
  from public.release_builds
  where candidate_id = p_candidate_id and status = 'available' and platform = 'android';
  if v_available_builds = 0 then raise exception 'android_build_required'; end if;

  select count(*) into v_blockers
  from public.beta_feedback
  where candidate_id = p_candidate_id
    and status not in ('resolved','closed')
    and (impact = 'blocking' or priority = 'urgent');
  if v_blockers > 0 then raise exception 'blocking_feedback_open:%', v_blockers; end if;

  update public.release_candidates
  set status = 'promoted', approved_by = auth.uid(), promoted_at = timezone('utc', now())
  where id = p_candidate_id and status in ('qa','approved','blocked','draft');
  if not found then raise exception 'release_candidate_not_promotable'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'release_promoted', 'release_candidate', p_candidate_id,
    jsonb_build_object('required_gates', 'passed', 'android_builds', v_available_builds));
end;
$$;

for function_name in
  select unnest(array[
    'operator_create_release_candidate(text,integer,text,text)',
    'operator_set_release_gate(uuid,text,text,text)',
    'operator_register_release_build(uuid,text,text,text,text,text,text)',
    'operator_set_release_status(uuid,text,text)',
    'operator_update_feedback(uuid,text,text,text,uuid)',
    'operator_set_tester_status(uuid,text)',
    'operator_promote_release(uuid)'
  ])
loop
  execute format('revoke all on function public.%s from public', function_name);
  execute format('grant execute on function public.%s to authenticated', function_name);
end loop;

commit;
