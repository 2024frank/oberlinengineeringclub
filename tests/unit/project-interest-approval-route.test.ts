import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { requireRole, approve } = vi.hoisted(() => ({ requireRole: vi.fn(), approve: vi.fn() }))
vi.mock('@/lib/auth/requireRole', () => ({ requireRole }))
vi.mock('@/lib/projects/teamAdmin', () => ({ approveProjectInterest: approve }))
import { POST } from '@/app/api/admin/project-interest/approve/route'
const requestId = '00000000-0000-4000-8000-000000000030'
const projectId = '00000000-0000-4000-8000-000000000020'
const request = (body: unknown) => new Request('https://example.com/api/admin/project-interest/approve', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => { requireRole.mockResolvedValue({ userId: 'admin', role: 'ADMIN' }) })
afterEach(() => vi.resetAllMocks())

it('requires Admin permission before calling the approval service', async () => {
  requireRole.mockRejectedValue(new Error('ADMIN_ROLE_REQUIRED'))
  expect((await POST(request({ source: 'application', requestId }))).status).toBe(403)
  expect(approve).not.toHaveBeenCalled()
  expect(requireRole).toHaveBeenCalledWith('ADMIN')
})
it('adds people as regular team members unless a lead is chosen explicitly', async () => {
  approve.mockResolvedValue({ result: { role: 'MEMBER' }, emailSent: true })
  expect((await POST(request({ source: 'application', requestId }))).status).toBe(200)
  expect(approve).toHaveBeenCalledWith({ source: 'application', requestId, role: 'MEMBER' })
  await POST(request({ source: 'submission', requestId, projectId, role: 'LEAD' }))
  expect(approve).toHaveBeenLastCalledWith({ source: 'submission', requestId, projectId, role: 'LEAD' })
})
it.each([
  { source: 'submission', requestId },
  { source: 'application', requestId: 'not-a-uuid' },
  { source: 'application', requestId, userId: 'someone-else' },
  { source: 'application', requestId, role: 'OWNER' },
])('rejects incomplete or user-controlled fields: %j', async body => {
  expect((await POST(request(body))).status).toBe(400)
  expect(approve).not.toHaveBeenCalled()
})
it('returns known errors and hides unknown database errors', async () => {
  approve.mockRejectedValueOnce(new Error('ACTIVE_MEMBER_REQUIRED'))
  expect(await (await POST(request({ source: 'application', requestId }))).json()).toEqual({ error: 'ACTIVE_MEMBER_REQUIRED' })
  approve.mockRejectedValueOnce(new Error('secret database connection details'))
  const response = await POST(request({ source: 'application', requestId }))
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({ error: 'PROJECT_TEAM_ACTION_FAILED' })
})
