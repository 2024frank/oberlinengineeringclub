import { NextResponse } from 'next/server'
import { getCurrentMember } from '@/lib/auth/memberSession'
import { performTeamAction } from '@/lib/teams/server'
import { teamActionSchema, teamError } from '@/lib/teams/input'

export async function POST(request: Request) {
  if (!await getCurrentMember()) return NextResponse.json({ error: 'Sign in with an active member account.' }, { status: 401 })
  const parsed = teamActionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Check the team details and try again.' }, { status: 400 })
  try { return NextResponse.json({ ok: true, result: await performTeamAction(parsed.data) }) }
  catch (error) { return NextResponse.json({ error: teamError(error) }, { status: 400 }) }
}
