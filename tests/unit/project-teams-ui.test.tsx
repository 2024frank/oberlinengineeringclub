import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ProjectTeamsOverview } from '@/components/admin/projects/ProjectTeamsOverview'
import { MilestoneBoard } from '@/components/member/workspace/MilestoneBoard'
import type { ProjectTeamSummary } from '@/lib/projects/teamAdmin'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); refresh.mockReset() })

const base: ProjectTeamSummary = { id: 'p', title: 'Project', slug: 'p', status: 'open_for_interest', publicationState: 'published', recruiting: true, startedAt: null, leadName: '', memberCount: 0, leads: [], pendingApplications: 0, milestonesTotal: 0, milestonesDone: 0, lastActivityAt: null }
const projects: ProjectTeamSummary[] = [
  { ...base, id: 'empty', title: 'DO Probe Amplifier' },
  { ...base, id: 'leaderless', title: 'Ender 3 Upgrade', memberCount: 3, pendingApplications: 2 },
  { ...base, id: 'running', title: 'PET Recycling', memberCount: 4, leads: ['Ada Lovelace'], startedAt: '2026-09-01T12:00:00Z', status: 'active', milestonesTotal: 4, milestonesDone: 1 },
  { ...base, id: 'hidden', title: 'Old Printer', publicationState: 'archived' },
]

it('surfaces projects that need members, a lead, or a decision', async () => {
  const user = userEvent.setup()
  render(<ProjectTeamsOverview projects={projects}/>)
  expect(screen.getByRole('status')).toHaveTextContent('3 projects')
  expect(screen.queryByText('Old Printer')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /No members yet/ }))
  expect(screen.getByRole('link', { name: 'DO Probe Amplifier' })).toHaveAttribute('href', '/admin/project-teams/empty')
  expect(screen.queryByText('PET Recycling')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Needs a lead/ }))
  expect(screen.getByText('Ender 3 Upgrade')).toBeInTheDocument()
  expect(screen.getByText('2 applications waiting')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Underway/ }))
  const row = screen.getByText('PET Recycling').closest('article')!
  expect(within(row).getByText('Lead: Ada Lovelace')).toBeInTheDocument()
  expect(within(row).getByText('1 of 4 milestones done')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Hidden/ }))
  expect(screen.getByText('Old Printer')).toBeInTheDocument()
})

const roster = [{ userId: 'me', displayName: 'Ben', role: 'MEMBER' as const, joinedAt: '2026-09-01' }, { userId: 'lead', displayName: 'Ada', role: 'LEAD' as const, joinedAt: '2026-09-01' }]
const milestone = { id: '00000000-0000-4000-8000-000000000050', title: 'Breadboard the amplifier', description: '', status: 'TODO' as const, dueDate: '2026-01-02', sortOrder: 100, assigneeUserId: null, assigneeName: null, completedAt: null }

it('lets any team member claim and finish milestones without lead-only controls', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<MilestoneBoard projectId="00000000-0000-4000-8000-000000000020" milestones={[milestone]} roster={roster} me="me" isLead={false}/>)
  expect(screen.getByText(/Overdue/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Add a milestone/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /I'll take it/ }))
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: 'milestone-claim', milestoneId: milestone.id, claim: true })
  await user.selectOptions(screen.getByLabelText('Status of Breadboard the amplifier'), 'DONE')
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ action: 'milestone-status', milestoneId: milestone.id, status: 'DONE' })
  expect(await screen.findByRole('status')).toHaveTextContent('is done and your team was notified')
  expect(refresh).toHaveBeenCalled()
})

it('shows a readable message when a teammate already took the milestone', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'MILESTONE_ALREADY_CLAIMED' }) }))
  render(<MilestoneBoard projectId="00000000-0000-4000-8000-000000000020" milestones={[milestone]} roster={roster} me="me" isLead={false}/>)
  await userEvent.click(screen.getByRole('button', { name: /I'll take it/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('A teammate already took this milestone.')
})
