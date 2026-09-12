import { afterEach, expect, it, vi } from 'vitest'
const { requireAdmin, listSubmissions, listProjectLeadChoices } = vi.hoisted(() => ({ requireAdmin: vi.fn(), listSubmissions: vi.fn().mockResolvedValue([]), listProjectLeadChoices: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin }))
vi.mock('@/lib/cms/submissions', () => ({ listSubmissions }))
vi.mock('@/lib/projects/leadApproval', () => ({ listProjectLeadChoices }))
import SubmissionsPage from '@/app/admin/(portal)/submissions/page'
import { AccessDenied } from '@/components/admin/system/AccessDenied'
afterEach(() => vi.clearAllMocks())
it('hides the review Inbox from Editors before loading requests or approval controls', async () => {
  requireAdmin.mockResolvedValue({ role: 'EDITOR' })
  const page = await SubmissionsPage({ searchParams: Promise.resolve({}) })
  expect(page.type).toBe(AccessDenied)
  expect(listSubmissions).not.toHaveBeenCalled()
  expect(listProjectLeadChoices).not.toHaveBeenCalled()
})
it.each(['ADMIN', 'SUPER_ADMIN'])('loads the approval Inbox for %s', async role => {
  requireAdmin.mockResolvedValue({ role })
  const page = await SubmissionsPage({ searchParams: Promise.resolve({}) })
  expect(page.type).toBe('main')
  expect(listSubmissions).toHaveBeenCalledTimes(1)
  expect(listProjectLeadChoices).toHaveBeenCalledTimes(1)
})
