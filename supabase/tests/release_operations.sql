begin;
select plan(25);

select has_table('public','release_candidates','release_candidates existe');
select has_table('public','release_gates','release_gates existe');
select has_table('public','release_builds','release_builds existe');
select has_table('public','operator_audit_log','operator_audit_log existe');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='release_candidates' and c.relrowsecurity),'RLS ativa em release_candidates');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='release_gates' and c.relrowsecurity),'RLS ativa em release_gates');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='release_builds' and c.relrowsecurity),'RLS ativa em release_builds');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='operator_audit_log' and c.relrowsecurity),'RLS ativa em operator_audit_log');

select has_column('public','beta_feedback','priority','priority existe em beta_feedback');
select has_column('public','beta_feedback','operator_notes','operator_notes existe em beta_feedback');
select has_column('public','beta_feedback','assigned_to','assigned_to existe em beta_feedback');
select has_column('public','beta_feedback','candidate_id','candidate_id existe em beta_feedback');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='release_candidates' and policyname='release_candidates_operator_select'),'policy de candidatos para operador existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='release_gates' and policyname='release_gates_operator_select'),'policy de gates para operador existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='release_builds' and policyname='release_builds_operator_select'),'policy de builds para operador existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='operator_audit_log' and policyname='operator_audit_log_operator_select'),'policy de auditoria para operador existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='beta_feedback' and policyname='beta_feedback_operator_select'),'policy de feedback para operador existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_release_candidate'),'RPC de criação de candidato existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_set_release_gate'),'RPC de gate existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_register_release_build'),'RPC de registro de build existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_revoke_release_build'),'RPC de revogação de build existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_set_release_status'),'RPC de status da release existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_feedback'),'RPC de triagem existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_set_tester_status'),'RPC de tester existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_promote_release'),'RPC de promoção existe');

select * from finish();
rollback;
