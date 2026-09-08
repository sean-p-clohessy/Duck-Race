-- Run through the trusted Supabase SQL editor AFTER creating your Auth user.
-- Replace the two values below. No passwords belong in this script.
-- Rerunning does not promote an existing staff account or reactivate it silently.
do $$
declare
 admin_email text := 'REPLACE_WITH_YOUR_EMAIL';
 admin_name text := 'REPLACE_WITH_YOUR_NAME';
 user_id uuid;
begin
 if admin_email='REPLACE_WITH_YOUR_EMAIL' or admin_name='REPLACE_WITH_YOUR_NAME' then
   raise exception 'Set your admin email and name before running this script';
 end if;
 select id into user_id from auth.users where lower(email)=lower(btrim(admin_email));
 if user_id is null then
   raise exception 'Create the staff account through Supabase Auth first';
 end if;
 insert into public.staff(id,name,email,role,active)
 values(user_id,btrim(admin_name),lower(btrim(admin_email)),'admin',true)
 on conflict(id) do nothing;
end $$;
