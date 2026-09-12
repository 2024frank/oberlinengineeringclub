import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { approveProjectInterestAsLead } from '@/lib/projects/leadApproval'
import { projectLeadApprovalSchema, publicProjectLeadError } from '@/lib/projects/leadApprovalInput'

export async function POST(request: Request) {
  try { await requireRole('ADMIN') } catch {
    return NextResponse.json({ error: 'PROJECT_LEAD_APPROVAL_FORBIDDEN' }, { status: 403 })
  }
  const parsed = projectLeadApprovalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_PROJECT_LEAD_APPROVAL' }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, ...await approveProjectInterestAsLead(parsed.data) })
  } catch (error) {
    const code = publicProjectLeadError(error instanceof Error ? error.message : '')
    return NextResponse.json({ error: code }, { status: code === 'PROJECT_LEAD_APPROVAL_FAILED' ? 500 : 400 })
  }
}
