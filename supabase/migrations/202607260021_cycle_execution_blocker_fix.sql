begin;

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
  if exists(select 1 from public.corrective_actions where status not in ('done','cancelled') and (priority='critical' or (priority='high' and due_at<now()))) then v_blockers:=array_append(v_blockers,'corrective_actions_blocking'); end if;
  if exists(select 1 from public.dependency_reviews where update_type='security' and status not in ('validated','deployed','deferred','rejected')) then v_blockers:=array_append(v_blockers,'security_dependencies_open'); end if;
  if p_target_status='released' then
    if exists(select 1 from public.cycle_backlog_items where cycle_id=p_cycle_id and status in ('committed','in_progress','blocked')) then v_blockers:=array_append(v_blockers,'committed_backlog_incomplete'); end if;
    if not exists(select 1 from public.delivery_milestones where cycle_id=p_cycle_id and milestone_kind='release' and status='done') then v_blockers:=array_append(v_blockers,'release_milestone_pending'); end if;
  end if;
  return jsonb_build_object('target_status',p_target_status,'ready',coalesce(array_length(v_blockers,1),0)=0,'blockers',to_jsonb(v_blockers));
end;
$$;

revoke all on function public.operator_get_cycle_execution_blockers(uuid,text) from public;
grant execute on function public.operator_get_cycle_execution_blockers(uuid,text) to authenticated;

commit;
