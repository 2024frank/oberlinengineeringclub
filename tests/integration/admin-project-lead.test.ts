// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { existsSync, readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
const asUser = (n: number | null) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [n === null ? '' : id(n)])
const approve = (source = 'application', request = 30, project: number | null = null) => db.query<{ result: { alreadyApproved: boolean } }>(
  'select public.approve_project_interest_as_lead($1,$2,$3) as result', [source, id(request), project === null ? null : id(project)],
)
const roles = () => db.query<{ user_id: string; role: string }>('select user_id,role from public.project_memberships order by user_id')

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
  `)
  for (const name of ['001_core', '002_content', '003_cms', '010_staff_invites', '011_members', '012_project_collaboration', '013_member_staff_rls', '016_project_team_workflows', '017_project_workspace', '021_submission_membership_approval']) {
    await db.exec(readFileSync(`database/migrations/${name}.sql`, 'utf8'))
  }
  const migration = 'database/migrations/023_admin_project_lead_approval.sql'
  if (existsSync(migration)) await db.exec(readFileSync(migration, 'utf8'))
}, 30000)
beforeEach(async () => {
  await db.exec('begin')
  for (const n of [1, 2, 3, 10, 11, 12, 13]) await db.query('insert into auth.users(id,email) values($1,$2)', [id(n), `member${n}@oberlin.edu`])
  for (const [n, role] of [[1, 'ADMIN'], [2, 'EDITOR'], [3, 'ADMIN']] as const) {
    await db.query("insert into public.admin_profiles(user_id,status,active) values($1,$2,$3)", [id(n), n === 3 ? 'SUSPENDED' : 'ACTIVE', n !== 3])
    await db.query('insert into public.role_assignments(user_id,role) values($1,$2)', [id(n), role])
  }
  for (const n of [10, 11, 12, 13]) {
    await db.query("insert into public.membership_requests(id,email,display_name,status,auth_user_id) values($1,$2,$3,'ACTIVE',$1)", [id(n), `member${n}@oberlin.edu`, `Member ${n}`])
    await db.query('insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status) values($1,$1,$2,$3,$4)', [id(n), `member${n}@oberlin.edu`, `Member ${n}`, n === 12 ? 'SUSPENDED' : n === 13 ? 'APPROVED' : 'ACTIVE'])
  }
  await db.query("insert into public.projects(id,slug,title,publication_state,recruiting) values($1,'existing-printer','Existing printer','published',true),($2,'draft-printer','Draft printer','draft',true)", [id(20), id(21)])
  await db.query("insert into public.project_applications(id,project_id,applicant_user_id,motivation) values($1,$2,$3,'I want to repair this printer')", [id(30), id(20), id(10)])
  await db.query("insert into public.submissions(id,type,full_name,email,payload,status) values($1,'join_project','Member 11','MEMBER11@oberlin.edu',$2,'new')", [id(40), JSON.stringify({ project: 'Existing printer' })])
  await asUser(1)
})
afterEach(async () => { await db.exec('rollback') })
afterAll(async () => { await db?.close() })

describe('admin project lead approval against isolated Postgres', () => {
  it('makes an applicant lead, records the admin without a member profile, and opens their workspace', async () => {
    await approve()
    expect((await roles()).rows).toEqual([{ user_id: id(10), role: 'LEAD' }])
    expect((await db.query('select status,reviewed_by_admin_id from public.project_applications')).rows).toEqual([{ status: 'ACCEPTED', reviewed_by_admin_id: id(1) }])
    expect((await db.query('select actor_id from public.audit_log')).rows).toEqual([{ actor_id: id(1) }])
    await asUser(10)
    const workspace = await db.query<{ result: { myRole: string } }>('select public.get_project_workspace($1) as result', [id(20)])
    expect(workspace.rows[0].result.myRole).toBe('LEAD')
    await expect(db.query('select public.create_project_team_invite($1,$2,$3)', [id(20), id(11), 'Join our team'])).resolves.toBeDefined()
  })
  it('promotes public interest using the matching active account, not the supplied name', async () => {
    await approve('submission', 40, 20)
    expect((await roles()).rows).toEqual([{ user_id: id(11), role: 'LEAD' }])
    expect((await db.query('select status,approved_project_id from public.submissions')).rows).toEqual([{ status: 'approved', approved_project_id: id(20) }])
  })
  it('allows explicit co-leads without removing the first lead', async () => {
    await approve()
    await approve('submission', 40, 20)
    expect((await roles()).rows.map(r => r.role)).toEqual(['LEAD', 'LEAD'])
  })
  it('is idempotent and sends one in-app notification on repeated approval', async () => {
    expect((await approve()).rows[0].result.alreadyApproved).toBe(false)
    expect((await approve()).rows[0].result.alreadyApproved).toBe(true)
    expect((await db.query('select * from public.member_notifications')).rows).toHaveLength(1)
    expect((await db.query('select * from public.audit_log')).rows).toHaveLength(1)
  })
  it.each([null, 2, 3, 10])('rejects unauthenticated, editor, suspended-admin and member callers (%s)', async n => {
    await asUser(n)
    await expect(approve()).rejects.toThrow('PROJECT_LEAD_APPROVAL_FORBIDDEN')
  })
  it.each([12, 13, 99])('rejects suspended, unactivated and unknown recipients (%s)', async n => {
    await db.query('update public.submissions set email=$1', [`member${n}@oberlin.edu`])
    await expect(approve('submission', 40, 20)).rejects.toThrow('ACTIVE_MEMBER_REQUIRED')
  })
  it('requires the admin to select a published project for public interest', async () => {
    await expect(approve('submission', 40, 21)).rejects.toThrow('PUBLISHED_PROJECT_REQUIRED')
  })
  it('does not allow changing the project attached to an application', async () => {
    await expect(approve('application', 30, 21)).rejects.toThrow('PROJECT_MISMATCH')
  })
  it('does not approve archived public requests', async () => {
    await db.exec("update public.submissions set status='archived'")
    await expect(approve('submission', 40, 20)).rejects.toThrow('PROJECT_INTEREST_NOT_PENDING')
  })
  it('does not mistake a general membership request for project interest', async () => {
    await db.exec("update public.submissions set type='join_club'")
    await expect(approve('submission', 40, 20)).rejects.toThrow('PROJECT_INTEREST_NOT_FOUND')
  })
  it('does not let stale invitations demote a newly approved lead', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(11)])
    await asUser(11)
    const invitation = await db.query<{ result: { inviteId: string } }>('select public.create_project_team_invite($1,$2) as result', [id(20), id(10)])
    await asUser(1)
    await approve()
    await asUser(10)
    await db.query("select public.respond_project_team_invite($1,'ACCEPT')", [invitation.rows[0].result.inviteId])
    expect((await roles()).rows.every(r => r.role === 'LEAD')).toBe(true)
  })
  it('does not let a pending application demote a lead approved through the public form', async () => {
    await db.query("insert into public.project_applications(project_id,applicant_user_id,motivation) values($1,$2,'I want to help repair this')", [id(20), id(11)])
    await approve()
    await approve('submission', 40, 20)
    const application = await db.query<{ id: string }>('select id from public.project_applications where applicant_user_id=$1', [id(11)])
    await asUser(10)
    await db.query("select public.review_project_application($1,'ACCEPT')", [application.rows[0].id])
    expect((await roles()).rows.every(r => r.role === 'LEAD')).toBe(true)
  })
})
