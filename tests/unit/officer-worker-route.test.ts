// @vitest-environment node
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const send = vi.hoisted(() => vi.fn())
vi.mock('@/lib/leadership/emailServer', () => ({ sendQueuedOfficerEmails: send }))
import { POST } from '@/app/api/cron/officer-emails/route'

const secret = '0123456789abcdef0123456789abcdef'
const now = 1_800_000_000

function signature(timestamp: string, key = secret) {
  return createHmac('sha256', key).update(`officer-email-worker:${timestamp}`, 'utf8').digest('hex')
}

function request(timestamp = String(now), suppliedSignature = signature(timestamp), extraHeaders: Record<string, string> = {}) {
  return new Request('https://example.test/api/cron/officer-emails', {
    method: 'POST', headers: { 'x-oec-timestamp': timestamp, 'x-oec-signature': suppliedSignature, ...extraHeaders },
  })
}

async function expectUnauthorized(input: Request) {
  const response = await POST(input)
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' })
  expect(send).not.toHaveBeenCalled()
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ processed: 0, configured: true })
  vi.stubEnv('OFFICER_EMAIL_CRON_SECRET', secret)
  vi.spyOn(Date, 'now').mockReturnValue(now * 1000)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

it.each([0, -120, 30])('accepts a correctly signed timestamp at offset %s seconds', async offset => {
  const response = await POST(request(String(now + offset)))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ processed: 0, configured: true })
  expect(send).toHaveBeenCalledExactlyOnceWith()
})

it('rejects a signature older than 120 seconds', async () => {
  await expectUnauthorized(request(String(now - 121)))
})

it('rejects a timestamp more than 30 seconds in the future', async () => {
  await expectUnauthorized(request(String(now + 31)))
})

it('rejects a tampered timestamp even when both timestamps are fresh', async () => {
  await expectUnauthorized(request(String(now + 1), signature(String(now))))
})

it('rejects a signature made with a different key', async () => {
  await expectUnauthorized(request(String(now), signature(String(now), 'fedcba9876543210fedcba9876543210')))
})

it('requires the exact worker message prefix', async () => {
  await expectUnauthorized(request(String(now), createHmac('sha256', secret).update(String(now), 'utf8').digest('hex')))
})

it.each(['', '180000000', '18000000000', '18000000.0', '1.800000e9', '+800000000', '-800000000', '180000000x'])('rejects malformed timestamp %j', async timestamp => {
  await expectUnauthorized(request(timestamp))
})

it.each(['', 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), signature(String(now)).toUpperCase(), '0'.repeat(64)])('rejects malformed or incorrect signature %j', async suppliedSignature => {
  await expectUnauthorized(request(String(now), suppliedSignature))
})

it.each(['x-oec-timestamp', 'x-oec-signature'])('rejects a missing %s header', async header => {
  const input = request()
  input.headers.delete(header)
  await expectUnauthorized(input)
})

it.each([undefined, '', 'short-secret', 'x'.repeat(31)])('rejects missing or undersized configuration %j', async configuredSecret => {
  vi.stubEnv('OFFICER_EMAIL_CRON_SECRET', configuredSecret)
  await expectUnauthorized(request(String(now), signature(String(now), configuredSecret ?? '')))
})

it('does not accept the legacy bearer credential', async () => {
  await expectUnauthorized(new Request('https://example.test/api/cron/officer-emails', {
    method: 'POST', headers: { authorization: `Bearer ${secret}` },
  }))
})

it('does not fall back to bearer authentication when the signature is wrong', async () => {
  await expectUnauthorized(request(String(now), '0'.repeat(64), { authorization: `Bearer ${secret}` }))
})

it('masks worker errors after successful authentication', async () => {
  send.mockRejectedValueOnce(new Error('private provider credential detail'))
  const response = await POST(request())
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({ error: 'EMAIL_WORKER_FAILED' })
  expect(send).toHaveBeenCalledOnce()
})

it('preserves the unavailable status when the authenticated worker is not configured', async () => {
  send.mockResolvedValueOnce({ processed: 0, configured: false })
  const response = await POST(request())
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ processed: 0, configured: false })
})
