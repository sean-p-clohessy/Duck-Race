-- OPTIONAL fictional demo, ONLY for a dedicated test Supabase project.
-- First create a test user through Supabase Auth and provision it in public.staff.
-- This script chooses the first active admin to own the fictional awards.
-- It is idempotent. No real users or authentication passwords are created.
do $$
declare staff_uuid uuid; learner_uuid uuid; i integer; j integer; stamp timestamptz;
 names text[]:=array['Alex','Jamie','Sam','Casey','Jordan','Morgan','Oliver','Riley','Taylor','Robin','Drew','Avery','Elliot','Quinn','Charlie','Harper','Finley','Rowan'];
 initials text[]:=array['R','T','K','M','P','L','M','B','H','W','C','D','F','S','N','J','G','E'];
 totals integer[]:=array[14,12,10,9,7,6,5,5,4,4,3,3,2,2,1,1,1,0];
 monthly integer[]:=array[3,5,2,4,1,2,1,2,1,1,1,1,1,1,1,1,1,0];
 cats text[]:=array['creativity','helping','improvement','above-beyond','professional','resilience','outstanding-work','contribution'];
 messages text[]:=array['Developed an elegant solution to a difficult Python problem.','Supported another learner through a challenging networking task.','Produced their strongest piece of project work so far.','Completed additional work on their game environment.','Took responsibility for organising their project team.','Persisted through technical issues and successfully solved the problem.'];
begin
 select id into staff_uuid from public.staff where active and role='admin' order by id limit 1;
 if staff_uuid is null then raise exception 'Provision a test admin in public.staff first';end if;
 for i in 1..18 loop
   learner_uuid:=('d0000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
   insert into public.learners(id,first_name,surname_initial,course_or_group) values(learner_uuid,names[i],initials[i],(array['Level 3 Computing','T Level Digital','Level 2 IT'])[1+(i-1)%3]) on conflict(id) do nothing;
   for j in 1..totals[i] loop
     stamp:=case when j<=monthly[i] then now()-(j-1)*interval '20 minutes' else date_trunc('month',now())-interval '10 days'+j*interval '1 hour' end;
     insert into public.duck_awards(id,learner_id,staff_id,category,public_message,awarded_at)
     values(('a0000000-0000-4000-8000-'||lpad((i*100+j)::text,12,'0'))::uuid,learner_uuid,staff_uuid,cats[1+(i+j-2)%8],case when j=1 then messages[1+(i-1)%6] else null end,stamp)
     on conflict(id) do nothing;
   end loop;
 end loop;
end $$;
