import { afterEach, expect, it, vi } from 'vitest'
import { sendTransactionalEmailBatch } from '@/lib/email/client'
import { memberSiteOrigin } from '@/lib/email/siteOrigin'
import { projectKickoffEmail } from '@/lib/email/templates'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

it('sends kickoff email in batches of 100 and counts accepted messages', async () => {
  vi.stubEnv('RESEND_API_KEY', 'key'); vi.stubEnv('RESEND_FROM_EMAIL', 'OEC <club@example.com>')
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false })
  vi.stubGlobal('fetch', fetchMock)
  const messages = Array.from({ length: 101 }, (_, n) => ({ to: `M${n}@Oberlin.edu `, message: { subject: 'Hi', text: 'Body' } }))
  expect(await sendTransactionalEmailBatch({ messages, idempotencyKey: 'project-kickoff/k' })).toBe(100)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('https://api.resend.com/emails/batch')
  expect(init.headers['Idempotency-Key']).toBe('project-kickoff/k/0')
  expect(JSON.parse(init.body)[0]).toEqual({ from: 'OEC <club@example.com>', to: ['m0@oberlin.edu'], subject: 'Hi', text: 'Body' })
})
it('does nothing without email configuration', async () => {
  vi.stubEnv('RESEND_API_KEY', '')
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  expect(await sendTransactionalEmailBatch({ messages: [{ to: 'a@oberlin.edu', message: { subject: 's', text: 't' } }] })).toBe(0)
  expect(fetchMock).not.toHaveBeenCalled()
})
it('points member links at the public site', () => {
  expect(memberSiteOrigin('https://admin.oberlin32engineeringsociety.com')).toBe('https://oberlin32engineeringsociety.com')
  expect(memberSiteOrigin('')).toBe('https://oberlin32engineeringsociety.com')
  expect(memberSiteOrigin('http://localhost:3000/')).toBe('http://localhost:3000')
})
it('writes a kickoff email with the meeting details in Eastern time', () => {
  const email = projectKickoffEmail({ memberName: 'Ben', projectTitle: 'DO Probe', role: 'MEMBER', message: 'Bring a laptop.', meetingAt: '2026-09-25T22:00:00.000Z', location: 'Science Center B25', actionUrl: 'https://example.test/member/teams/1' })
  expect(email.subject).toBe('Time to start: DO Probe')
  expect(email.text).toContain('Bring a laptop.')
  expect(email.text).toContain('When: Friday, September 25 at 6:00 PM (Eastern)')
  expect(email.text).toContain('Where: Science Center B25')
  expect(email.text).toContain('https://example.test/member/teams/1')
})
