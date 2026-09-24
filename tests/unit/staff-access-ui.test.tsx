import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AdminUsersManager } from '@/components/admin/system/AdminUsersManager'
import { StaffActivationForm } from '@/components/admin/system/StaffActivationForm'
import { SiteSettingsForm } from '@/components/admin/system/SiteSettingsForm'

const toast = vi.hoisted(() => vi.fn())
const auth = vi.hoisted(() => ({ updateUser: vi.fn() }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => toast }))
vi.mock('@/lib/supabase/browser', () => ({ createSupabaseBrowserClient: () => ({ auth }) }))

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

const future = '2099-01-01T00:00:00.000Z'
const invite = { id: 'invite-1', email: 'ada@oberlin.edu', displayName: 'Ada', role: 'EDITOR' as const, scopes: [], canPublish: false, status: 'INVITED' as const, expiresAt: future, createdAt: '2026-09-20T00:00:00.000Z' }
const json = (body: unknown, ok = true) => ({ ok, json: async () => body })
const settings = { contactEmail: 'engineering@oberlin.edu', footerText: '', socialLinks: { instagram: '', linkedin: '', github: '' }, defaultOgMediaId: null, seoTitlePattern: '%s · OEC', announcement: { enabled: false, text: '', href: '' }, brand: { badgeMediaId: null, horizontalMediaId: null } }

async function sendInvitation() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Invite officer' }))
  await user.type(screen.getByLabelText('Email'), 'ada@oberlin.edu')
  await user.type(screen.getByLabelText('Display name'), 'Ada')
  await user.click(screen.getByRole('button', { name: 'Send invitation email' }))
}

it('explains a failed invitation in plain language and refreshes the list', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json({ error: 'STAFF_AUTH_LINK_FAILED:A user with this email address has already been registered' }, false))
    .mockResolvedValueOnce(json({ users: [] }))
    .mockResolvedValueOnce(json({ invites: [invite] }))
  vi.stubGlobal('fetch', fetchMock)
  render(<AdminUsersManager initialUsers={[]} initialInvites={[]} />)
  await sendInvitation()

  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('no invitation was saved'), 'error'))
  expect(toast.mock.calls.flat().join(' ')).not.toMatch(/STAFF_|registered/)
  expect(fetchMock).toHaveBeenCalledWith('/api/admin/staff/invites')
  expect(await screen.findByRole('button', { name: 'Resend invitation to ada@oberlin.edu' })).toBeInTheDocument()
})

it('reports a network failure instead of failing silently', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<AdminUsersManager initialUsers={[]} initialInvites={[invite]} />)
  await sendInvitation()
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not reach the server'), 'error'))
  expect(screen.getByRole('button', { name: 'Send invitation email' })).toBeEnabled()

  toast.mockClear()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Revoke invitation to ada@oberlin.edu' }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not reach the server'), 'error'))
})

it('resends an open invitation and says the old link stops working', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json({ ok: true, id: 'invite-1', expiresAt: future }))
    .mockResolvedValueOnce(json({ users: [] }))
    .mockResolvedValueOnce(json({ invites: [invite] }))
  vi.stubGlobal('fetch', fetchMock)
  render(<AdminUsersManager initialUsers={[]} initialInvites={[invite]} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Resend invitation to ada@oberlin.edu' }))

  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('no longer work')))
  expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/staff/invites')
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ action: 'resend', id: 'invite-1' }) })
})

it('lists an expired invitation separately and only while it is the latest for that email', () => {
  const expired = { ...invite, id: 'old', status: 'EXPIRED' as const, expiresAt: '2026-09-01T00:00:00.000Z' }
  const { unmount } = render(<AdminUsersManager initialUsers={[]} initialInvites={[expired]} />)
  expect(screen.getByText(/^Expired /)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Dismiss expired invitation to ada@oberlin.edu' })).toBeInTheDocument()
  unmount()

  render(<AdminUsersManager initialUsers={[]} initialInvites={[{ ...invite, status: 'ACCEPTED' }, expired]} />)
  expect(screen.queryByText(/^Expired /)).not.toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Staff invitations' })).not.toBeInTheDocument()
})

it('activates an existing member who keeps their current password', async () => {
  auth.updateUser.mockResolvedValue({ error: { code: 'same_password', status: 422, name: 'AuthApiError' } })
  const fetchMock = vi.fn().mockResolvedValue(json({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  render(<StaffActivationForm token="t" />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Choose password'), 'current-password')
  await user.type(screen.getByLabelText('Confirm password'), 'current-password')
  await user.click(screen.getByRole('button', { name: 'Activate officer account' }))
  await waitFor(() => expect(assign).toHaveBeenCalledWith('/admin'))
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/staff/accept', expect.objectContaining({ method: 'POST' }))
})

it('tells an invited officer their invitation expired in plain language', async () => {
  auth.updateUser.mockResolvedValue({ error: null })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'STAFF_INVITE_EXPIRED' }, false)))
  render(<StaffActivationForm token="t" />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Choose password'), 'long-enough-pass')
  await user.type(screen.getByLabelText('Confirm password'), 'long-enough-pass')
  await user.click(screen.getByRole('button', { name: 'Activate officer account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('This invitation has expired. Ask the Super Admin to resend it.')
})

it('reports a network failure when saving site settings', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  render(<SiteSettingsForm initial={settings} mediaAssets={[]} />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Save site settings' }))
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringContaining('Could not reach the server'), 'error'))
  expect(screen.getByRole('button', { name: 'Save site settings' })).toBeEnabled()
})
