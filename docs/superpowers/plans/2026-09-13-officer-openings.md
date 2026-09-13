# Officer Openings Implementation Plan

> Execute in the existing isolated checkout using test-first development and a focused UI implementer, followed by independent review.

**Goal:** Posted officer roles are discoverable, applications are reviewable, and new published openings notify active members.

**Architecture:** Keep `leaders` as the vacancy source. Add authenticated SQL application actions and a durable, service-only email outbox populated transactionally when an opening is first published. Preserve all existing memberships and staff access.

**Tech Stack:** Next.js, React, Supabase/Postgres, Resend, Vitest/PGlite, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-13-officer-applications-voting-design.md`, positions/applications/announcements release only. Elections remain a separate release.

## Global Constraints

- No real member test emails or test applications in production.
- No foreground browser or native-computer actions.
- Published, current, non-advisor open seats only; database failures are not empty states.
- No automatic staff access, appointment, or project-lead promotion.
- Preserve historical Inbox submissions. No retroactive vacancy email blast.

## Tasks

1. Database: add `application_closes_at` to leaders, officer applications, announcement records and recipient outbox. Test first in `tests/integration/officer-openings.test.ts` using real migrations. SQL RPCs: `list_officer_positions()`, `list_officer_applications()`, `officer_application_action(action,position_id,statement,experience,decision,feedback,user_id)`. Application statuses PENDING/SHORTLISTED/NOT_SELECTED/WITHDRAWN. Active members own applications; ADMIN/SUPER_ADMIN review. Public listing excludes closed roles. Service-only claim/finish email functions serialize delivery and retain ambiguous outcomes past provider deduplication window rather than resend.
2. UI: public `/leadership`, member `/member/leadership`, and admin `/admin/officer-applications`; change Explore leadership to the posted list. Show role details, statement/experience form, saved application and review status. Admin review queue with shortlist/not-selected and member-visible feedback. Add navigation and focused UI tests. Use existing styling, responsive layouts, no decorative filler.
3. Integrate publishing: label open-seat editor fields as role details, support deadline, clearly identify publish-and-notify, queue automatically only on first published opening, and expose email delivery status/retry for admins. Dispatch bounded background batches after publish. A Supabase five-minute cron checks only for queued work and calls a dedicated authenticated worker; preserve the existing daily publishing cron. Test server auth, input, email text and idempotency.
4. Verify: targeted tests, full suite, typecheck, build, scoped lint, headless mobile/desktop checks, independent review. Apply additive production migration with before/after counts and no outgoing mail. Merge and verify live routes only after passing checks.

## Progress

- Implementation complete; isolated database and UI tests pass. No production test records or member emails created.
- Independent backend review identified and verified fixes for a direct-write publishing bypass and insufficient daily retry scheduling.
- Headless UI verification: 21 scenarios at 390/768/1440 pixels, requests mocked. Existing roles left unchanged pending confirmation.
- Production migrations applied with unchanged existing row counts, zero application test records, and zero outgoing emails. The five-minute scheduler is enabled and makes no HTTP request when idle.
- Supabase-managed network queue grants cannot be revoked by the project role. Scheduler requests therefore contain only a short-lived HMAC signature, not a reusable secret. Vault permissions and exclusion of net/vault from the Data API were verified.
