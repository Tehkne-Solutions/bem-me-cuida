begin;
select plan(61);

select has_table('public','cycle_backlog_items','cycle_backlog_items existe');
select has_table('public','cycle_objectives','cycle_objectives existe');
select has_table('public','cycle_key_results','cycle_key_results existe');
select has_table('public','cycle_scope_changes','cycle_scope_changes existe');
select has_table('public','product_experiments','product_experiments existe');
select has_table('public','experiment_measurements','experiment_measurements existe');
select has_table('public','delivery_milestones','delivery_milestones existe');
select has_table('public','cycle_release_gates','cycle_release_gates existe');

select has_column('public','cycle_backlog_items','priority_score','backlog possui priority_score');
select has_column('public','product_experiments','consent_required','experimento exige consentimento');
select has_column('public','experiment_measurements','sample_size','medição possui amostra agregada');
select has_column('public','cycle_release_gates','required','gate possui obrigatoriedade');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cycle_backlog_items'),'RLS ativa em backlog');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cycle_objectives'),'RLS ativa em objetivos');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cycle_key_results'),'RLS ativa em KRs');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cycle_scope_changes'),'RLS ativa em escopo');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='product_experiments'),'RLS ativa em experimentos');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='experiment_measurements'),'RLS ativa em medições');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='delivery_milestones'),'RLS ativa em marcos');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='cycle_release_gates'),'RLS ativa em gates');

select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='cycle_backlog_items' and policyname='cycle_backlog_items_operator_select'),'policy de backlog existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='cycle_objectives' and policyname='cycle_objectives_operator_select'),'policy de objetivos existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='cycle_key_results' and policyname='cycle_key_results_operator_select'),'policy de KRs existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='cycle_scope_changes' and policyname='cycle_scope_changes_operator_select'),'policy de escopo existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='product_experiments' and policyname='product_experiments_operator_select'),'policy de experimentos existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='experiment_measurements' and policyname='experiment_measurements_operator_select'),'policy de medições existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='delivery_milestones' and policyname='delivery_milestones_operator_select'),'policy de marcos existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='cycle_release_gates' and policyname='cycle_release_gates_operator_select'),'policy de gates existe');

select has_function('public','operator_upsert_cycle_backlog_item',array['uuid','uuid','text','text','text','integer','integer','integer','integer','uuid','timestamp with time zone'],'RPC de backlog existe');
select has_function('public','operator_update_cycle_backlog_status',array['uuid','text'],'RPC de status do backlog existe');
select has_function('public','operator_create_cycle_objective',array['uuid','text','text','integer'],'RPC de objetivo existe');
select has_function('public','operator_add_cycle_key_result',array['uuid','text','numeric','numeric','text','text'],'RPC de KR existe');
select has_function('public','operator_update_cycle_key_result',array['uuid','numeric','text'],'RPC de atualização de KR existe');
select has_function('public','operator_request_scope_change',array['uuid','uuid','text','text','text'],'RPC de mudança de escopo existe');
select has_function('public','admin_decide_scope_change',array['uuid','text','text'],'RPC de decisão de escopo existe');
select has_function('public','operator_create_experiment',array['uuid','text','text','text','text','text','text','timestamp with time zone','timestamp with time zone'],'RPC de experimento existe');
select has_function('public','operator_request_experiment_approval',array['uuid'],'RPC de aprovação de experimento existe');
select has_function('public','admin_decide_experiment',array['uuid','text'],'RPC de decisão de experimento existe');
select has_function('public','operator_update_experiment_status',array['uuid','text'],'RPC de status de experimento existe');
select has_function('public','operator_record_experiment_measurement',array['uuid','text','timestamp with time zone','timestamp with time zone','integer','integer','numeric','integer','text'],'RPC de medição agregada existe');
select has_function('public','operator_create_delivery_milestone',array['uuid','text','text','timestamp with time zone','uuid'],'RPC de marco existe');
select has_function('public','operator_update_delivery_milestone',array['uuid','text','text'],'RPC de atualização de marco existe');
select has_function('public','operator_initialize_cycle_release_gates',array['uuid'],'RPC de inicialização de gates existe');
select has_function('public','operator_set_cycle_release_gate',array['uuid','text','text'],'RPC de atualização de gate existe');
select has_function('public','operator_get_cycle_execution_blockers',array['uuid','text'],'RPC de bloqueadores existe');
select has_function('public','operator_update_product_cycle_status',array['uuid','text'],'RPC protegida de ciclo existe');

select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_scope_change' and p.prosecdef),'decisão de escopo usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='admin_decide_experiment' and p.prosecdef),'decisão de experimento usa security definer');
select ok(exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='operator_update_product_cycle_status' and p.prosecdef),'transição de ciclo usa security definer');

select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='cycle_backlog_items_cycle_priority'),'índice de prioridade existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='cycle_objectives_cycle_status'),'índice de objetivos existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='cycle_key_results_objective'),'índice de KRs existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='cycle_scope_changes_cycle_status'),'índice de escopo existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='product_experiments_cycle_status'),'índice de experimentos existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='experiment_measurements_experiment_period'),'índice de medições existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='delivery_milestones_cycle_due'),'índice de marcos existe');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='cycle_release_gates_cycle_status'),'índice de gates existe');

select col_default_is('public','product_experiments','consent_required','true','consentimento obrigatório por padrão');
select col_default_is('public','cycle_release_gates','required','true','gate obrigatório por padrão');
select col_default_is('public','product_experiments','status','draft','experimento começa em rascunho');
select col_default_is('public','cycle_scope_changes','status','pending','mudança começa pendente');

select * from finish();
rollback;
