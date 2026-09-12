import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), link: vi.fn(), send: vi.fn(), limit: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: mocks.from, auth: { admin: { generateLink: mocks.link } } }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: mocks.send }))
vi.mock('@/lib/submissions/rateLimit', () => ({ hashNetworkAddress: (value: string) => value, consumeSubmissionRateLimit: mocks.limit }))
import { submitMembershipRequest } from '@/lib/auth/memberServer'

const origin = 'https://oberlin32engineeringsociety.com'
const input = { email: ' Ada@oberlin.edu ', displayName: 'Changed name' }
function setup(status = 'REQUESTED', overrides = {}) {
  const row = { id: 'request-a', email: 'ada@oberlin.edu', display_name: 'Ada', status, preapproved_at: null, last_email_sent_at: null, ...overrides }
  const query = { select: vi.fn(), ilike: vi.fn(), eq: vi.fn(), update: vi.fn(), insert: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: row }), single: vi.fn().mockResolvedValue({ data: row }) }
  for (const key of ['select', 'ilike', 'eq', 'update', 'insert'] as const) query[key].mockReturnValue(query)
  mocks.from.mockReturnValue(query)
  return query
}
beforeEach(() => {
  mocks.limit.mockResolvedValue(true)
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'test-hash', verification_type: 'magiclink' } } })
  mocks.send.mockResolvedValue(true)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin)
})
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })

it('resends verification for an existing request instead of blocking signup', async () => {
  const query = setup()
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ status: 'REQUESTED', emailSent: true })
  expect(mocks.send.mock.calls[0][0].message.text).toContain('Hi Ada,')
  expect(mocks.send.mock.calls[0][0].message.text).toContain('member-verify')
  expect(query.insert).not.toHaveBeenCalled()
  expect(query.update).not.toHaveBeenCalledWith(expect.objectContaining({ display_name: 'Changed name' }))
})
it('creates a new request and tracks delivery of its first verification email', async () => {
  const query = setup()
  query.maybeSingle.mockResolvedValueOnce({ data: null } as never)
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ status: 'REQUESTED', emailSent: true })
  expect(query.insert).toHaveBeenCalledWith({ email: 'ada@oberlin.edu', display_name: 'Changed name', status: 'REQUESTED' })
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ last_email_error: null, last_email_sent_at: expect.any(String) }))
})
it('preserves an officer-approved invitation when resending verification', async () => {
  setup('REQUESTED', { preapproved_at: '2026-09-12T12:00:00Z' })
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ emailSent: true })
  expect(mocks.send.mock.calls[0][0].message.text).toContain('You do not need another officer approval.')
})
it('resends the setup link for an approved member without granting access', async () => {
  setup('APPROVED')
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ status: 'APPROVED', emailSent: true })
  expect(mocks.send.mock.calls[0][0].message.text).toContain('member-activate')
})
it.each(['PENDING_APPROVAL', 'ACTIVE'])('returns the next step for %s without issuing another token', async status => {
  setup(status)
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ status, emailSent: false })
  expect(mocks.link).not.toHaveBeenCalled()
})
it.each(['SUSPENDED', 'REJECTED'])('never reopens a %s membership', async status => {
  setup(status)
  await expect(submitMembershipRequest(input, origin)).rejects.toThrow('MEMBERSHIP_REQUEST_BLOCKED')
  expect(mocks.send).not.toHaveBeenCalled()
})
it('does not replace a link sent less than a minute ago', async () => {
  setup('REQUESTED', { last_email_sent_at: new Date().toISOString() })
  expect(await submitMembershipRequest(input, origin)).toMatchObject({ emailSent: false, retryAfter: 60 })
  expect(mocks.link).not.toHaveBeenCalled()
})
it('reports failed email delivery and preserves the request for another attempt', async () => {
  const query = setup()
  mocks.send.mockRejectedValue(new Error('EMAIL_SEND_FAILED:429'))
  await expect(submitMembershipRequest(input, origin)).rejects.toThrow('MEMBERSHIP_EMAIL_FAILED')
  expect(query.update).toHaveBeenCalledWith({ last_email_error: 'EMAIL_SEND_FAILED' })
  expect(query.insert).not.toHaveBeenCalled()
})
it('limits repeated email requests by address, not the shared campus network', async () => {
  setup()
  mocks.limit.mockResolvedValue(false)
  await expect(submitMembershipRequest(input, origin)).rejects.toThrow('MEMBERSHIP_EMAIL_RATE_LIMITED')
  expect(mocks.limit).toHaveBeenCalledWith('member-email:ada@oberlin.edu', 8)
  expect(mocks.link).not.toHaveBeenCalled()
})
it('fails closed if the existing request cannot be read', async () => {
  const query = setup()
  query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'database unavailable' } } as never)
  await expect(submitMembershipRequest(input, origin)).rejects.toThrow('MEMBERSHIP_REQUEST_LOAD_FAILED')
  expect(query.insert).not.toHaveBeenCalled()
})
