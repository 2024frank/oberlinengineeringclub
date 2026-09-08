import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkbenchPreview } from '@/components/concepts/workbench/WorkbenchPreview'
import Link from 'next/link'

const scene = vi.hoisted(() => ({ progress: 0 }))
vi.mock('next/dynamic', () => ({ default: () => (props: { progress: number }) => { scene.progress = props.progress; return null } }))
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(cleanup)
const projects = [{ id: 'printer', slug: 'printer-repair', title: 'Printer repair', summary: 'Repair the extruder.', status: 'open_for_interest', disciplines: ['Mechanical'] }]

it('uses public URLs for the drawer, navigation and join lever, without preview claims', async () => {
  const user = userEvent.setup(), navigate = vi.fn()
  render(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/', navigate }}/>)
  await user.click(within(screen.getByRole('region', { name: 'Project drawer' })).getByRole('button', { name: /Printer repair/ }))
  expect(navigate).toHaveBeenLastCalledWith('/projects/printer-repair')
  await user.click(screen.getByRole('button', { name: 'Join the club' }))
  expect(navigate).toHaveBeenLastCalledWith('/get-involved')
  await user.click(screen.getByRole('button', { name: 'Events' }))
  expect(navigate).toHaveBeenLastCalledWith('/events')
  expect(screen.queryByText('Design preview')).not.toBeInTheDocument()
  expect(screen.queryByText(/Nothing is submitted/)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Member sign in' })).toHaveAttribute('href', '/member/login')
  expect(screen.getByRole('link', { name: 'Officer sign in' })).toHaveAttribute('href', '/admin/login')
  expect(screen.getByRole('link', { name: 'Submit a project idea' })).toHaveAttribute('href', '/get-involved?type=propose_project')
})

it('renders real signup content on direct links and syncs machine progress without a demo form', () => {
  render(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/get-involved', navigate: vi.fn() }}><h1>Live registration</h1><button>Send to OEC</button></WorkbenchPreview>)
  expect(screen.getByRole('heading', { name: 'Live registration' })).toBeVisible()
  expect(screen.getByText('Membership', { selector: '.wb-label' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Send to OEC' })).toBeVisible()
  expect(screen.queryByText(/Local preview only/)).not.toBeInTheDocument()
  act(() => window.dispatchEvent(new CustomEvent('oec-join-progress', { detail: { phase: 2 } })))
  expect(scene.progress).toBe(3)
})

it('keeps server-rendered project details and changes views when browser history changes the URL', () => {
  const navigate = vi.fn()
  const result = render(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/projects/printer-repair', navigate }}><h1>Printer details</h1><Link href="/get-involved?type=join_project&project=Printer%20repair">Express interest</Link></WorkbenchPreview>)
  expect(screen.getByRole('heading', { name: 'Printer details' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Express interest' })).toHaveAttribute('href', '/get-involved?type=join_project&project=Printer%20repair')
  result.rerender(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/projects', navigate }}/>)
  expect(screen.getByRole('heading', { name: /Project catalog/ })).toBeVisible()
  result.rerender(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/', navigate }}/>)
  expect(screen.getByRole('heading', { name: 'Oberlin Engineering Club' })).toBeVisible()
})

it.each(['/about', '/resources', '/pathway', '/opportunities', '/news', '/events/workshop'])('keeps published content accessible at %s', pathname => {
  render(<WorkbenchPreview projects={projects} events={[]} route={{ pathname, navigate: vi.fn() }}><h1>Published content</h1></WorkbenchPreview>)
  expect(screen.getByRole('heading', { name: 'Published content' })).toBeVisible()
})

it('does not dismiss a real signup when Escape is pressed', async () => {
  const navigate = vi.fn(), user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]} route={{ pathname: '/get-involved', navigate }}><input aria-label="Full name" defaultValue="Student"/></WorkbenchPreview>)
  await user.click(screen.getByRole('textbox', { name: 'Full name' }))
  await user.keyboard('{Escape}')
  expect(navigate).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Student')
})

it('honors legacy project filters and synchronizes search with shareable URLs', async () => {
  const navigate = vi.fn(), user = userEvent.setup()
  const records = [...projects.map(project => ({ ...project, recruiting: true, skills: ['CAD'] })), { ...projects[0], id: 'other', title: 'Closed project', recruiting: false, skills: [] }]
  const result = render(<WorkbenchPreview projects={records} events={[]} route={{ pathname: '/projects', search: 'recruiting=true&skill=CAD', navigate }}/>)
  expect(screen.getByRole('button', { name: /Printer repair/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: /Closed project/ })).not.toBeInTheDocument()
  await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'P')
  expect(navigate).toHaveBeenLastCalledWith('/projects?recruiting=true&skill=CAD&q=P')
  result.rerender(<WorkbenchPreview projects={records} events={[]} route={{ pathname: '/projects', search: 'recruiting=false', navigate }}/>)
  expect(screen.getByRole('button', { name: /Closed project/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: /Printer repair/ })).not.toBeInTheDocument()
})
