begin;

create or replace function public.operator_upsert_product_slo(
  p_service_key text,
  p_name text,
  p_description text,
  p_objective_pct numeric,
  p_evaluation_window_days integer,
  p_warning_burn_rate numeric,
  p_critical_burn_rate numeric,
  p_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_objective_pct <= 0 or p_objective_pct >= 100 then raise exception 'invalid_slo_objective'; end if;
  if p_evaluation_window_days < 1 or p_evaluation_window_days > 90 then raise exception 'invalid_slo_window'; end if;
  if p_warning_burn_rate <= 0 or p_critical_burn_rate <= p_warning_burn_rate then raise exception 'invalid_burn_thresholds'; end if;

  insert into public.product_slos(
    service_key, name, description, objective_pct, evaluation_window_days,
    warning_burn_rate, critical_burn_rate, active, created_by
  ) values (
    lower(trim(p_service_key)), trim(p_name), nullif(trim(p_description), ''), p_objective_pct,
    p_evaluation_window_days, p_warning_burn_rate, p_critical_burn_rate, p_active, auth.uid()
  )
  on conflict (service_key) do update
    set name = excluded.name,
        description = excluded.description,
        objective_pct = excluded.objective_pct,
        evaluation_window_days = excluded.evaluation_window_days,
        warning_burn_rate = excluded.warning_burn_rate,
        critical_burn_rate = excluded.critical_burn_rate,
        active = excluded.active
  returning id into v_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product_slo_upserted', 'product_slo', v_id,
    jsonb_build_object('service_key', lower(trim(p_service_key)), 'objective_pct', p_objective_pct));
  return v_id;
end;
$$;

create or replace function public.operator_record_slo_measurement(
  p_slo_id uuid,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_good_events bigint,
  p_total_events bigint,
  p_source text default 'aggregated'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slo public.product_slos%rowtype;
  v_id uuid;
  v_observed numeric;
  v_allowed_bad numeric;
  v_actual_bad numeric;
  v_burn numeric;
  v_consumed numeric;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_window_end <= p_window_start then raise exception 'invalid_slo_measurement_window'; end if;
  if p_total_events <= 0 or p_good_events < 0 or p_good_events > p_total_events then raise exception 'invalid_slo_events'; end if;
  if p_source not in ('aggregated','manual_review') then raise exception 'invalid_slo_source'; end if;

  select * into v_slo from public.product_slos where id = p_slo_id and active = true;
  if not found then raise exception 'active_slo_required'; end if;

  v_observed := round((p_good_events::numeric / p_total_events::numeric) * 100, 4);
  v_allowed_bad := 100 - v_slo.objective_pct;
  v_actual_bad := 100 - v_observed;
  v_burn := round(greatest(v_actual_bad, 0) / v_allowed_bad, 4);
  v_consumed := round(v_burn * 100, 4);

  insert into public.slo_measurements(
    slo_id, window_start, window_end, good_events, total_events,
    observed_pct, burn_rate, error_budget_consumed_pct, source, recorded_by
  ) values (
    p_slo_id, p_window_start, p_window_end, p_good_events, p_total_events,
    v_observed, v_burn, v_consumed, p_source, auth.uid()
  )
  returning id into v_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'slo_measurement_recorded', 'slo_measurement', v_id,
    jsonb_build_object('slo_id', p_slo_id, 'observed_pct', v_observed, 'burn_rate', v_burn));
  return v_id;
end;
$$;

create or replace function public.operator_create_postmortem(
  p_incident_id uuid,
  p_title text,
  p_summary text,
  p_root_cause text,
  p_detection text,
  p_resolution text,
  p_customer_impact text default null,
  p_lessons text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if not exists (select 1 from public.production_incidents where id = p_incident_id) then raise exception 'incident_not_found'; end if;

  insert into public.postmortem_reports(
    incident_id, title, summary, root_cause, detection, resolution,
    customer_impact, lessons, created_by
  ) values (
    p_incident_id, trim(p_title), trim(p_summary), trim(p_root_cause), trim(p_detection), trim(p_resolution),
    nullif(trim(p_customer_impact), ''), nullif(trim(p_lessons), ''), auth.uid()
  ) returning id into v_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'postmortem_created', 'postmortem_report', v_id,
    jsonb_build_object('incident_id', p_incident_id));
  return v_id;
end;
$$;

create or replace function public.operator_request_postmortem_review(p_postmortem_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  update public.postmortem_reports set status = 'review'
  where id = p_postmortem_id and status in ('draft','rejected');
  if not found then raise exception 'postmortem_not_reviewable'; end if;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'postmortem_review_requested', 'postmortem_report', p_postmortem_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_decide_postmortem(
  p_postmortem_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_report public.postmortem_reports%rowtype;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_postmortem_decision'; end if;
  select * into v_report from public.postmortem_reports where id = p_postmortem_id for update;
  if not found then raise exception 'postmortem_not_found'; end if;
  if v_report.status <> 'review' then raise exception 'postmortem_review_required'; end if;
  if v_report.created_by = auth.uid() then raise exception 'four_eyes_approval_required'; end if;

  update public.postmortem_reports
  set status = p_decision,
      approved_by = case when p_decision = 'approved' then auth.uid() else null end,
      approved_at = case when p_decision = 'approved' then timezone('utc', now()) else null end
  where id = p_postmortem_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'postmortem_decided', 'postmortem_report', p_postmortem_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

create or replace function public.operator_create_corrective_action(
  p_postmortem_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_owner_user_id uuid,
  p_due_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_priority not in ('critical','high','medium','low') then raise exception 'invalid_corrective_priority'; end if;
  if not exists (select 1 from public.postmortem_reports where id = p_postmortem_id) then raise exception 'postmortem_not_found'; end if;
  insert into public.corrective_actions(
    postmortem_id, title, description, priority, owner_user_id, due_at, created_by
  ) values (
    p_postmortem_id, trim(p_title), nullif(trim(p_description), ''), p_priority, p_owner_user_id, p_due_at, auth.uid()
  ) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'corrective_action_created', 'corrective_action', v_id,
    jsonb_build_object('postmortem_id', p_postmortem_id, 'priority', p_priority));
  return v_id;
end;
$$;

create or replace function public.operator_update_corrective_action(
  p_action_id uuid,
  p_status text,
  p_verification text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('open','in_progress','done','cancelled') then raise exception 'invalid_corrective_status'; end if;
  update public.corrective_actions
  set status = p_status,
      verification = coalesce(nullif(trim(p_verification), ''), verification),
      completed_at = case when p_status = 'done' then timezone('utc', now()) else null end
  where id = p_action_id;
  if not found then raise exception 'corrective_action_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'corrective_action_updated', 'corrective_action', p_action_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.operator_record_capacity_cost(
  p_period_start date,
  p_period_end date,
  p_active_accounts integer,
  p_sync_operations bigint,
  p_storage_megabytes numeric,
  p_notification_deliveries bigint,
  p_estimated_cost_brl numeric,
  p_budget_brl numeric,
  p_source text default 'aggregated'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_period_end < p_period_start then raise exception 'invalid_capacity_period'; end if;
  if p_source not in ('aggregated','manual_review') then raise exception 'invalid_capacity_source'; end if;
  insert into public.capacity_cost_snapshots(
    period_start, period_end, active_accounts, sync_operations, storage_megabytes,
    notification_deliveries, estimated_cost_brl, budget_brl, source, recorded_by
  ) values (
    p_period_start, p_period_end, p_active_accounts, p_sync_operations, p_storage_megabytes,
    p_notification_deliveries, p_estimated_cost_brl, p_budget_brl, p_source, auth.uid()
  ) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'capacity_cost_recorded', 'capacity_cost_snapshot', v_id,
    jsonb_build_object('estimated_cost_brl', p_estimated_cost_brl, 'budget_brl', p_budget_brl));
  return v_id;
end;
$$;

create or replace function public.operator_create_maintenance_window(
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_customer_impact text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_maintenance_window'; end if;
  if p_customer_impact not in ('none','degraded','unavailable') then raise exception 'invalid_maintenance_impact'; end if;
  insert into public.maintenance_windows(title, starts_at, ends_at, customer_impact, notes, created_by)
  values (trim(p_title), p_starts_at, p_ends_at, p_customer_impact, nullif(trim(p_notes), ''), auth.uid())
  returning id into v_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'maintenance_window_created', 'maintenance_window', v_id,
    jsonb_build_object('starts_at', p_starts_at, 'customer_impact', p_customer_impact));
  return v_id;
end;
$$;

create or replace function public.operator_request_maintenance_approval(p_window_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  update public.maintenance_windows set status = 'awaiting_approval'
  where id = p_window_id and status in ('planned','rejected');
  if not found then raise exception 'maintenance_window_not_approvable'; end if;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'maintenance_approval_requested', 'maintenance_window', p_window_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_decide_maintenance_window(
  p_window_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_window public.maintenance_windows%rowtype;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_maintenance_decision'; end if;
  select * into v_window from public.maintenance_windows where id = p_window_id for update;
  if not found then raise exception 'maintenance_window_not_found'; end if;
  if v_window.status <> 'awaiting_approval' then raise exception 'maintenance_approval_required'; end if;
  if v_window.created_by = auth.uid() then raise exception 'four_eyes_approval_required'; end if;
  update public.maintenance_windows
  set status = p_decision,
      approved_by = case when p_decision = 'approved' then auth.uid() else null end,
      approved_at = case when p_decision = 'approved' then timezone('utc', now()) else null end
  where id = p_window_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'maintenance_window_decided', 'maintenance_window', p_window_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

create or replace function public.operator_create_dependency_review(
  p_package_name text,
  p_current_version text,
  p_target_version text,
  p_update_type text,
  p_risk_level text,
  p_due_at date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_update_type not in ('patch','minor','major','security') then raise exception 'invalid_dependency_update_type'; end if;
  if p_risk_level not in ('critical','high','medium','low') then raise exception 'invalid_dependency_risk'; end if;
  insert into public.dependency_reviews(
    package_name, current_version, target_version, update_type, risk_level, due_at, notes, created_by
  ) values (
    trim(p_package_name), trim(p_current_version), trim(p_target_version), p_update_type, p_risk_level,
    p_due_at, nullif(trim(p_notes), ''), auth.uid()
  ) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'dependency_review_created', 'dependency_review', v_id,
    jsonb_build_object('package_name', trim(p_package_name), 'target_version', trim(p_target_version)));
  return v_id;
end;
$$;

create or replace function public.operator_update_dependency_review(
  p_review_id uuid,
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
  if p_status not in ('proposed','approved','in_progress','validated','deployed','deferred','rejected') then raise exception 'invalid_dependency_status'; end if;
  update public.dependency_reviews
  set status = p_status, notes = coalesce(nullif(trim(p_notes), ''), notes)
  where id = p_review_id;
  if not found then raise exception 'dependency_review_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'dependency_review_updated', 'dependency_review', p_review_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.operator_create_product_cycle(
  p_version text,
  p_title text,
  p_goals text,
  p_starts_at date default null,
  p_target_release_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  insert into public.product_cycles(version, title, goals, starts_at, target_release_at, created_by)
  values (trim(p_version), trim(p_title), trim(p_goals), p_starts_at, p_target_release_at, auth.uid())
  returning id into v_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product_cycle_created', 'product_cycle', v_id,
    jsonb_build_object('version', trim(p_version), 'target_release_at', p_target_release_at));
  return v_id;
end;
$$;

create or replace function public.operator_request_cycle_approval(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  update public.product_cycles set status = 'awaiting_approval'
  where id = p_cycle_id and status in ('planning','rejected');
  if not found then raise exception 'product_cycle_not_approvable'; end if;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product_cycle_approval_requested', 'product_cycle', p_cycle_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_decide_product_cycle(
  p_cycle_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cycle public.product_cycles%rowtype;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_cycle_decision'; end if;
  select * into v_cycle from public.product_cycles where id = p_cycle_id for update;
  if not found then raise exception 'product_cycle_not_found'; end if;
  if v_cycle.status <> 'awaiting_approval' then raise exception 'product_cycle_approval_required'; end if;
  if v_cycle.created_by = auth.uid() then raise exception 'four_eyes_approval_required'; end if;
  update public.product_cycles
  set status = p_decision,
      approved_by = case when p_decision = 'approved' then auth.uid() else null end,
      approved_at = case when p_decision = 'approved' then timezone('utc', now()) else null end
  where id = p_cycle_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product_cycle_decided', 'product_cycle', p_cycle_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

create or replace function public.operator_update_product_cycle_status(
  p_cycle_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('active','frozen','released','cancelled') then raise exception 'invalid_cycle_status'; end if;
  select status into v_current from public.product_cycles where id = p_cycle_id for update;
  if not found then raise exception 'product_cycle_not_found'; end if;
  if p_status = 'active' and v_current <> 'approved' then raise exception 'approved_cycle_required'; end if;
  if p_status in ('frozen','released') and v_current not in ('active','frozen') then raise exception 'active_cycle_required'; end if;
  update public.product_cycles set status = p_status where id = p_cycle_id;
  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'product_cycle_status_changed', 'product_cycle', p_cycle_id,
    jsonb_build_object('from_status', v_current, 'to_status', p_status));
end;
$$;

revoke all on function public.operator_upsert_product_slo(text,text,text,numeric,integer,numeric,numeric,boolean) from public;
revoke all on function public.operator_record_slo_measurement(uuid,timestamptz,timestamptz,bigint,bigint,text) from public;
revoke all on function public.operator_create_postmortem(uuid,text,text,text,text,text,text,text) from public;
revoke all on function public.operator_request_postmortem_review(uuid) from public;
revoke all on function public.admin_decide_postmortem(uuid,text) from public;
revoke all on function public.operator_create_corrective_action(uuid,text,text,text,uuid,timestamptz) from public;
revoke all on function public.operator_update_corrective_action(uuid,text,text) from public;
revoke all on function public.operator_record_capacity_cost(date,date,integer,bigint,numeric,bigint,numeric,numeric,text) from public;
revoke all on function public.operator_create_maintenance_window(text,timestamptz,timestamptz,text,text) from public;
revoke all on function public.operator_request_maintenance_approval(uuid) from public;
revoke all on function public.admin_decide_maintenance_window(uuid,text) from public;
revoke all on function public.operator_create_dependency_review(text,text,text,text,text,date,text) from public;
revoke all on function public.operator_update_dependency_review(uuid,text,text) from public;
revoke all on function public.operator_create_product_cycle(text,text,text,date,date) from public;
revoke all on function public.operator_request_cycle_approval(uuid) from public;
revoke all on function public.admin_decide_product_cycle(uuid,text) from public;
revoke all on function public.operator_update_product_cycle_status(uuid,text) from public;

grant execute on function public.operator_upsert_product_slo(text,text,text,numeric,integer,numeric,numeric,boolean) to authenticated;
grant execute on function public.operator_record_slo_measurement(uuid,timestamptz,timestamptz,bigint,bigint,text) to authenticated;
grant execute on function public.operator_create_postmortem(uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.operator_request_postmortem_review(uuid) to authenticated;
grant execute on function public.admin_decide_postmortem(uuid,text) to authenticated;
grant execute on function public.operator_create_corrective_action(uuid,text,text,text,uuid,timestamptz) to authenticated;
grant execute on function public.operator_update_corrective_action(uuid,text,text) to authenticated;
grant execute on function public.operator_record_capacity_cost(date,date,integer,bigint,numeric,bigint,numeric,numeric,text) to authenticated;
grant execute on function public.operator_create_maintenance_window(text,timestamptz,timestamptz,text,text) to authenticated;
grant execute on function public.operator_request_maintenance_approval(uuid) to authenticated;
grant execute on function public.admin_decide_maintenance_window(uuid,text) to authenticated;
grant execute on function public.operator_create_dependency_review(text,text,text,text,text,date,text) to authenticated;
grant execute on function public.operator_update_dependency_review(uuid,text,text) to authenticated;
grant execute on function public.operator_create_product_cycle(text,text,text,date,date) to authenticated;
grant execute on function public.operator_request_cycle_approval(uuid) to authenticated;
grant execute on function public.admin_decide_product_cycle(uuid,text) to authenticated;
grant execute on function public.operator_update_product_cycle_status(uuid,text) to authenticated;

commit;
