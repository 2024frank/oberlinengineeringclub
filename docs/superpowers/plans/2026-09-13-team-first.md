# Team-first Implementation Plan

**Goal:** Let members form teams before selecting projects, with consent-based invitations and officer oversight.
**Architecture:** Add independent teams and approved project connections. Reuse project workspaces through permission-aware effective rosters, preserving direct memberships.
**Tech Stack:** Next.js, React, Supabase PostgreSQL, Zod, Vitest and PGlite.
**Spec:** `docs/superpowers/specs/2026-09-13-team-first.md`

## Global Constraints

- Invitations must be accepted before access.
- Only project leads or admins approve team-project connections.
- Existing project memberships, privacy choices and URLs remain intact.
- No user-browser navigation or real test emails.

## Tasks

1. Write isolated SQL tests in `tests/integration/club-teams.test.ts`. Use authenticated UUID fixtures and real migrations. Assert create without project, invite/accept/decline, request review, denied foreign responses, pending connection denied, approved connection access, membership removal, privacy masking and proposal approval. Run before implementing and confirm missing-function failures.
2. Add migration `024_club_teams.sql`: tables with RLS, session-authorized lifecycle RPC, privacy-aware read RPCs, proposal guards and approval trigger; effective project rosters preserve direct roles. Re-run SQL tests until green.
3. Add typed `lib/teams` contracts and validation, session-client service, member and admin API routes. Test that unknown actions, forged identities and unauthenticated mutations fail.
4. Build team directory, creation form, invitation controls and workspace using existing portal styles. Wire member directory, projects, proposals, invitations, dashboard and admin navigation. Add component tests for consent and failed actions preserving input.
5. Run focused and full tests, changed-file lint, TypeScript and production build. Exercise actual components headlessly at 390, 768 and 1440 pixels; check overflow and interaction states.
6. Review diff, commit scoped files, apply additive migration transactionally after checking deployed function bodies, merge through GitHub and verify production aliases and unauthenticated API guards.
