import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { DashboardCards } from '@/components/admin/DashboardCards'
const summary = { newSubmissions: 3, drafts: 2, upcomingEvents: 1, activeProjects: 4, closingOpportunities: 2, scheduledPublications: 1, pendingMemberApprovals: 2, activeStaffInvites: 1, pendingProjectProposals: 0, pendingProjectUpdateReviews: 0 }
const admin = { userId: 'officer', email: 'officer@example.com', displayName: 'Officer', role: 'SUPER_ADMIN' as const, scopes: [], canPublish: true, active: true }
afterEach(cleanup)
it('prioritizes only the queues that need attention', () => {
  render(<DashboardCards summary={summary}/>)
  expect(screen.getByText('5 waiting')).toBeInTheDocument()
  expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/admin/submissions?status=new')
  expect(screen.queryByText('Project ideas')).not.toBeInTheDocument()
})
it('shows a calm clear state when all reviews are done', () => {
  render(<DashboardCards summary={{ ...summary, newSubmissions: 0, pendingMemberApprovals: 0 }}/>)
  expect(screen.getByText("You're all caught up")).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
it('takes officers straight into creating a project or event', () => {
  render(<AdminDashboard admin={admin} summary={summary} activity={[]}/>)
  expect(screen.getByRole('link', { name: /Add a project/ })).toHaveAttribute('href', '/admin/projects?new=1')
  expect(screen.getByRole('link', { name: /Post an event/ })).toHaveAttribute('href', '/admin/events?new=1')
})
it('does not offer editors administrative reviews or creation outside their scopes', () => {
  render(<AdminDashboard admin={{ ...admin, role: 'EDITOR', scopes: ['events'] }} summary={summary} activity={[]}/>)
  expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Add a project/ })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Post an event/ })).toBeInTheDocument()
})
