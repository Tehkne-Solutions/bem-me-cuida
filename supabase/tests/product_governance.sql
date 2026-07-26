begin;
select plan(57);

select has_table('public','product_slos','product_slos existe');
select has_table('public','slo_measurements','slo_measurements existe');
select has_table('public','postmortem_reports','postmortem_reports existe');
select has_table('public','corrective_actions','corrective_actions existe');
select has_table('public','capacity_cost_snapshots','capacity_cost_snapshots existe');
select has_table('public','maintenance_windows','maintenance_windows existe');
select has_table('public','dependency_reviews','dependency_reviews existe');
select has_table('public','product_cycles','product_cycles existe');

select has_column('public','slo_measurements','burn_rate','burn rate existe');
select has_column('public','slo_measurements','error_budget_consumed_pct','orçamento de erro existe');
select has_column('public','postmortem_reports','approved_by','aprovação do postmortem existe');
select has_column('public','capacity_cost_snapshots','estimated_cost_brl','custo em BRL existe');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='product_slos' and c.relrowsecurity),'RLS ativa em product_slos');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='slo_measurements' and c.relrowsecurity),'RLS ativa em slo_measurements');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='postmortem_reports' and c.relrowsecurity),'RLS ativa em postmortem_reports');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='corrective_actions' and c.relrowsecurity),'RLS ativa em corrective_actions');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='capacity_cost_snapshots' and c.relrowsecurity),'RLS ativa em capacity_cost_snapshots');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='maintenance_windows' and c.relrowsecurity),'RLS ativa em maintenance_windows');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='dependency_reviews' and c.relrowsecurity),'RLS ativa em dependency_reviews');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='product_cycles' and c.relrowsecurity),'RLS ativa em product_cycles');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='product_slos' and policyname='product_slos_operator_select'),'policy de SLO existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='slo_measurements' and policyname='slo_measurements_operator_select'),'policy de medição existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='postmortem_reports' and policyname='postmortem_reports_operator_select'),'policy de postmortem existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='corrective_actions' and policyname='corrective_actions_operator_select'),'policy de ação corretiva existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='capacity_cost_snapshots' and policyname='capacity_cost_operator_select'),'policy de capacidade existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='maintenance_windows' and policyname='maintenance_windows_operator_select'),'policy de manutenção existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='dependency_reviews' and policyname='dependency_reviews_operator_select'),'policy de dependência existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='product_cycles' and policyname='product_cycles_operator_select'),'policy de ciclo existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_upsert_product_slo'),'RPC de SLO existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_record_slo_measurement'),'RPC de medição SLO existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_postmortem'),'RPC de postmortem existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_request_postmortem_review'),'RPC de revisão do postmortem existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_postmortem'),'RPC de decisão do postmortem existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_corrective_action'),'RPC de ação corretiva existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_corrective_action'),'RPC de atualização corretiva existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_record_capacity_cost'),'RPC de capacidade e custo existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_maintenance_window'),'RPC de janela de manutenção existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_request_maintenance_approval'),'RPC de aprovação de manutenção existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_maintenance_window'),'RPC de decisão de manutenção existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_dependency_review'),'RPC de revisão de dependência existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_dependency_review'),'RPC de atualização de dependência existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_product_cycle'),'RPC de ciclo existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_request_cycle_approval'),'RPC de aprovação de ciclo existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_product_cycle'),'RPC de decisão de ciclo existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_product_cycle_status'),'RPC de estado do ciclo existe');

select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='product_slos_active_updated'),'índice de SLO existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='slo_measurements_slo_created'),'índice de medição existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='postmortem_reports_status_updated'),'índice de postmortem existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='corrective_actions_status_due'),'índice de ações existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='capacity_cost_period'),'índice de capacidade existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='maintenance_windows_status_start'),'índice de manutenção existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='dependency_reviews_status_risk'),'índice de dependências existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='product_cycles_status_target'),'índice de ciclos existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_postmortem' and p.prosecdef),'decisão de postmortem usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_maintenance_window' and p.prosecdef),'decisão de manutenção usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_product_cycle' and p.prosecdef),'decisão de ciclo usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_record_slo_measurement' and p.prosecdef),'medição SLO usa security definer');

select * from finish();
rollback;
