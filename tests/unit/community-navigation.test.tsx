import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemberSidebar } from '@/components/member/MemberSidebar'
vi.mock('next/navigation', () => ({ usePathname: () => '/member' }))
afterEach(cleanup)
describe('community navigation', () => { it('keeps every member destination accessible with plain labels', () => {
  render(<MemberSidebar displayName="Ada"/>)
  const destinations = { Dashboard: '/member', 'Find a project': '/member/projects', 'My teams': '/member/teams', 'My applications': '/member/applications', Invitations: '/member/invitations', 'My ideas': '/member/proposals', Notifications: '/member/notifications', 'Find teammates': '/member/directory', 'Saved items': '/member/saved', 'My profile': '/member/profile' }
  for (const [label, href] of Object.entries(destinations)) expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href)
}) })
