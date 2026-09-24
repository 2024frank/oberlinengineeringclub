// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let db: PGlite
const SUPER = 1, STAFF = 2, SUSPENDED = 3, MEMBER = 10
const emailOf = (n: number) => `u${n}@oberlin.edu`
const invite = (email: string, expires = "now()+interval '72 hours'", status = 'INVITED') => db.query<{ id: string }>(
  `insert into public.staff_invites(email,display_name,role,token_hash,status,expires_at,invited_by) values($1,'Invitee','EDITOR',gen_random_uuid()::text,$2,${expires},$3) returning id`,
  [email, status, id(SUPER)],
).then((result) => result.rows[0].id)
const statusOf = async (inviteId: string) => (await db.query<{ status: string }>('select status from public.staff_invites where id=$1', [inviteId])).rows[0].status
const accept = (inviteId: string, user: number) => db.query<{ result: { error?: string; role?: string } }>('select public.accept_staff_invite($1,$2) result', [inviteId, id(user)]).then((r) => r.rows[0].result)
// Runs a statement that must fail without aborting the rest of the test's transaction.
async function refused(run: () => Promise<unknown>) {
  await db.exec('savepoint attempt')
  try { await run() } catch (error) {
    await db.exec('rollback to savepoint attempt')
    return error as Error & { code?: string }
  }
  await db.exec('release savepoint attempt')
  throw new Error('Expected the statement to be refused')
}
let preexistingStale = ''
let preexistingOpen = ''

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;`)
  for (const name of ['001_core', '002_content', '003_cms', '004_rls', '010_staff_invites', '011_members', '012_project_collaboration', '013_member_staff_rls']) {
    await db.exec(readFileSync(`database/migrations/${name}.sql`, 'utf8'))
  }
  for (const n of [SUPER, STAFF, SUSPENDED, MEMBER, 11]) await db.query('insert into auth.users values($1,$2)', [id(n), emailOf(n)])
  for (const [n, role, status] of [[SUPER, 'SUPER_ADMIN', 'ACTIVE'], [STAFF, 'ADMIN', 'ACTIVE'], [SUSPENDED, 'ADMIN', 'SUSPENDED']] as const) {
    await db.query('insert into public.admin_profiles(user_id,display_name,active,status) values($1,$2,$3,$4)', [id(n), `Staff ${n}`, status === 'ACTIVE', status])
    await db.query('insert into public.role_assignments(user_id,role) values($1,$2)', [id(n), role])
  }
  // Rows written before 028 existed: one ran out while still marked INVITED.
  preexistingStale = await invite('stale@oberlin.edu', "now()-interval '1 day'")
  preexistingOpen = await invite('open@oberlin.edu')
  await db.exec(readFileSync('database/migrations/028_staff_invite_lifecycle.sql', 'utf8'))
  await db.exec('grant usage on schema public,private,auth to authenticated; grant select,insert,update on public.staff_invites to authenticated')
}, 30000)
beforeEach(async () => { await db.exec('begin') })
afterEach(async () => { await db.exec('rollback') })
afterAll(async () => { await db?.close() })

it('records invitations that had already expired when the migration ran', async () => {
  expect(await statusOf(preexistingStale)).toBe('EXPIRED')
  expect(await statusOf(preexistingOpen)).toBe('INVITED')
})

it('still allows only one open invitation per email', async () => {
  await invite(emailOf(MEMBER))
  expect(await refused(() => invite(emailOf(MEMBER).toUpperCase()))).toMatchObject({ code: '23505' })
})

it('lets a new invitation replace one that expired without being recorded', async () => {
  const stale = await invite(emailOf(MEMBER), "now()-interval '1 minute'")
  const fresh = await invite(emailOf(MEMBER))
  expect(await statusOf(stale)).toBe('EXPIRED')
  expect(await statusOf(fresh)).toBe('INVITED')
})

it('keeps the EXPIRED status when someone opens an expired invitation', async () => {
  const stale = await invite(emailOf(MEMBER), "now()-interval '1 minute'")
  expect(await accept(stale, MEMBER)).toEqual({ error: 'STAFF_INVITE_EXPIRED' })
  expect(await statusOf(stale)).toBe('EXPIRED')
  expect((await db.query('select 1 from public.admin_profiles where user_id=$1', [id(MEMBER)])).rows).toHaveLength(0)
  expect((await refused(() => accept(stale, MEMBER))).message).toContain('STAFF_INVITE_EXPIRED')
})

it('activates an existing member account that matches the invitation', async () => {
  const open = await invite(emailOf(MEMBER))
  expect(await accept(open, MEMBER)).toMatchObject({ role: 'EDITOR' })
  expect(await statusOf(open)).toBe('ACCEPTED')
  expect((await db.query<{ role: string }>('select role from public.role_assignments where user_id=$1', [id(MEMBER)])).rows[0].role).toBe('EDITOR')
})

it('does not invite someone who is already active staff, or let an invitation change their role', async () => {
  expect((await refused(() => invite(emailOf(STAFF).toUpperCase()))).message).toContain('STAFF_ALREADY_ACTIVE')
  // An invitation created while the officer was suspended cannot overwrite a later reactivation.
  const pending = await invite(emailOf(SUSPENDED))
  await db.query("update public.admin_profiles set active=true,status='ACTIVE' where user_id=$1", [id(SUSPENDED)])
  expect((await refused(() => accept(pending, SUSPENDED))).message).toContain('STAFF_ALREADY_ACTIVE')
  expect((await db.query<{ role: string }>('select role from public.role_assignments where user_id=$1', [id(SUSPENDED)])).rows[0].role).toBe('ADMIN')
  expect(await statusOf(pending)).toBe('INVITED')
})

it('reinstates a suspended officer through a new invitation', async () => {
  const open = await invite(emailOf(SUSPENDED))
  expect(await accept(open, SUSPENDED)).toMatchObject({ role: 'EDITOR' })
  expect((await db.query<{ status: string }>('select status from public.admin_profiles where user_id=$1', [id(SUSPENDED)])).rows[0].status).toBe('ACTIVE')
})

it('reopens an expired invitation on resend unless another one is already open', async () => {
  const expired = await invite(emailOf(MEMBER), "now()-interval '1 minute'", 'EXPIRED')
  await db.query("update public.staff_invites set status='INVITED',token_hash='resent',expires_at=now()+interval '72 hours' where id=$1", [expired])
  expect(await statusOf(expired)).toBe('INVITED')

  const other = await invite(emailOf(11), "now()-interval '1 minute'", 'EXPIRED')
  await invite(emailOf(11))
  expect(await refused(() => db.query("update public.staff_invites set status='INVITED',token_hash='resent-2',expires_at=now()+interval '72 hours' where id=$1", [other]))).toMatchObject({ code: '23505' })
})

it('applies the same rules to a Super Admin writing through row-level security', async () => {
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id(SUPER)])
  await db.exec('set local role authenticated')
  await db.query(`insert into public.staff_invites(email,display_name,role,token_hash,expires_at,invited_by) values($1,'Invitee','EDITOR','rls-token',now()-interval '1 minute',$2)`, [emailOf(MEMBER), id(SUPER)])
  await db.query(`insert into public.staff_invites(email,display_name,role,token_hash,expires_at,invited_by) values($1,'Invitee','EDITOR','rls-token-2',now()+interval '72 hours',$2)`, [emailOf(MEMBER), id(SUPER)])
  expect((await refused(() => db.query(`insert into public.staff_invites(email,display_name,role,token_hash,expires_at,invited_by) values($1,'Invitee','EDITOR','rls-token-3',now()+interval '72 hours',$2)`, [emailOf(STAFF), id(SUPER)]))).message).toContain('STAFF_ALREADY_ACTIVE')
  expect((await db.query<{ status: string }>("select status from public.staff_invites where token_hash='rls-token'")).rows[0].status).toBe('EXPIRED')
})
