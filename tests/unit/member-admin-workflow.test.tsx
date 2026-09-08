import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { parseMemberEmails, memberStatusLabel } from '@/lib/members/invitations'
import { memberEmailOrigin } from '@/lib/auth/memberEmailOrigin'
import { MemberApplicationQueue } from '@/components/admin/members/MemberApplicationQueue'
import { MemberActivationForm } from '@/components/member/MemberActivationForm'

const auth = vi.hoisted(() => ({ updateUser: vi.fn() }))
vi.mock('@/lib/supabase/browser', () => ({ createSupabaseBrowserClient: () => ({ auth }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

const row = { id: 'a', email: 'ada@oberlin.edu', displayName: 'Ada', status: 'REQUESTED' as const, emailVerifiedAt: null, reviewedAt: null, reviewNote: null, createdAt: '2026-09-05T15:00:00Z', preapprovedAt: null, lastEmailSentAt: null, lastEmailError: null }

it('normalizes comma/newline separated emails, deduplicates, and rejects bad input before sending', () => {
  expect(parseMemberEmails(' Ada@Oberlin.edu, ben@oberlin.edu\nada@oberlin.edu ')).toEqual(['ada@oberlin.edu', 'ben@oberlin.edu'])
  expect(() => parseMemberEmails('ada@oberlin.edu, wrong@example.com')).toThrow('wrong@example.com')
  expect(() => parseMemberEmails('')).toThrow()
  expect(() => parseMemberEmails(Array.from({ length: 26 }, (_, i) => `m${i}@oberlin.edu`).join(','))).toThrow('25')
})

it('distinguishes officer approval from verified, active membership', () => {
  expect(memberStatusLabel(row)).toBe('Needs approval')
  expect(memberStatusLabel({ ...row, preapprovedAt: '2026-09-05' })).toBe('Awaiting email verification')
  expect(memberStatusLabel({ ...row, status: 'APPROVED' })).toBe('Awaiting account setup')
  expect(memberStatusLabel({ ...row, status: 'ACTIVE' })).toBe('Active member')
  expect(memberStatusLabel({ ...row, status: 'PENDING_APPROVAL', preapprovedAt: '2026-09-05' })).toBe('Needs approval')
})

it('puts member emails on the public site, never the officer host', () => {
  expect(memberEmailOrigin('https://admin.oberlin32engineeringsociety.com', 'https://oberlin32engineeringsociety.com')).toBe('https://oberlin32engineeringsociety.com')
  expect(memberEmailOrigin('https://admin.oberlin32engineeringsociety.com', '')).toBe('https://oberlin32engineeringsociety.com')
  expect(memberEmailOrigin('http://localhost:3022', '')).toBe('http://localhost:3022')
  expect(() => memberEmailOrigin('https://attacker.example', '')).toThrow()
})

it('shows pending members in the roster with an approval action', () => {
  render(<MemberApplicationQueue initial={[row]} initialFilter="all"/>)
  expect(screen.getByText('Ada')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Approve & send email' })).toBeInTheDocument()
})

it('reviews the exact deduplicated recipients before a batch is sent', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [{ email: 'ada@oberlin.edu', outcome: 'sent' }], requests: [row] }) })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemberApplicationQueue initial={[]} initialFilter="all"/>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Add members' }))
  await user.type(screen.getByRole('textbox', { name: 'Oberlin email addresses' }), 'ADA@oberlin.edu, ada@oberlin.edu')
  await user.click(screen.getByRole('button', { name: 'Review invitations' }))
  expect(fetchMock).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Approve & email 1 member' }))
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ emails: 'ada@oberlin.edu' })
  expect(await screen.findByText('Email sent')).toBeInTheDocument()
})

it('keeps saved approvals visible when sending their email fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { emailSent: false }, requests: [{ ...row, status: 'APPROVED', lastEmailError: 'EMAIL_SEND_FAILED' }] }) }))
  render(<MemberApplicationQueue initial={[row]} initialFilter="all"/>)
  await userEvent.click(screen.getByRole('button', { name: 'Approve & send email' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('saved')
  expect(screen.getByRole('button', { name: 'Resend setup email' })).toBeInTheDocument()
})

it('explains an expired activation session without changing membership', async () => {
  auth.updateUser.mockResolvedValue({ error: { code: 'session_not_found', message: 'Session missing' } })
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
  render(<MemberActivationForm/>)
  await userEvent.type(screen.getByLabelText('Choose password'), 'example-test-password')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'example-test-password')
  await userEvent.click(screen.getByRole('button', { name: 'Activate member account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('expired')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('accepts an unchanged existing password and still proceeds to activation', async () => {
  auth.updateUser.mockResolvedValue({ error: { code: 'same_password' } })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'ACTIVATION_TEST_STOP' }) }))
  render(<MemberActivationForm/>)
  await userEvent.type(screen.getByLabelText('Choose password'), 'example-test-password')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'example-test-password')
  await userEvent.click(screen.getByRole('button', { name: 'Activate member account' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('ACTIVATION_TEST_STOP')
  expect(fetch).toHaveBeenCalledWith('/api/auth/member/activate', { method: 'POST' })
})
