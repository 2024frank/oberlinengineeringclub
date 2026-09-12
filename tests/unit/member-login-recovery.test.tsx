import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { MemberLoginPanel } from '@/components/member/MemberLoginPanel'

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/lib/supabase/browser', () => ({ createSupabaseBrowserClient: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/') })

it('explains an unusable email link and offers a new setup email', async () => {
  window.history.replaceState({}, '', '/member/login?error=auth_link')
  render(<MemberLoginPanel authError="auth_link" />)
  expect(screen.getByRole('alert')).toHaveTextContent(/expired or has already been used/i)
  await userEvent.click(screen.getByRole('button', { name: 'Request a new setup email' }))
  expect(screen.getByRole('heading', { name: 'Request an account' })).toBeVisible()
})
it.each([
  [{ status: 'PENDING_APPROVAL', emailSent: false }, /waiting for an officer to approve/i],
  [{ status: 'ACTIVE', emailSent: false }, /already set up/i],
  [{ status: 'APPROVED', emailSent: true }, /setup email sent/i],
  [{ status: 'REQUESTED', emailSent: false, retryAfter: 60 }, /already sent an email/i],
])('shows the actual next step rather than claiming every request sent verification', async (result, message) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => result }))
  const user = userEvent.setup()
  render(<MemberLoginPanel />)
  await user.click(screen.getByRole('button', { name: 'Request an account' }))
  await user.type(screen.getByLabelText('Full name'), 'Ada Example')
  await user.type(screen.getByLabelText('Oberlin email'), 'ada@oberlin.edu')
  await user.click(screen.getByRole('button', { name: 'Request account' }))
  expect(await screen.findByRole('status')).toHaveTextContent(message)
})
