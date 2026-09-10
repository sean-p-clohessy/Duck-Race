-- Run after schema.sql, categories.sql and policies.sql in a TEST PROJECT.
-- Transactional: creates fictional identities/records and rolls everything back.
-- The final SELECT must report success; any violation aborts this transaction.
begin;
insert into auth.users(id,email) values
 ('f1000000-0000-4000-8000-000000000001','duck-staff-check@example.invalid'),
 ('f1000000-0000-4000-8000-000000000002','duck-admin-check@example.invalid'),
 ('f1000000-0000-4000-8000-000000000003','duck-outsider-check@example.invalid');
insert into public.staff(id,name,email,role) values
 ('f1000000-0000-4000-8000-000000000001','Test staff','duck-staff-check@example.invalid','staff'),
 ('f1000000-0000-4000-8000-000000000002','Test admin','duck-admin-check@example.invalid','admin');
insert into public.learners(id,first_name,surname_initial,course_or_group) values
 ('f2000000-0000-4000-8000-000000000001','PolicyTest','T','PRIVATE GROUP');

set local role anon;
do $$ begin
 begin
   perform * from public.learners;
   raise exception 'FAIL: anonymous learner table access';
 exception when insufficient_privilege then null; end;
 begin
   insert into public.duck_awards(learner_id,staff_id,category) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','helping');
   raise exception 'FAIL: anonymous write';
 exception when insufficient_privilege then null; end;
 perform public.public_race(current_date-30,current_date+1,12);
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000003',true);
do $$ begin
 if exists(select 1 from public.learners) then raise exception 'FAIL: unauthorised account can read learners';end if;
 begin
   insert into public.duck_awards(learner_id,staff_id,category) values('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003','helping');
   raise exception 'FAIL: unauthorised account can award';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
insert into public.duck_awards(id,learner_id,category,public_message,awarded_at)
values('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','helping','A fictional public test message.',now()-interval '10 days');
do $$ declare removed integer;begin
 if not exists(select 1 from public.duck_awards where id='f3000000-0000-4000-8000-000000000001' and staff_id=auth.uid() and awarded_at=now()) then raise exception 'FAIL: database did not stamp award identity/time';end if;
 delete from public.duck_awards where id='f3000000-0000-4000-8000-000000000001';get diagnostics removed=row_count;
 if removed<>0 then raise exception 'FAIL: normal staff can delete';end if;
 begin
  update public.staff set role='admin' where id=auth.uid();raise exception 'FAIL: staff can elevate own role';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.duck_awards(learner_id,category,public_message) values('f2000000-0000-4000-8000-000000000001','helping',repeat('x',101));raise exception 'FAIL: long public message accepted';
 exception when check_violation then null;end;
end $$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $$ declare payload jsonb;removed integer;begin
 payload:=public.public_race(current_date-30,current_date+1,50);
 if payload::text not like '%PRIVATE GROUP%' or payload::text like '%duck-staff-check%' then raise exception 'FAIL: public projection course/staff fields incorrect';end if;
 update public.learners set active=false where id='f2000000-0000-4000-8000-000000000001';
 payload:=public.public_race(current_date-30,current_date+1,50);
 if payload::text like '%PolicyTest%' then raise exception 'FAIL: inactive learner still public';end if;
 if not public.delete_learner('f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL: admin cannot delete learner';end if;
 if exists(select 1 from public.learners where id='f2000000-0000-4000-8000-000000000001') or exists(select 1 from public.duck_awards where learner_id='f2000000-0000-4000-8000-000000000001') then raise exception 'FAIL: learner deletion was incomplete';end if;
end $$;
reset role;
select 'PASS: anonymous isolation, staff authorisation, admin actions, timestamp integrity and public privacy' as result;
rollback;
