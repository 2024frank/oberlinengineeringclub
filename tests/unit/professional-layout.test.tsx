import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { heroSchema } from '@/lib/page-builder/schemas/hero'
import { pageSnapshotSchema } from '@/lib/page-builder/types'
afterEach(cleanup)
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props} data-client-link="true">{children}</a> }))
vi.mock('@/components/public/PrinterHero', () => ({ PrinterHero: () => <div data-testid="printer-canvas"/> }))

vi.mock('next/navigation', () => ({ usePathname: () => '/projects' }))
vi.mock('@/lib/page-builder/publicPages', () => ({
  getCmsRenderContext: async () => ({}),
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
  expect(screen.getByRole('link', { name: 'Officer sign in' })).not.toHaveAttribute('data-client-link')
})

it('introduces the club with a real image and direct membership links instead of a 3D printer', async () => {
  const { HeroSection } = await import('@/components/page-builder/sections/HeroSection')
  const section = heroSchema.parse({ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', headline: 'Build things. Learn together.', body: 'Projects and engineering at Oberlin.' })
  render(<HeroSection section={section} context={{ pageSlug: 'home' }}/>)
  expect(screen.queryByTestId('printer-canvas')).not.toBeInTheDocument()
  const shortcuts = within(screen.getByRole('navigation', { name: 'Get started' }))
  expect(shortcuts.getByRole('link', { name: /Member sign in/ })).toHaveAttribute('href', '/member/login')
  expect(shortcuts.getByRole('link', { name: /Share a project idea/ })).toHaveAttribute('href', '/get-involved?type=propose_project')
})

it.each(['image', 'split', 'minimal'] as const)('preserves interior CMS %s hero content', async layout => {
  const { CmsPage } = await import('@/components/public/CmsPage')
  const page = pageSnapshotSchema.parse({ pageId: '00000000-0000-4000-8000-000000000099', slug: 'about', title: 'About', sections: [{ stableKey: 'hero', type: 'hero', isVisible: true, layout, eyebrow: 'Our club', headline: 'A place to build together', body: 'Bring your ideas.', primaryCta: { label: 'Meet the team', href: '/about#team' } }] })
  render(await CmsPage({ page }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A place to build together')
  expect(screen.getByText('Our club')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Meet the team' })).toHaveAttribute('href', '/about#team')
  expect(screen.queryByRole('navigation', { name: 'Get started' })).not.toBeInTheDocument()
})

it('passes the actual homepage identity through the CMS renderer', async () => {
  const { CmsPage } = await import('@/components/public/CmsPage')
  const page = pageSnapshotSchema.parse({ pageId: '00000000-0000-4000-8000-000000000098', slug: 'home', title: 'Home', sections: [{ stableKey: 'hero', type: 'hero', isVisible: true, layout: 'split', headline: 'Build things. Learn together.', body: '' }] })
  render(await CmsPage({ page }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('OberlinEngineeringClub.')
  expect(screen.getByRole('navigation', { name: 'Get started' })).toBeVisible()
})
