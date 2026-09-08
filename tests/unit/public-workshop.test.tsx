import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PublicWorkshop } from '@/components/concepts/PublicWorkshop'

vi.mock('next/dynamic', () => ({ default: () => () => null }))
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const projects = [
  { id: 'printer', slug: 'printer-repair', title: 'Printer repair', summary: 'Repair a build plate.', status: 'open_for_interest', disciplines: ['mechanical'] },
  { id: 'board', slug: 'new-controller', title: 'New controller', summary: 'Wire a new board.', status: 'in_progress', disciplines: ['electrical'] }
]

describe('Public project workshop', () => {
  it('selects published projects and carries the exact title into the join request', async () => {
    const user = userEvent.setup()
    render(<PublicWorkshop projects={projects} events={[]} paused={false}/>)
    await user.click(within(screen.getByRole('navigation', { name: 'Project index' })).getByRole('button', { name: /New controller/ }))
    expect(screen.getByRole('link', { name: 'View project' })).toHaveAttribute('href', '/projects/new-controller')
    expect(screen.getByRole('link', { name: 'Join this project' })).toHaveAttribute('href', '/get-involved?type=join_project&project=New%20controller')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Project discipline' }), 'mechanical')
    expect(screen.getByRole('link', { name: 'View project' })).toHaveAttribute('href', '/projects/printer-repair')
    expect(within(screen.getByRole('navigation', { name: 'Project index' })).queryByRole('button', { name: /New controller/ })).not.toBeInTheDocument()
  })

  it('retains distinct proposal and capstone paths at the hero entry anchors', () => {
    render(<PublicWorkshop projects={projects} events={[]} paused={false}/>)
    expect(screen.getByRole('link', { name: 'Submit your idea' })).toHaveAttribute('href', '/get-involved?type=propose_project')
    expect(screen.getByRole('link', { name: 'Submit your idea' }).closest('section')).toHaveAttribute('id', 'ideas')
    expect(screen.getByRole('link', { name: 'Discuss a capstone' })).toHaveAttribute('href', '/get-involved?type=propose_project&focus=capstone')
    expect(screen.getByRole('link', { name: 'Discuss a capstone' }).closest('section')).toHaveAttribute('id', 'capstones')
    expect(screen.getByRole('navigation', { name: 'Project index' }).closest('section')).toHaveAttribute('id', 'workshop')
  })

  it('does not offer a company-challenge or partnership inquiry path', () => {
    render(<PublicWorkshop projects={projects} events={[]} paused={false}/>)
    expect(screen.queryByRole('link', { name: /company challenge/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).not.toContain('/get-involved?type=partnership_inquiry')
  })

  it('keeps the workshop free of company and partner positioning', () => {
    const { container } = render(<PublicWorkshop projects={projects} events={[]} paused={false}/>)
    expect(container).not.toHaveTextContent(/\b(compan(?:y|ies)|partners?|partnerships?|sponsors?)\b/i)
  })

  it('retains published event dates and links alongside club participation', () => {
    render(<PublicWorkshop projects={projects} events={[
      { id: 'repair', title: 'Printer repair session', start: '2026-09-12T18:00:00Z', location: 'Workshop' }
    ]} paused={false}/>)
    const event = screen.getByRole('link', { name: /Printer repair session/ })
    expect(event).toHaveAttribute('href', '/events')
    expect(event).toHaveTextContent('Sep 12')
    expect(screen.getByRole('link', { name: 'Events & meetups' })).toHaveAttribute('href', '/events')
    expect(screen.getByRole('link', { name: 'Join the club' })).toHaveAttribute('href', '/get-involved')
  })

  it('handles an empty project collection without invented projects', () => {
    render(<PublicWorkshop projects={[]} events={[]} paused={true}/>)
    expect(screen.getByText('New projects will appear here once published.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Join this project' })).not.toBeInTheDocument()
  })
})
