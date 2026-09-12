import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { rpc, send } = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ rpc }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: send }))
import { approveProjectInterestAsLead } from '@/lib/projects/leadApproval'
const result = { projectId: 'printer', projectTitle: 'Printer repair', memberName: 'Ada', memberEmail: 'ada@example.com', userId: 'ada', role: 'LEAD', alreadyApproved: false }
beforeEach(() => { rpc.mockResolvedValue({ data: result, error: null }); send.mockResolvedValue(true) })
afterEach(() => vi.resetAllMocks())
it('emails the account returned by the database with the workspace and lead responsibilities', async () => {
  const response = await approveProjectInterestAsLead({ source: 'application', requestId: 'application' })
  expect(response.emailSent).toBe(true)
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com', message: expect.objectContaining({ text: expect.stringContaining('/member/teams/printer') }) }))
  expect(send.mock.calls[0][0].message.text).toContain('you are now a project lead')
})
it('preserves the successful appointment when the email provider fails', async () => {
  send.mockRejectedValue(new Error('network error'))
  await expect(approveProjectInterestAsLead({ source: 'application', requestId: 'application' })).resolves.toEqual({ result, emailSent: false })
})
it('does not send duplicate messages when the admin retries an already-approved request', async () => {
  rpc.mockResolvedValue({ data: { ...result, alreadyApproved: true }, error: null })
  await approveProjectInterestAsLead({ source: 'submission', requestId: 'request', projectId: 'printer' })
  expect(send).not.toHaveBeenCalled()
})
it('does not send email after a refused appointment', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'ACTIVE_MEMBER_REQUIRED' } })
  await expect(approveProjectInterestAsLead({ source: 'application', requestId: 'application' })).rejects.toThrow('ACTIVE_MEMBER_REQUIRED')
  expect(send).not.toHaveBeenCalled()
})
