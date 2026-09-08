import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { heroSchema } from '@/lib/page-builder/schemas/hero'
afterEach(cleanup)
vi.mock('@/components/public/PrinterHero', () => ({ PrinterHero: () => <div data-testid="printer-canvas"/> }))

vi.mock('next/navigation', () => ({ usePathname: () => '/projects' }))
vi.mock('@/lib/page-builder/publicPages', () => ({
  getPublicSiteSettings: async () => ({
    contact: { email: 'club@example.com' }, footer: { text: 'Learn and build together.' },
    social: {}, brand: { badgeUrl: null }, announcement: { text: 'Interest meeting this Saturday', href: '/events' },
  }),
  getPublishedNavigation: async () => [
    { label: 'Projects', destination: '/projects' }, { label: 'Events', destination: '/events' },
    { label: 'About', destination: '/about' }, { label: 'Resources', destination: '/resources' },
  ],
}))
vi.mock('@/lib/content/projects', () => ({ listPublishedProjects: async () => [] }))
vi.mock('@/lib/content/events', () => ({ listPublishedEvents: async () => [] }))
vi.mock('@/components/concepts/workbench/WorkbenchSite', () => ({
  WorkbenchSite: ({ children }: { children: React.ReactNode }) => <div data-testid="legacy-machine">{children}</div>,
}))

it('shows published club content inside ordinary navigation and a document, without a 3D machine', async () => {
  const { default: PublicLayout } = await import('@/app/(public)/layout')
  render(await PublicLayout({ children: <h1>Water monitoring project</h1> }))
  expect(screen.queryByTestId('legacy-machine')).not.toBeInTheDocument()
  expect(within(screen.getByRole('main')).getByRole('heading', { name: 'Water monitoring project' })).toBeVisible()
  expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Join the club' })).toHaveAttribute('href', '/get-involved')
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  expect(screen.getByRole('complementary', { name: 'Announcement' })).toHaveTextContent('Interest meeting this Saturday')
  expect(screen.getByRole('link', { name: 'Officer sign in' })).toHaveAttribute('href', '/admin/login')
})

it('introduces the club with a real image and direct membership links instead of a 3D printer', async () => {
  const { HeroSection } = await import('@/components/page-builder/sections/HeroSection')
  const section = heroSchema.parse({ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', headline: 'Build things. Learn together.', body: 'Projects and engineering at Oberlin.' })
  render(<HeroSection section={section}/>)
  expect(screen.queryByTestId('printer-canvas')).not.toBeInTheDocument()
  const shortcuts = within(screen.getByRole('navigation', { name: 'Get started' }))
  expect(shortcuts.getByRole('link', { name: /Member sign in/ })).toHaveAttribute('href', '/member/login')
  expect(shortcuts.getByRole('link', { name: /Share a project idea/ })).toHaveAttribute('href', '/get-involved?type=propose_project')
})
