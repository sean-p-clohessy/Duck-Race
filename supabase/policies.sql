begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
-- Fixed search_path and fully qualified relations avoid object-shadowing attacks.
-- This helper avoids recursive RLS on staff. Browser users cannot create staff rows.
create or replace function private.is_staff(require_admin boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.staff s where s.id=(select auth.uid()) and s.active
 and (not require_admin or s.role='admin'));
$$;
revoke all on function private.is_staff(boolean) from public, anon;
grant execute on function private.is_staff(boolean) to authenticated;
grant select on public.staff, public.learners, public.award_categories, public.duck_awards to authenticated;
grant insert,update on public.learners to authenticated;
grant insert,delete on public.duck_awards to authenticated;
-- No public direct table access, even to learners. Only the projection RPC below.
create policy staff_self on public.staff for select to authenticated using (id=(select auth.uid()));
create policy learners_read on public.learners for select to authenticated using ((select private.is_staff()));
create policy learners_create on public.learners for insert to authenticated with check ((select private.is_staff(true)));
create policy learners_edit on public.learners for update to authenticated using ((select private.is_staff(true))) with check ((select private.is_staff(true)));
create policy categories_read on public.award_categories for select to authenticated using ((select private.is_staff()));
create policy awards_read on public.duck_awards for select to authenticated using ((select private.is_staff()));
create policy awards_create on public.duck_awards for insert to authenticated with check (
 (select private.is_staff()) and staff_id=(select auth.uid())
 and exists(select 1 from public.learners l where l.id=learner_id and l.active)
 and exists(select 1 from public.award_categories c where c.id=category and c.active)
);
create policy awards_delete on public.duck_awards for delete to authenticated using ((select private.is_staff(true)));
-- Ensure award timestamps cannot be forged by a browser client. Historic imports
-- are permitted only from trusted database/service-role tooling.
create or replace function private.stamp_award() returns trigger
language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') then
   new.awarded_at=now(); new.created_at=now(); new.staff_id=auth.uid();
 end if;
 return new;
end;
$$;
revoke all on function private.stamp_award() from public, anon, authenticated;
create trigger stamp_award before insert on public.duck_awards for each row execute function private.stamp_award();

-- Admin-only atomic removal keeps the foreign-key restriction for every other caller.
create or replace function public.delete_learner(target_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare removed uuid;
begin
 if not private.is_staff(true) then raise insufficient_privilege; end if;
 delete from public.duck_awards where learner_id=target_id;
 delete from public.learners where id=target_id returning id into removed;
 return removed is not null;
end;
$$;
revoke all on function public.delete_learner(uuid) from public, anon;
grant execute on function public.delete_learner(uuid) to authenticated;

-- The ONLY anonymous data endpoint. Returns course/group as the public lane tagline,
-- but never staff identity,
-- inactive learners or awards outside the requested season. Totals are aggregates.
create or replace function public.public_race(season_start date, season_end date, feed_limit integer default 12)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if season_end<=season_start or season_end-season_start>370 then
   raise exception 'Invalid academic season';
 end if;
 with eligible as (
   select a.id,a.learner_id,a.category,a.public_message,a.awarded_at,
          l.first_name || ' ' || l.surname_initial || '.' as name,
          l.course_or_group as course
   from public.duck_awards a join public.learners l on l.id=a.learner_id
   where l.active and a.awarded_at >= (season_start::timestamp at time zone 'Europe/London')
     and a.awarded_at < (season_end::timestamp at time zone 'Europe/London')
     and a.awarded_at<=now()
 ), overall as (
   select learner_id as id,name,course,count(*)::integer as total from eligible group by learner_id,name,course
 ), monthly as (
   select learner_id as id,name,course,count(*)::integer as total from eligible
   where date_trunc('month',awarded_at at time zone 'Europe/London')=date_trunc('month',now() at time zone 'Europe/London')
   group by learner_id,name,course
 ), feed as (
   select id,name,category,public_message,awarded_at from eligible
   order by awarded_at desc,id limit greatest(1,least(coalesce(feed_limit,12),50))
 ) select jsonb_build_object(
   'overall',coalesce((select jsonb_agg(to_jsonb(o) order by total desc,name,id) from overall o),'[]'::jsonb),
   'monthly',coalesce((select jsonb_agg(to_jsonb(m) order by total desc,name,id) from monthly m),'[]'::jsonb),
   'total',(select count(*) from eligible),
   'feed',coalesce((select jsonb_agg(to_jsonb(f) order by awarded_at desc,id) from feed f),'[]'::jsonb)
 ) into result;
 return result;
end;
$$;
revoke all on function public.public_race(date,date,integer) from public;
grant execute on function public.public_race(date,date,integer) to anon, authenticated;
commit;
