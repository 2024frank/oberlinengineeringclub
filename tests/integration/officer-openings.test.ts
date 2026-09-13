// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
let db: PGlite
const asUser = (n: number | null) => db.query("select set_config('request.jwt.claim.sub',$1,false)",[n === null ? '' : id(n)])
const list = async () => (await db.query<{result: {id:string}[]}>('select public.list_officer_positions() result')).rows[0].result
const applications = async () => (await db.query<{result: {userId:string;status:string;feedback:string}[]}>('select public.list_officer_applications() result')).rows[0].result
const action = (name='apply', position=20, user:number|null=null, decision:string|null=null) => db.query('select public.officer_application_action($1,$2,$3,$4,$5,$6,$7)',[name,id(position),'I would like to help organize club activities.','Organized workshops',decision,'Thanks for applying',user ? id(user) : null])
const publish = async (n=20) => {
  const previous=(await db.query<{u:string}>("select current_setting('request.jwt.claim.sub',true) u")).rows[0].u
  await asUser(1)
  await db.query("update public.leaders set publication_state='published',open_seat=true where id=$1",[id(n)])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[previous])
}
const countMail = async () => Number((await db.query<{n:number}>('select count(*) n from public.officer_email_outbox')).rows[0].n)
beforeAll(async () => {
  db=new PGlite({extensions:{pgcrypto}})
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.role() returns text language sql stable as $$ select 'authenticated'::text $$;`)
  for(const name of ['001_core','002_content','003_cms','004_rls','010_staff_invites','011_members','012_project_collaboration','013_member_staff_rls','019_project_difficulty','025_officer_openings']) {
    const path=`database/migrations/${name}.sql`
    if(existsSync(path)) await db.exec(readFileSync(path,'utf8'))
  }
  await db.exec('grant usage on schema public,private,auth to authenticated;grant select,update on public.leaders to authenticated')
  await db.exec('create schema extensions;alter extension pgcrypto set schema extensions')
  await db.exec(`create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
    create schema net;create table net.test_requests(url text,headers jsonb);
    create table net.http_request_queue(headers jsonb);
    grant select on all tables in schema net to public,anon,authenticated;
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$begin insert into net.test_requests values(url,headers);return 1;end$$;
    create schema cron;create table cron.test_jobs(name text,schedule text,command text);
    create function cron.schedule(name text,schedule text,command text) returns bigint language plpgsql as $$begin insert into cron.test_jobs values(name,schedule,command);return 1;end$$;`)
  const scheduler=readFileSync('database/migrations/026_officer_email_schedule.sql','utf8').replace(/^create extension if not exists (pg_cron|pg_net);$/gm,'')
  await db.exec(scheduler)
},30000)
beforeEach(async()=>{
  await db.exec('begin')
  for(const n of [1,2,10,11,12])await db.query('insert into auth.users values($1,$2)',[id(n),`m${n}@oberlin.edu`])
  for(const [n,role] of [[1,'ADMIN'],[2,'EDITOR']] as const){
    await db.query("insert into public.admin_profiles(user_id,status,active) values($1,'ACTIVE',true)",[id(n)])
    await db.query('insert into public.role_assignments(user_id,role,scopes,can_publish) values($1,$2,array[\'leaders\'],true)',[id(n),role])
  }
  for(const n of [10,11,12]) {
    await db.query("insert into public.membership_requests(id,email,display_name,status,auth_user_id) values($1,$2,'Test member','ACTIVE',$1)",[id(n),`m${n}@oberlin.edu`])
    await db.query('insert into public.member_profiles(user_id,membership_request_id,oberlin_email,display_name,status) values($1,$1,$2,$3,$4)',[id(n),`m${n}@oberlin.edu`,`Member ${n}`,n===12?'SUSPENDED':'ACTIVE'])
  }
  for(const n of [20,21])await db.query("insert into public.leaders(id,name,role_title) values($1,'Open position','Secretary')",[id(n)])
  await asUser(10)
})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})

it('shows only published current non-advisor open positions',async()=>{
  await publish();expect((await list()).map(r=>r.id)).toEqual([id(20)])
  await db.exec('update public.leaders set advisor=true');expect(await list()).toEqual([])
})
it('excludes filled, expired and non-current positions',async()=>{
  await publish();await db.exec("update public.leaders set application_closes_at=now()-interval '1 second'");expect(await list()).toEqual([])
  await db.exec('update public.leaders set application_closes_at=null,current=false');expect(await list()).toEqual([])
  await db.exec('update public.leaders set current=true,open_seat=false');expect(await list()).toEqual([])
})
it('lets an active member apply once and edit their pending application',async()=>{
  await publish();await action();await action();expect(await applications()).toHaveLength(1)
  expect((await applications())[0].status).toBe('PENDING')
})
it.each([null,2,12])('rejects applications without active membership (%s)',async n=>{
  await publish();await asUser(n);await expect(action()).rejects.toThrow('ACTIVE_MEMBER_REQUIRED')
})
it('rejects applying after a position has closed',async()=>{
  await publish();await db.exec('update public.leaders set open_seat=false');await expect(action()).rejects.toThrow('POSITION_CLOSED')
})
it('rejects short statements at the database boundary',async()=>{
  await publish();await expect(db.query('select public.officer_application_action($1,$2,$3)',['apply',id(20),'hi'])).rejects.toThrow('APPLICATION_INVALID')
})
it('limits members to their own applications',async()=>{
  await publish();await action();await asUser(11);expect(await applications()).toEqual([])
  await asUser(1);expect(await applications()).toHaveLength(1)
})
it.each([10,2])('does not let members or editors review applications (%s)',async n=>{
  await publish();await action();await asUser(n);await expect(action('review',20,10,'SHORTLISTED')).rejects.toThrow('ADMIN_REQUIRED')
})
it('shortlists without granting staff or project access',async()=>{
  await publish();await action();await asUser(1);await action('review',20,10,'SHORTLISTED')
  await asUser(10);expect((await applications())[0]).toMatchObject({status:'SHORTLISTED',feedback:'Thanks for applying'})
  expect((await db.query<{n:number}>('select count(*) n from public.role_assignments where user_id=$1',[id(10)])).rows[0].n).toBe(0)
  expect((await db.query<{n:number}>('select count(*) n from public.project_memberships')).rows[0].n).toBe(0)
})
it('prevents rewriting an application after review',async()=>{
  await publish();await action();await asUser(1);await action('review',20,10,'NOT_SELECTED');await asUser(10)
  await expect(action()).rejects.toThrow('APPLICATION_REVIEWED')
})
it('does not let withdrawal erase a previous review',async()=>{
  await publish();await action();await asUser(1);await action('review',20,10,'SHORTLISTED');await asUser(10);await action('withdraw')
  await expect(action()).rejects.toThrow('APPLICATION_REVIEWED')
})
it('allows withdrawal after the vacancy closes',async()=>{
  await publish();await action();await db.exec('update public.leaders set open_seat=false');await action('withdraw')
  expect((await applications())[0].status).toBe('WITHDRAWN')
})
it('queues one email per active member on first publication, never edits or republishing',async()=>{
  expect(await countMail()).toBe(0);await publish();expect(await countMail()).toBe(2)
  await asUser(1);await db.exec("update public.leaders set bio='Changed'");await publish();expect(await countMail()).toBe(2)
  await db.exec('update public.leaders set open_seat=false');await publish();expect(await countMail()).toBe(2)
})
it('honors deadlines passed through the real publishing function',async()=>{
  await asUser(1)
  await db.query('select public.publish_content_snapshot($1,$2,$3)', ['leaders',id(20),JSON.stringify({name:'Open position',roleTitle:'Secretary',openSeat:true,current:true,applicationClosesAt:'2020-01-01T00:00:00Z'})])
  expect(await list()).toEqual([]);expect(await countMail()).toBe(0)
})
it('claims recipients once, skips inactive members, and requires service privileges',async()=>{
  await publish();await db.query("update public.member_profiles set status='SUSPENDED' where user_id=$1",[id(11)])
  await db.exec('set local role service_role')
  const rows=(await db.query<{id:string;claimToken:string}>('select * from public.claim_officer_email()')).rows
  expect(rows).toHaveLength(1)
  expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
  await db.query('select public.finish_officer_email($1,$2,$3,$4)',[rows[0].id,rows[0].claimToken,'SENT',null])
  expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
})
it('does not retry an ambiguous send past the provider idempotency window',async()=>{
  await publish();await db.exec("update public.officer_email_outbox set status='SENDING',first_attempt_at=now()-interval '25 hours',claimed_at=now()-interval '25 hours'")
  await db.exec('set local role service_role')
  expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
  await db.exec('reset role')
  expect((await db.query<{status:string}>('select distinct status from public.officer_email_outbox')).rows).toEqual([{status:'UNKNOWN'}])
})
it('retains the original deduplication deadline after an uncertain attempt then a rejection',async()=>{
  await publish();await db.exec("update public.officer_email_outbox set status='SENDING',first_attempt_at=now()-interval '22 hours',claimed_at=now()-interval '22 hours'")
  const row=(await db.query<{id:string;claimToken:string}>('select * from public.claim_officer_email()')).rows[0]
  await db.query('select public.finish_officer_email($1,$2,$3,$4)',[row.id,row.claimToken,'FAILED','EMAIL_HTTP_429'])
  await db.exec("update public.officer_email_outbox set first_attempt_at=now()-interval '25 hours',next_attempt_at=now()-interval '1 second'")
  expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
  expect((await db.query<{status:string}>('select distinct status from public.officer_email_outbox')).rows).toEqual([{status:'UNKNOWN'}])
})
it('does not send a stale announcement for a closed role',async()=>{
  await publish();await db.exec('update public.leaders set open_seat=false');await db.exec('set local role service_role')
  expect((await db.query('select * from public.claim_officer_email()')).rows).toHaveLength(0)
})
it('allows admins to retry confirmed failures but not sent or uncertain deliveries',async()=>{
  await publish();await db.exec("update public.officer_email_outbox set status='FAILED',attempts=5")
  await asUser(1);await db.query('select public.retry_officer_emails($1)',[id(20)])
  expect((await db.query<{attempts:number}>('select distinct attempts from public.officer_email_outbox')).rows).toEqual([{attempts:0}])
  await db.exec("update public.officer_email_outbox set status='UNKNOWN'")
  await db.query('select public.retry_officer_emails($1)',[id(20)])
  expect((await db.query<{status:string}>('select distinct status from public.officer_email_outbox')).rows).toEqual([{status:'UNKNOWN'}])
})
it('allows public listings but not anonymous writes or direct member table access',async()=>{
  await publish();await db.exec('set local role anon');expect(await list()).toHaveLength(1);await db.exec('reset role')
  for(const role of ['anon','authenticated'])expect((await db.query<{ok:boolean}>("select has_table_privilege($1,'public.officer_applications','insert') ok",[role])).rows[0].ok).toBe(false)
  expect((await db.query<{ok:boolean}>("select has_function_privilege('authenticated','public.claim_officer_email()','execute') ok")).rows[0].ok).toBe(false)
})
it('blocks an editor from triggering email by bypassing the publishing RPC',async()=>{
  await db.query('update public.role_assignments set can_publish=false where user_id=$1',[id(2)])
  await asUser(2);await db.exec('set local role authenticated')
  await expect(db.query("update public.leaders set publication_state='published',open_seat=true where id=$1",[id(20)])).rejects.toThrow('PUBLISH_PERMISSION_REQUIRED')
})
it('checks the queue every five minutes without making idle HTTP calls',async()=>{
  expect((await db.query<{schedule:string}>('select schedule from cron.test_jobs')).rows).toEqual([{schedule:'*/5 * * * *'}])
  await db.exec('select private.wake_officer_email_worker()')
  expect((await db.query('select * from net.test_requests')).rows).toHaveLength(0)
  await publish();await db.query('insert into vault.decrypted_secrets values($1,$2)',['oec_officer_email_worker','test-secret-which-is-longer-than-thirty-two-characters'])
  await db.exec('select private.wake_officer_email_worker()')
  expect((await db.query<{url:string}>('select url from net.test_requests')).rows).toEqual([{url:'https://oberlin32engineeringsociety.com/api/cron/officer-emails'}])
  expect((await db.query<{ok:boolean}>("select has_function_privilege('authenticated','private.wake_officer_email_worker()','execute') ok")).rows[0].ok).toBe(false)
})
it('queues only a short-lived signature, never the reusable secret',async()=>{
  const secret='test-secret-which-is-longer-than-thirty-two-characters'
  await publish();await db.query('insert into vault.decrypted_secrets values($1,$2)',['oec_officer_email_worker',secret])
  await db.exec('select private.wake_officer_email_worker()')
  const {headers}=(await db.query<{headers:Record<string,string>}>('select headers from net.test_requests')).rows[0]
  expect(headers['x-oec-timestamp']).toMatch(/^\d{10}$/)
  expect(headers['x-oec-signature']).toBe(createHmac('sha256',secret).update(`officer-email-worker:${headers['x-oec-timestamp']}`).digest('hex'))
  expect(JSON.stringify(headers)).not.toContain(secret)
  expect(headers.Authorization).toBeUndefined()
})
