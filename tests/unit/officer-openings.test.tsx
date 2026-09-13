import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { GetInvolvedForm } from '@/components/forms/GetInvolvedForm'
import { adminPortalGroups, memberPortalGroups } from '@/lib/navigation/portal'
import { OfficerPositions } from '@/components/leadership/OfficerPositions'
import { MemberOfficerOpenings } from '@/components/leadership/MemberOfficerOpenings'
import { OfficerApplicationQueue } from '@/components/leadership/OfficerApplicationQueue'
import type { OfficerApplication, OfficerPosition } from '@/lib/leadership/types'

const { push, refresh, redirect, listPositions, listApplications, listEmailStatus, currentMember, activeMember, admin } = vi.hoisted(() => ({
  push: vi.fn(), refresh: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
  listPositions: vi.fn(), listApplications: vi.fn(), listEmailStatus: vi.fn(), currentMember: vi.fn(), activeMember: vi.fn(), admin: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }), redirect }))
vi.mock('@/lib/page-builder/publicPages', () => ({ getPublishedPageBySlug: vi.fn(async () => null), getCmsRenderContext: vi.fn(async () => ({})) }))
vi.mock('@/lib/leadership/server', () => ({ listOfficerPositions: listPositions, listOfficerApplications: listApplications, listOfficerEmailStatus: listEmailStatus }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: currentMember, requireActiveMember: activeMember }))
vi.mock('@/lib/auth/requireRole', () => ({ requireAdmin: admin }))

beforeEach(() => {
  vi.clearAllMocks()
  listPositions.mockResolvedValue([position, secondPosition]); listApplications.mockResolvedValue([])
  listEmailStatus.mockResolvedValue([])
  currentMember.mockResolvedValue(null); activeMember.mockResolvedValue({ userId: 'member-1' }); admin.mockResolvedValue({ role: 'ADMIN' })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const position: OfficerPosition = { id: 'opening-1', roleTitle: 'Secretary', term: 'Fall 2026', bio: 'Keep meeting records and coordinate club communications.', closesAt: '2099-09-30T23:00:00Z' }
const secondPosition: OfficerPosition = { ...position, id: 'opening-2', roleTitle: 'Treasurer', closesAt: null }
const application: OfficerApplication = { positionId: position.id, roleTitle: position.roleTitle, term: position.term, userId: 'member-1', displayName: 'Alex Student', statement: 'I would like to help coordinate the club and keep clear records.', experience: 'I organized a student project.', status: 'PENDING', feedback: '', submittedAt: '2026-09-12T12:00:00Z', reviewedAt: null }

it('shows posted details and preserves the selected opening through member login', () => {
  render(<OfficerPositions positions={[position, secondPosition]} signedIn={false}/>)
  const row = screen.getByRole('article', { name: 'Secretary' })
  expect(row).toHaveAttribute('id', 'position-opening-1')
  expect(within(row).getByText(position.bio)).toBeInTheDocument()
  expect(within(row).getByText(position.term)).toBeInTheDocument()
  expect(row.querySelector('time')).toHaveAttribute('dateTime', position.closesAt)
  expect(within(row).getByRole('link', { name: /sign in to apply/i })).toHaveAttribute('href', '/member/login?next=%2Fmember%2Fleadership%3Fposition%3Dopening-1')
  expect(screen.getByRole('article', { name: 'Treasurer' }).querySelector('time')).toBeNull()
})

it('links signed-in visitors directly to the selected application', () => {
  render(<OfficerPositions positions={[position]} signedIn/>)
  expect(screen.getByRole('link', { name: 'Apply' })).toHaveAttribute('href', '/member/leadership?position=opening-1')
})

it('shows an honest empty list and no application action when no openings are posted', () => {
  render(<OfficerPositions positions={[]} signedIn={false}/>)
  expect(screen.getByText(/no open positions/i)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('selects the requested vacancy, and otherwise shows openings and application history', () => {
  const { rerender } = render(<MemberOfficerOpenings positions={[position, secondPosition]} applications={[]} positionId={secondPosition.id}/>)
  expect(screen.getByRole('heading', { name: 'Apply for Treasurer' })).toBeInTheDocument()
  rerender(<MemberOfficerOpenings positions={[position, secondPosition]} applications={[]}/>)
  expect(screen.queryByRole('textbox', { name: 'Statement of interest' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'My applications' })).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Apply' })).toHaveLength(2)
})

it.each([['short', ''], [' '.repeat(20), ''], ['s'.repeat(3001), ''], ['s'.repeat(20), 'e'.repeat(2001)]])('rejects invalid statement/experience before sending', (statement, experience) => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  render(<MemberOfficerOpenings positions={[position]} applications={[]} positionId={position.id}/>)
  fireEvent.change(screen.getByLabelText('Statement of interest'), { target: { value: statement } })
  fireEvent.change(screen.getByLabelText('Relevant experience'), { target: { value: experience } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

it('keeps a failed draft, blocks duplicate requests, and refreshes after a successful retry', async () => {
  let finish!: (value: unknown) => void
  const fetch = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve })).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetch)
  render(<MemberOfficerOpenings positions={[position]} applications={[]} positionId={position.id}/>)
  fireEvent.change(screen.getByLabelText('Statement of interest'), { target: { value: application.statement } })
  fireEvent.change(screen.getByLabelText('Relevant experience'), { target: { value: application.experience } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))
  expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /saving/i }))
  expect(fetch).toHaveBeenCalledTimes(1)
  finish({ ok: false, json: async () => ({ error: 'This position has closed.' }) })
  expect(await screen.findByRole('alert')).toHaveTextContent('This position has closed.')
  expect(screen.getByLabelText('Statement of interest')).toHaveValue(application.statement)
  expect(screen.getByLabelText('Relevant experience')).toHaveValue(application.experience)
  fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  expect(fetch).toHaveBeenLastCalledWith('/api/member/leadership', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'apply', positionId: position.id, statement: application.statement, experience: application.experience }) }))
  expect(screen.getByRole('status')).toHaveTextContent(/saved/i)
})

it.each(['PENDING', 'WITHDRAWN'] as const)('allows %s editing only for an open role', status => {
  const { rerender } = render(<MemberOfficerOpenings positions={[position]} applications={[{ ...application, status }]} positionId={position.id}/>)
  expect(screen.getByLabelText('Statement of interest')).toHaveValue(application.statement)
  rerender(<MemberOfficerOpenings positions={[]} applications={[{ ...application, status }]} positionId={position.id}/>)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByText(/no longer accepting applications/i)).toBeInTheDocument()
})

it.each(['SHORTLISTED', 'NOT_SELECTED'] as const)('shows %s feedback without allowing statement edits', status => {
  render(<MemberOfficerOpenings positions={[position]} applications={[{ ...application, status, feedback: 'Thank you for your application.' }]} positionId={position.id}/>)
  expect(screen.getByText('Thank you for your application.')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /save|submit|resubmit/i })).not.toBeInTheDocument()
})

it.each(['PENDING', 'WITHDRAWN'] as const)('never permits a reviewed %s application to be edited or resubmitted', status => {
  render(<MemberOfficerOpenings positions={[position]} applications={[{ ...application, status, reviewedAt: '2026-09-13T01:00:00Z' }]} positionId={position.id}/>)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /edit application|resubmit application/i })).not.toBeInTheDocument()
})

it.each(['PENDING', 'SHORTLISTED'] as const)('allows a %s application to be withdrawn after its role closes', async status => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }); vi.stubGlobal('fetch', fetch)
  render(<MemberOfficerOpenings positions={[]} applications={[{ ...application, status }]}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Withdraw application' }))
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  expect(fetch).toHaveBeenCalledWith('/api/member/leadership', expect.objectContaining({ body: JSON.stringify({ action: 'withdraw', positionId: position.id }) }))
  expect(screen.queryByRole('button', { name: 'Withdraw application' })).not.toBeInTheDocument()
})

it('does not offer an unknown or expired vacancy for application', () => {
  render(<MemberOfficerOpenings positions={[{ ...position, closesAt: '2020-01-01T00:00:00Z' }]} applications={[]} positionId={position.id}/>)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.getByText(/no longer accepting applications/i)).toBeInTheDocument()
})

it('filters reviews by status and role, including distinct openings with the same title', () => {
  const other = { ...application, positionId: 'opening-3', term: 'Spring 2027', displayName: 'Sam Student', status: 'NOT_SELECTED' as const }
  render(<OfficerApplicationQueue applications={[application, other]}/>)
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'NOT_SELECTED' } })
  expect(screen.queryByText('Alex Student')).not.toBeInTheDocument()
  expect(screen.getByText('Sam Student')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ALL' } })
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'opening-3' } })
  expect(screen.queryByText('Alex Student')).not.toBeInTheDocument()
  expect(screen.getByText('Sam Student')).toBeInTheDocument()
})

it.each(['SHORTLISTED', 'NOT_SELECTED'] as const)('reviews with %s and member-visible feedback without appointing the applicant', async decision => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }); vi.stubGlobal('fetch', fetch)
  render(<OfficerApplicationQueue applications={[application]}/>)
  fireEvent.change(screen.getByLabelText('Feedback visible to member'), { target: { value: 'Thanks for your interest.' } })
  fireEvent.click(screen.getByRole('button', { name: decision === 'SHORTLISTED' ? 'Shortlist' : 'Not selected' }))
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce())
  expect(fetch).toHaveBeenCalledOnce()
  expect(fetch).toHaveBeenCalledWith('/api/admin/officer-applications', expect.objectContaining({ body: JSON.stringify({ action: 'review', positionId: position.id, userId: application.userId, decision, feedback: 'Thanks for your interest.' }) }))
  expect(screen.getByRole('status')).toHaveTextContent(/review saved/i)
  expect(screen.queryByRole('button', { name: /appoint|grant|promote/i })).not.toBeInTheDocument()
})

it('preserves review feedback after errors and blocks concurrent decisions', async () => {
  let finish!: (value: unknown) => void
  const fetch = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve })); vi.stubGlobal('fetch', fetch)
  render(<OfficerApplicationQueue applications={[application]}/>)
  fireEvent.change(screen.getByLabelText('Feedback visible to member'), { target: { value: 'Please share more details.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Shortlist' }))
  expect(screen.getByRole('button', { name: 'Not selected' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Not selected' }))
  expect(fetch).toHaveBeenCalledOnce()
  finish({ ok: false, json: async () => ({ error: 'Review failed. Try again.' }) })
  expect(await screen.findByRole('alert')).toHaveTextContent('Review failed. Try again.')
  expect(screen.getByLabelText('Feedback visible to member')).toHaveValue('Please share more details.')
  expect(refresh).not.toHaveBeenCalled()
})

it('does not review withdrawn applications', () => {
  render(<OfficerApplicationQueue applications={[{ ...application, status: 'WITHDRAWN' }]}/>)
  expect(within(screen.getByRole('article')).getByText('Withdrawn')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Not selected' })).not.toBeInTheDocument()
})

it('blocks withdrawal while saving the same application', async () => {
  let finish!: (value: unknown) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { finish = resolve })))
  render(<MemberOfficerOpenings positions={[position]} applications={[application]} positionId={position.id}/>)
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(screen.getByRole('button', { name: 'Withdraw application' })).toBeDisabled()
  finish({ ok: false, json: async () => ({ error: 'Please try again.' }) })
  await screen.findByRole('alert')
})

it('renders public openings without reading private applications', async () => {
  const { default: Page } = await import('@/app/(public)/leadership/page')
  render(await Page())
  expect(screen.getAllByRole('link', { name: /sign in to apply/i })).toHaveLength(2)
  expect(listApplications).not.toHaveBeenCalled()
})

it('lets a public listing failure propagate instead of claiming no openings exist', async () => {
  listPositions.mockRejectedValueOnce(new Error('Database unavailable'))
  const { default: Page } = await import('@/app/(public)/leadership/page')
  await expect(Page()).rejects.toThrow('Database unavailable')
})

it('loads the selected member application only after checking active membership', async () => {
  const { default: Page } = await import('@/app/member/(portal)/leadership/page')
  render(await Page({ searchParams: Promise.resolve({ position: secondPosition.id }) }))
  expect(activeMember).toHaveBeenCalledOnce()
  expect(screen.getByRole('heading', { name: 'Apply for Treasurer' })).toBeInTheDocument()
  expect(listApplications).toHaveBeenCalledWith()
})

it('does not load private applications when the member guard rejects access', async () => {
  activeMember.mockRejectedValueOnce(new Error('Member required'))
  const { default: Page } = await import('@/app/member/(portal)/leadership/page')
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('Member required')
  expect(listApplications).not.toHaveBeenCalled()
})

it('limits an admin member to their own applications even when the RPC returns other members', async () => {
  activeMember.mockResolvedValueOnce({ userId: 'admin-member' })
  listApplications.mockResolvedValueOnce([
    { ...application, userId: 'admin-member' },
    { ...application, positionId: secondPosition.id, roleTitle: secondPosition.roleTitle, userId: 'other-member', statement: 'Another member private statement.', feedback: 'Another member private feedback.' },
  ])
  const { default: Page } = await import('@/app/member/(portal)/leadership/page')
  render(await Page({ searchParams: Promise.resolve({ position: secondPosition.id }) }))
  expect(screen.getByText(application.statement)).toBeInTheDocument()
  expect(screen.queryAllByText('Another member private statement.')).toHaveLength(0)
  expect(screen.queryByText('Another member private feedback.')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Apply for Treasurer' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Statement of interest' })).toHaveValue('')
  expect(screen.getAllByRole('article')).toHaveLength(1)
})

it('denies editors before loading the officer review queue', async () => {
  admin.mockResolvedValueOnce({ role: 'EDITOR' })
  const { default: Page } = await import('@/app/admin/(portal)/officer-applications/page')
  render(await Page())
  expect(screen.getByRole('heading', { name: 'Admin access required' })).toBeInTheDocument()
  expect(listApplications).not.toHaveBeenCalled()
  expect(listEmailStatus).not.toHaveBeenCalled()
})

it('loads the admin queue without passing a client-selected identity', async () => {
  listApplications.mockResolvedValueOnce([application])
  const { default: Page } = await import('@/app/admin/(portal)/officer-applications/page')
  render(await Page())
  expect(screen.getByText('Alex Student')).toBeInTheDocument()
  expect(listApplications).toHaveBeenCalledWith()
})

it('shows announcement delivery below the admin queue without initiating email delivery', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  listApplications.mockResolvedValueOnce([application])
  listEmailStatus.mockResolvedValueOnce([{ positionId: position.id, roleTitle: position.roleTitle, baseline: true, pending: 0, sending: 0, sent: 0, failed: 0, unknown: 0, skipped: 0 }])
  const { default: Page } = await import('@/app/admin/(portal)/officer-applications/page')
  render(await Page())
  const heading = screen.getByRole('heading', { name: 'Position announcement emails' })
  expect(screen.getByText('Existing opening. No announcement sent.')).toBeInTheDocument()
  expect(screen.getByText('Alex Student').compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
})

it('routes Explore leadership to posted openings without collecting a generic request', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
  render(<GetInvolvedForm/>)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'leadership_interest' } })
  expect(push).toHaveBeenCalledExactlyOnceWith('/leadership')
  expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Your interests' })).not.toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
})

it('navigates a leadership default directly to posted openings', () => {
  render(<GetInvolvedForm defaultType="leadership_interest"/>)
  expect(push).toHaveBeenCalledExactlyOnceWith('/leadership')
  expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
})

it('redirects the legacy leadership query on the server', async () => {
  const { default: Page } = await import('@/app/(public)/get-involved/page')
  await expect(Page({ searchParams: Promise.resolve({ type: 'leadership_interest' }) })).rejects.toThrow('REDIRECT:/leadership')
})

it('places openings in member Community and reviews in admin Start here, excluding editors', () => {
  expect(memberPortalGroups.find(group => group.label === 'Community')?.items).toContainEqual({ label: 'Open positions', href: '/member/leadership', icon: 'people' })
  for (const role of ['ADMIN', 'SUPER_ADMIN'] as const) {
    expect(adminPortalGroups(role).find(group => group.label === 'Start here')?.items).toContainEqual({ label: 'Officer applications', href: '/admin/officer-applications', icon: 'requests' })
  }
  expect(adminPortalGroups('EDITOR').flatMap(group => group.items).some(item => item.href === '/admin/officer-applications')).toBe(false)
})
