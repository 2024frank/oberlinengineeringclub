// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { existsSync, readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
const asUser = (n: number | null) => db.query("select set_config('request.jwt.claim.sub',$1,false)", [n === null ? '' : id(n)])
async function action(action: string, teamId: string | null = null, payload: Record<string, unknown> = {}) {
  const result = await db.query<{ result: { teamId: string; status?: string } }>('select public.club_team_action($1,$2,$3) result', [action, teamId, JSON.stringify(payload)])
  return result.rows[0].result
}
async function create() { return (await action('create', null, { name: 'Water sensors', description: 'Build instruments for the creek', recruiting: true })).teamId }
async function join(team: string, member = 11) {
  await action('invite', team, { userId: id(member), message: 'Join us' })
  await asUser(member)
  await action('respond', team, { decision: 'ACCEPT' })
  await asUser(10)
}
const allowed = async () => (await db.query<{ allowed: boolean }>('select private.is_project_member($1) allowed', [id(20)])).rows[0].allowed
const list = async () => (await db.query<{ result: Array<{ id: string; roster: Array<{ userId: string | null; displayName: string }>; projects: unknown[]; requests: unknown[] }> }>('select public.list_club_teams() result')).rows[0].result

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;`)
  for (const name of ['001_core','002_content','003_cms','010_staff_invites','011_members','012_project_collaboration','013_member_staff_rls','015_project_proposal_review','016_project_team_workflows','017_project_workspace','021_submission_membership_approval','023_admin_project_lead_approval','024_club_teams']) {
    const path = `database/migrations/${name}.sql`
    if (existsSync(path)) await db.exec(readFileSync(path,'utf8'))
  }
}, 30000)
beforeEach(async () => {
  await db.exec('begin')
  for (const n of [1,2,10,11,12,13,14]) await db.query('insert into auth.users values($1,$2)', [id(n), `m${n}@oberlin.edu`])
  for (const [n,role] of [[1,'ADMIN'],[2,'EDITOR']] as const) {
    await db.query("insert into public.admin_profiles(user_id,status,active) values($1,'ACTIVE',true)",[id(n)])
    await db.query('insert into public.role_assignments(user_id,role) values($1,$2)',[id(n),role])
  }
  for (const n of [10,11,12,13,14]) {
    await db.query("insert into public.membership_requests(id,email,display_name,status,auth_user_id) values($1,$2,$3,'ACTIVE',$1)",[id(n),`m${n}@oberlin.edu`,`Member ${n}`])
    await db.query('insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status) values($1,$1,$2,$3,$4)',[id(n),`m${n}@oberlin.edu`,`Member ${n}`,n===13?'SUSPENDED':'ACTIVE'])
    await db.query("insert into public.member_privacy_settings(user_id,directory_visible,visible_fields) values($1,$2,array['display_name','skills']) on conflict(user_id) do update set directory_visible=excluded.directory_visible,visible_fields=excluded.visible_fields",[id(n),n!==12])
  }
  await db.query("insert into public.projects(id,slug,title,publication_state,recruiting) values($1,'water-sensor','Water sensor','published',true),($2,'private-project','Private project','draft',true)",[id(20),id(21)])
  await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'LEAD')",[id(20),id(14)])
  await asUser(10)
})
afterEach(async () => { await db.exec('rollback') })
afterAll(async () => { await db?.close() })

it('creates a team without creating or joining a project', async () => {
  const team = await create()
  expect((await list())[0].id).toBe(team)
  expect((await list())[0].roster).toHaveLength(1)
  expect(await allowed()).toBe(false)
})
it.each([null,13,2])('blocks non-active members from creating teams (%s)', async user => {
  await asUser(user)
  await expect(create()).rejects.toThrow('ACTIVE_MEMBER_REQUIRED')
})
it('requires invitation acceptance and prevents another member accepting it', async () => {
  const team = await create()
  await action('invite',team,{userId:id(11)})
  expect((await list())[0].roster).toHaveLength(1)
  await asUser(12)
  await expect(action('respond',team,{decision:'ACCEPT'})).rejects.toThrow('TEAM_INVITATION_NOT_FOUND')
})
it('adds accepted members, and handles repeated acceptance without duplicate membership', async () => {
  const team = await create()
  await join(team)
  await asUser(11)
  await action('respond',team,{decision:'ACCEPT'})
  expect((await list())[0].roster).toHaveLength(2)
})
it('keeps declined and expired invitations from granting membership', async () => {
  const team = await create()
  await action('invite',team,{userId:id(11)})
  await asUser(11)
  await action('respond',team,{decision:'DECLINE'})
  expect((await list())[0].roster).toHaveLength(1)
  await asUser(10)
  await action('invite',team,{userId:id(11)})
  await db.exec("update public.club_team_requests set expires_at=now()-interval '1 second'")
  await asUser(11)
  expect((await action('respond',team,{decision:'ACCEPT'})).status).toBe('EXPIRED')
  expect((await list())[0].roster).toHaveLength(1)
})
it('lets a member request a team and only the team lead review it', async () => {
  const team = await create()
  await asUser(11)
  await action('join',team,{message:'I can help with circuits'})
  await expect(action('review-member',team,{userId:id(11),decision:'ACCEPT'})).rejects.toThrow('TEAM_LEAD_REQUIRED')
})
it('accepts a join request and rejects requests to closed teams', async () => {
  const team = await create()
  await asUser(11)
  await action('join',team)
  await asUser(10)
  await action('review-member',team,{userId:id(11),decision:'ACCEPT'})
  expect((await list())[0].roster).toHaveLength(2)
  await action('update',team,{name:'Water sensors',description:'Build sensors',recruiting:false})
  await asUser(12)
  await expect(action('join',team)).rejects.toThrow('TEAM_NOT_RECRUITING')
})
it('does not grant project access until a project lead approves the connection', async () => {
  const team = await create()
  await join(team)
  await action('request-project',team,{projectId:id(20)})
  expect(await allowed()).toBe(false)
  await asUser(14)
  await action('review-project',team,{projectId:id(20),decision:'APPROVE'})
  await asUser(11)
  expect(await allowed()).toBe(true)
  const workspace = (await db.query<{ result: { myRole: string; roster: unknown[] } }>('select public.get_project_workspace($1) result',[id(20)])).rows[0].result
  expect(workspace.myRole).toBe('MEMBER')
  expect(workspace.roster).toHaveLength(3)
})
it('blocks self-approval of project connections and unpublished projects', async () => {
  const team = await create()
  await expect(action('review-project',team,{projectId:id(20),decision:'APPROVE'})).rejects.toThrow('PROJECT_REVIEW_FORBIDDEN')
})
it('rejects connecting an unpublished project', async () => {
  const team = await create()
  await expect(action('request-project',team,{projectId:id(21)})).rejects.toThrow('PROJECT_NOT_ACCEPTING_TEAMS')
})
it('revokes team-derived access when leaving, without removing existing direct leads', async () => {
  const team = await create()
  await join(team)
  await action('request-project',team,{projectId:id(20)})
  await asUser(1)
  await action('review-project',team,{projectId:id(20),decision:'APPROVE'})
  await asUser(11)
  await action('leave',team)
  expect(await allowed()).toBe(false)
  await asUser(14)
  expect((await db.query<{ yes:boolean }>('select private.is_project_lead($1) yes',[id(20)])).rows[0].yes).toBe(true)
})
it('allows project leads to remove team-derived access explicitly', async () => {
  const team = await create()
  await action('request-project',team,{projectId:id(20)})
  await asUser(14)
  await action('review-project',team,{projectId:id(20),decision:'APPROVE'})
  await db.query('select public.remove_project_member($1,$2)',[id(20),id(10)])
  await asUser(10)
  expect(await allowed()).toBe(false)
})
it('masks hidden directory members outside their team, but shows the roster to teammates', async () => {
  const team = await create()
  await asUser(12)
  await action('join',team)
  await asUser(10)
  await action('review-member',team,{userId:id(12),decision:'ACCEPT'})
  expect((await list())[0].roster.some(m=>m.userId===id(12))).toBe(true)
  await asUser(11)
  const roster=(await list())[0].roster
  expect(roster.some(m=>m.userId===id(12))).toBe(false)
  expect(roster.some(m=>m.displayName==='OEC member')).toBe(true)
})
it('limits pending requests to leads and admins', async () => {
  const team=await create()
  await action('invite',team,{userId:id(11)})
  expect((await list())[0].requests).toHaveLength(1)
  await asUser(12)
  expect((await list())[0].requests).toEqual([])
})
it('automatically connects an approved team proposal, but not a pending one', async () => {
  const team=await create()
  await join(team)
  await db.query("insert into public.project_proposals(id,proposer_user_id,title,problem,goal,team_id) values($1,$2,'Creek sensors','Measure dissolved oxygen','Build a useful measurement device',$3)",[id(30),id(10),team])
  expect((await list())[0].projects).toHaveLength(0)
  await asUser(1)
  const approved=await db.query<{ result:{projectId:string} }>('select public.approve_project_proposal($1,$2) result',[id(30),id(1)])
  await asUser(11)
  const result=await db.query<{ allowed:boolean }>('select private.is_project_member($1) allowed',[approved.rows[0].result.projectId])
  expect(result.rows[0].allowed).toBe(true)
})
it('does not let a non-lead attach their proposal to another team', async () => {
  const team=await create()
  await asUser(11)
  await expect(db.query("insert into public.project_proposals(proposer_user_id,title,problem,goal,team_id) values($1,'Creek sensors','Measure dissolved oxygen','Build a useful measurement device',$2)",[id(11),team])).rejects.toThrow('TEAM_LEAD_REQUIRED')
})
it('keeps direct table writes and anonymous RPC calls unavailable', async () => {
  expect((await db.query<{ allowed:boolean }>("select has_function_privilege('anon','public.club_team_action(text,uuid,jsonb)','execute') allowed")).rows[0].allowed).toBe(false)
  expect((await db.query<{ allowed:boolean }>("select has_table_privilege('authenticated','public.club_team_memberships','insert') allowed")).rows[0].allowed).toBe(false)
})
it('runs discovery and creation with the real authenticated database role', async () => {
  await db.exec('set local role authenticated')
  const team = await create()
  expect((await list())[0].id).toBe(team)
})
it('prevents a teammate from removing another teammate', async () => {
  const team = await create()
  await join(team)
  await asUser(11)
  await expect(action('remove',team,{userId:id(10)})).rejects.toThrow('TEAM_LEAD_REQUIRED')
})
it('transfers team leadership without granting project leadership', async () => {
  const team = await create()
  await join(team)
  await action('transfer',team,{userId:id(11)})
  await action('leave',team)
  await asUser(11)
  expect((await list())[0].roster).toEqual([{userId:id(11),displayName:'Member 11',role:'LEAD'}])
  expect((await db.query<{ yes:boolean }>('select private.is_project_lead($1) yes',[id(20)])).rows[0].yes).toBe(false)
})
it('adds future accepted teammates to approved projects but not suspended members', async () => {
  const team=await create()
  await action('request-project',team,{projectId:id(20)})
  await asUser(1)
  await action('review-project',team,{projectId:id(20),decision:'APPROVE'})
  await asUser(10)
  await join(team)
  await asUser(11)
  expect(await allowed()).toBe(true)
  await db.query("update public.member_profiles set status='SUSPENDED' where user_id=$1",[id(11)])
  expect(await allowed()).toBe(false)
})
it('preserves direct membership when the same person leaves their connected team', async () => {
  const team=await create()
  await join(team)
  await db.query("insert into public.project_memberships(project_id,user_id,role) values($1,$2,'MEMBER')",[id(20),id(11)])
  await asUser(11)
  await action('leave',team)
  expect(await allowed()).toBe(true)
})
it.each(['direct','team'])('removes suspended %s project members before they are reactivated', async source => {
  if(source==='direct') {
    await db.query("insert into public.project_memberships(project_id,user_id) values($1,$2)",[id(20),id(11)])
  } else {
    const team=await create()
    await join(team)
    await action('request-project',team,{projectId:id(20)})
    await asUser(14)
    await action('review-project',team,{projectId:id(20),decision:'APPROVE'})
  }
  await db.query("update public.member_profiles set status='SUSPENDED' where user_id=$1",[id(11)])
  await asUser(14)
  await db.query('select public.remove_project_member($1,$2)',[id(20),id(11)])
  await db.query("update public.member_profiles set status='ACTIVE' where user_id=$1",[id(11)])
  await asUser(11)
  expect(await allowed()).toBe(false)
})
