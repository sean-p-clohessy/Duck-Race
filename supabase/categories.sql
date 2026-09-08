-- Generated from js/config.js by pnpm build. Run after schema.sql.
-- Removed categories stay as inactive history; never delete referenced categories.
begin;
update public.award_categories set active=false;
insert into public.award_categories(id,name,description,active) values
('outstanding-work','Outstanding Work','For work that stands out significantly in quality, ambition or execution.',true),
('above-beyond','Going Above & Beyond','For doing considerably more than was reasonably expected.',true),
('improvement','Brilliant Improvement','For clear and meaningful progress from your previous standard.',true),
('helping','Helping Others','For making a meaningful contribution to another learner’s learning or success.',true),
('professional','Professional Behaviour','For demonstrating particularly strong workplace or professional behaviours.',true),
('resilience','Resilience & Perseverance','For persisting through a genuinely difficult challenge or setback.',true),
('creativity','Creativity & Problem Solving','For particularly effective, innovative or thoughtful problem solving.',true),
('contribution','Contribution to Digital','For making a meaningful positive contribution to the wider Digital Technologies community.',true)
on conflict(id) do update set name=excluded.name,description=excluded.description,active=true;
commit;
