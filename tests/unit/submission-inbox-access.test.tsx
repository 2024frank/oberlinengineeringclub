import { afterEach, expect, it, vi } from 'vitest'
const { requireAdmin, listSubmissions, listProjectChoices } = vi.hoisted(() => ({ requireAdmin: vi.fn(), listSubmissions: vi.fn().mockResolvedValue([]), listProjectChoices: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin }))
vi.mock('@/lib/cms/submissions', () => ({ listSubmissions }))
vi.mock('@/lib/projects/teamAdmin', () => ({ listProjectChoices }))
import SubmissionsPage from '@/app/admin/(portal)/submissions/page'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
afterEach(() => vi.clearAllMocks())
it('hides the review Inbox from Editors before loading requests or approval controls', async () => {
  requireAdmin.mockResolvedValue({ role: 'EDITOR' })
  const page = await SubmissionsPage({ searchParams: Promise.resolve({}) })
  expect(page.type).toBe(AccessDenied)
  expect(listSubmissions).not.toHaveBeenCalled()
  expect(listProjectChoices).not.toHaveBeenCalled()
})
it.each(['ADMIN', 'SUPER_ADMIN'])('loads the approval Inbox for %s', async role => {
  requireAdmin.mockResolvedValue({ role })
  const page = await SubmissionsPage({ searchParams: Promise.resolve({}) })
  expect(page.type).toBe('main')
  expect(listSubmissions).toHaveBeenCalledTimes(1)
  expect(listProjectChoices).toHaveBeenCalledTimes(1)
})
