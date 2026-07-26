begin;

create or replace function public.operator_create_hotfix(
  p_version text,
  p_kind text,
  p_severity text,
  p_title text,
  p_summary text,
  p_target_runtime_version text,
  p_target_channel text,
  p_source_commit text,
  p_native_changes boolean default false,
  p_requires_binary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hotfix_id uuid;
  v_requires_binary boolean;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_kind not in ('ota','binary') then raise exception 'invalid_hotfix_kind'; end if;
  if p_severity not in ('critical','high','medium','low') then raise exception 'invalid_hotfix_severity'; end if;
  if p_target_channel not in ('production','hotfix-validation') then raise exception 'invalid_hotfix_channel'; end if;
  if trim(p_version) !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][A-Za-z0-9.-]+)?$' then raise exception 'invalid_hotfix_version'; end if;
  if trim(p_source_commit) !~ '^[A-Fa-f0-9]{7,40}$' then raise exception 'invalid_source_commit'; end if;
  if p_kind = 'ota' and (p_native_changes or p_requires_binary) then raise exception 'ota_cannot_include_native_changes'; end if;

  v_requires_binary := case when p_kind = 'binary' then true else false end;

  insert into public.maintenance_hotfixes(
    version, kind, severity, title, summary, target_runtime_version, target_channel,
    source_commit, native_changes, requires_binary, created_by
  ) values (
    trim(p_version), p_kind, p_severity, trim(p_title), trim(p_summary),
    trim(p_target_runtime_version), p_target_channel, lower(trim(p_source_commit)),
    p_native_changes, v_requires_binary, auth.uid()
  ) returning id into v_hotfix_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'hotfix_created', 'hotfix', v_hotfix_id,
    jsonb_build_object(
      'version', trim(p_version),
      'kind', p_kind,
      'severity', p_severity,
      'target_runtime_version', trim(p_target_runtime_version),
      'target_channel', p_target_channel,
      'native_changes', p_native_changes
    ));

  return v_hotfix_id;
end;
$$;

create or replace function public.operator_request_hotfix_approval(p_hotfix_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;

  update public.maintenance_hotfixes
  set status = 'awaiting_approval'
  where id = p_hotfix_id and status = 'draft';
  if not found then raise exception 'draft_hotfix_required'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'hotfix_approval_requested', 'hotfix', p_hotfix_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_decide_hotfix(
  p_hotfix_id uuid,
  p_decision text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator uuid;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_approval_decision'; end if;

  select created_by into v_creator
  from public.maintenance_hotfixes
  where id = p_hotfix_id and status = 'awaiting_approval'
  for update;
  if not found then raise exception 'hotfix_not_awaiting_approval'; end if;
  if v_creator = auth.uid() then raise exception 'four_eyes_approval_required'; end if;

  insert into public.operation_approvals(entity_type, entity_id, decision, comment, decided_by)
  values ('hotfix', p_hotfix_id, p_decision, nullif(trim(p_comment), ''), auth.uid());

  update public.maintenance_hotfixes
  set status = case when p_decision = 'approved' then 'approved' else 'cancelled' end,
      approved_at = case when p_decision = 'approved' then timezone('utc', now()) else null end
  where id = p_hotfix_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'hotfix_decided', 'hotfix', p_hotfix_id,
    jsonb_build_object('decision', p_decision, 'comment_present', nullif(trim(p_comment), '') is not null));
end;
$$;

create or replace function public.operator_register_hotfix_artifact(
  p_hotfix_id uuid,
  p_platform text,
  p_build_number text,
  p_artifact_url text,
  p_artifact_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artifact_id uuid;
  v_kind text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_platform not in ('android','ios') then raise exception 'invalid_hotfix_platform'; end if;
  if trim(p_artifact_url) !~ '^https://' then raise exception 'artifact_https_required'; end if;
  if trim(p_artifact_sha256) !~ '^[A-Fa-f0-9]{64}$' then raise exception 'invalid_artifact_sha256'; end if;

  select kind into v_kind
  from public.maintenance_hotfixes
  where id = p_hotfix_id and status in ('approved','building','ready')
  for update;
  if not found then raise exception 'approved_binary_hotfix_required'; end if;
  if v_kind <> 'binary' then raise exception 'binary_hotfix_required'; end if;

  insert into public.hotfix_artifacts(
    hotfix_id, platform, build_number, artifact_url, artifact_sha256, created_by
  ) values (
    p_hotfix_id, p_platform, trim(p_build_number), trim(p_artifact_url), lower(trim(p_artifact_sha256)), auth.uid()
  )
  on conflict (hotfix_id, platform, build_number) do update
    set artifact_url = excluded.artifact_url,
        artifact_sha256 = excluded.artifact_sha256,
        status = 'available'
  returning id into v_artifact_id;

  update public.maintenance_hotfixes
  set status = case when p_platform = 'android' then 'ready' else 'building' end
  where id = p_hotfix_id and status in ('approved','building');

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'hotfix_artifact_registered', 'hotfix_artifact', v_artifact_id,
    jsonb_build_object('hotfix_id', p_hotfix_id, 'platform', p_platform, 'build_number', trim(p_build_number)));

  return v_artifact_id;
end;
$$;

create or replace function public.operator_deploy_binary_hotfix(p_hotfix_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;

  if not exists (
    select 1 from public.maintenance_hotfixes
    where id = p_hotfix_id and kind = 'binary' and status in ('ready','approved')
  ) then raise exception 'binary_hotfix_not_ready'; end if;

  if not exists (
    select 1 from public.operation_approvals
    where entity_type = 'hotfix' and entity_id = p_hotfix_id and decision = 'approved'
  ) then raise exception 'hotfix_approval_required'; end if;

  if not exists (
    select 1 from public.hotfix_artifacts
    where hotfix_id = p_hotfix_id and platform = 'android' and status = 'available'
  ) then raise exception 'android_hotfix_artifact_required'; end if;

  update public.hotfix_artifacts set status = 'deployed'
  where hotfix_id = p_hotfix_id and status = 'available';

  update public.maintenance_hotfixes
  set status = 'deployed', deployed_at = timezone('utc', now())
  where id = p_hotfix_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'binary_hotfix_deployed', 'hotfix', p_hotfix_id, '{}'::jsonb);
end;
$$;

create or replace function public.operator_create_ota_plan(
  p_hotfix_id uuid,
  p_channel text,
  p_runtime_version text,
  p_message text,
  p_fingerprint_sha256 text,
  p_asset_count integer,
  p_rollout_percentage integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_hotfix public.maintenance_hotfixes%rowtype;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_channel not in ('production','hotfix-validation') then raise exception 'invalid_ota_channel'; end if;
  if p_rollout_percentage not in (1,5,10,25,50,100) then raise exception 'invalid_ota_rollout_percentage'; end if;
  if trim(p_fingerprint_sha256) !~ '^[A-Fa-f0-9]{64}$' then raise exception 'invalid_ota_fingerprint'; end if;

  select * into v_hotfix
  from public.maintenance_hotfixes
  where id = p_hotfix_id and status = 'approved'
  for update;
  if not found then raise exception 'approved_hotfix_required'; end if;
  if v_hotfix.kind <> 'ota' then raise exception 'ota_hotfix_required'; end if;
  if v_hotfix.native_changes or v_hotfix.requires_binary then raise exception 'ota_native_change_forbidden'; end if;
  if trim(p_runtime_version) <> v_hotfix.target_runtime_version then raise exception 'ota_runtime_mismatch'; end if;
  if p_channel <> v_hotfix.target_channel then raise exception 'ota_channel_mismatch'; end if;

  insert into public.ota_update_plans(
    hotfix_id, channel, runtime_version, message, fingerprint_sha256,
    asset_count, rollout_percentage, created_by
  ) values (
    p_hotfix_id, p_channel, trim(p_runtime_version), trim(p_message),
    lower(trim(p_fingerprint_sha256)), p_asset_count, p_rollout_percentage, auth.uid()
  ) returning id into v_plan_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ota_plan_created', 'ota_update', v_plan_id,
    jsonb_build_object(
      'hotfix_id', p_hotfix_id,
      'channel', p_channel,
      'runtime_version', trim(p_runtime_version),
      'asset_count', p_asset_count,
      'rollout_percentage', p_rollout_percentage
    ));

  return v_plan_id;
end;
$$;

create or replace function public.admin_decide_ota_plan(
  p_plan_id uuid,
  p_decision text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator uuid;
  v_hotfix_id uuid;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_approval_decision'; end if;

  select created_by, hotfix_id into v_creator, v_hotfix_id
  from public.ota_update_plans
  where id = p_plan_id and status = 'draft'
  for update;
  if not found then raise exception 'draft_ota_plan_required'; end if;
  if v_creator = auth.uid() then raise exception 'four_eyes_approval_required'; end if;

  insert into public.operation_approvals(entity_type, entity_id, decision, comment, decided_by)
  values ('ota_update', p_plan_id, p_decision, nullif(trim(p_comment), ''), auth.uid());

  update public.ota_update_plans
  set status = case when p_decision = 'approved' then 'approved' else 'cancelled' end
  where id = p_plan_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ota_plan_decided', 'ota_update', p_plan_id,
    jsonb_build_object('decision', p_decision, 'hotfix_id', v_hotfix_id));
end;
$$;

create or replace function public.operator_record_ota_publication(
  p_plan_id uuid,
  p_update_group_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hotfix_id uuid;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if length(trim(p_update_group_id)) < 8 then raise exception 'update_group_id_required'; end if;

  update public.ota_update_plans
  set status = 'published',
      update_group_id = trim(p_update_group_id),
      published_at = timezone('utc', now())
  where id = p_plan_id and status = 'approved'
  returning hotfix_id into v_hotfix_id;
  if not found then raise exception 'approved_ota_plan_required'; end if;

  if not exists (
    select 1 from public.operation_approvals
    where entity_type = 'ota_update' and entity_id = p_plan_id and decision = 'approved'
  ) then raise exception 'ota_plan_approval_required'; end if;

  update public.maintenance_hotfixes
  set status = 'deployed', deployed_at = timezone('utc', now())
  where id = v_hotfix_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ota_update_published', 'ota_update', p_plan_id,
    jsonb_build_object('hotfix_id', v_hotfix_id, 'update_group_id', trim(p_update_group_id)));
end;
$$;

create or replace function public.operator_rollback_hotfix(
  p_hotfix_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if length(trim(p_reason)) < 10 then raise exception 'rollback_reason_required'; end if;

  update public.maintenance_hotfixes
  set status = 'rolled_back', rolled_back_at = timezone('utc', now())
  where id = p_hotfix_id and status in ('deployed','ready','building');
  if not found then raise exception 'hotfix_not_rollbackable'; end if;

  update public.hotfix_artifacts
  set status = 'revoked'
  where hotfix_id = p_hotfix_id and status <> 'revoked';

  update public.ota_update_plans
  set status = 'rolled_back', rolled_back_at = timezone('utc', now())
  where hotfix_id = p_hotfix_id and status = 'published';

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'hotfix_rolled_back', 'hotfix', p_hotfix_id,
    jsonb_build_object('reason', trim(p_reason)));
end;
$$;

create or replace function public.admin_set_incident_legal_hold(
  p_incident_id uuid,
  p_legal_hold boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  update public.production_incidents set legal_hold = p_legal_hold where id = p_incident_id;
  if not found then raise exception 'incident_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'incident_legal_hold_changed', 'production_incident', p_incident_id,
    jsonb_build_object('legal_hold', p_legal_hold));
end;
$$;

create or replace function public.admin_set_audit_retention_hold(
  p_audit_id bigint,
  p_hold_until timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  update public.operator_audit_log
  set retention_hold_until = p_hold_until
  where id = p_audit_id;
  if not found then raise exception 'audit_entry_not_found'; end if;
end;
$$;

create or replace function public.admin_set_health_retention_hold(
  p_snapshot_id uuid,
  p_hold_until timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;
  update public.production_health_snapshots
  set retention_hold_until = p_hold_until
  where id = p_snapshot_id;
  if not found then raise exception 'health_snapshot_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'health_retention_hold_changed', 'production_health_snapshot', p_snapshot_id,
    jsonb_build_object('hold_until', p_hold_until));
end;
$$;

create or replace function public.admin_run_operations_retention(p_dry_run boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid;
  v_health_cutoff timestamptz := timezone('utc', now()) - interval '180 days';
  v_audit_cutoff timestamptz := timezone('utc', now()) - interval '365 days';
  v_incident_cutoff timestamptz := timezone('utc', now()) - interval '730 days';
  v_health_eligible integer := 0;
  v_audit_eligible integer := 0;
  v_incident_eligible integer := 0;
  v_health_deleted integer := 0;
  v_audit_deleted integer := 0;
  v_incident_deleted integer := 0;
begin
  if not public.is_release_admin() then raise exception 'release_admin_required'; end if;

  select count(*) into v_health_eligible
  from public.production_health_snapshots
  where created_at < v_health_cutoff
    and (retention_hold_until is null or retention_hold_until < timezone('utc', now()));

  select count(*) into v_audit_eligible
  from public.operator_audit_log
  where created_at < v_audit_cutoff
    and (retention_hold_until is null or retention_hold_until < timezone('utc', now()));

  select count(*) into v_incident_eligible
  from public.production_incident_updates u
  join public.production_incidents i on i.id = u.incident_id
  where u.created_at < v_incident_cutoff
    and i.status = 'resolved'
    and i.legal_hold = false;

  insert into public.operations_retention_runs(
    policy_version, dry_run, health_cutoff, audit_cutoff, incident_update_cutoff,
    eligible_health_count, eligible_audit_count, eligible_incident_update_count,
    created_by
  ) values (
    '2026-07-v1', p_dry_run, v_health_cutoff, v_audit_cutoff, v_incident_cutoff,
    v_health_eligible, v_audit_eligible, v_incident_eligible, auth.uid()
  ) returning id into v_run_id;

  if not p_dry_run then
    delete from public.production_health_snapshots
    where created_at < v_health_cutoff
      and (retention_hold_until is null or retention_hold_until < timezone('utc', now()));
    get diagnostics v_health_deleted = row_count;

    delete from public.production_incident_updates u
    using public.production_incidents i
    where i.id = u.incident_id
      and u.created_at < v_incident_cutoff
      and i.status = 'resolved'
      and i.legal_hold = false;
    get diagnostics v_incident_deleted = row_count;

    delete from public.operator_audit_log
    where created_at < v_audit_cutoff
      and (retention_hold_until is null or retention_hold_until < timezone('utc', now()));
    get diagnostics v_audit_deleted = row_count;
  end if;

  update public.operations_retention_runs
  set status = 'completed',
      deleted_health_count = v_health_deleted,
      deleted_audit_count = v_audit_deleted,
      deleted_incident_update_count = v_incident_deleted,
      executed_at = timezone('utc', now())
  where id = v_run_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'operations_retention_executed', 'retention_run', v_run_id,
    jsonb_build_object(
      'dry_run', p_dry_run,
      'eligible_health', v_health_eligible,
      'eligible_audit', v_audit_eligible,
      'eligible_incident_updates', v_incident_eligible,
      'deleted_health', v_health_deleted,
      'deleted_audit', v_audit_deleted,
      'deleted_incident_updates', v_incident_deleted
    ));

  return v_run_id;
end;
$$;

revoke all on function public.operator_create_hotfix(text,text,text,text,text,text,text,text,boolean,boolean) from public;
revoke all on function public.operator_request_hotfix_approval(uuid) from public;
revoke all on function public.admin_decide_hotfix(uuid,text,text) from public;
revoke all on function public.operator_register_hotfix_artifact(uuid,text,text,text,text) from public;
revoke all on function public.operator_deploy_binary_hotfix(uuid) from public;
revoke all on function public.operator_create_ota_plan(uuid,text,text,text,text,integer,integer) from public;
revoke all on function public.admin_decide_ota_plan(uuid,text,text) from public;
revoke all on function public.operator_record_ota_publication(uuid,text) from public;
revoke all on function public.operator_rollback_hotfix(uuid,text) from public;
revoke all on function public.admin_set_incident_legal_hold(uuid,boolean) from public;
revoke all on function public.admin_set_audit_retention_hold(bigint,timestamptz) from public;
revoke all on function public.admin_set_health_retention_hold(uuid,timestamptz) from public;
revoke all on function public.admin_run_operations_retention(boolean) from public;

grant execute on function public.operator_create_hotfix(text,text,text,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.operator_request_hotfix_approval(uuid) to authenticated;
grant execute on function public.admin_decide_hotfix(uuid,text,text) to authenticated;
grant execute on function public.operator_register_hotfix_artifact(uuid,text,text,text,text) to authenticated;
grant execute on function public.operator_deploy_binary_hotfix(uuid) to authenticated;
grant execute on function public.operator_create_ota_plan(uuid,text,text,text,text,integer,integer) to authenticated;
grant execute on function public.admin_decide_ota_plan(uuid,text,text) to authenticated;
grant execute on function public.operator_record_ota_publication(uuid,text) to authenticated;
grant execute on function public.operator_rollback_hotfix(uuid,text) to authenticated;
grant execute on function public.admin_set_incident_legal_hold(uuid,boolean) to authenticated;
grant execute on function public.admin_set_audit_retention_hold(bigint,timestamptz) to authenticated;
grant execute on function public.admin_set_health_retention_hold(uuid,timestamptz) to authenticated;
grant execute on function public.admin_run_operations_retention(boolean) to authenticated;

commit;
