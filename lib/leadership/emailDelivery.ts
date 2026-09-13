import { officerOpeningEmail } from './emailTemplate'

type EmailJob = { id: string; claimToken: string; recipient: string; displayName: string; positionId: string; roleTitle: string; term: string; bio: string; closesAt: string | null }
type Dependencies = {
  rpc: (name: string, params?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
  send?: typeof fetch
  wait?: (ms: number) => Promise<void>
}

export async function deliverOfficerEmails({ rpc, send = fetch, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) }: Dependencies) {
  const key = process.env.RESEND_API_KEY?.trim(), from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!key || !from) return { processed: 0, configured: false }
  let processed = 0
  const started = Date.now()
  while (processed < 20 && Date.now() - started < 40_000) {
    const claim = await rpc('claim_officer_email')
    if (claim.error) throw new Error('EMAIL_CLAIM_FAILED')
    const job = (claim.data as EmailJob[] | null)?.[0]
    if (!job) break
    let status = 'UNCERTAIN', error: string | null = null
    try {
      const response = await send('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(8000),
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'Idempotency-Key': `officer-opening/${job.id}` },
        body: JSON.stringify({ from, to: [job.recipient], ...officerOpeningEmail(job) }),
      })
      status = response.ok ? 'SENT' : response.status >= 400 && response.status < 500 && response.status !== 409 && response.status !== 408 ? 'FAILED' : 'UNCERTAIN'
      if (!response.ok) error = `EMAIL_HTTP_${response.status}`
    } catch { error = 'EMAIL_RESPONSE_UNCERTAIN' }
    const saved = await rpc('finish_officer_email', { p_id: job.id, p_claim_token: job.claimToken, p_status: status, p_error: error })
    if (saved.error || saved.data !== true) throw new Error('EMAIL_TRACKING_FAILED')
    processed++
    if (error) break
    await wait(600)
  }
  return { processed, configured: true }
}
