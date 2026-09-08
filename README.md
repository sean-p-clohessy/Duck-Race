# The Duck Race

A small reward and recognition app for Boston College Digital Technologies. Staff award meaningful ducks; learners watch the race.

Vanilla HTML, CSS and JavaScript. No runtime package installation, framework, or server is required for the deployed frontend. Supabase provides Postgres, staff authentication and database permissions. The public site works on GitHub Pages, including repository subpaths.

## Run the fictional demo

Install Node.js 24 (or newer), then from this folder:

```sh
node scripts/build.js
node scripts/serve.js
```

Open **http://127.0.0.1:4173**. Open **/admin/** and select **Try the staff demo**. Award a duck, then open the public race in another tab in the same browser. Demo changes are stored in localStorage; tabs receive updates immediately, with a 20-second refresh as a fallback. Demo admin is deliberately a simulator, not an authentication system.

The demo has 18 fictional learners, annual scores from 1–14 and monthly scores from 1–5. Historic awards are generated in the preceding month and recent awards in the current month. Season filtering always applies, so demos run at the very start of or outside the configured season may have lower or empty standings. For a future presentation, update the configured season and clear only the `duck-race-demo-v1-2026/27` localStorage key to generate fresh fictional dates.

Live mode is enabled only by supplying both Supabase values. A partial configuration fails the build; live connection failures never silently fall back to demo data.

## Connect Supabase

1. Create a Supabase project. In its SQL editor run **supabase/schema.sql**, then **supabase/categories.sql**, then **supabase/policies.sql**, in that order. These are first-install scripts; schema/policies are not intended to be blindly rerun against an existing installation.
2. Disable public signups and anonymous sign-ins in Supabase Auth. Create the first administrator through the Auth dashboard and authorise that account with the SQL below. Learners do not get accounts.
3. After the first administrator is authorised, deploy `supabase/functions/manage-staff/index.ts`. Administrators can then invite colleagues from **Staff** in the portal; invitees choose their own password from the secure email link. The service/secret key stays inside the Edge Function and is never shipped to the browser.

```sql
insert into public.staff (id, name, email, role)
values ('AUTH-USER-UUID', 'Staff name', 'staff@example.ac.uk', 'admin');
-- Use role 'staff' for colleagues who award ducks and read records.
-- Use role 'admin' for colleagues who also manage learners/delete awards.
```

4. Copy `.env.example` to `.env`, then fill in the project URL and public publishable/anon key:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-PUBLIC-KEY
```

The `VITE_` names are retained as public build variables; the app does not require Vite. Never use a service-role key or a secret key. The build rejects recognisable private keys. These public values are deliberately included in the generated JavaScript; RLS and grants provide security.

5. Run `node scripts/build.js` and restart/open the preview. Log in at `/admin/` with the staff account. The demo button disappears in connected mode. Staff passwords are set from invitation links and can be recovered through Supabase Auth if needed.
6. Add real learners under **Learners → Add learner** as an admin. Enter only first name, one surname initial and course/group. All live data starts empty. A disabled learner remains in staff history but disappears from the public race and feed. Deactivate staff through the trusted SQL editor with `update public.staff set active=false where id='UUID';`.

## Replace demo data with real learners

Browser demo data never uploads to Supabase and is ignored when live mode is configured. Start the live database empty and add learners through the admin page. For bulk imports, import a CSV containing `first_name,surname_initial,course_or_group,active` into the learners table using the Supabase dashboard. Let the database generate UUIDs. Surname initials must be one uppercase A–Z character. Use course/group to distinguish learners sharing a public display name.

`supabase/seed.sql` is optional fictional data for a **separate test project** only. Provision a test admin first, then run it. It is idempotent and uses recognisable `d000…` learner IDs and `a000…` award IDs. Do not run it in your real learner database. Never import full surnames or sensitive notes.

## Permissions and data boundaries

| Visitor | Public race | Staff history | Award duck | Manage learners / remove awards |
| --- | --- | --- | --- | --- |
| Public / learner | Yes | No | No | No |
| Signed-in but not authorised | Yes | No | No | No |
| Active staff | Yes | Yes | Yes | No |
| Active admin | Yes | Yes | Yes | Yes |

Anonymous clients have no direct table access. `public_race` is a narrow read-only security-definer function with a fixed search path, a bounded feed and a maximum 370-day season. It projects only public display names, opaque identifiers, calculated scores, award categories, public messages and dates. Course/group and awarding staff never appear in that response. Active authorised staff can read staff-side data; only admins can manage learners or delete awards. Staff authorisation rows are managed exclusively through trusted database tooling, with no browser write grants.

Award timestamps and the awarding user are set by the database for browser requests. Category validity, active learner/staff membership, and the 100-character public-message limit are checked at the database boundary. There is no editable total, automatic repeat-behaviour limit, or learner account. Deleted awards reduce calculated totals; deactivation preserves records.

The small `js/supabase.js` adapter uses the documented Supabase Auth password, refresh, user and logout HTTP endpoints, and PostgREST. Sessions are stored in sessionStorage for the staff tab, refreshed on demand, and cleared on logout/invalid refresh. An expired or revoked staff permission is enforced on each database operation by RLS. Only public configuration is shipped. User-authored text is HTML-escaped before display. Staff should still use public shout-outs carefully; the app cannot determine whether a message contains sensitive information.

Reference: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [password authentication](https://supabase.com/docs/guides/auth/passwords).

## Deploy to GitHub Pages

1. Put this project in a GitHub repository with a `main` branch.
2. In repository **Settings → Pages**, select **GitHub Actions** as the source.
3. For a live site, set repository Actions **Variables** named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Leave both absent to deploy the labelled fictional demo.
4. Push to `main` or run **Deploy Duck Race to GitHub Pages** manually. The included workflow tests the domain and REST adapter, builds the static files, and uploads only `dist/`.
5. Open the Pages URL. The staff link resolves to `/YOUR-REPO/admin/`. Verify a staff award, removal and inactive learner against the public race before using real data.

Alternatively upload the contents of `dist/` to any static host. Do not publish the entire source directory as your built site. No database credentials beyond the publishable/anon key are needed by the frontend.

## Configuration

Edit **js/config.js** for department/college, year label, inclusive season start and exclusive season end, categories and descriptions, race lane count, monthly list size, feed count, timings, display/recognition toggles and recognition principle. V1 uses the configured 2026/27 year from **1 August 2026 to 31 July 2027**; adjust if your department uses a different academic year boundary.

When changing categories, run `node scripts/categories.js` (also runs during build), then execute the generated `supabase/categories.sql` in Supabase. This keeps one authoring source for category IDs/text. Removed categories become inactive while historic awards retain their category IDs. Keep stable IDs when changing names. Rebuild/redeploy after configuration changes.

Monthly boundaries use **Europe/London** in both JavaScript and SQL. If changing the timezone, update it in `config.js` and `public_race` in `policies.sql` together. Monthly scores come from award dates within the selected academic season. Monthly rollover does not delete anything. Scores tied on ducks share a competition rank (1, 1, 3); alphabetical name and UUID order make the display stable. The race scale uses the leader plus at least three ducks of open track, never a fixed target of 100.

## Display mode and accessibility

Append `?display=true` to the public URL for a classroom/projector view. Navigation and the earn section are removed, lanes grow, and data continues to refresh every 20 seconds. Use the browser’s fullscreen shortcut for an unattended screen. Keep the device awake using its normal display settings.

The Duck Feed changes every nine seconds and pauses on hover or keyboard focus. It has previous, pause/play and next controls. Reduced-motion preferences stop duck animation and start the feed paused. Empty states, failed refresh status, keyboard focus styles, semantic forms and mobile layouts are included. Display mode still shows a demo label when using fictional data.

## Project map

```text
index.html, css/main.css       Public race and responsive theme
admin/, css/admin.css         Staff forms and management
js/config.js                  Central settings/category definitions
js/env.js                     Default blank public connection
js/domain.js                  Totals, month filtering, ties and escaping
js/data.js, js/supabase.js     Demo/live repository and REST/Auth adapter
js/demo.js                    Fictional seed generation
js/leaderboard.js              Public display and periodic refresh
js/duck-feed.js                Readable rotating recognition feed
js/admin.js                    Authenticated staff workflow
supabase/                     Schema, RLS, generated categories, optional seed
scripts/                      Dependency-free build/local server
tests/                        Domain and HTTP adapter checks
.github/workflows/pages.yml   GitHub Pages deployment
```

## Validation

```sh
node --test --test-isolation=none tests/*.test.js
node scripts/build.js
```

Automated tests cover actual-award totals, deletion, privacy projection, inactive/future awards, London month rollover, ties, dynamic scaling, output escaping, REST authentication/refresh and failed requests. `supabase/verify.sql` is a rollback-only integration check to run in a **test Supabase project** after installation. It checks database privileges and RLS with unauthorised, staff and admin identities.

No live Supabase project or GitHub repository is preconfigured. Local checks do not certify a remote database installation: run the SQL verification and complete the live award → public refresh → removal flow after connecting your project.

Browsers supporting WebMCP can read the same public results through the optional `read_duck_race` tool. This is read-only, accepts no parameters, and does not expose staff data. Browser-native WebMCP execution has not been verified in this environment.

## Colour themes

The interface follows the EduTools navy, paper and pink palette. Use System, Light or Dark in the header on either page. System is the default and follows operating-system changes; a manual choice is remembered across pages and tabs. Select System again to restore automatic appearance. Theme colours are centralised in css/theme.css.

