begin;
select plan(18);

select has_table('public', 'mood_checkins', 'mood_checkins existe');
select row_security_active('public.mood_checkins');
select has_policy('public', 'mood_checkins', 'checkins_select_own');
select has_policy('public', 'mood_checkins', 'checkins_insert_own');

select has_table('public', 'medications', 'medications existe');
select row_security_active('public.medications');
select has_policy('public', 'medications', 'medications_select_own');
select has_policy('public', 'medications', 'medications_insert_own');

select has_table('public', 'medication_schedules', 'medication_schedules existe');
select row_security_active('public.medication_schedules');

select has_table('public', 'medication_intakes', 'medication_intakes existe');
select row_security_active('public.medication_intakes');

select has_table('public', 'care_practices', 'care_practices existe');
select row_security_active('public.care_practices');
select has_policy('public', 'care_practices', 'care_practices_select_own');
select has_policy('public', 'care_practices', 'care_practices_insert_own');

select has_table('public', 'care_practice_completions', 'care_practice_completions existe');
select row_security_active('public.care_practice_completions');

select * from finish();
rollback;
