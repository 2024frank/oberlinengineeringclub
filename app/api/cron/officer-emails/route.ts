import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendQueuedOfficerEmails } from '@/lib/leadership/emailServer'
export const maxDuration = 60
export async function POST(request: Request) {
  const secret = process.env.OFFICER_EMAIL_CRON_SECRET
  const timestamp = request.headers.get('x-oec-timestamp') ?? ''
  const signature = request.headers.get('x-oec-signature') ?? ''
  if (!secret || secret.length < 32 || !/^[0-9]{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }
  const age = Math.floor(Date.now() / 1000) - Number(timestamp)
  if (age > 120 || age < -30) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const expected = createHmac('sha256', secret).update(`officer-email-worker:${timestamp}`, 'utf8').digest()
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  try {
    const result = await sendQueuedOfficerEmails()
    return NextResponse.json(result, { status: result.configured ? 200 : 503 })
  } catch { return NextResponse.json({ error: 'EMAIL_WORKER_FAILED' }, { status: 500 }) }
}
