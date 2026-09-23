import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { MemberDashboard } from '@/components/member/MemberDashboard'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); refresh.mockReset() })

const project = '00000000-0000-4000-8000-000000000020'
const summary = { saved: 0, openApplications: 0, pendingInvitations: 0, activeTeams: 1, projectProposals: 0, unreadNotifications: 0 }
const teams = [{ projectId: project, title: 'PET Recycling', slug: 'pet', membershipRole: 'MEMBER' as const, projectStatus: 'active', publicationState: 'published', recruiting: true }]
const progress = [{ projectId: project, title: 'PET Recycling', role: 'MEMBER' as const, status: 'active', startedAt: '2026-09-01', memberCount: 3, milestonesTotal: 4, milestonesDone: 1, myOpenMilestones: 1, nextMilestone: { title: 'Tune the hotend', dueDate: '2026-01-02', status: 'IN_PROGRESS' as const }, lastPostAt: null }]
const work = {
  mine: [{ id: '00000000-0000-4000-8000-000000000041', title: 'Tune the hotend', status: 'IN_PROGRESS' as const, dueDate: '2026-01-02', projectId: project, projectTitle: 'PET Recycling' }],
  unclaimed: [{ id: '00000000-0000-4000-8000-000000000042', title: 'Print a calibration cube', status: 'TODO' as const, dueDate: null, projectId: project, projectTitle: 'PET Recycling' }],
  posts: [{ id: 'post', projectId: project, projectTitle: 'PET Recycling', kind: 'BLOCKER' as const, body: 'The extruder jams above 250C.', authorName: 'Esi Asante', authorUserId: 'esi', officer: false, createdAt: new Date().toISOString() }],
}

it('leads with the member’s own work, progress, and team news', () => {
  render(<MemberDashboard displayName="Dana Ruiz" summary={summary} teams={teams} progress={progress} work={work}/>)
  expect(screen.getByText('You own 1 open milestone, and one is overdue.')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '1 of 4 milestones done' })).toBeInTheDocument()
  const mine = screen.getByRole('region', { name: 'Your milestones' })
  expect(within(mine).getByText('Overdue, was due Jan 2')).toBeInTheDocument()
  expect(within(mine).getByRole('button', { name: "Take Print a calibration cube" })).toBeInTheDocument()
  const feed = screen.getByRole('region', { name: 'Latest from your teams' })
  expect(within(feed).getByText('Blocker')).toBeInTheDocument()
  expect(within(feed).getByRole('link', { name: 'PET Recycling' })).toHaveAttribute('href', `/member/teams/${project}#team-feed`)
  expect(screen.getByRole('link', { name: /Find a project/ })).toHaveAttribute('href', '/member/projects')
})

it('marks a milestone done in one click and refreshes the dashboard', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemberDashboard displayName="Dana Ruiz" summary={summary} teams={teams} progress={progress} work={work}/>)
  await userEvent.click(screen.getByRole('button', { name: 'Mark Tune the hotend done' }))
  expect(fetchMock).toHaveBeenCalledWith(`/api/member/projects/${project}`, expect.objectContaining({ body: JSON.stringify({ action: 'milestone-status', milestoneId: work.mine[0].id, status: 'DONE' }) }))
  expect(refresh).toHaveBeenCalled()
})
