begin;
select plan(8);

select has_table('public','journal_entries','journal_entries existe');
select has_column('public','journal_entries','emotions','journal_entries possui emoções estruturadas');
select has_column('public','journal_entries','for_therapy','journal_entries possui marcação para consulta');
select ok(
  exists(
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'journal_entries' and c.relrowsecurity
  ),
  'RLS ativa em journal_entries'
);
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='journal_entries' and policyname='journal_entries_select_own'),'journal_entries_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='journal_entries' and policyname='journal_entries_insert_own'),'journal_entries_insert_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='journal_entries' and policyname='journal_entries_update_own'),'journal_entries_update_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='journal_entries' and policyname='journal_entries_delete_own'),'journal_entries_delete_own existe');

select * from finish();
rollback;
