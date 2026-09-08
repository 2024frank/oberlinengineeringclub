# Oberlin Engineering Club Platform

A Next.js + Supabase platform for the public Oberlin Engineering Club website, officer CMS, approved-member community portal, and engineering project teams.

## Product surfaces

- Public site: Home, About, Projects, Events, Opportunities, Resources, 3-2 Pathway, News, Get Involved.
- Officer portal: `/admin` with Draft → Preview → Publish CMS, structured content managers, Media Library, submissions, member/project review queues, roles, settings, redirects, and audit history.
- Member portal: `/member` for profiles/privacy, member directory, saved items, applications, proposals, invitations, teams, workspaces, and notifications.

## Stack

- Next.js App Router / React / TypeScript
- Supabase Postgres, Auth, Storage, and RLS
- Resend transactional email
- Vercel hosting and scheduled publishing cron
- Vitest + Playwright + SQL RLS acceptance checks

## Local setup

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Apply `database/migrations/*.sql` in numeric order to the environment database before running authenticated flows.

## Verification

Run the local baseline with `npm test`. It runs Vitest unit/integration tests,
then the standalone Node tests in `tests/node`. Run either runner independently
with `npm run test:vitest` or `npm run test:node`; pass Vitest file filters after
`npm run test:vitest --`. Vitest does not collect Playwright or Node test files.
Its cache stays in `.cache/vitest`, and the runner config loader supports a shared
`node_modules` symlink without writing a bundled config into that directory.

Playwright remains a separate `npm run test:e2e` command. The eight existing
integration tests only check for harness credentials and are skipped without
them; they do not exercise database operations even when enabled. A passing
local baseline does not replace staging/database acceptance.

```bash
npm run verify:release
```

See `docs/DEPLOYMENT.md` for staging/production acceptance, `docs/MIGRATION_RUNBOOK.md` for legacy import, and `docs/ADMIN_OPERATIONS.md` for officer/member operations.

## First deployment

After migrations and mail configuration, create the one-time first Super Admin with:

```bash
npm run bootstrap:super-admin
```

The bootstrap command is intentionally unusable after an active Super Admin exists. All later officers are email-invited by a Super Admin through the portal.
