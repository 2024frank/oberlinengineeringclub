import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { MemberShell } from '@/components/member/MemberShell'
import type { CurrentAdmin } from '@/lib/auth/session'

const route = vi.hoisted(() => ({ pathname: '/admin' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/SignOutButton', () => ({ SignOutButton: () => <button>Sign out</button> }))
const admin: CurrentAdmin = { userId: 'officer', displayName: 'Officer', email: 'officer@example.com', role: 'SUPER_ADMIN', scopes: [], canPublish: true, active: true }

afterEach(() => { cleanup(); route.pathname = '/admin'; vi.unstubAllGlobals() })

describe('Portal navigation', () => {
  it('marks nested pages active on both the officer host and the local admin path', () => {
    route.pathname = '/pages/home'
    const view = render(<AdminSidebar admin={admin}/>)
    expect(screen.getByRole('link', { name: 'Website pages' })).toHaveAttribute('aria-current', 'page')
    route.pathname = '/admin/pages/home'
    view.rerender(<AdminSidebar admin={admin}/>)
    expect(screen.getByRole('link', { name: 'Website pages' })).toHaveAttribute('aria-current', 'page')
  })

  it('lets an officer recover from a navigation search with no results', async () => {
    const user = userEvent.setup()
    render(<AdminSidebar admin={admin}/>)
    await user.type(screen.getByRole('searchbox'), 'no such page')
    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear navigation search' }))
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
  })

  it('keeps restricted destinations out of editor navigation', () => {
    render(<AdminSidebar admin={{ ...admin, role: 'EDITOR' }}/>)
    expect(screen.queryByRole('link', { name: 'Member requests' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Staff access' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
  })

  it('opens member navigation as a modal and restores focus when dismissed', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    const user = userEvent.setup()
    route.pathname = '/member/teams/example'
    render(<MemberShell member={{ displayName: 'Ada', email: 'ada@example.com' }}><h1>My project</h1></MemberShell>)
    const opener = screen.getByRole('button', { name: 'Open member navigation' })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Member navigation' })
    expect(within(dialog).getByRole('link', { name: 'My teams' })).toHaveAttribute('aria-current', 'page')
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }))
    expect(opener).toHaveAttribute('aria-expanded', 'false')
    expect(opener).toHaveFocus()
  })
})
