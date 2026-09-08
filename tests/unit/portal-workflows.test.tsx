import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemberDashboard } from '@/components/member/MemberDashboard'
import { MemberProjectBrowser } from '@/components/member/MemberProjectBrowser'
import { ProjectApplicationForm } from '@/components/member/ProjectApplicationForm'
import { ProjectProposalForm } from '@/components/member/ProjectProposalForm'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const summary = { saved: 0, openApplications: 0, pendingInvitations: 0, activeTeams: 0, projectProposals: 0, unreadNotifications: 0 }

describe('Member next actions', () => {
  it('does not allow a native form submission before client handlers are ready', () => {
    expect(renderToString(<ProjectProposalForm/>)).toMatch(/<fieldset[^>]*disabled=""/)
    expect(renderToString(<ProjectApplicationForm projectId="robot" projectTitle="Robot arm"/>)).toMatch(/<fieldset[^>]*disabled=""/)
  })
  it('takes new members directly to projects or an idea without leaving the portal', () => {
    render(<MemberDashboard displayName="Ada" summary={summary} teams={[]}/>)
    expect(screen.getByRole('link', { name: /Find a project/ })).toHaveAttribute('href', '/member/projects')
    expect(screen.getByRole('link', { name: /Propose an idea/ })).toHaveAttribute('href', '/member/proposals?new=1')
    expect(screen.queryByText(/0 unread/)).not.toBeInTheDocument()
  })

  it('makes invitations and existing team work directly reachable', () => {
    render(<MemberDashboard displayName="Ada" summary={{ ...summary, pendingInvitations: 2, activeTeams: 1 }} teams={[{ projectId: 'robot', title: 'Robot arm', membershipRole: 'MEMBER', slug: 'robot', projectStatus: 'active', publicationState: 'published', recruiting: false }]}/>)
    expect(screen.getByRole('link', { name: /2 team invitations/ })).toHaveAttribute('href', '/member/invitations')
    expect(screen.getByRole('link', { name: /Robot arm/ })).toHaveAttribute('href', '/member/teams/robot')
  })

  it('distinguishes available projects, pending applications, and existing teams', async () => {
    const user = userEvent.setup()
    render(<MemberProjectBrowser projects={[
      { id: 'a', title: 'Robot arm', summary: 'Build an arm', disciplines: ['Mechanical'], skills: [], recruiting: true },
      { id: 'b', title: 'Weather station', summary: 'Track the weather', disciplines: ['Electrical'], skills: [], recruiting: true },
      { id: 'c', title: 'Printer repair', summary: 'Repair the printer', disciplines: [], skills: [], recruiting: true },
    ]} applications={[{ projectId: 'b', status: 'PENDING' }]} teamIds={['c']}/>)
    expect(screen.getByRole('link', { name: 'Apply to Robot arm' })).toHaveAttribute('href', '/member/applications?project=a')
    expect(screen.getByRole('link', { name: 'View application for Weather station' })).toHaveAttribute('href', '/member/applications')
    expect(screen.getByRole('link', { name: 'Open Printer repair workspace' })).toHaveAttribute('href', '/member/teams/c')
    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'no match')
    expect(screen.getByText('No matching projects.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('link', { name: 'Apply to Robot arm' })).toBeInTheDocument()
  })

  it('shows a successful application clearly and does not submit it twice', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    const user = userEvent.setup()
    render(<ProjectApplicationForm projectId="robot" projectTitle="Robot arm"/>)
    await user.type(screen.getByRole('textbox', { name: /Why do you want to join/ }), 'I would like to learn about mechanical design.')
    await user.click(screen.getByRole('button', { name: 'Send application' }))
    expect(await screen.findByRole('heading', { name: 'Application sent' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my applications' })).toHaveAttribute('href', '/member/applications')
    expect(screen.queryByRole('button', { name: 'Send application' })).not.toBeInTheDocument()
  })

  it('keeps an idea through the steps and submits only after review', async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', request)
    const user = userEvent.setup()
    render(<ProjectProposalForm/>)
    await user.type(screen.getByRole('textbox', { name: 'Project title' }), 'Accessible campus robot')
    await user.type(screen.getByRole('textbox', { name: 'What problem are you solving?' }), 'Moving equipment between campus workshops.')
    await user.type(screen.getByRole('textbox', { name: 'What should the project accomplish?' }), 'Build a prototype that transports small equipment.')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Review idea' }))
    expect(request).not.toHaveBeenCalled()
    expect(screen.getByText('Accessible campus robot')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByRole('heading', { name: 'Idea submitted' })).toBeInTheDocument()
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ title: 'Accessible campus robot', disciplines: [] })
  })
})
