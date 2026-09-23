import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { approveProjectInterest } from '@/lib/projects/teamAdmin'
import { projectInterestDecisionSchema, publicProjectTeamError } from '@/lib/projects/teamAdminInput'

export async function POST(request: Request) {
  try { await requireRole('ADMIN') } catch {
    return NextResponse.json({ error: 'PROJECT_TEAM_ADMIN_REQUIRED' }, { status: 403 })
  }
  const parsed = projectInterestDecisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_PROJECT_INTEREST_DECISION' }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, ...await approveProjectInterest(parsed.data) })
  } catch (error) {
    const code = publicProjectTeamError(error instanceof Error ? error.message : '')
    return NextResponse.json({ error: code }, { status: code === 'PROJECT_TEAM_ACTION_FAILED' ? 500 : 400 })
  }
}
