import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProjectPage from '@/app/(public)/projects/[slug]/page'

const fixture = vi.hoisted(() => ({ project: {} as Record<string, unknown>, member: null as null | { userId: string }, teams: [] as { projectId: string }[], applications: [] as { projectId: string; status: string }[], stats: {} as Record<string, unknown> }))
vi.mock('@/lib/content/projects', () => ({ getPublishedProject: async () => fixture.project }))
vi.mock('@/lib/auth/memberSession', () => ({ getCurrentMember: async () => fixture.member }))
vi.mock('@/lib/content/projectTeamStats', () => ({ getProjectTeamStats: async () => fixture.stats }))
vi.mock('@/lib/projects/workspace', () => ({ listMyProjectWorkspaces: async () => fixture.teams }))
vi.mock('@/lib/projects/applications', () => ({ listMyProjectApplications: async () => fixture.applications }))
vi.mock('@/lib/members/saves', () => ({ isSavedItem: async () => false }))
vi.mock('@/lib/content/publicMedia', () => ({ publicMedia: async () => ({ 'legacy-cover': { url: '/project-cover.jpg', alt: 'The printer awaiting repair' } }) }))
vi.mock('@/components/public/CoverImage', () => ({ CoverImage: () => <div role="img" aria-label="Legacy project cover"/> }))

beforeEach(() => {
  fixture.member = null; fixture.teams = []; fixture.applications = []; fixture.stats = {}
  fixture.project = {
    id: 'printer', slug: 'ender-3-klipper-upgrade', title: 'Ender 3 Repair & Klipper Upgrade',
    summary: 'Upgrade the controller and install Klipper.', status: 'open_for_interest',
    disciplines: ['Electrical'], skills: ['Firmware', 'Electronics'], cover_media_id: 'legacy-cover',
    problem: '', goal: '', timeline: [], updates: [], recruiting: true
  }
})
afterEach(cleanup)

it('shows the published difficulty alongside the existing project details', async () => {
  fixture.project.difficulty = 'Intermediate'
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByText('Difficulty', { selector: 'dt' })).toBeVisible()
  expect(screen.getByText('Intermediate', { selector: 'dd' })).toBeVisible()
})

it('shows the published project photograph with the brief and working interest links', async () => {
  const { container } = render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByRole('img', { name: 'The printer awaiting repair' })).toHaveAttribute('src', expect.stringContaining('project-cover.jpg'))
  expect(screen.getByRole('heading', { name: 'Project brief' })).toBeVisible()
  expect(container.querySelector('.prose')).toHaveTextContent('Upgrade the controller and install Klipper.')
  expect(screen.getAllByText('Upgrade the controller and install Klipper.')).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Skills you can contribute' })).toBeVisible()
  expect(screen.getByRole('list', { name: 'Project skills' })).toHaveTextContent('Firmware')
  expect(screen.getByRole('link', { name: 'Sign in to apply' })).toHaveAttribute('href', '/member/login?next=%2Fmember%2Fapplications%3Fproject%3Dprinter')
  expect(screen.getByRole('link', { name: 'Join OEC first' })).toHaveAttribute('href', '/get-involved')
  expect(screen.getByRole('link', { name: 'Sign in to save' })).toHaveAttribute('href', '/member/login')
})

it('preserves detailed proposals without repeating their summary in the brief', async () => {
  fixture.project = { ...fixture.project, problem: 'The probe produces a small signal.', goal: 'Validate an amplifier.', skills: [] }
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByRole('heading', { name: 'Problem' })).toBeVisible()
  expect(screen.getByText('The probe produces a small signal.')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Goal' })).toBeVisible()
  expect(screen.queryByRole('heading', { name: 'Project brief' })).not.toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Project skills' })).not.toBeInTheDocument()
})

it('shows live team status and milestone progress without naming anyone', async () => {
  fixture.stats = { printer: { memberCount: 3, milestonesTotal: 4, milestonesDone: 1, startedAt: '2026-09-12T16:00:00Z' } }
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByText('Underway')).toBeVisible()
  expect(screen.getByText('3 members')).toBeVisible()
  expect(screen.getByText('Started Sep 12, 2026')).toBeVisible()
  expect(screen.getByRole('img', { name: '1 of 4 milestones done' })).toBeInTheDocument()
})

it.each([
  ['member', [], [], 'Apply to join', '/member/applications?project=printer'],
  ['applicant', [], [{ projectId: 'printer', status: 'PENDING' }], 'View your application', '/member/applications'],
  ['teammate', [{ projectId: 'printer' }], [], 'Open your workspace', '/member/teams/printer'],
])('offers a %s one clear next step', async (_who, teams, applications, name, href) => {
  fixture.member = { userId: 'ada' }; fixture.teams = teams; fixture.applications = applications
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
  expect(screen.queryByRole('link', { name: 'Sign in to apply' })).not.toBeInTheDocument()
})

it('tells visitors when a team is not taking members and offers a way to ask', async () => {
  fixture.project.recruiting = false
  render(await ProjectPage({ params: Promise.resolve({ slug: 'ender-3-klipper-upgrade' }) }))
  expect(screen.getByText('This team is not taking new members right now.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Ask the club about this project' })).toHaveAttribute('href', '/get-involved?type=join_project&project=Ender%203%20Repair%20%26%20Klipper%20Upgrade')
})
