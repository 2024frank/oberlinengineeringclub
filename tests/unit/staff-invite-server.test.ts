import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), link: vi.fn(), send: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc, auth: { admin: { generateLink: mocks.link } } }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: mocks.send }))
import { acceptServerStaffInvite, createServerStaffInvite, listStaffInvites, resendServerStaffInvite } from '@/lib/auth/staffInviteServer'
import { hashStaffInviteToken } from '@/lib/auth/staffInvites'

// A chainable stand-in for a Supabase query that records each call and resolves to `result`.
function query(result: unknown) {
  const calls: [string, unknown[]][] = []
  const builder: Record<string, unknown> = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => Promise.resolve(result).then(resolve, reject)
      if (prop === 'calls') return calls
      return (...args: unknown[]) => { calls.push([String(prop), args]); return builder }
    },
  })
  return builder as Record<string, unknown> & { calls: [string, unknown[]][] }
}
const called = (q: { calls: [string, unknown[]][] }, method: string) => q.calls.filter(([name]) => name === method).map(([, args]) => args)

const input = { email: 'Member@Oberlin.edu', displayName: 'Ada Member', role: 'EDITOR', scopes: ['projects', 'not-a-scope'], canPublish: true }
const row = { id: 'invite-1', email: 'member@oberlin.edu', display_name: 'Ada Member', role: 'EDITOR', scopes: [], can_publish: false, token_hash: hashStaffInviteToken('old'), status: 'INVITED', expires_at: '2099-01-01T00:00:00.000Z', invited_by: 'super-1', created_at: '2026-09-20T00:00:00.000Z' }

afterEach(() => { vi.resetAllMocks() })

it('uses a sign-in link for existing members instead of a Supabase invite link', async () => {
  const insert = query({ data: { id: 'invite-1' }, error: null })
  mocks.from.mockReturnValueOnce(insert).mockReturnValueOnce(query({ error: null }))
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'hashed', verification_type: 'magiclink' } }, error: null })
  mocks.send.mockResolvedValue(true)

  await createServerStaffInvite(input, 'super-1', 'https://admin.example')

  expect(mocks.link).toHaveBeenCalledWith({ type: 'magiclink', email: 'member@oberlin.edu' })
  const url = new URL(mocks.send.mock.calls[0][0].message.text.match(/https:\/\/\S+/)[0])
  expect(url.pathname).toBe('/auth/email-action')
  expect(url.searchParams.get('type')).toBe('magiclink')
  expect(url.searchParams.get('next')).toMatch(/^\/staff-activate\?invite=/)
  expect(called(insert, 'insert')[0][0]).toMatchObject({ email: 'member@oberlin.edu', scopes: ['projects'], can_publish: true })
})

it('uses the signup token type Supabase returns for a brand-new email', async () => {
  mocks.from.mockReturnValueOnce(query({ data: { id: 'invite-1' }, error: null })).mockReturnValueOnce(query({ error: null }))
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'hashed', verification_type: 'signup' } }, error: null })
  mocks.send.mockResolvedValue(true)
  await createServerStaffInvite(input, 'super-1', 'https://admin.example')
  expect(mocks.send.mock.calls[0][0].message.text).toContain('type=signup')
})

it('deletes the invitation row when the link cannot be created', async () => {
  const discard = query({ error: null })
  mocks.from.mockReturnValueOnce(query({ data: { id: 'invite-1' }, error: null })).mockReturnValueOnce(discard)
  mocks.link.mockResolvedValue({ data: null, error: { message: 'Email rate limit exceeded' } })

  await expect(createServerStaffInvite(input, 'super-1', 'https://admin.example')).rejects.toThrow('STAFF_AUTH_LINK_FAILED')
  expect(called(discard, 'delete')).toHaveLength(1)
  expect(called(discard, 'eq')).toEqual([['id', 'invite-1'], ['status', 'INVITED']])
  expect(mocks.send).not.toHaveBeenCalled()
})

it('maps database refusals to stable codes', async () => {
  mocks.from.mockReturnValueOnce(query({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "staff_invites_open_email_idx"' } }))
  await expect(createServerStaffInvite(input, 'super-1', 'https://admin.example')).rejects.toThrow(/^STAFF_INVITE_ALREADY_PENDING$/)
  mocks.from.mockReturnValueOnce(query({ data: null, error: { code: 'P0001', message: 'STAFF_ALREADY_ACTIVE' } }))
  await expect(createServerStaffInvite(input, 'super-1', 'https://admin.example')).rejects.toThrow(/^STAFF_ALREADY_ACTIVE$/)
  expect(mocks.link).not.toHaveBeenCalled()
})

it('lists open invitations past their expiry as expired', async () => {
  mocks.from.mockReturnValueOnce(query({ data: [{ ...row, expires_at: '2020-01-01T00:00:00.000Z' }, { ...row, id: 'invite-2' }], error: null }))
  const invites = await listStaffInvites()
  expect(invites.map((invite) => invite.status)).toEqual(['EXPIRED', 'INVITED'])
  expect(JSON.stringify(invites)).not.toContain(row.token_hash)
})

it('resends by replacing the stored token only if it has not changed meanwhile', async () => {
  const reissue = query({ data: [{ id: 'invite-1' }], error: null })
  mocks.from.mockReturnValueOnce(query({ data: row, error: null })).mockReturnValueOnce(reissue).mockReturnValueOnce(query({ error: null }))
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'hashed', verification_type: 'magiclink' } }, error: null })
  mocks.send.mockResolvedValue(true)

  await resendServerStaffInvite('invite-1', 'super-1', 'https://admin.example')
  expect(called(reissue, 'update')[0][0]).toMatchObject({ status: 'INVITED', token_hash: expect.not.stringMatching(row.token_hash) })
  expect(called(reissue, 'eq')).toContainEqual(['token_hash', row.token_hash])
  expect(mocks.send).toHaveBeenCalledOnce()
})

it('refuses a resend that raced with another change', async () => {
  mocks.from.mockReturnValueOnce(query({ data: row, error: null })).mockReturnValueOnce(query({ data: [], error: null }))
  await expect(resendServerStaffInvite('invite-1', 'super-1', 'https://admin.example')).rejects.toThrow('STAFF_INVITE_CHANGED')
  expect(mocks.send).not.toHaveBeenCalled()
})

it('surfaces an expiry reported by the database function', async () => {
  mocks.from.mockReturnValueOnce(query({ data: row, error: null }))
  mocks.rpc.mockResolvedValue({ data: { error: 'STAFF_INVITE_EXPIRED' }, error: null })
  await expect(acceptServerStaffInvite('old', { id: 'user-1', email: 'member@oberlin.edu' })).rejects.toThrow('STAFF_INVITE_EXPIRED')
})
