# Connect the live Duck Race backend

The published Pages site currently runs in fictional demo mode. A backend installation does not change that site until both public connection variables are added and it is rebuilt.

1. Create a dedicated Supabase project in the desired organisation. Use the free plan for initial evaluation. Choose a suitable UK region if available. Store its database password in your password manager; do not paste it into this repository or chat.
2. Generate the installer with `node scripts/backend-setup.js`, then run `supabase/install.sql` once through the project's SQL editor. All tables, categories, grants and row-level security install in one transaction. Do not run both the combined installer and the individual schema/policy scripts.
3. Run `supabase/verify.sql` in the empty project. It creates temporary fictional fixtures, checks anonymous isolation, active staff authorisation, administrative actions and public privacy, then rolls back. Do this before adding real learners.
4. Disable new user signups and anonymous sign-ins in Auth. Create your first user in the Auth dashboard. Set its password directly in the dashboard; no credentials are needed in the source files.
5. Fill the email and name in `supabase/bootstrap-admin.sql` and run it in the trusted SQL editor. This links an existing Auth identity to an active admin. Further staff accounts use the documented `staff` role; only admins can manage learners or remove awards.
6. In GitHub repository Settings → Secrets and variables → Actions → Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project URL and publishable/anon key. Never use the secret or service-role key.
7. Run the existing **Deploy Duck Race to GitHub Pages** workflow. The site becomes live and the demo entry disappears.
8. Sign in at `/Duck-Race/admin/`. Add a clearly fictional verification learner, award one duck, and confirm the public race/feed/monthly score updates. Remove that test award and mark the verification learner inactive before adding real learners.

The first installation starts empty. Browser-local demo data never migrates into the backend. The public leaderboard exposes no staff identity or course/group information. All data changes are checked by database permissions, not only by the staff interface.

Changing categories: edit `js/config.js`, regenerate `supabase/categories.sql`, and run only that category script against an installed database. Changes to existing schema or policies require a targeted migration, not rerunning `install.sql`.
