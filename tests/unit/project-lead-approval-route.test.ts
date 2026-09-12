import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { requireRole, approve } = vi.hoisted(() => ({ requireRole: vi.fn(), approve: vi.fn() }))
vi.mock('@/lib/auth/requireRole', () => ({ requireRole }))
vi.mock('@/lib/projects/leadApproval', () => ({ approveProjectInterestAsLead: approve }))
import { POST } from '@/app/api/admin/project-interest/approve-lead/route'
const requestId = '00000000-0000-4000-8000-000000000030'
const projectId = '00000000-0000-4000-8000-000000000020'
const request = (body: unknown) => new Request('https://example.com/api/admin/project-interest/approve-lead', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => { requireRole.mockResolvedValue({ userId: 'admin', role: 'ADMIN' }) })
afterEach(() => vi.resetAllMocks())
it('requires admin permission before calling the approval service', async () => {
  requireRole.mockRejectedValue(new Error('ADMIN_ROLE_REQUIRED'))
  expect((await POST(request({ source: 'application', requestId }))).status).toBe(403)
  expect(approve).not.toHaveBeenCalled()
  expect(requireRole).toHaveBeenCalledWith('ADMIN')
})
it('approves a valid member application', async () => {
  approve.mockResolvedValue({ result: { role: 'LEAD' }, emailSent: true })
  const response = await POST(request({ source: 'application', requestId }))
  expect(response.status).toBe(200)
  expect(approve).toHaveBeenCalledWith({ source: 'application', requestId })
  expect(await response.json()).toMatchObject({ ok: true, result: { role: 'LEAD' } })
})
it.each([
  { source: 'submission', requestId },
  { source: 'application', requestId: 'not-a-uuid' },
  { source: 'application', requestId, userId: 'someone-else' },
])('rejects incomplete or user-controlled identity fields: %j', async body => {
  expect((await POST(request(body))).status).toBe(400)
  expect(approve).not.toHaveBeenCalled()
})
it('returns a useful error for people who have not activated membership', async () => {
  approve.mockRejectedValue(new Error('ACTIVE_MEMBER_REQUIRED'))
  const response = await POST(request({ source: 'submission', requestId, projectId }))
  expect(await response.json()).toEqual({ error: 'ACTIVE_MEMBER_REQUIRED' })
})
it('does not expose unknown database errors to the client', async () => {
  approve.mockRejectedValue(new Error('secret database connection details'))
  const response = await POST(request({ source: 'application', requestId }))
  expect(await response.json()).toEqual({ error: 'PROJECT_LEAD_APPROVAL_FAILED' })
})
