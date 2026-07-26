begin;

create or replace function public.operator_upsert_cycle_backlog_item(
  p_cycle_id uuid,
  p_item_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_impact_score integer,
  p_confidence_score integer,
  p_effort_points integer,
  p_risk_score integer,
  p_owner_id uuid default null,
  p_due_at timestamptz default null
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
  if p_category not in ('reliability','accessibility','value','security','operations') then raise exception 'invalid_backlog_category'; end if;
  if p_item_id is null then
    insert into public.cycle_backlog_items(
      cycle_id,title,description,category,impact_score,confidence_score,effort_points,risk_score,owner_id,due_at,created_by
    ) values (
      p_cycle_id,trim(p_title),coalesce(trim(p_description),''),p_category,p_impact_score,p_confidence_score,p_effort_points,p_risk_score,p_owner_id,p_due_at,auth.uid()
    ) returning id into v_id;
  else
    update public.cycle_backlog_items
    set title=trim(p_title), description=coalesce(trim(p_description),''), category=p_category,
        impact_score=p_impact_score, confidence_score=p_confidence_score, effort_points=p_effort_points,
        risk_score=p_risk_score, owner_id=p_owner_id, due_at=p_due_at, updated_at=now()
    where id=p_item_id and cycle_id=p_cycle_id
    returning id into v_id;
    if not found then raise exception 'backlog_item_not_found'; end if;
  end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_backlog_item_upserted','cycle_backlog_item',v_id,
    jsonb_build_object('cycle_id',p_cycle_id,'category',p_category));
  return v_id;
end;
$$;

create or replace function public.operator_update_cycle_backlog_status(p_item_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('proposed','committed','in_progress','blocked','done','removed') then raise exception 'invalid_backlog_status'; end if;
  update public.cycle_backlog_items set status=p_status,updated_at=now() where id=p_item_id;
  if not found then raise exception 'backlog_item_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_backlog_status_changed','cycle_backlog_item',p_item_id,jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.operator_create_cycle_objective(
  p_cycle_id uuid,p_title text,p_description text,p_weight integer default 100
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  insert into public.cycle_objectives(cycle_id,title,description,weight,created_by)
  values(p_cycle_id,trim(p_title),coalesce(trim(p_description),''),p_weight,auth.uid()) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_objective_created','cycle_objective',v_id,jsonb_build_object('cycle_id',p_cycle_id));
  return v_id;
end;
$$;

create or replace function public.operator_add_cycle_key_result(
  p_objective_id uuid,p_title text,p_baseline numeric,p_target numeric,p_unit text,p_aggregation_mode text default 'latest'
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_unit not in ('count','percentage','rate','hours','currency_brl') then raise exception 'invalid_key_result_unit'; end if;
  if p_aggregation_mode not in ('latest','sum','average','minimum','maximum') then raise exception 'invalid_aggregation_mode'; end if;
  insert into public.cycle_key_results(objective_id,title,baseline_value,target_value,current_value,unit,aggregation_mode,created_by)
  values(p_objective_id,trim(p_title),p_baseline,p_target,p_baseline,p_unit,p_aggregation_mode,auth.uid()) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_key_result_created','cycle_key_result',v_id,jsonb_build_object('objective_id',p_objective_id,'target',p_target,'unit',p_unit));
  return v_id;
end;
$$;

create or replace function public.operator_update_cycle_key_result(p_key_result_id uuid,p_current numeric,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('on_track','at_risk','achieved','missed') then raise exception 'invalid_key_result_status'; end if;
  update public.cycle_key_results set current_value=p_current,status=p_status,updated_at=now() where id=p_key_result_id;
  if not found then raise exception 'key_result_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_key_result_updated','cycle_key_result',p_key_result_id,jsonb_build_object('current',p_current,'status',p_status));
end;
$$;

create or replace function public.operator_request_scope_change(
  p_cycle_id uuid,p_backlog_item_id uuid,p_change_type text,p_reason text,p_impact_summary text
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_change_type not in ('add','remove','reorder','resize') then raise exception 'invalid_scope_change_type'; end if;
  insert into public.cycle_scope_changes(cycle_id,backlog_item_id,change_type,reason,impact_summary,requested_by)
  values(p_cycle_id,p_backlog_item_id,p_change_type,trim(p_reason),trim(p_impact_summary),auth.uid()) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_scope_change_requested','cycle_scope_change',v_id,jsonb_build_object('cycle_id',p_cycle_id,'change_type',p_change_type));
  return v_id;
end;
$$;

create or replace function public.admin_decide_scope_change(p_change_id uuid,p_decision text,p_comment text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_change public.cycle_scope_changes%rowtype;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_scope_decision'; end if;
  select * into v_change from public.cycle_scope_changes where id=p_change_id for update;
  if not found then raise exception 'scope_change_not_found'; end if;
  if v_change.status <> 'pending' then raise exception 'scope_change_not_pending'; end if;
  if v_change.requested_by=auth.uid() then raise exception 'four_eyes_approval_required'; end if;
  update public.cycle_scope_changes set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now(),review_comment=nullif(trim(p_comment),'') ,updated_at=now() where id=p_change_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_scope_change_decided','cycle_scope_change',p_change_id,jsonb_build_object('decision',p_decision));
end;
$$;

create or replace function public.operator_create_experiment(
  p_cycle_id uuid,p_experiment_key text,p_title text,p_hypothesis text,p_success_metric text,p_guardrail_metric text,
  p_audience_description text,p_starts_at timestamptz default null,p_ends_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  insert into public.product_experiments(
    cycle_id,experiment_key,title,hypothesis,success_metric,guardrail_metric,audience_description,consent_required,starts_at,ends_at,created_by
  ) values (
    p_cycle_id,lower(trim(p_experiment_key)),trim(p_title),trim(p_hypothesis),trim(p_success_metric),trim(p_guardrail_metric),trim(p_audience_description),true,p_starts_at,p_ends_at,auth.uid()
  ) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'product_experiment_created','product_experiment',v_id,jsonb_build_object('cycle_id',p_cycle_id,'consent_required',true));
  return v_id;
end;
$$;

create or replace function public.operator_request_experiment_approval(p_experiment_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  update public.product_experiments set status='awaiting_approval',updated_at=now() where id=p_experiment_id and status in ('draft','cancelled');
  if not found then raise exception 'experiment_not_approvable'; end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'experiment_approval_requested','product_experiment',p_experiment_id,'{}'::jsonb);
end;
$$;

create or replace function public.admin_decide_experiment(p_experiment_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_experiment public.product_experiments%rowtype;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','cancelled') then raise exception 'invalid_experiment_decision'; end if;
  select * into v_experiment from public.product_experiments where id=p_experiment_id for update;
  if not found then raise exception 'experiment_not_found'; end if;
  if v_experiment.status <> 'awaiting_approval' then raise exception 'experiment_approval_required'; end if;
  if v_experiment.created_by=auth.uid() then raise exception 'four_eyes_approval_required'; end if;
  update public.product_experiments set status=p_decision,approved_by=case when p_decision='approved' then auth.uid() else null end,
    approved_at=case when p_decision='approved' then now() else null end,updated_at=now() where id=p_experiment_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'experiment_decided','product_experiment',p_experiment_id,jsonb_build_object('decision',p_decision));
end;
$$;

create or replace function public.operator_update_experiment_status(p_experiment_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_current text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('running','paused','concluded','cancelled') then raise exception 'invalid_experiment_status'; end if;
  select status into v_current from public.product_experiments where id=p_experiment_id for update;
  if not found then raise exception 'experiment_not_found'; end if;
  if p_status='running' and v_current not in ('approved','paused') then raise exception 'approved_experiment_required'; end if;
  if p_status in ('paused','concluded') and v_current<>'running' then raise exception 'running_experiment_required'; end if;
  update public.product_experiments set status=p_status,updated_at=now() where id=p_experiment_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'experiment_status_changed','product_experiment',p_experiment_id,jsonb_build_object('from_status',v_current,'to_status',p_status));
end;
$$;

create or replace function public.operator_record_experiment_measurement(
  p_experiment_id uuid,p_variant text,p_period_start timestamptz,p_period_end timestamptz,p_sample_size integer,
  p_conversions integer,p_value_sum numeric,p_guardrail_breaches integer,p_source text default 'aggregated'
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_status text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_variant not in ('control','treatment') then raise exception 'invalid_experiment_variant'; end if;
  if p_source not in ('aggregated','manual_review') then raise exception 'invalid_experiment_source'; end if;
  select status into v_status from public.product_experiments where id=p_experiment_id;
  if v_status not in ('running','paused','concluded') then raise exception 'experiment_measurement_not_allowed'; end if;
  insert into public.experiment_measurements(
    experiment_id,variant,period_start,period_end,sample_size,conversions,value_sum,guardrail_breaches,source,recorded_by
  ) values (
    p_experiment_id,p_variant,p_period_start,p_period_end,p_sample_size,p_conversions,p_value_sum,p_guardrail_breaches,p_source,auth.uid()
  ) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'experiment_measurement_recorded','experiment_measurement',v_id,
    jsonb_build_object('experiment_id',p_experiment_id,'variant',p_variant,'sample_size',p_sample_size));
  return v_id;
end;
$$;

create or replace function public.operator_create_delivery_milestone(
  p_cycle_id uuid,p_title text,p_kind text,p_due_at timestamptz,p_owner_id uuid default null
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_kind not in ('planning','design','development','qa','rc','freeze','release') then raise exception 'invalid_milestone_kind'; end if;
  insert into public.delivery_milestones(cycle_id,title,milestone_kind,due_at,owner_id,created_by)
  values(p_cycle_id,trim(p_title),p_kind,p_due_at,p_owner_id,auth.uid()) returning id into v_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'delivery_milestone_created','delivery_milestone',v_id,jsonb_build_object('cycle_id',p_cycle_id,'kind',p_kind));
  return v_id;
end;
$$;

create or replace function public.operator_update_delivery_milestone(
  p_milestone_id uuid,p_status text,p_evidence_summary text default null
)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('planned','in_progress','blocked','done','cancelled') then raise exception 'invalid_milestone_status'; end if;
  update public.delivery_milestones set status=p_status,evidence_summary=coalesce(nullif(trim(p_evidence_summary),''),evidence_summary),updated_at=now() where id=p_milestone_id;
  if not found then raise exception 'milestone_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'delivery_milestone_updated','delivery_milestone',p_milestone_id,jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.operator_initialize_cycle_release_gates(p_cycle_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  insert into public.cycle_release_gates(cycle_id,gate_key,label,required)
  values
    (p_cycle_id,'quality_ci','CI de qualidade aprovado',true),
    (p_cycle_id,'database_ci','Migrations e pgTAP aprovados',true),
    (p_cycle_id,'accessibility_review','Acessibilidade homologada',true),
    (p_cycle_id,'privacy_review','Privacidade e consentimentos revisados',true),
    (p_cycle_id,'rc_build','Build RC disponível',true),
    (p_cycle_id,'physical_device','Homologação em aparelho físico',true),
    (p_cycle_id,'store_metadata','Metadados de distribuição revisados',false)
  on conflict(cycle_id,gate_key) do nothing;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_release_gates_initialized','product_cycle',p_cycle_id,'{}'::jsonb);
end;
$$;

create or replace function public.operator_set_cycle_release_gate(
  p_gate_id uuid,p_status text,p_evidence_summary text default null
)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('pending','passed','failed','waived') then raise exception 'invalid_release_gate_status'; end if;
  if p_status='waived' and not public.is_release_admin() then raise exception 'release_admin_required_for_waiver'; end if;
  update public.cycle_release_gates set status=p_status,evidence_summary=coalesce(nullif(trim(p_evidence_summary),''),evidence_summary),
    checked_by=auth.uid(),checked_at=now(),updated_at=now() where id=p_gate_id;
  if not found then raise exception 'release_gate_not_found'; end if;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'cycle_release_gate_updated','cycle_release_gate',p_gate_id,jsonb_build_object('status',p_status));
end;
$$;

create or replace function public.operator_get_cycle_execution_blockers(p_cycle_id uuid,p_target_status text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_blockers text[] := array[]::text[];
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_target_status not in ('frozen','released') then raise exception 'invalid_target_status'; end if;
  if exists(select 1 from public.cycle_scope_changes where cycle_id=p_cycle_id and status='pending') then v_blockers:=array_append(v_blockers,'scope_changes_pending'); end if;
  if exists(select 1 from public.product_experiments where cycle_id=p_cycle_id and status in ('awaiting_approval','running','paused')) then v_blockers:=array_append(v_blockers,'experiments_open'); end if;
  if exists(select 1 from public.cycle_backlog_items where cycle_id=p_cycle_id and status='blocked') then v_blockers:=array_append(v_blockers,'backlog_blocked'); end if;
  if exists(select 1 from public.cycle_release_gates where cycle_id=p_cycle_id and required=true and status not in ('passed','waived')) then v_blockers:=array_append(v_blockers,'required_gates_pending'); end if;
  if not exists(select 1 from public.delivery_milestones where cycle_id=p_cycle_id and milestone_kind='rc' and status='done') then v_blockers:=array_append(v_blockers,'rc_milestone_pending'); end if;
  if exists(select 1 from public.production_incidents where status<>'resolved' and severity in ('sev1','sev2')) then v_blockers:=array_append(v_blockers,'critical_incidents_open'); end if;
  if exists(select 1 from public.corrective_actions where status not in ('completed','cancelled') and (priority='critical' or (priority='high' and due_at<now()))) then v_blockers:=array_append(v_blockers,'corrective_actions_blocking'); end if;
  if exists(select 1 from public.dependency_reviews where update_type='security' and status not in ('validated','deployed','deferred','rejected')) then v_blockers:=array_append(v_blockers,'security_dependencies_open'); end if;
  if p_target_status='released' then
    if exists(select 1 from public.cycle_backlog_items where cycle_id=p_cycle_id and status in ('committed','in_progress','blocked')) then v_blockers:=array_append(v_blockers,'committed_backlog_incomplete'); end if;
    if not exists(select 1 from public.delivery_milestones where cycle_id=p_cycle_id and milestone_kind='release' and status='done') then v_blockers:=array_append(v_blockers,'release_milestone_pending'); end if;
  end if;
  return jsonb_build_object('target_status',p_target_status,'ready',coalesce(array_length(v_blockers,1),0)=0,'blockers',to_jsonb(v_blockers));
end;
$$;

create or replace function public.operator_update_product_cycle_status(p_cycle_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_current text; v_result jsonb; v_ready boolean;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('active','frozen','released','cancelled') then raise exception 'invalid_cycle_status'; end if;
  select status into v_current from public.product_cycles where id=p_cycle_id for update;
  if not found then raise exception 'product_cycle_not_found'; end if;
  if p_status='active' and v_current<>'approved' then raise exception 'approved_cycle_required'; end if;
  if p_status='frozen' then
    if v_current<>'active' then raise exception 'active_cycle_required'; end if;
    v_result:=public.operator_get_cycle_execution_blockers(p_cycle_id,'frozen');
    v_ready:=coalesce((v_result->>'ready')::boolean,false);
    if not v_ready then raise exception 'cycle_freeze_blocked:%',v_result->'blockers'; end if;
  end if;
  if p_status='released' then
    if v_current<>'frozen' then raise exception 'frozen_cycle_required'; end if;
    v_result:=public.operator_get_cycle_execution_blockers(p_cycle_id,'released');
    v_ready:=coalesce((v_result->>'ready')::boolean,false);
    if not v_ready then raise exception 'cycle_release_blocked:%',v_result->'blockers'; end if;
  end if;
  update public.product_cycles set status=p_status where id=p_cycle_id;
  insert into public.operator_audit_log(operator_user_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'product_cycle_status_changed','product_cycle',p_cycle_id,jsonb_build_object('from_status',v_current,'to_status',p_status));
end;
$$;

revoke all on function public.operator_upsert_cycle_backlog_item(uuid,uuid,text,text,text,integer,integer,integer,integer,uuid,timestamptz) from public;
revoke all on function public.operator_update_cycle_backlog_status(uuid,text) from public;
revoke all on function public.operator_create_cycle_objective(uuid,text,text,integer) from public;
revoke all on function public.operator_add_cycle_key_result(uuid,text,numeric,numeric,text,text) from public;
revoke all on function public.operator_update_cycle_key_result(uuid,numeric,text) from public;
revoke all on function public.operator_request_scope_change(uuid,uuid,text,text,text) from public;
revoke all on function public.admin_decide_scope_change(uuid,text,text) from public;
revoke all on function public.operator_create_experiment(uuid,text,text,text,text,text,text,timestamptz,timestamptz) from public;
revoke all on function public.operator_request_experiment_approval(uuid) from public;
revoke all on function public.admin_decide_experiment(uuid,text) from public;
revoke all on function public.operator_update_experiment_status(uuid,text) from public;
revoke all on function public.operator_record_experiment_measurement(uuid,text,timestamptz,timestamptz,integer,integer,numeric,integer,text) from public;
revoke all on function public.operator_create_delivery_milestone(uuid,text,text,timestamptz,uuid) from public;
revoke all on function public.operator_update_delivery_milestone(uuid,text,text) from public;
revoke all on function public.operator_initialize_cycle_release_gates(uuid) from public;
revoke all on function public.operator_set_cycle_release_gate(uuid,text,text) from public;
revoke all on function public.operator_get_cycle_execution_blockers(uuid,text) from public;
revoke all on function public.operator_update_product_cycle_status(uuid,text) from public;

grant execute on function public.operator_upsert_cycle_backlog_item(uuid,uuid,text,text,text,integer,integer,integer,integer,uuid,timestamptz) to authenticated;
grant execute on function public.operator_update_cycle_backlog_status(uuid,text) to authenticated;
grant execute on function public.operator_create_cycle_objective(uuid,text,text,integer) to authenticated;
grant execute on function public.operator_add_cycle_key_result(uuid,text,numeric,numeric,text,text) to authenticated;
grant execute on function public.operator_update_cycle_key_result(uuid,numeric,text) to authenticated;
grant execute on function public.operator_request_scope_change(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.admin_decide_scope_change(uuid,text,text) to authenticated;
grant execute on function public.operator_create_experiment(uuid,text,text,text,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.operator_request_experiment_approval(uuid) to authenticated;
grant execute on function public.admin_decide_experiment(uuid,text) to authenticated;
grant execute on function public.operator_update_experiment_status(uuid,text) to authenticated;
grant execute on function public.operator_record_experiment_measurement(uuid,text,timestamptz,timestamptz,integer,integer,numeric,integer,text) to authenticated;
grant execute on function public.operator_create_delivery_milestone(uuid,text,text,timestamptz,uuid) to authenticated;
grant execute on function public.operator_update_delivery_milestone(uuid,text,text) to authenticated;
grant execute on function public.operator_initialize_cycle_release_gates(uuid) to authenticated;
grant execute on function public.operator_set_cycle_release_gate(uuid,text,text) to authenticated;
grant execute on function public.operator_get_cycle_execution_blockers(uuid,text) to authenticated;
grant execute on function public.operator_update_product_cycle_status(uuid,text) to authenticated;

commit;
