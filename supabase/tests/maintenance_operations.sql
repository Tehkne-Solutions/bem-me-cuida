begin;
select plan(38);

select has_table('public','maintenance_hotfixes','maintenance_hotfixes existe');
select has_table('public','operation_approvals','operation_approvals existe');
select has_table('public','hotfix_artifacts','hotfix_artifacts existe');
select has_table('public','ota_update_plans','ota_update_plans existe');
select has_table('public','operations_retention_runs','operations_retention_runs existe');

select has_column('public','operator_audit_log','retention_hold_until','hold de auditoria existe');
select has_column('public','production_health_snapshots','retention_hold_until','hold de saúde técnica existe');
select has_column('public','production_incidents','legal_hold','legal hold de incidente existe');

select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='maintenance_hotfixes' and c.relrowsecurity),'RLS ativa em maintenance_hotfixes');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='operation_approvals' and c.relrowsecurity),'RLS ativa em operation_approvals');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='hotfix_artifacts' and c.relrowsecurity),'RLS ativa em hotfix_artifacts');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='ota_update_plans' and c.relrowsecurity),'RLS ativa em ota_update_plans');
select ok(exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='operations_retention_runs' and c.relrowsecurity),'RLS ativa em operations_retention_runs');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='maintenance_hotfixes' and policyname='maintenance_hotfixes_operator_select'),'policy de hotfix existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='operation_approvals' and policyname='operation_approvals_operator_select'),'policy de aprovações existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='hotfix_artifacts' and policyname='hotfix_artifacts_operator_select'),'policy de artefatos existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='ota_update_plans' and policyname='ota_update_plans_operator_select'),'policy de OTA existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='operations_retention_runs' and policyname='operations_retention_runs_operator_select'),'policy de retenção existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_release_admin'),'helper de release_admin existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_hotfix'),'RPC de criação de hotfix existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_request_hotfix_approval'),'RPC de solicitação de aprovação existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_hotfix'),'RPC de decisão do hotfix existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_register_hotfix_artifact'),'RPC de artefato existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_deploy_binary_hotfix'),'RPC de deploy binário existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_create_ota_plan'),'RPC de plano OTA existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_ota_plan'),'RPC de aprovação OTA existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_record_ota_publication'),'RPC de publicação OTA existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_rollback_hotfix'),'RPC de rollback de hotfix existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_set_incident_legal_hold'),'RPC de legal hold existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_set_audit_retention_hold'),'RPC de hold de auditoria existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_set_health_retention_hold'),'RPC de hold de saúde existe');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_run_operations_retention'),'RPC de retenção existe');

select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='maintenance_hotfixes_status_updated'),'índice de hotfix existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='operation_approvals_entity'),'índice de aprovações existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='ota_update_plans_status_updated'),'índice OTA existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='operator_audit_log_retention'),'índice de retenção de auditoria existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_hotfix' and p.prosecdef),'aprovação de hotfix usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_run_operations_retention' and p.prosecdef),'retenção usa security definer');

select * from finish();
rollback;
