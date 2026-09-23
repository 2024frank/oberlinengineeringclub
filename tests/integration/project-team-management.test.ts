// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Users: 1 admin, 2 editor; members 10-14 (13 suspended). Projects: 20 published, 21 draft.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
const asUser = (n: number | null) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [n === null ? '' : id(n)])
async function call<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  return (await db.query<{ result: T }>(`select ${sql} as result`, params)).rows[0].result
}
const roster = async (project = 20) => (await db.query<{ user_id: string; role: string; status: string }>(
  'select user_id,role,status from public.project_memberships where project_id=$1 order by user_id', [id(project)])).rows
const activeRoles = async (project = 20) => (await roster(project)).filter(r => r.status === 'ACTIVE').map(r => [r.user_id, r.role])
// Postgres aborts a transaction after an error, so expected failures run inside a savepoint.
async function rejects(sql: string, params: unknown[], code: string) {
  await db.exec('savepoint expected_failure')
  await expect(db.query(`select ${sql}`, params)).rejects.toThrow(code)
  await db.exec('rollback to savepoint expected_failure')
}
const notifications = async (user: number) => (await db.query<{ kind: string; action_url: string }>(
  'select kind,action_url from public.member_notifications where user_id=$1 order by created_at', [id(user)])).rows

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;
  `)
  for (const name of ['001_core', '002_content', '003_cms', '010_staff_invites', '011_members', '012_project_collaboration', '013_member_staff_rls', '014_saved_items',
    '015_project_proposal_review', '016_project_team_workflows', '017_project_workspace', '021_submission_membership_approval', '023_admin_project_lead_approval',
    '024_club_teams', '027_project_team_management']) {
    await db.exec(readFileSync(`database/migrations/${name}.sql`, 'utf8'))
  }
}, 30000)
beforeEach(async () => {
  await db.exec('begin')
  for (const n of [1, 2, 10, 11, 12, 13, 14]) await db.query('insert into auth.users(id,email) values($1,$2)', [id(n), `member${n}@oberlin.edu`])
  for (const [n, role] of [[1, 'ADMIN'], [2, 'EDITOR']] as const) {
    await db.query("insert into public.admin_profiles(user_id,display_name,status,active) values($1,$2,'ACTIVE',true)", [id(n), `Officer ${n}`])
    await db.query('insert into public.role_assignments(user_id,role) values($1,$2)', [id(n), role])
  }
  for (const n of [10, 11, 12, 13, 14]) {
    await db.query("insert into public.membership_requests(id,email,display_name,status,auth_user_id) values($1,$2,$3,'ACTIVE',$1)", [id(n), `member${n}@oberlin.edu`, `Member ${n}`])
    await db.query('insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status) values($1,$1,$2,$3,$4)', [id(n), `member${n}@oberlin.edu`, `Member ${n}`, n === 13 ? 'SUSPENDED' : 'ACTIVE'])
  }
  await db.query("insert into public.projects(id,slug,title,publication_state,recruiting) values($1,'water-probe','Water probe','published',true),($2,'draft-printer','Draft printer','draft',false)", [id(20), id(21)])
  await db.query("insert into public.project_applications(id,project_id,applicant_user_id,motivation) values($1,$2,$3,'I want to build the probe amplifier')", [id(30), id(20), id(10)])
  await db.query("insert into public.submissions(id,type,full_name,email,payload,status) values($1,'join_project','Member 11','MEMBER11@oberlin.edu',$2,'new')", [id(40), JSON.stringify({ project: 'Water probe' })])
  await asUser(1)
})
afterEach(async () => { await db.exec('rollback') })
afterAll(async () => { await db?.close() })

describe('approving project interest', () => {
  it('adds an applicant as a regular team member by default', async () => {
    const result = await call<{ role: string; alreadyApproved: boolean }>('public.admin_approve_project_interest($1,$2)', ['application', id(30)])
    expect(result).toMatchObject({ role: 'MEMBER', alreadyApproved: false })
    expect(await activeRoles()).toEqual([[id(10), 'MEMBER']])
    expect((await db.query('select status,reviewed_by_admin_id from public.project_applications')).rows).toEqual([{ status: 'ACCEPTED', reviewed_by_admin_id: id(1) }])
    expect((await notifications(10)).map(n => n.kind)).toEqual(['PROJECT_MEMBER_APPROVED'])
  })
  it('appoints a lead only when the officer asks for one', async () => {
    await call('public.admin_approve_project_interest($1,$2,$3,$4)', ['submission', id(40), id(20), 'LEAD'])
    expect(await activeRoles()).toEqual([[id(11), 'LEAD']])
  })
  it('never demotes an existing lead when approving them as a member', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(11)])
    await call("public.admin_approve_project_interest($1,$2,$3,'MEMBER')", ['submission', id(40), id(20)])
    expect(await activeRoles()).toEqual([[id(11), 'LEAD']])
  })
  it('closes an application automatically once the applicant is already on the team', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'MEMBER')", [id(20), id(10)])
    expect((await db.query('select status from public.project_applications')).rows).toEqual([{ status: 'ACCEPTED' }])
    await rejects('public.admin_approve_project_interest($1,$2)', ['application', id(30)], 'PROJECT_INTEREST_NOT_PENDING')
  })
  it('is idempotent for repeated clicks', async () => {
    await call('public.admin_approve_project_interest($1,$2)', ['application', id(30)])
    expect(await call<{ alreadyApproved: boolean }>('public.admin_approve_project_interest($1,$2)', ['application', id(30)])).toMatchObject({ alreadyApproved: true })
    expect(await notifications(10)).toHaveLength(1)
  })
  it.each([null, 2, 10])('rejects callers who are not Admins (%s)', async n => {
    await asUser(n)
    await rejects('public.admin_approve_project_interest($1,$2)', ['application', id(30)], 'PROJECT_TEAM_ADMIN_REQUIRED')
  })
  it('lets officers decline an application on a project with no lead', async () => {
    const result = await call<{ status: string }>("public.review_project_application($1,'REJECT','Team is full')", [id(30)])
    expect(result.status).toBe('REJECTED')
    expect((await db.query('select status,reviewed_by_admin_id,reviewed_by_user_id from public.project_applications')).rows).toEqual([{ status: 'REJECTED', reviewed_by_admin_id: id(1), reviewed_by_user_id: null }])
  })
  it('still lets project leads review applications', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(14)])
    await asUser(14)
    await call("public.review_project_application($1,'ACCEPT')", [id(30)])
    expect(await activeRoles()).toEqual([[id(10), 'MEMBER'], [id(14), 'LEAD']])
  })
})

describe('officer roster controls', () => {
  it('adds, promotes, demotes and removes members', async () => {
    expect(await call<{ changed: boolean; previousRole: string | null }>("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(12)])).toMatchObject({ changed: true, previousRole: null })
    await call("public.admin_set_project_member($1,$2,'LEAD')", [id(20), id(12)])
    expect(await activeRoles()).toEqual([[id(12), 'LEAD']])
    await call("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(12)])
    expect(await activeRoles()).toEqual([[id(12), 'MEMBER']])
    await call('public.admin_remove_project_member($1,$2)', [id(20), id(12)])
    expect(await activeRoles()).toEqual([])
    expect((await notifications(12)).map(n => n.kind)).toEqual(['PROJECT_ROLE_UPDATED', 'PROJECT_ROLE_UPDATED', 'PROJECT_ROLE_UPDATED', 'PROJECT_MEMBERSHIP_REMOVED'])
  })
  it('can remove a lead, which project leads themselves cannot do', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD'),($1,$3,'LEAD')", [id(20), id(10), id(11)])
    await asUser(10)
    await rejects('public.remove_project_member($1,$2)', [id(20), id(11)], 'CANNOT_REMOVE_PROJECT_LEAD')
    await asUser(1)
    await call('public.admin_remove_project_member($1,$2)', [id(20), id(11)])
    expect(await activeRoles()).toEqual([[id(10), 'LEAD']])
  })
  it('does not add suspended accounts', async () => {
    await rejects("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(13)], 'ACTIVE_MEMBER_REQUIRED')
  })
  it('closes a pending application when the officer adds the applicant directly', async () => {
    await call("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(10)])
    expect((await db.query('select status from public.project_applications')).rows).toEqual([{ status: 'ACCEPTED' }])
  })
  it('summarises every project team for the overview', async () => {
    await call("public.admin_set_project_member($1,$2,'LEAD')", [id(20), id(11)])
    await call("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(12)])
    const rows = await call<Array<{ id: string; memberCount: number; leads: string[]; pendingApplications: number }>>('public.admin_list_project_teams()')
    expect(rows.map(r => [r.id, r.memberCount, r.leads, r.pendingApplications])).toEqual([[id(21), 0, [], 0], [id(20), 2, ['Member 11'], 1]])
    const team = await call<{ roster: Array<{ email: string; role: string }>; applications: unknown[] }>('public.admin_project_team($1)', [id(20)])
    expect(team.roster.map(r => [r.email, r.role])).toEqual([['member11@oberlin.edu', 'LEAD'], ['member12@oberlin.edu', 'MEMBER']])
    expect(team.applications).toHaveLength(1)
    await asUser(2)
    await rejects('public.admin_list_project_teams()', [], 'PROJECT_TEAM_ADMIN_REQUIRED')
  })
})

describe('starting a project', () => {
  it('needs at least one team member', async () => {
    await rejects('public.start_project($1)', [id(20)], 'PROJECT_HAS_NO_MEMBERS')
  })
  it('marks the project active, records the kickoff, and notifies everyone on the team', async () => {
    await call("public.admin_set_project_member($1,$2,'LEAD')", [id(20), id(11)])
    await call("public.admin_set_project_member($1,$2,'MEMBER')", [id(20), id(12)])
    await db.query("insert into public.content_drafts(entity_type,entity_id,payload) values('projects',$1,$2)", [id(20), JSON.stringify({ title: 'Water probe', status: 'open_for_interest', leadName: '', nextStep: 'Order parts' })])
    const result = await call<{ restarted: boolean; recipients: Array<{ email: string }> }>("public.start_project($1,'Meet at the lab.',now(),'Science Center B25')", [id(20)])
    expect(result.restarted).toBe(false)
    expect(result.recipients.map(r => r.email)).toEqual(['member11@oberlin.edu', 'member12@oberlin.edu'])
    const project = (await db.query<{ status: string; started_at: string | null; lead_name: string; next_step: string }>('select status,started_at,lead_name,next_step from public.projects where id=$1', [id(20)])).rows[0]
    expect(project).toMatchObject({ status: 'active', lead_name: 'Member 11', next_step: 'Team kickoff at Science Center B25' })
    expect(project.started_at).not.toBeNull()
    const draft = (await db.query<{ payload: Record<string, string> }>("select payload from public.content_drafts where entity_id=$1", [id(20)])).rows[0].payload
    expect(draft).toMatchObject({ status: 'active', leadName: 'Member 11', nextStep: 'Order parts' })
    expect((await notifications(12)).map(n => n.kind)).toContain('PROJECT_STARTED')
    expect((await db.query('select recipient_count,meeting_location from public.project_kickoffs')).rows).toEqual([{ recipient_count: 2, meeting_location: 'Science Center B25' }])
    await asUser(11)
    const workspace = await call<{ kickoff: { message: string }; project: { startedAt: string } }>('public.get_project_workspace($1)', [id(20)])
    expect(workspace.kickoff.message).toBe('Meet at the lab.')
    expect(workspace.project.startedAt).toBeTruthy()
  })
  it('is officer-only', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(11)])
    await asUser(11)
    await rejects('public.start_project($1)', [id(20)], 'PROJECT_TEAM_ADMIN_REQUIRED')
  })
})

describe('deleting a project', () => {
  it('requires the exact project title', async () => {
    await rejects("public.delete_project($1,'Water')", [id(20)], 'PROJECT_DELETE_CONFIRMATION_MISMATCH')
  })
  it('removes the project and everything attached to it, and tells its team', async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(11)])
    await db.query("insert into public.saved_items(user_id,item_type,item_id) values($1,'PROJECT',$2)", [id(12), id(20)])
    await db.query("insert into public.content_drafts(entity_type,entity_id,payload) values('projects',$1,'{}')", [id(20)])
    expect(await call<{ notifiedMembers: number }>("public.delete_project($1,' water PROBE ')", [id(20)])).toMatchObject({ notifiedMembers: 1 })
    for (const table of ['projects', 'project_memberships', 'project_applications']) {
      expect((await db.query(`select 1 from public.${table} where ${table === 'projects' ? 'id' : 'project_id'}=$1`, [id(20)])).rows).toHaveLength(0)
    }
    expect((await db.query('select 1 from public.saved_items')).rows).toHaveLength(0)
    expect((await db.query('select 1 from public.content_drafts')).rows).toHaveLength(0)
    expect((await notifications(11)).map(n => n.kind)).toEqual(['PROJECT_DELETED'])
    expect((await db.query("select entity_id from public.audit_log where action='PROJECT_DELETED'")).rows).toEqual([{ entity_id: id(20) }])
  })
})

describe('member progress tools', () => {
  beforeEach(async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD'),($1,$3,'MEMBER'),($1,$4,'MEMBER')", [id(20), id(10), id(11), id(12)])
  })
  const milestone = async () => {
    await asUser(10)
    return (await call<{ id: string }>("public.upsert_project_milestone($1,null,'Breadboard the amplifier','',$2,null)", [id(20), 'TODO'])).id
  }
  it('lets any team member move and claim milestones, but only leads plan them', async () => {
    const m = await milestone()
    await asUser(11)
    await rejects("public.upsert_project_milestone($1,null,'Order parts','','TODO',null)", [id(20)], 'PROJECT_LEAD_REQUIRED')
    await call('public.claim_project_milestone($1)', [m])
    await asUser(12)
    await rejects('public.claim_project_milestone($1)', [m], 'MILESTONE_ALREADY_CLAIMED')
    await asUser(11)
    await call("public.set_project_milestone_status($1,'DONE')", [m])
    const row = (await db.query<{ status: string; assignee_user_id: string; completed_at: string | null }>('select status,assignee_user_id,completed_at from public.project_milestones')).rows[0]
    expect(row).toMatchObject({ status: 'DONE', assignee_user_id: id(11) })
    expect(row.completed_at).not.toBeNull()
    expect((await notifications(12)).map(n => n.kind)).toEqual(['PROJECT_MILESTONE_DONE'])
    await asUser(14)
    await rejects("public.set_project_milestone_status($1,'TODO')", [m], 'PROJECT_MEMBER_REQUIRED')
  })
  it('lets leads assign an owner who is on the team', async () => {
    await asUser(10)
    await rejects("public.upsert_project_milestone($1,null,'Order parts','','TODO',null,100,$2)", [id(20), id(14)], 'MILESTONE_ASSIGNEE_NOT_ON_TEAM')
    await call("public.upsert_project_milestone($1,null,'Order parts','','TODO',null,100,$2)", [id(20), id(12)])
    await asUser(12)
    const workspace = await call<{ milestones: Array<{ assigneeName: string }> }>('public.get_project_workspace($1)', [id(20)])
    expect(workspace.milestones[0].assigneeName).toBe('Member 12')
  })
  it('keeps a private team feed with notifications for teammates', async () => {
    await asUser(11)
    const post = (await call<{ id: string }>("public.post_project_team_update($1,'BLOCKER','The op-amp we have is too noisy.')", [id(20)])).id
    expect((await notifications(10)).map(n => [n.kind, n.action_url])).toEqual([['PROJECT_TEAM_POST', `/member/teams/${id(20)}#team-feed`]])
    expect(await notifications(11)).toEqual([])
    await asUser(12)
    await rejects('public.delete_project_team_post($1)', [post], 'TEAM_POST_FORBIDDEN')
    await asUser(14)
    await rejects("public.post_project_team_update($1,'UPDATE','hello team')", [id(20)], 'PROJECT_MEMBER_REQUIRED')
    await asUser(1)
    await call("public.post_project_team_update($1,'WIN','Great progress this week.')", [id(20)])
    await asUser(10)
    const workspace = await call<{ posts: Array<{ kind: string; officer: boolean; authorName: string }> }>('public.get_project_workspace($1)', [id(20)])
    expect(workspace.posts.map(p => [p.kind, p.officer, p.authorName])).toEqual([['WIN', true, 'Officer 1'], ['BLOCKER', false, 'Member 11']])
    await call('public.delete_project_team_post($1)', [post])
    expect((await call<{ posts: unknown[] }>('public.get_project_workspace($1)', [id(20)])).posts).toHaveLength(1)
  })
  it('shares working links and rejects anything that is not a web address', async () => {
    await asUser(11)
    await rejects("public.add_project_team_link($1,'Drive','javascript:alert(1)')", [id(20)], 'TEAM_LINK_INVALID')
    const link = (await call<{ id: string }>("public.add_project_team_link($1,'Shared drive','https://drive.google.com/drive/folders/abc')", [id(20)])).id
    await asUser(12)
    await rejects('public.remove_project_team_link($1)', [link], 'TEAM_LINK_FORBIDDEN')
    await asUser(10)
    await call('public.remove_project_team_link($1)', [link])
    expect((await db.query('select 1 from public.project_team_links')).rows).toHaveLength(0)
  })
  it('lets members leave, and asks a sole lead to hand off first', async () => {
    await asUser(10)
    await rejects('public.leave_project($1)', [id(20)], 'SOLE_PROJECT_LEAD')
    await asUser(12)
    await call('public.leave_project($1)', [id(20)])
    expect(await activeRoles()).toEqual([[id(10), 'LEAD'], [id(11), 'MEMBER']])
    expect((await db.query<{ allowed: boolean }>('select private.is_project_member($1) allowed', [id(20)])).rows[0].allowed).toBe(false)
    expect((await notifications(10)).map(n => n.kind)).toEqual(['PROJECT_MEMBER_LEFT'])
  })
  it('summarises progress for each of my projects', async () => {
    const m = await milestone()
    await call("public.upsert_project_milestone($1,null,'Log a week of data','',$2,null)", [id(20), 'TODO'])
    await call("public.set_project_milestone_status($1,'DONE')", [m])
    const [overview] = await call<Array<{ role: string; memberCount: number; milestonesDone: number; milestonesTotal: number; nextMilestone: { title: string } }>>('public.list_my_project_overview()')
    expect(overview).toMatchObject({ role: 'LEAD', memberCount: 3, milestonesDone: 1, milestonesTotal: 2, nextMilestone: { title: 'Log a week of data' } })
  })
})

describe('applications, invitations and update revisions', () => {
  beforeEach(async () => {
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')", [id(20), id(14)])
  })
  it('lets applicants withdraw a pending application', async () => {
    await asUser(10)
    expect(await call<{ status: string }>('public.withdraw_project_application($1)', [id(30)])).toMatchObject({ status: 'WITHDRAWN' })
    await rejects('public.withdraw_project_application($1)', [id(30)], 'PROJECT_APPLICATION_NOT_WITHDRAWABLE')
    await asUser(11)
    await db.query("update public.project_applications set status='PENDING' where id=$1", [id(30)])
    await rejects('public.withdraw_project_application($1)', [id(30)], 'PROJECT_APPLICATION_NOT_WITHDRAWABLE')
  })
  it('closes an open application when the member joins through an invitation', async () => {
    await asUser(14)
    const invite = await call<{ inviteId: string }>("public.create_project_team_invite($1,$2,'Come help')", [id(20), id(10)])
    await asUser(10)
    await call("public.respond_project_team_invite($1,'ACCEPT')", [invite.inviteId])
    expect((await db.query('select status from public.project_applications where id=$1', [id(30)])).rows).toEqual([{ status: 'ACCEPTED' }])
  })
  it('reports expired invitations as expired and allows a fresh one', async () => {
    await asUser(14)
    await call("public.create_project_team_invite($1,$2,'First try')", [id(20), id(11)])
    await rejects("public.create_project_team_invite($1,$2,'Again')", [id(20), id(11)], 'ALREADY_INVITED')
    await db.query("update public.project_team_invites set expires_at=now()-interval '1 day'")
    await asUser(11)
    expect((await db.query<{ status: string }>('select status from public.list_my_project_team_invites()')).rows).toEqual([{ status: 'EXPIRED' }])
    await asUser(14)
    await call("public.create_project_team_invite($1,$2,'Second try')", [id(20), id(11)])
    expect((await db.query('select status from public.project_team_invites order by created_at,status')).rows.map(r => (r as { status: string }).status).sort()).toEqual(['EXPIRED', 'PENDING'])
  })
  it('sends a revised update back to review after an officer asks for changes', async () => {
    await asUser(14)
    const { updateId } = await call<{ updateId: string }>("public.submit_team_project_update($1,'Week one','We ordered the parts for the probe.','', '', null)", [id(20)])
    await rejects("public.resubmit_team_project_update($1,'Week one','Still pending review','', '', null)", [updateId], 'TEAM_UPDATE_NOT_EDITABLE')
    await asUser(1)
    await call("public.review_team_project_update($1,'CHANGES','Add a photo caption')", [updateId])
    await asUser(14)
    await call("public.resubmit_team_project_update($1,'Week one, revised','We ordered and received the probe parts.','', '', null)", [updateId])
    expect((await db.query('select status from public.project_update_reviews')).rows).toEqual([{ status: 'PENDING_REVIEW' }])
    expect((await db.query<{ payload: { title: string } }>("select payload from public.content_drafts where entity_type='project_updates'")).rows[0].payload.title).toBe('Week one, revised')
  })
  it('archives a project off the public site and restores it', async () => {
    await db.query("update public.projects set published_at=now() where id=$1", [id(20)])
    expect(await call<{ publicationState: string }>('public.set_project_archived($1,true)', [id(20)])).toMatchObject({ publicationState: 'archived' })
    const rows = await call<Array<{ id: string; publicationState: string }>>('public.admin_list_project_teams()')
    expect(rows.find(r => r.id === id(20))?.publicationState).toBe('archived')
    expect(await call<{ publicationState: string }>('public.set_project_archived($1,false)', [id(20)])).toMatchObject({ publicationState: 'published' })
    expect(await call<{ publicationState: string }>('public.set_project_archived($1,false)', [id(21)])).toMatchObject({ publicationState: 'draft' })
    await asUser(14)
    await rejects('public.set_project_archived($1,true)', [id(20)], 'PROJECT_TEAM_ADMIN_REQUIRED')
  })
})

describe('one-time roster cleanup script', () => {
  const script = () => readFileSync('database/maintenance/2026-09-22_project_roster_cleanup.sql', 'utf8').replace(/^begin;$/m, '').replace(/^commit;$/m, '')
  it('demotes people made lead by the old approval, keeps proposers as leads, and deletes the DO Probe project', async () => {
    await db.query("insert into public.projects(id,slug,title,publication_state) values($1,'do-probe-amplifier-mayfly-data-logger','DO Probe Amplifier & MayFly Data Logger','published')", [id(22)])
    await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD'),($1,$3,'LEAD'),($1,$4,'MEMBER'),($5,$2,'LEAD')", [id(20), id(10), id(11), id(12), id(22)])
    await db.query("insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot,created_at) values($1,'PROJECT_LEAD_APPROVED','submission','x',$2,'2026-09-15')", [id(1), JSON.stringify({ projectId: id(20), userId: id(11), role: 'LEAD' })])
    await db.query("insert into public.audit_log(actor_id,action,entity_type,entity_id,after_snapshot,created_at) values($1,'PROJECT_LEAD_APPROVED','submission','y',$2,'2026-09-15')", [id(1), JSON.stringify({ projectId: id(20), userId: id(10), role: 'LEAD' })])
    await db.query("insert into public.project_proposals(proposer_user_id,title,problem,goal,status,approved_project_id) values($1,'Water probe','Creek oxygen is unmeasured','Log dissolved oxygen','APPROVED',$2)", [id(10), id(20)])
    await db.query("insert into public.saved_items(user_id,item_type,item_id) values($1,'PROJECT',$2)", [id(12), id(22)])
    await db.exec(script())
    expect(await activeRoles()).toEqual([[id(10), 'LEAD'], [id(11), 'MEMBER'], [id(12), 'MEMBER']])
    expect((await db.query("select 1 from public.projects where slug='do-probe-amplifier-mayfly-data-logger'")).rows).toHaveLength(0)
    expect((await db.query("select 1 from public.project_memberships where project_id=$1", [id(22)])).rows).toHaveLength(0)
    expect((await db.query('select 1 from public.saved_items')).rows).toHaveLength(0)
    expect((await db.query("select 1 from public.projects where id=$1", [id(20)])).rows).toHaveLength(1)
    expect((await notifications(10)).map(n => n.kind)).toEqual(['PROJECT_DELETED'])
  })
})
