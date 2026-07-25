begin;

create table public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  title text check (title is null or char_length(title) <= 120),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  mood text not null check (mood in ('very_low','low','neutral','good','very_good')),
  intensity smallint check (intensity is null or intensity between 0 and 10),
  tags text[] not null default '{}',
  flag_for_therapy boolean not null default false,
  archived boolean not null default false,
  client_updated_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  unique(id, user_id)
);

create index journal_entries_user_occurred_idx
  on public.journal_entries(user_id, archived, occurred_at desc)
  where deleted_at is null;
create index journal_entries_user_therapy_idx
  on public.journal_entries(user_id, flag_for_therapy, occurred_at desc)
  where deleted_at is null;

create trigger journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

alter table public.journal_entries enable row level security;

create policy "journal_entries_select_own" on public.journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal_entries_insert_own" on public.journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journal_entries_update_own" on public.journal_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journal_entries_delete_own" on public.journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.sync_journal_entry(p_record jsonb)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid := (p_record ->> 'id')::uuid;
  v_client_updated_at timestamptz := (p_record ->> 'client_updated_at')::timestamptz;
  v_existing timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if (p_record ->> 'user_id')::uuid <> v_user_id then raise exception 'account_scope_mismatch'; end if;

  select client_updated_at into v_existing
  from public.journal_entries where id = v_id and user_id = v_user_id;
  if v_existing is not null and v_existing > v_client_updated_at then return 'remote_newer'; end if;

  insert into public.journal_entries(
    id,user_id,occurred_at,title,body,mood,intensity,tags,flag_for_therapy,archived,
    client_updated_at,deleted_at
  ) values (
    v_id,v_user_id,(p_record ->> 'occurred_at')::timestamptz,nullif(p_record ->> 'title',''),
    p_record ->> 'body',p_record ->> 'mood',
    case when p_record ->> 'intensity' is null then null else (p_record ->> 'intensity')::smallint end,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_record -> 'tags','[]'::jsonb))),'{}'::text[]),
    coalesce((p_record ->> 'flag_for_therapy')::boolean,false),
    coalesce((p_record ->> 'archived')::boolean,false),v_client_updated_at,
    case when p_record ->> 'deleted_at' is null then null else (p_record ->> 'deleted_at')::timestamptz end
  ) on conflict(id) do update set
    occurred_at=excluded.occurred_at,title=excluded.title,body=excluded.body,mood=excluded.mood,
    intensity=excluded.intensity,tags=excluded.tags,flag_for_therapy=excluded.flag_for_therapy,
    archived=excluded.archived,client_updated_at=excluded.client_updated_at,
    deleted_at=excluded.deleted_at,updated_at=timezone('utc',now())
  where public.journal_entries.user_id=v_user_id
    and public.journal_entries.client_updated_at<=excluded.client_updated_at;

  return 'applied';
end;
$$;

create or replace function public.pull_journal_entries(
  p_cursor_updated_at timestamptz default '1970-01-01 00:00:00+00',
  p_cursor_id uuid default '00000000-0000-0000-0000-000000000000',
  p_limit integer default 250
)
returns table(
  id uuid,user_id uuid,occurred_at timestamptz,title text,body text,mood text,intensity smallint,
  tags text[],flag_for_therapy boolean,archived boolean,client_updated_at timestamptz,
  created_at timestamptz,updated_at timestamptz,deleted_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select j.id,j.user_id,j.occurred_at,j.title,j.body,j.mood,j.intensity,j.tags,j.flag_for_therapy,
    j.archived,j.client_updated_at,j.created_at,j.updated_at,j.deleted_at
  from public.journal_entries j
  where j.user_id=(select auth.uid())
    and (j.updated_at,j.id) > (p_cursor_updated_at,p_cursor_id)
  order by j.updated_at,j.id
  limit least(greatest(p_limit,1),500);
$$;

revoke all on function public.sync_journal_entry(jsonb) from public;
revoke all on function public.pull_journal_entries(timestamptz,uuid,integer) from public;
grant execute on function public.sync_journal_entry(jsonb) to authenticated;
grant execute on function public.pull_journal_entries(timestamptz,uuid,integer) to authenticated;

commit;
