begin;
select plan(18);

select has_table('public', 'mood_checkins', 'mood_checkins existe');
select row_security_active('public.mood_checkins');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='mood_checkins' and policyname='checkins_select_own'),'checkins_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='mood_checkins' and policyname='checkins_insert_own'),'checkins_insert_own existe');

select has_table('public', 'medications', 'medications existe');
select row_security_active('public.medications');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='medications' and policyname='medications_select_own'),'medications_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='medications' and policyname='medications_insert_own'),'medications_insert_own existe');

select has_table('public', 'medication_schedules', 'medication_schedules existe');
select row_security_active('public.medication_schedules');

select has_table('public', 'medication_intakes', 'medication_intakes existe');
select row_security_active('public.medication_intakes');

select has_table('public', 'care_practices', 'care_practices existe');
select row_security_active('public.care_practices');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='care_practices' and policyname='care_practices_select_own'),'care_practices_select_own existe');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='care_practices' and policyname='care_practices_insert_own'),'care_practices_insert_own existe');

select has_table('public', 'care_practice_completions', 'care_practice_completions existe');
select row_security_active('public.care_practice_completions');

select * from finish();
rollback;
