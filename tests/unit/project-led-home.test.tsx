import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { HeroSection } from '@/components/page-builder/sections/HeroSection'
import { heroSchema } from '@/lib/page-builder/schemas/hero'
import { AnnouncementBanner } from '@/components/public/AnnouncementBanner'

afterEach(cleanup)
const section = heroSchema.parse({ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', eyebrow: 'Oberlin Engineering Club', headline: 'Build things. Learn together.', body: 'Projects and engineering at Oberlin.', primaryCta: { label: 'Get involved', href: '/get-involved' }, secondaryCta: { label: 'Explore projects', href: '/projects' } })

it('places project discovery and the next published meeting in the homepage opening', () => {
  const future = new Date(Date.now() + 86400000).toISOString()
  render(<HeroSection section={section} context={{ pageSlug: 'home', events: [{ id: 'meeting', slug: 'first-meeting', title: 'First interest meeting', start_at: future, location: 'Science Center A155' }] }}/>)
  expect(screen.getByRole('link', { name: /First interest meeting/ })).toHaveAttribute('href', '/events/first-meeting')
  expect(screen.getByText('Science Center A155')).toBeVisible()
  expect(screen.getByRole('link', { name: /Explore projects/ })).toHaveAttribute('href', '/projects')
  expect(screen.queryByRole('heading', { name: 'Build things. Learn together.' })).not.toBeInTheDocument()
})

it('never advertises past or invalid dates as an upcoming meeting', () => {
  render(<HeroSection section={section} context={{ pageSlug: 'home', events: [{ id: 'past', slug: 'past', title: 'Old meeting', start_at: '2000-01-01' }, { id: 'invalid', slug: 'invalid', title: 'Invalid date', start_at: 'invalid' }] }}/>)
  expect(screen.queryByRole('link', { name: /Old meeting|Invalid date/ })).not.toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Get started' })).toBeVisible()
})

it('preserves a new homepage introduction written in the officer portal', () => {
  render(<HeroSection section={{ ...section, body: 'Our next workshop covers circuit testing.' }} context={{ pageSlug: 'home' }}/>)
  expect(screen.getByText('Our next workshop covers circuit testing.')).toBeVisible()
})

it('removes the retired membership-interest announcement while preserving real announcements', () => {
  const { rerender } = render(<AnnouncementBanner announcement={{ text: 'Organizing for 2026–27. Membership interest is open.' }}/>)
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  rerender(<AnnouncementBanner announcement={{ text: 'Workshop room changed to A155', href: '/events' }}/>)
  expect(screen.getByRole('link')).toHaveTextContent('Workshop room changed to A155')
})
