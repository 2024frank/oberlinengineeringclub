import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import { inviteMembers, listMembershipRequests, reviewMembershipRequest, sendMembershipSetupEmail } from '@/lib/auth/memberServer'
import type { MembershipStatus } from '@/lib/auth/memberLifecycle'
import { parseMemberEmails } from '@/lib/members/invitations'

export const maxDuration = 60

const allowedStatuses = new Set(['REQUESTED','EMAIL_VERIFIED','PENDING_APPROVAL','APPROVED','REJECTED','ACTIVE','SUSPENDED','ALL'])

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  const raw = new URL(request.url).searchParams.get('status') ?? 'PENDING_APPROVAL'
  const status = allowedStatuses.has(raw) ? raw as MembershipStatus | 'ALL' : 'PENDING_APPROVAL'
  return NextResponse.json({ requests: await listMembershipRequests(status) })
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    if (typeof body.requestId !== 'string' || !body.requestId) return NextResponse.json({ error: 'REQUEST_ID_REQUIRED' }, { status: 400 })
    const result = body.action === 'resend'
      ? await sendMembershipSetupEmail(body.requestId, new URL(request.url).origin)
      : await reviewMembershipRequest(body, admin.userId, new URL(request.url).origin)
    return NextResponse.json({ ok: true, result, requests: await listMembershipRequests('ALL') })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBERSHIP_REVIEW_FAILED' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (admin.role === 'EDITOR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  try {
    const body = await request.json()
    if (typeof body.emails !== 'string' || body.emails.length > 10000) return NextResponse.json({ error: 'EMAILS_REQUIRED' }, { status: 400 })
    parseMemberEmails(body.emails)
    const results = await inviteMembers(body.emails, admin.userId, new URL(request.url).origin)
    return NextResponse.json({ ok: true, results, requests: await listMembershipRequests('ALL') })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'MEMBER_INVITATIONS_FAILED' }, { status: 400 })
  }
}
