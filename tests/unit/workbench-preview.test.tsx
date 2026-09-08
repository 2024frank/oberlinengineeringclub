import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkbenchPreview } from '@/components/concepts/workbench/WorkbenchPreview'

const scene = vi.hoisted(() => ({ surfaceReady: null as null | ((surface: HTMLDivElement | null) => void), action: null as null | ((action: string) => void) }))
vi.mock('next/dynamic', () => ({ default: () => (props: { onSurfaceReady: (surface: HTMLDivElement | null) => void; onAction: (action: string) => void }) => { scene.surfaceReady = props.onSurfaceReady; scene.action = props.onAction; return null } }))
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  HTMLElement.prototype.scrollTo = vi.fn()
})
afterEach(cleanup)
const projects = [
  { id: 'one', slug: 'printer', title: 'Printer repair', summary: 'Repair the extruder.', status: 'open_for_interest', disciplines: ['Mechanical'] },
  { id: 'two', slug: 'sensor', title: 'Air sensor', summary: 'Measure room temperature.', status: 'planning', disciplines: ['Electrical'] }
]

it('opens a real project directly from the home drawer', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  const drawer = screen.getByRole('region', { name: 'Project drawer' })
  await user.click(within(drawer).getByRole('button', { name: /Printer repair/ }))
  expect(screen.getByRole('heading', { name: 'Printer repair' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Join this project' }))
  expect(screen.getByText('Printer repair')).toBeVisible()
})

it('offers keyboard-operable rotary section navigation and handles its physical actions', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.selectOptions(screen.getByRole('combobox', { name: 'Section selector' }), 'events')
  expect(screen.getByRole('heading', { name: /Workshops/ })).toBeVisible()
  act(() => scene.action?.('home'))
  expect(screen.getByRole('heading', { name: 'Oberlin Engineering Club' })).toBeVisible()
  act(() => scene.action?.('about'))
  expect(screen.getByRole('heading', { name: 'About the club' })).toBeVisible()
  act(() => scene.action?.('unknown'))
  expect(screen.getByRole('heading', { name: 'About the club' })).toBeVisible()
})

it('filters real projects and carries the selected project into the signup preview', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(within(screen.getByRole('navigation', { name: 'Workshop navigation' })).getByRole('button', { name: 'Projects' }))
  await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'sensor')
  expect(screen.queryByRole('button', { name: /Printer repair/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Air sensor/ }))
  expect(screen.getByText('Measure room temperature.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Join this project' }))
  expect(screen.getByText('Air sensor')).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Join the club' })).toBeVisible()
})

it('provides honest empty event and project states, with a working return home action', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={[]} events={[]}/> )
  await user.click(within(screen.getByRole('navigation', { name: 'Workshop navigation' })).getByRole('button', { name: 'Events' }))
  expect(screen.getByText(/No events are published yet/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Return to workshop' }))
  expect(screen.getByRole('heading', { name: 'Oberlin Engineering Club' })).toBeVisible()
  await user.click(within(screen.getByRole('navigation', { name: 'Workshop navigation' })).getByRole('button', { name: 'Projects' }))
  expect(screen.getByText(/No projects are published yet/)).toBeVisible()
})

it('does not attach a previously viewed project to a general signup', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(screen.getByRole('button', { name: 'Projects' }))
  await user.click(screen.getByRole('button', { name: /Air sensor/ }))
  await user.click(screen.getByRole('button', { name: 'About' }))
  await user.click(screen.getByRole('button', { name: 'Join the club' }))
  expect(screen.queryByText('Air sensor')).not.toBeInTheDocument()
})

it('restores keyboard focus to the new home button after closing signup', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(screen.getByRole('button', { name: 'Join the club' }))
  await user.keyboard('{Escape}')
  expect(screen.getByRole('button', { name: 'Join the club' })).toHaveFocus()
})

it('preserves focused input and its value through scene readiness and context loss', async () => {
  const user = userEvent.setup()
  const target = document.createElement('div')
  const result = render(<WorkbenchPreview projects={projects} events={[]}/> )
  result.container.appendChild(target)
  await user.click(screen.getByRole('button', { name: 'Join the club' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  const input = screen.getByRole('textbox', { name: 'Full name' })
  await user.type(input, 'Preview')
  act(() => scene.surfaceReady?.(target))
  expect(input).toHaveFocus()
  await user.type(input, ' Student')
  act(() => scene.surfaceReady?.(null))
  expect(input).toHaveFocus()
  expect(input).toHaveValue('Preview Student')
  result.unmount(); target.remove()
})

it('combines discipline filtering with search and can restore the complete catalog', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(screen.getByRole('button', { name: 'Projects' }))
  await user.selectOptions(screen.getByRole('combobox', { name: 'Project discipline' }), 'Mechanical')
  expect(screen.queryByRole('button', { name: /Air sensor/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Printer repair/ })).toBeVisible()
  await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'sensor')
  expect(screen.getByText('No matching projects.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('searchbox', { name: 'Search projects' })).toHaveFocus()
  expect(screen.getByRole('button', { name: /Air sensor/ })).toBeVisible()
  expect(screen.getByRole('button', { name: /Printer repair/ })).toBeVisible()
})

it('browses adjacent project sheets and retains the correct project when joining', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(screen.getByRole('button', { name: 'Projects' }))
  await user.click(screen.getByRole('button', { name: /Printer repair/ }))
  expect(screen.getByRole('button', { name: 'Previous project' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Next project' }))
  expect(screen.getByRole('heading', { name: 'Air sensor' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Next project' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Join this project' }))
  expect(screen.getByText('Air sensor')).toBeVisible()
  expect(screen.queryByText('Printer repair')).not.toBeInTheDocument()
})

it('preserves entered project signup details when the physical lever is pulled again', async () => {
  const user = userEvent.setup()
  render(<WorkbenchPreview projects={projects} events={[]}/> )
  await user.click(screen.getByRole('button', { name: 'Projects' }))
  await user.click(screen.getByRole('button', { name: /Air sensor/ }))
  await user.click(screen.getByRole('button', { name: 'Join this project' }))
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Preview Student')
  act(() => scene.action?.('join'))
  expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('Preview Student')
  expect(screen.getByText('Air sensor')).toBeVisible()
})
