begin;
select plan(30);

select has_table('public','store_submissions','store_submissions existe');
select has_table('public','production_rollouts','production_rollouts existe');
select has_table('public','production_health_snapshots','production_health_snapshots existe');
select has_table('public','production_incidents','production_incidents existe');
select has_table('public','production_incident_updates','production_incident_updates existe');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='store_submissions' and c.relrowsecurity),'RLS ativa em store_submissions');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='production_rollouts' and c.relrowsecurity),'RLS ativa em production_rollouts');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='production_health_snapshots' and c.relrowsecurity),'RLS ativa em production_health_snapshots');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='production_incidents' and c.relrowsecurity),'RLS ativa em production_incidents');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='production_incident_updates' and c.relrowsecurity),'RLS ativa em production_incident_updates');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='store_submissions' and policyname='store_submissions_operator_select'),'policy de submissões existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='production_rollouts' and policyname='production_rollouts_operator_select'),'policy de rollouts existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='production_health_snapshots' and policyname='production_health_operator_select'),'policy de saúde agregada existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='production_incidents' and policyname='production_incidents_operator_select'),'policy de incidentes existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='production_incident_updates' and policyname='production_incident_updates_operator_select'),'policy da timeline existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_register_store_submission'),'RPC de submissão existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_store_submission'),'RPC de atualização da submissão existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_start_rollout'),'RPC de início do rollout existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_record_health_snapshot'),'RPC de saúde agregada existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_advance_rollout'),'RPC de avanço existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_pause_rollout'),'RPC de pausa existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_rollback_rollout'),'RPC de rollback existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_open_incident'),'RPC de abertura de incidente existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_incident'),'RPC de atualização de incidente existe');

select has_column('public','store_submissions','external_reference','referência externa existe');
select has_column('public','production_rollouts','target_percent','percentual do rollout existe');
select has_column('public','production_health_snapshots','crash_free_sessions_pct','métrica crash-free existe');
select has_column('public','production_health_snapshots','blocker_count','contagem de bloqueadores existe');
select has_column('public','production_incidents','severity','severidade existe');
select has_column('public','production_incident_updates','message','mensagem da timeline existe');

select * from finish();
rollback;
