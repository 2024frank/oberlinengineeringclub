# Officer Openings

## Post a Position

In Admin > Leadership, choose New Leader and turn on Accept applications for
this role. Enter the role title, term, responsibilities, and optional deadline.
Keep Current checked and publish. Saving a draft does not publish or email it.

Explore leadership opens `/leadership`. Only published, current, non-advisor
openings with an unexpired deadline appear. A deadline is optional; close a role
by making it non-current and publishing the change.

The first publication of an opening queues its announcement for active members.
Editing or republishing that same record does not resend. For a new recruiting
term, create a new record. Existing openings at migration time are not announced.

## Apply and Review

Members sign in, choose a position, and submit a statement and experience.
Their application and feedback appear in Member > Open positions > My applications.
They can edit pending applications while the role is open, or withdraw pending
and shortlisted applications. A reviewed application cannot be rewritten.

Admins use Officer applications in the sidebar to filter applicants by role and
status. Shortlist and Not selected save a review with member-visible feedback.
These decisions do not appoint an officer or grant staff access. Super Admins
still manage officer-login permissions under Staff access.

## Email Status and Resending

Position announcement emails appear beneath the review queue. Refresh status
shows queued, sending, accepted by the provider, failed, and skipped counts.
Retry failed emails retries confirmed failures only. A sent email is not resent.
An unknown outcome needs reconciliation in Resend before another send; no retry
button bypasses that protection. Provider acceptance does not prove inbox delivery.

Publication starts a bounded worker. A Supabase five-minute job drains remaining
recipients and retries due failures. Idle checks do not make HTTP calls. Requests
use Resend idempotency keys and stop uncertain retries before the 24-hour window.
The behavior follows Resend's idempotency documentation:
https://resend.com/docs/dashboard/emails/idempotency-keys

## Deployment

Apply migrations 025 and 026 in order. Before 026, provision a random secret in
Supabase Vault named `oec_officer_email_worker` and the matching production Vercel
variable `OFFICER_EMAIL_CRON_SECRET`. Never put that secret in source or logs.
The worker only accepts authenticated POST requests at `/api/cron/officer-emails`.
Requests use a timestamped HMAC signature valid for two minutes, never a reusable
bearer secret in pg_net's managed queue. Keep `net` and `vault` out of exposed API
schemas and do not expose generic SQL or networking RPCs to browser roles.
Migrations require Supabase's pg_cron, pg_net, pgcrypto, and Vault extensions.

Scheduler reference: https://supabase.com/docs/guides/functions/schedule-functions

Check the named `oec-officer-email-worker` job in `cron.job` and its recent run
details; inspect the HTTP status in `net._http_response` when a batch is pending.
The older daily publishing cron remains unchanged. To pause only these retries,
an authorized database operator can run:

```sql
select cron.unschedule('oec-officer-email-worker');
```

Election ballots and result announcements are not part of this release.
