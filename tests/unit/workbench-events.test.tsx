import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkbenchEvents } from '@/components/concepts/workbench/WorkbenchEvents'

afterEach(cleanup)
it('links published events to their details and registration', () => {
  render(<WorkbenchEvents events={[{ id: 'event', slug: 'printer-workshop', title: 'Printer workshop', start: '2026-09-10T18:00:00-04:00', location: 'Lab' }]} onJoin={vi.fn()} initialMonth="2026-09"/>)
  expect(screen.getByRole('link', { name: 'Printer workshop' })).toHaveAttribute('href', '/events/printer-workshop')
})
const events = [
  { id: 'one', title: 'Printer workshop', start: '2026-09-10T18:00:00-04:00', location: 'Engineering lab' },
  { id: 'two', title: 'Electronics workshop', start: '2026-10-05T18:00:00-04:00', location: 'Engineering lab' }
]

it('browses months and only shows the events in the selected month', async () => {
  const user = userEvent.setup()
  render(<WorkbenchEvents events={events} onJoin={vi.fn()} initialMonth="2026-09"/>)
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible()
  expect(screen.getByText('Printer workshop')).toBeVisible()
  expect(screen.queryByText('Electronics workshop')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeVisible()
  expect(screen.getByText('Electronics workshop')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(screen.getByText('Printer workshop')).toBeVisible()
})

it('selects a date without inventing events and can clear the selection', async () => {
  const user = userEvent.setup()
  render(<WorkbenchEvents events={events} onJoin={vi.fn()} initialMonth="2026-09"/>)
  await user.click(screen.getByRole('button', { name: 'September 11, 2026' }))
  expect(screen.getByText('No events on this date.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'All dates this month' }))
  expect(screen.getByText('Printer workshop')).toBeVisible()
})

it('has an honest empty calendar and a working join action', async () => {
  const user = userEvent.setup(), join = vi.fn()
  render(<WorkbenchEvents events={[]} onJoin={join} initialMonth="2026-09"/>)
  expect(screen.getByText(/No events are published yet/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Join the club' }))
  expect(join).toHaveBeenCalledOnce()
})
