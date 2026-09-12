import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), link: vi.fn(), send: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc, auth: { admin: { generateLink: mocks.link } } }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: mocks.send }))
import { sendMembershipSetupEmail, startMembershipFromSubmission } from '@/lib/auth/memberServer'

afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })
function setup(status = 'APPROVED') {
  const load = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { id: 'a', email: 'ada@oberlin.edu', display_name: 'Ada', status, preapproved_at: null } }) }
  load.select.mockReturnValue(load); load.eq.mockReturnValue(load)
  const save = { update: vi.fn(), eq: vi.fn().mockResolvedValue({ error: null }) }
  save.update.mockReturnValue(save)
  mocks.from.mockReturnValueOnce(load).mockReturnValueOnce(save)
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'test-only-not-a-real-token' } } })
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://oberlin32engineeringsociety.com')
  return save
}
it('records a mail failure without undoing approval or returning a false success', async () => {
  const save = setup()
  mocks.send.mockRejectedValue(new Error('EMAIL_SEND_FAILED:429'))
  expect(await sendMembershipSetupEmail('a', 'https://admin.oberlin32engineeringsociety.com')).toMatchObject({ emailSent: false, emailError: 'EMAIL_SEND_FAILED' })
  expect(save.update).toHaveBeenCalledWith({ last_email_error: 'EMAIL_SEND_FAILED' })
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('records a successful resend and generates a public-host setup link', async () => {
  const save = setup()
  mocks.send.mockResolvedValue(true)
  expect(await sendMembershipSetupEmail('a', 'https://admin.oberlin32engineeringsociety.com')).toMatchObject({ emailSent: true })
  expect(mocks.send.mock.calls[0][0].message.text).toContain('https://oberlin32engineeringsociety.com/auth/email-action')
  expect(mocks.send.mock.calls[0][0].message.text).not.toContain('https://admin.')
  expect(save.update).toHaveBeenCalledWith(expect.objectContaining({ last_email_error: null, last_email_sent_at: expect.any(String) }))
})
it('uses the signup token type returned for a first-time auth identity', async () => {
  setup('REQUESTED')
  mocks.link.mockResolvedValue({ data: { properties: { hashed_token: 'test-only-token', verification_type: 'signup' } } })
  expect(await sendMembershipSetupEmail('a', 'https://oberlin32engineeringsociety.com')).toMatchObject({ emailSent: true })
  expect(mocks.send.mock.calls[0][0].message.text).toContain('type=signup')
})
it('never sends setup emails for suspended members', async () => {
  setup('SUSPENDED')
  await expect(sendMembershipSetupEmail('a', 'https://oberlin32engineeringsociety.com')).rejects.toThrow('MEMBERSHIP_REQUEST_BLOCKED')
  expect(mocks.link).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled()
})
it('does not recreate or resend invitations to already-active members', async () => {
  mocks.rpc.mockResolvedValue({ data: { request_id: 'a', status: 'ACTIVE' } })
  expect(await startMembershipFromSubmission({ email: 'ada@oberlin.edu', displayName: 'Ada' }, 'https://oberlin32engineeringsociety.com', 'officer')).toMatchObject({ skipped: true, status: 'ACTIVE' })
  expect(mocks.send).not.toHaveBeenCalled()
})
