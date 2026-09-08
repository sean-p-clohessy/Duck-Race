# Live backend status

Project: Duck Race, within EduTools (Free)
Project reference: maqfthdlzzftwowywkgx
Region: eu-west-1 (Ireland)
Public site: https://sean-p-clohessy.github.io/Duck-Race/

Installed schema, all eight categories, RLS, staff timestamp trigger and public_race RPC.
Transactional database verification passed: anonymous isolation, staff authorisation, admin actions, timestamp integrity and public privacy. Test data rolled back.
Public account signups disabled; anonymous sign-ins remain disabled.
GitHub Actions public connection variables configured. Deployment run 34224579372 succeeded; public page verified LIVE with zero learners/awards.

First administrator: Sean Clohessy (sean-c@boston.ac.uk), active admin.

The authenticated `manage-staff` Edge Function was deployed on 8 September 2026. It verifies the caller against the active administrator record, sends staff invitations, lists authorised staff and lets an administrator pause or restore non-admin access. The GitHub Pages staff portal now includes the matching Staff tab and invitation password setup flow.

Live authenticated award flow verified by the administrator on a phone on 8 September 2026. A fictional learner, Ben S., received one Outstanding Work award with a public message. The deployed public endpoint returned demo=false, total=1, matching overall/monthly rankings and feed entry. The public payload exposed no staff identity or course/group fields.

Still to verify before real learner rollout: administrator deletion of a disposable award and learner deactivation from the staff interface. The existing transactional database verification already confirms both permissions at the database layer.
