import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ admin: vi.fn(), invite: vi.fn(), list: vi.fn(), review: vi.fn(), resend: vi.fn() }))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/lib/auth/memberServer', () => ({ inviteMembers: mocks.invite, listMembershipRequests: mocks.list, reviewMembershipRequest: mocks.review, sendMembershipSetupEmail: mocks.resend }))
import { POST, PUT } from '@/app/api/admin/members/route'

beforeEach(() => { mocks.admin.mockResolvedValue({ role: 'ADMIN', userId: 'officer' }); mocks.list.mockResolvedValue([]) })
afterEach(() => vi.resetAllMocks())
const request = (body: unknown) => new Request('https://admin.oberlin32engineeringsociety.com/api/admin/members', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

it('rejects editors before sending or modifying any membership', async () => {
  mocks.admin.mockResolvedValue({ role: 'EDITOR' })
  expect((await POST(request({ emails: 'ada@oberlin.edu' }))).status).toBe(403)
  expect((await PUT(request({ requestId: 'a', decision: 'APPROVE' }))).status).toBe(403)
  expect(mocks.invite).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled()
})
it('validates the whole email batch before calling the invitation service', async () => {
  expect((await POST(request({ emails: 'ada@oberlin.edu,wrong@example.com' }))).status).toBe(400)
  expect(mocks.invite).not.toHaveBeenCalled()
})
it('returns per-recipient outcomes and the refreshed roster for partial failures', async () => {
  const results = [{ email: 'ada@oberlin.edu', outcome: 'sent' }, { email: 'ben@oberlin.edu', outcome: 'failed' }]
  mocks.invite.mockResolvedValue(results)
  const response = await POST(request({ emails: 'ada@oberlin.edu,ben@oberlin.edu' }))
  expect(await response.json()).toMatchObject({ ok: true, results, requests: [] })
  expect(mocks.invite.mock.calls[0][1]).toBe('officer')
})
it('resends a setup email without attempting a new approval', async () => {
  mocks.resend.mockResolvedValue({ emailSent: true })
  const response = await PUT(request({ requestId: 'approved', action: 'resend' }))
  expect(response.status).toBe(200)
  expect(mocks.resend).toHaveBeenCalledWith('approved', 'https://admin.oberlin32engineeringsociety.com')
  expect(mocks.review).not.toHaveBeenCalled()
})
it('reports a saved approval separately from email failure', async () => {
  mocks.review.mockResolvedValue({ status: 'APPROVED', emailSent: false })
  const response = await PUT(request({ requestId: 'a', decision: 'APPROVE' }))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ result: { status: 'APPROVED', emailSent: false } })
})
