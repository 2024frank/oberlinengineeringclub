import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const { getCurrentMember, rpc } = vi.hoisted(() => ({ getCurrentMember: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember }))
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: async () => ({ rpc }) }))
import { PUT } from '@/app/api/member/projects/[projectId]/route'

const projectId = '00000000-0000-4000-8000-000000000020'
const put = (body: unknown, id = projectId) => PUT(new Request(`https://example.com/api/member/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ projectId: id }) })
beforeEach(() => { getCurrentMember.mockResolvedValue({ userId: 'me' }); rpc.mockResolvedValue({ data: { id: 'x' }, error: null }) })
afterEach(() => vi.resetAllMocks())

it('requires an active member', async () => {
  getCurrentMember.mockResolvedValue(null)
  expect((await put({ action: 'leave' })).status).toBe(401)
})
it('routes team actions to their database functions', async () => {
  await put({ action: 'post', kind: 'BLOCKER', body: 'The op-amp is too noisy.' })
  expect(rpc).toHaveBeenLastCalledWith('post_project_team_update', { p_project_id: projectId, p_kind: 'BLOCKER', p_body: 'The op-amp is too noisy.' })
  await put({ action: 'leave' })
  expect(rpc).toHaveBeenLastCalledWith('leave_project', { p_project_id: projectId })
  await put({ action: 'link-add', label: 'Drive', url: 'https://drive.google.com/x' })
  expect(rpc).toHaveBeenLastCalledWith('add_project_team_link', { p_project_id: projectId, p_label: 'Drive', p_url: 'https://drive.google.com/x' })
})
it.each([
  [{ action: 'link-add', label: 'Bad', url: 'javascript:alert(1)' }, 'TEAM_LINK_INVALID'],
  [{ action: 'milestone-status', milestoneId: 'not-a-uuid', status: 'DONE' }, 'WORKSPACE_ACTION_INVALID'],
  [{ action: 'delete-everything' }, 'WORKSPACE_ACTION_INVALID'],
])('rejects invalid input before touching the database: %j', async (body, error) => {
  const response = await put(body)
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({ error })
  expect(rpc).not.toHaveBeenCalled()
})
it('passes known errors through and hides unknown ones', async () => {
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'SOLE_PROJECT_LEAD' } })
  expect(await (await put({ action: 'leave' })).json()).toEqual({ error: 'SOLE_PROJECT_LEAD' })
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'relation "x" does not exist' } })
  expect(await (await put({ action: 'leave' })).json()).toEqual({ error: 'WORKSPACE_UPDATE_FAILED' })
})
