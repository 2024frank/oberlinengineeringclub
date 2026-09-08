import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProjectsPage from '@/app/admin/(portal)/projects/page'
import EventsPage from '@/app/admin/(portal)/events/page'
import NewsPage from '@/app/admin/(portal)/news/page'
import { ToastProvider } from '@/components/ui/Toast'

const fixture = vi.hoisted(() => ({
  requireAdmin: vi.fn(), listMedia: vi.fn(),
  media: {
    id: '00000000-0000-4000-8000-000000000001', fileName: 'workbench.jpg',
    storagePath: 'workbench.jpg', publicUrl: '/workbench.jpg', mimeType: 'image/jpeg',
    sizeBytes: 1024, altText: 'Club workbench', caption: '', tags: [], width: 800, height: 600,
    protected: false, contentHash: null, sourceType: 'original', rightsNote: null,
    focalX: null, focalY: null, visualQaApproved: false
  }
}))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin: fixture.requireAdmin }))
vi.mock('@/lib/cms/adminContent', () => ({ listAdminContent: async () => [] }))
vi.mock('@/lib/cms/media', () => ({ listMedia: fixture.listMedia }))

beforeEach(() => {
  vi.resetAllMocks()
  fixture.requireAdmin.mockResolvedValue({ role: 'SUPER_ADMIN', scopes: [], canPublish: true })
  fixture.listMedia.mockResolvedValue([fixture.media])
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const pages = [
  { type: 'projects', button: 'New Project', load: () => ProjectsPage({ searchParams: Promise.resolve({}) }) },
  { type: 'events', button: 'New Event', load: () => EventsPage({ searchParams: Promise.resolve({}) }) },
  { type: 'news_posts', button: 'New News post', load: () => NewsPage() }
]

it.each(pages)('loads selectable media and saves the $type cover in its draft', async ({ type, button, load }) => {
  const user = userEvent.setup()
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetch)
  render(<ToastProvider>{await load()}</ToastProvider>)
  await user.click(screen.getByRole('button', { name: button }))
  await user.click(screen.getByRole('button', { name: /workbench\.jpg/ }))
  await user.click(screen.getByRole('button', { name: 'Save draft' }))
  expect(fetch).toHaveBeenCalledWith('/api/admin/content', expect.objectContaining({ method: 'POST' }))
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ entityType: type, payload: { coverMediaId: fixture.media.id } })
})

it.each(pages)('checks admin access before loading $type media', async ({ load }) => {
  fixture.requireAdmin.mockRejectedValue(new Error('ADMIN_REQUIRED'))
  await expect(load()).rejects.toThrow('ADMIN_REQUIRED')
  expect(fixture.listMedia).not.toHaveBeenCalled()
})
