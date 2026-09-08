import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import EventPage from '@/app/(public)/events/[slug]/page'

const fixture = vi.hoisted(() => ({ event: { slug: 'founding-meetup', title: 'First interest meeting', start_at: '2026-09-12T17:00:00Z', end_at: '2026-09-12T18:30:00Z', location: 'Science Center A155' } as Record<string, unknown> }))
vi.mock('@/lib/content/events', () => ({ getPublishedEvent: async () => fixture.event }))
vi.mock('@/components/public/CoverImage', () => ({ CoverImage: () => null }))
afterEach(cleanup)

it('shows the complete meeting time in Oberlin local time', async () => {
  render(await EventPage({ params: Promise.resolve({ slug: 'founding-meetup' }) }))
  expect(screen.getByText('Saturday, September 12, 2026')).toBeVisible()
  expect(screen.getByText('1:00 PM - 2:30 PM')).toBeVisible()
  expect(screen.getByText('Science Center A155')).toBeVisible()
})

it('does not render an epoch date for an unscheduled event', async () => {
  fixture.event = { ...fixture.event, start_at: null, end_at: null }
  render(await EventPage({ params: Promise.resolve({ slug: 'founding-meetup' }) }))
  expect(screen.getByText('Date to be announced')).toBeVisible()
  expect(screen.queryByText(/1969|1970/)).not.toBeInTheDocument()
})
