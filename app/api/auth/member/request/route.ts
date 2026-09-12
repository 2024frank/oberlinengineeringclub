import { NextResponse } from 'next/server'
import { submitMembershipRequest } from '@/lib/auth/memberServer'

export async function POST(request: Request) {
  try {
    const result = await submitMembershipRequest(await request.json(), new URL(request.url).origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0] : 'MEMBERSHIP_REQUEST_FAILED'
    const status = code === 'MEMBERSHIP_EMAIL_RATE_LIMITED' ? 429
      : ['OBERLIN_EMAIL_REQUIRED', 'DISPLAY_NAME_REQUIRED', 'MEMBERSHIP_REQUEST_BLOCKED'].includes(code) ? 400 : 503
    if (status === 503) console.error('Membership request failed', { code })
    return NextResponse.json({ error: code }, { status })
  }
}
