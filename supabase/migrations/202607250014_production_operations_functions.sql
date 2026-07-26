begin;

create or replace function public.operator_register_store_submission(
  p_candidate_id uuid,
  p_build_id uuid,
  p_store text,
  p_track text,
  p_status text,
  p_external_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_submission_id uuid;
  v_expected_platform text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_store not in ('google_play','app_store') then raise exception 'invalid_store'; end if;
  if p_track not in ('internal','closed','open','production','testflight') then raise exception 'invalid_track'; end if;
  if p_status not in ('draft','uploaded','in_review','approved','rejected','published','withdrawn') then raise exception 'invalid_submission_status'; end if;

  v_expected_platform := case when p_store = 'google_play' then 'android' else 'ios' end;
  if not exists (
    select 1 from public.release_builds
    where id = p_build_id
      and candidate_id = p_candidate_id
      and platform = v_expected_platform
      and status = 'available'
      and audience = 'store'
  ) then
    raise exception 'store_build_required';
  end if;

  insert into public.store_submissions(
    candidate_id, build_id, store, track, status, external_reference, notes,
    submitted_at, published_at, created_by
  ) values (
    p_candidate_id, p_build_id, p_store, p_track, p_status,
    nullif(trim(p_external_reference), ''), nullif(trim(p_notes), ''),
    case when p_status in ('uploaded','in_review','approved','published') then timezone('utc', now()) else null end,
    case when p_status = 'published' then timezone('utc', now()) else null end,
    auth.uid()
  )
  on conflict (candidate_id, store, track) do update
    set build_id = excluded.build_id,
        status = excluded.status,
        external_reference = excluded.external_reference,
        notes = excluded.notes,
        submitted_at = coalesce(public.store_submissions.submitted_at, excluded.submitted_at),
        published_at = excluded.published_at
  returning id into v_submission_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'store_submission_registered', 'store_submission', v_submission_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'store', p_store, 'track', p_track, 'status', p_status));

  return v_submission_id;
end;
$$;

create or replace function public.operator_update_store_submission(
  p_submission_id uuid,
  p_status text,
  p_external_reference text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('draft','uploaded','in_review','approved','rejected','published','withdrawn') then raise exception 'invalid_submission_status'; end if;

  update public.store_submissions
  set status = p_status,
      external_reference = coalesce(nullif(trim(p_external_reference), ''), external_reference),
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      submitted_at = case
        when p_status in ('uploaded','in_review','approved','published') then coalesce(submitted_at, timezone('utc', now()))
        else submitted_at
      end,
      published_at = case when p_status = 'published' then timezone('utc', now()) else published_at end
  where id = p_submission_id;
  if not found then raise exception 'store_submission_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'store_submission_status_changed', 'store_submission', p_submission_id,
    jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.operator_start_rollout(
  p_candidate_id uuid,
  p_submission_id uuid,
  p_store text,
  p_track text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rollout_id uuid;
  v_open_critical integer;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_store not in ('google_play','app_store') then raise exception 'invalid_store'; end if;
  if p_track not in ('closed','open','production','testflight') then raise exception 'invalid_rollout_track'; end if;

  if not exists (select 1 from public.release_candidates where id = p_candidate_id and status = 'promoted') then
    raise exception 'promoted_candidate_required';
  end if;
  if not exists (
    select 1 from public.store_submissions
    where id = p_submission_id
      and candidate_id = p_candidate_id
      and store = p_store
      and status in ('approved','published')
  ) then
    raise exception 'approved_submission_required';
  end if;

  select count(*) into v_open_critical
  from public.production_incidents
  where candidate_id = p_candidate_id and status <> 'resolved' and severity in ('sev1','sev2');
  if v_open_critical > 0 then raise exception 'critical_incident_open:%', v_open_critical; end if;

  insert into public.production_rollouts(
    candidate_id, submission_id, store, track, target_percent, status, notes, created_by
  ) values (
    p_candidate_id, p_submission_id, p_store, p_track, 1, 'active', nullif(trim(p_notes), ''), auth.uid()
  ) returning id into v_rollout_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_rollout_started', 'production_rollout', v_rollout_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'store', p_store, 'track', p_track, 'target_percent', 1));

  return v_rollout_id;
end;
$$;

create or replace function public.operator_record_health_snapshot(
  p_rollout_id uuid,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_crash_free_sessions_pct numeric,
  p_sync_success_pct numeric,
  p_auth_success_pct numeric,
  p_notification_success_pct numeric default null,
  p_support_ticket_count integer default 0,
  p_blocker_count integer default 0,
  p_sampled_sessions integer default 0,
  p_source text default 'aggregated'
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_source not in ('aggregated','manual_review') then raise exception 'invalid_health_source'; end if;
  if p_window_end <= p_window_start then raise exception 'invalid_health_window'; end if;

  insert into public.production_health_snapshots(
    rollout_id, window_start, window_end, source,
    crash_free_sessions_pct, sync_success_pct, auth_success_pct, notification_success_pct,
    support_ticket_count, blocker_count, sampled_sessions, recorded_by
  ) values (
    p_rollout_id, p_window_start, p_window_end, p_source,
    p_crash_free_sessions_pct, p_sync_success_pct, p_auth_success_pct, p_notification_success_pct,
    p_support_ticket_count, p_blocker_count, p_sampled_sessions, auth.uid()
  ) returning id into v_snapshot_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_health_recorded', 'production_health_snapshot', v_snapshot_id,
    jsonb_build_object('rollout_id', p_rollout_id, 'blockers', p_blocker_count, 'sampled_sessions', p_sampled_sessions));

  return v_snapshot_id;
end;
$$;

create or replace function public.operator_advance_rollout(
  p_rollout_id uuid,
  p_target_percent integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rollout public.production_rollouts%rowtype;
  v_health public.production_health_snapshots%rowtype;
  v_open_critical integer;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_target_percent not in (5,10,25,50,100) then raise exception 'invalid_rollout_step'; end if;

  select * into v_rollout from public.production_rollouts where id = p_rollout_id for update;
  if not found then raise exception 'production_rollout_not_found'; end if;
  if v_rollout.status not in ('active','paused') then raise exception 'production_rollout_not_active'; end if;
  if p_target_percent <= v_rollout.target_percent then raise exception 'rollout_target_must_increase'; end if;

  select * into v_health
  from public.production_health_snapshots
  where rollout_id = p_rollout_id
  order by created_at desc
  limit 1;
  if not found then raise exception 'recent_health_snapshot_required'; end if;
  if v_health.created_at < timezone('utc', now()) - interval '24 hours' then raise exception 'health_snapshot_stale'; end if;
  if v_health.crash_free_sessions_pct < 99.00 then raise exception 'crash_free_threshold_not_met'; end if;
  if v_health.sync_success_pct < 97.00 then raise exception 'sync_threshold_not_met'; end if;
  if v_health.auth_success_pct < 98.00 then raise exception 'auth_threshold_not_met'; end if;
  if v_health.blocker_count > 0 then raise exception 'health_blockers_open:%', v_health.blocker_count; end if;

  select count(*) into v_open_critical
  from public.production_incidents
  where candidate_id = v_rollout.candidate_id and status <> 'resolved' and severity in ('sev1','sev2');
  if v_open_critical > 0 then raise exception 'critical_incident_open:%', v_open_critical; end if;

  update public.production_rollouts
  set target_percent = p_target_percent,
      status = case when p_target_percent = 100 then 'completed' else 'active' end,
      completed_at = case when p_target_percent = 100 then timezone('utc', now()) else null end
  where id = p_rollout_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_rollout_advanced', 'production_rollout', p_rollout_id,
    jsonb_build_object('from_percent', v_rollout.target_percent, 'to_percent', p_target_percent));
end;
$$;

create or replace function public.operator_pause_rollout(
  p_rollout_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  update public.production_rollouts
  set status = 'paused', notes = coalesce(nullif(trim(p_notes), ''), notes)
  where id = p_rollout_id and status = 'active';
  if not found then raise exception 'active_rollout_required'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_rollout_paused', 'production_rollout', p_rollout_id, '{}'::jsonb);
end;
$$;

create or replace function public.operator_rollback_rollout(
  p_rollout_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_candidate_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'rollback_reason_required'; end if;

  update public.production_rollouts
  set status = 'rolled_back', rolled_back_at = timezone('utc', now()), notes = trim(p_reason)
  where id = p_rollout_id and status in ('active','paused','completed')
  returning candidate_id into v_candidate_id;
  if not found then raise exception 'rollout_not_rollbackable'; end if;

  update public.release_candidates
  set status = 'rolled_back', rolled_back_at = timezone('utc', now()), notes = trim(p_reason)
  where id = v_candidate_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_rollout_rolled_back', 'production_rollout', p_rollout_id,
    jsonb_build_object('candidate_id', v_candidate_id, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.operator_open_incident(
  p_candidate_id uuid,
  p_rollout_id uuid,
  p_severity text,
  p_title text,
  p_summary text,
  p_technical_impact text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_incident_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_severity not in ('sev1','sev2','sev3','sev4') then raise exception 'invalid_incident_severity'; end if;

  insert into public.production_incidents(
    candidate_id, rollout_id, severity, status, title, summary, technical_impact,
    owner_user_id, created_by
  ) values (
    p_candidate_id, p_rollout_id, p_severity, 'open', trim(p_title), trim(p_summary),
    nullif(trim(p_technical_impact), ''), auth.uid(), auth.uid()
  ) returning id into v_incident_id;

  insert into public.production_incident_updates(incident_id, status, message, created_by)
  values (v_incident_id, 'open', 'Incidente aberto pelo console operacional.', auth.uid());

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_incident_opened', 'production_incident', v_incident_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'rollout_id', p_rollout_id, 'severity', p_severity));

  return v_incident_id;
end;
$$;

create or replace function public.operator_update_incident(
  p_incident_id uuid,
  p_status text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('open','monitoring','resolved') then raise exception 'invalid_incident_status'; end if;
  if length(trim(p_message)) < 5 then raise exception 'incident_update_required'; end if;

  update public.production_incidents
  set status = p_status,
      resolved_at = case when p_status = 'resolved' then timezone('utc', now()) else null end
  where id = p_incident_id;
  if not found then raise exception 'production_incident_not_found'; end if;

  insert into public.production_incident_updates(incident_id, status, message, created_by)
  values (p_incident_id, p_status, trim(p_message), auth.uid());

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'production_incident_updated', 'production_incident', p_incident_id,
    jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.operator_register_store_submission(uuid,uuid,text,text,text,text,text) from public;
grant execute on function public.operator_register_store_submission(uuid,uuid,text,text,text,text,text) to authenticated;
revoke all on function public.operator_update_store_submission(uuid,text,text,text) from public;
grant execute on function public.operator_update_store_submission(uuid,text,text,text) to authenticated;
revoke all on function public.operator_start_rollout(uuid,uuid,text,text,text) from public;
grant execute on function public.operator_start_rollout(uuid,uuid,text,text,text) to authenticated;
revoke all on function public.operator_record_health_snapshot(uuid,timestamptz,timestamptz,numeric,numeric,numeric,numeric,integer,integer,integer,text) from public;
grant execute on function public.operator_record_health_snapshot(uuid,timestamptz,timestamptz,numeric,numeric,numeric,numeric,integer,integer,integer,text) to authenticated;
revoke all on function public.operator_advance_rollout(uuid,integer) from public;
grant execute on function public.operator_advance_rollout(uuid,integer) to authenticated;
revoke all on function public.operator_pause_rollout(uuid,text) from public;
grant execute on function public.operator_pause_rollout(uuid,text) to authenticated;
revoke all on function public.operator_rollback_rollout(uuid,text) from public;
grant execute on function public.operator_rollback_rollout(uuid,text) to authenticated;
revoke all on function public.operator_open_incident(uuid,uuid,text,text,text,text) from public;
grant execute on function public.operator_open_incident(uuid,uuid,text,text,text,text) to authenticated;
revoke all on function public.operator_update_incident(uuid,text,text) from public;
grant execute on function public.operator_update_incident(uuid,text,text) to authenticated;

commit;
