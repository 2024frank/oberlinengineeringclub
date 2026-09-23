import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { rpc, send, sendBatch, requireRole } = vi.hoisted(() => ({ rpc: vi.fn(), send: vi.fn(), sendBatch: vi.fn(), requireRole: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ rpc }) }))
vi.mock('@/lib/email/client', () => ({ sendTransactionalEmail: send, sendTransactionalEmailBatch: sendBatch }))
vi.mock('@/lib/auth/requireRole', () => ({ requireRole }))
import { approveProjectInterest, performProjectTeamAction } from '@/lib/projects/teamAdmin'
import { POST } from '@/app/api/admin/project-teams/route'

const projectId = '00000000-0000-4000-8000-000000000020'
const userId = '00000000-0000-4000-8000-000000000010'
const member = { projectId, projectTitle: 'Printer repair', memberName: 'Ada', memberEmail: 'ada@oberlin.edu', userId, role: 'MEMBER', alreadyApproved: false }
const post = (body: unknown) => POST(new Request('https://example.com/api/admin/project-teams', { method: 'POST', body: JSON.stringify(body) }))
beforeEach(() => { send.mockResolvedValue(true); sendBatch.mockResolvedValue(2); requireRole.mockResolvedValue({ role: 'ADMIN' }) })
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })

it('welcomes a new team member to their workspace on the public site', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://admin.oberlin32engineeringsociety.com')
  rpc.mockResolvedValue({ data: member, error: null })
  const { emailSent } = await approveProjectInterest({ source: 'application', requestId: 'a', role: 'MEMBER' })
  expect(rpc).toHaveBeenCalledWith('admin_approve_project_interest', { p_source: 'application', p_request_id: 'a', p_project_id: null, p_role: 'MEMBER' })
  expect(emailSent).toBe(true)
  const message = send.mock.calls[0][0].message
  expect(message.subject).toBe("You're on the Printer repair team")
  expect(message.text).toContain(`https://oberlin32engineeringsociety.com/member/teams/${projectId}`)
  expect(message.text).not.toContain('project lead')
})
it('does not email again when an approval is repeated, and keeps the approval if email fails', async () => {
  rpc.mockResolvedValue({ data: { ...member, alreadyApproved: true }, error: null })
  await approveProjectInterest({ source: 'application', requestId: 'a', role: 'MEMBER' })
  expect(send).not.toHaveBeenCalled()
  rpc.mockResolvedValue({ data: member, error: null })
  send.mockRejectedValue(new Error('network'))
  await expect(approveProjectInterest({ source: 'application', requestId: 'a', role: 'MEMBER' })).resolves.toMatchObject({ emailSent: false })
})
it('emails a demoted lead nothing, but welcomes someone promoted to lead', async () => {
  rpc.mockResolvedValue({ data: { ...member, role: 'MEMBER', previousRole: 'LEAD', changed: true }, error: null })
  await performProjectTeamAction({ action: 'set-member', projectId, userId, role: 'MEMBER' })
  expect(send).not.toHaveBeenCalled()
  rpc.mockResolvedValue({ data: { ...member, role: 'LEAD', previousRole: 'MEMBER', changed: true }, error: null })
  await performProjectTeamAction({ action: 'set-member', projectId, userId, role: 'LEAD' })
  expect(send.mock.calls[0][0].message.subject).toBe('You are a project lead: Printer repair')
})
it('starts a project, emails every team member once, and records how many were sent', async () => {
  rpc.mockImplementation(async (name: string) => name === 'start_project'
    ? { data: { kickoffId: 'kick-1', projectId, projectTitle: 'Printer repair', restarted: false, recipients: [{ displayName: 'Ada', email: 'ada@oberlin.edu', role: 'LEAD' }, { displayName: 'Ben', email: 'ben@oberlin.edu', role: 'MEMBER' }] }, error: null }
    : { data: true, error: null })
  const response = await performProjectTeamAction({ action: 'start', projectId, message: 'First meeting Friday.', meetingAt: '2026-09-25T22:00:00.000Z', location: 'Science Center B25' })
  expect(response).toMatchObject({ emailsSent: 2, result: { recipients: 2 } })
  const batch = sendBatch.mock.calls[0][0]
  expect(batch.idempotencyKey).toBe('project-kickoff/kick-1')
  expect(batch.messages.map((m: { to: string }) => m.to)).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu'])
  expect(batch.messages[1].message.subject).toBe('Time to start: Printer repair')
  expect(batch.messages[1].message.text).toContain('First meeting Friday.')
  expect(batch.messages[1].message.text).toContain('Where: Science Center B25')
  expect(batch.messages[0].message.text).toContain('as a project lead')
  expect(rpc).toHaveBeenLastCalledWith('record_project_kickoff_delivery', { p_kickoff_id: 'kick-1', p_emails_sent: 2 })
})
it('only lets Admins use the project team endpoint and validates every action', async () => {
  requireRole.mockRejectedValue(new Error('ADMIN_ROLE_REQUIRED'))
  expect((await post({ action: 'delete', projectId, confirmTitle: 'x' })).status).toBe(403)
  requireRole.mockResolvedValue({ role: 'ADMIN' })
  expect((await post({ action: 'set-member', projectId, userId, role: 'OWNER' })).status).toBe(400)
  expect((await post({ action: 'start', projectId, meetingAt: 'next friday' })).status).toBe(400)
  expect(rpc).not.toHaveBeenCalled()
  rpc.mockResolvedValue({ data: null, error: { message: 'PROJECT_DELETE_CONFIRMATION_MISMATCH' } })
  const response = await post({ action: 'delete', projectId, confirmTitle: 'Wrong title' })
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error: 'PROJECT_DELETE_CONFIRMATION_MISMATCH' })
})
