begin;
select plan(12);

select has_table('public','beta_tester_enrollments','beta_tester_enrollments existe');
select has_column('public','beta_tester_enrollments','status','status da adesão existe');
select has_table('public','beta_feedback','beta_feedback existe');
select has_column('public','beta_feedback','diagnostic_snapshot','snapshot técnico existe');
select has_column('public','beta_feedback','technical_events','eventos técnicos existem');
select ok(exists(
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='beta_tester_enrollments' and c.relrowsecurity
),'RLS ativa em beta_tester_enrollments');
select ok(exists(
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='beta_feedback' and c.relrowsecurity
),'RLS ativa em beta_feedback');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_tester_enrollments' and policyname='beta_tester_enrollments_select_own'),'adesão permite select próprio');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_tester_enrollments' and policyname='beta_tester_enrollments_insert_own'),'adesão permite insert próprio');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_tester_enrollments' and policyname='beta_tester_enrollments_update_own'),'adesão permite update próprio');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_feedback' and policyname='beta_feedback_select_own'),'feedback permite select próprio');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_feedback' and policyname='beta_feedback_insert_own'),'feedback permite insert próprio');

select * from finish();
rollback;
