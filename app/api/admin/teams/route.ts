import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/session'
import { performTeamAction } from '@/lib/teams/server'
import { teamActionSchema, teamError } from '@/lib/teams/input'

export async function POST(request: Request) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role === 'EDITOR') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const parsed = teamActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.action !== 'review-project') return NextResponse.json({ error: 'Choose a project request and a review decision.' }, { status: 400 })
  try { return NextResponse.json({ ok: true, result: await performTeamAction(parsed.data) }) }
  catch (error) { return NextResponse.json({ error: teamError(error) }, { status: 400 }) }
}
