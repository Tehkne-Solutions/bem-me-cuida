begin;

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
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;

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
  values (
    auth.uid(), 'release_candidate_created', 'release_candidate', v_candidate_id,
    jsonb_build_object('version', trim(p_version), 'rc_number', p_rc_number)
  );

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
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('pending','passed','failed','waived') then raise exception 'invalid_gate_status'; end if;

  update public.release_gates
  set status = p_status,
      evidence = nullif(trim(p_evidence), ''),
      checked_by = auth.uid(),
      checked_at = case when p_status = 'pending' then null else timezone('utc', now()) end
  where candidate_id = p_candidate_id and gate_key = p_gate_key;

  if not found then raise exception 'release_gate_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'release_gate_updated', 'release_candidate', p_candidate_id,
    jsonb_build_object('gate_key', p_gate_key, 'status', p_status)
  );
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
  if trim(p_artifact_url) !~ '^https://' then raise exception 'artifact_url_must_use_https'; end if;
  if nullif(trim(p_artifact_sha256), '') is not null and trim(p_artifact_sha256) !~ '^[A-Fa-f0-9]{64}$' then
    raise exception 'invalid_artifact_sha256';
  end if;

  insert into public.release_builds(
    candidate_id, platform, build_profile, build_number, artifact_url,
    artifact_sha256, audience, status, created_by
  ) values (
    p_candidate_id, p_platform, trim(p_build_profile), trim(p_build_number), trim(p_artifact_url),
    nullif(trim(p_artifact_sha256), ''), p_audience, 'available', auth.uid()
  ) returning id into v_build_id;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'release_build_registered', 'release_build', v_build_id,
    jsonb_build_object('candidate_id', p_candidate_id, 'platform', p_platform, 'audience', p_audience)
  );

  return v_build_id;
end;
$$;

create or replace function public.operator_revoke_release_build(
  p_build_id uuid,
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
  if length(trim(p_reason)) < 5 then raise exception 'revocation_reason_required'; end if;

  update public.release_builds
  set status = 'revoked'
  where id = p_build_id and status <> 'revoked'
  returning candidate_id into v_candidate_id;
  if not found then raise exception 'release_build_not_found_or_revoked'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'release_build_revoked', 'release_build', p_build_id,
    jsonb_build_object('candidate_id', v_candidate_id, 'reason', left(trim(p_reason), 500))
  );
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
declare
  v_pending_gates integer;
  v_available_android integer;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;
  if p_status not in ('draft','qa','blocked','approved','rolled_back') then raise exception 'invalid_release_status'; end if;

  if p_status = 'approved' then
    select count(*) into v_pending_gates
    from public.release_gates
    where candidate_id = p_candidate_id and required and status <> 'passed';
    if v_pending_gates > 0 then raise exception 'required_release_gates_pending:%', v_pending_gates; end if;

    select count(*) into v_available_android
    from public.release_builds
    where candidate_id = p_candidate_id and platform = 'android' and status = 'available';
    if v_available_android = 0 then raise exception 'android_build_required'; end if;
  end if;

  update public.release_candidates
  set status = p_status,
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
      rolled_back_at = case when p_status = 'rolled_back' then timezone('utc', now()) else rolled_back_at end
  where id = p_candidate_id;
  if not found then raise exception 'release_candidate_not_found'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'release_status_changed', 'release_candidate', p_candidate_id,
    jsonb_build_object('status', p_status)
  );
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
  values (
    auth.uid(), 'beta_feedback_triaged', 'beta_feedback', p_feedback_id,
    jsonb_build_object('status', p_status, 'priority', p_priority, 'candidate_id', p_candidate_id)
  );
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
  values (
    auth.uid(), 'beta_tester_status_changed', 'beta_tester', p_user_id,
    jsonb_build_object('status', p_status)
  );
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
  v_status text;
begin
  if not public.is_release_operator() then raise exception 'release_operator_required'; end if;

  select status into v_status from public.release_candidates where id = p_candidate_id;
  if v_status is null then raise exception 'release_candidate_not_found'; end if;
  if v_status <> 'approved' then raise exception 'release_must_be_approved'; end if;

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
  where id = p_candidate_id and status = 'approved';
  if not found then raise exception 'release_candidate_not_promotable'; end if;

  insert into public.operator_audit_log(operator_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'release_promoted', 'release_candidate', p_candidate_id,
    jsonb_build_object('required_gates', 'passed', 'android_builds', v_available_builds)
  );
end;
$$;

revoke all on function public.operator_create_release_candidate(text,integer,text,text) from public;
revoke all on function public.operator_set_release_gate(uuid,text,text,text) from public;
revoke all on function public.operator_register_release_build(uuid,text,text,text,text,text,text) from public;
revoke all on function public.operator_revoke_release_build(uuid,text) from public;
revoke all on function public.operator_set_release_status(uuid,text,text) from public;
revoke all on function public.operator_update_feedback(uuid,text,text,text,uuid) from public;
revoke all on function public.operator_set_tester_status(uuid,text) from public;
revoke all on function public.operator_promote_release(uuid) from public;

grant execute on function public.operator_create_release_candidate(text,integer,text,text) to authenticated;
grant execute on function public.operator_set_release_gate(uuid,text,text,text) to authenticated;
grant execute on function public.operator_register_release_build(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.operator_revoke_release_build(uuid,text) to authenticated;
grant execute on function public.operator_set_release_status(uuid,text,text) to authenticated;
grant execute on function public.operator_update_feedback(uuid,text,text,text,uuid) to authenticated;
grant execute on function public.operator_set_tester_status(uuid,text) to authenticated;
grant execute on function public.operator_promote_release(uuid) to authenticated;

commit;
