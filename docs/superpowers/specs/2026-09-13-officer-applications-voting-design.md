# Officer Applications and Voting

Status: proposed design, awaiting review before implementation.

## Purpose

Members should be able to see the roles the club has posted, apply for a
specific role, receive announcements about new openings, vote in club polls
and officer elections, and receive the published results.

This does not grant officer-login privileges. Staff access remains a separate
Super Admin decision.

## Existing Behavior

- Leadership records live in the published `leaders` table and are edited in
  Admin > Leadership. They already have `current`, `open_seat`, and `advisor`
  fields.
- Explore leadership currently selects a generic `leadership_interest` form.
  It does not list vacancies or identify a specific position in an application.
- That form reaches the Inbox. Its approval action approves club membership,
  not an officer appointment.
- The application has member sessions, admin permissions, transactional email,
  and a daily authenticated publishing cron. It has no election subsystem.

## Approach

Extend the existing leadership records rather than introducing a second vacancy
directory. Add separate application, ballot, and email-delivery records.
Reusing the generic Inbox for voting would mix membership approvals with
elections and would not enforce one ballot per voter. A third-party survey
would add a separate login and make eligibility harder to enforce.

## Posted Positions

- Explore leadership opens a list of currently published, current, non-advisor
  open seats. Drafts, unpublished entries, filled roles, and expired openings
  must not appear as available.
- Show role title, term, responsibilities, application deadline when set, and
  an Apply action. No invented roles or placeholder office holders.
- Admin > Leadership keeps its existing records. For open seats, replace the
  person-oriented labels with role-oriented labels and add an optional
  application closing date. Preserve current office-holder editing.
- Members also have an Open positions link in their portal. Visitors may read
  the openings, but applying requires an active member account. Signing in
  returns them to the selected role.
- An empty list says there are no open positions. A loading/database failure
  must not be shown as an empty list.

## Applications

- Each application belongs to a member and an opening. Collect a statement of
  interest and relevant experience. Keep one application per member/opening.
- Members can view their application and withdraw it. Editing or resubmitting
  is allowed only before the deadline and before an admin decision.
- Admins see a dedicated officer-application queue with the role, applicant,
  statement, status, and review actions. Editors cannot review applications.
- Review outcomes are Shortlisted or Not selected. Shortlisting is not an
  appointment, a project-lead assignment, or a staff-access grant.
- Old generic leadership-interest submissions remain in the Inbox. Do not
  guess which role a historical applicant intended.
- Server/database validation rejects applications to closed, unpublished, or
  filled roles, including if a form was opened before a role closed.

## Member Announcements

- Publishing a newly opened role queues a single announcement to each active
  member. Saving drafts or editing an existing vacancy does not send again.
- Show the notification action and recipient count before publication. Existing
  published openings at rollout are not automatically announced.
- Store a durable outbox with a unique announcement/member key. Start delivery
  after publication, with authenticated cron retries and an admin retry action.
- Track queued, sending, delivered-to-provider, and failed states. A provider
  acceptance is not proof of inbox delivery.
- Use provider idempotency keys, bounded batches, and leased claims so retries
  and concurrent workers do not duplicate sends. Recheck active membership at
  delivery time. Stop stale vacancy announcements if the role is no longer open.
- Email links use the canonical public domain and normal member login, not
  account-reset tokens. No real member emails during development or tests.

## Polls and Elections

- Admins create a draft with a title, description, opening/closing times, and
  either a general poll question or a single officer position. One election
  per office keeps ballots and results understandable.
- Polls use named options. Elections use shortlisted applicants who explicitly
  accept candidacy and consent to displaying their name and candidate statement
  to voting members. Do not expose private application statements automatically.
- An admin reviews the options/candidates and sends the ballot announcement.
  Ballot options and eligible-member snapshots are locked when voting opens.
- Eligibility is active membership at opening and at vote submission. Members
  joining after opening are not added silently to an election already underway.
- A member selects one option/candidate and confirms their vote. One final vote
  per member per ballot is enforced in the database, including concurrent
  submissions. Reject early, late, suspended-member, and duplicate votes.
- Individual choices are not exposed in the member or admin UI. Admins see
  turnout, not names linked to votes. This is access-controlled voting, not a
  claim of cryptographic anonymity from database operators.
- Voting stops at the configured closing time, enforced on the server. Admins
  may cancel a ballot with an explanation but cannot rewrite recorded choices.
- After closing, admins preview aggregate totals and explicitly publish results.
  Results include the office/question, counts, turnout, and any ties. A tied or
  zero-vote election has no automatic winner; a runoff can be created separately.
- Publishing results can queue one results email per eligible active member.
  Results emails link to the member results page. No individual votes are sent.
- Election results never automatically grant staff permissions or overwrite the
  public office-holder directory. An admin confirms appointments separately;
  Super Admin still manages login access.

## Security and Data

- Use the existing active-member and admin/session checks, reinforced by SQL
  permissions and row-level security. Derive actor identity from the session.
- Members read only their own applications and vote receipt, published ballot
  details, and released aggregate results. Private review notes stay admin-only.
- Anonymous access is limited to published vacancy information.
- Privileged RPCs use an empty search path and explicit grants. Lock ballot
  lifecycle transitions and enforce unique vote/application keys in SQL.
- Record application reviews, ballot lifecycle changes, and result publication
  in the existing audit history without logging ballot choices or credentials.
- Migrations are additive and preserve existing memberships, teams, projects,
  leadership records, applications, and staff permissions.

## Verification and Release

- Test against an isolated database using actual migrations: vacancy visibility,
  role closure, duplicate applications, member/editor/admin boundaries,
  candidate consent, voting deadlines, eligibility, concurrent duplicate votes,
  hidden choices, tied results, and idempotent notification claims.
- Test API validation and UI success/error states, including preserving a failed
  application draft and preventing accidental repeated votes.
- Headless desktop/mobile screenshots and keyboard checks for vacancy browsing,
  application, admin review, voting, and results. Do not take over the user's
  browser or presentation computer.
- Run typecheck, focused lint, tests, and production build before merge.
- Inspect current production leadership data before rollout without modifying
  real roles or sending mail. Apply the additive migration with verification,
  merge reviewed implementation, then verify production routes and permissions.
- Report separately what is implemented, tested, deployed, and emailed. Do not
  describe this design document as an enabled feature.
